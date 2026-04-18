import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { api } from '@/lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface ScheduleConflict {
  id: string;
  type: string;
  staffName: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

interface SuggestedEntry {
  id: string;
  date: string;
  shift: 'morning' | 'afternoon' | 'night';
  staffName: string;
  confidence: number;
}

interface AbsenceRisk {
  staffId: string;
  staffName: string;
  riskPercent: number;
}

interface AnalyzeResponse {
  success: boolean;
  data: {
    conflicts: ScheduleConflict[];
    summary: {
      total_conflicts: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

interface SuggestResponse {
  success: boolean;
  data: {
    score: number;
    coverageRate: number;
    entries: SuggestedEntry[];
    absenceRisks: AbsenceRisk[];
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatMonth(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function toMonthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function conflictBorderColor(severity: ScheduleConflict['severity']): string {
  switch (severity) {
    case 'high': return colors.danger;
    case 'medium': return colors.warning;
    case 'low': return colors.primary;
  }
}

function conflictSeverityLabel(severity: ScheduleConflict['severity']): string {
  switch (severity) {
    case 'high': return 'Alta';
    case 'medium': return 'Média';
    case 'low': return 'Baixa';
  }
}

function shiftEmoji(shift: SuggestedEntry['shift']): string {
  switch (shift) {
    case 'morning': return '🌅';
    case 'afternoon': return '🌤';
    case 'night': return '🌙';
  }
}

function riskColor(riskPercent: number): string {
  if (riskPercent >= 60) return colors.danger;
  if (riskPercent >= 30) return colors.warning;
  return colors.secondary;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AiScheduleScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [analysisEnabled, setAnalysisEnabled] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestResponse['data'] | null>(null);
  const [expandedEntries, setExpandedEntries] = useState(false);

  const monthParam = toMonthParam(year, month);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else { setMonth((m) => m - 1); }
    setAnalysisEnabled(false);
    setSuggestion(null);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else { setMonth((m) => m + 1); }
    setAnalysisEnabled(false);
    setSuggestion(null);
  }

  // Analysis query — only runs when user taps "Analisar"
  const analyzeQuery = useQuery({
    queryKey: ['ai-schedule-analyze', monthParam],
    queryFn: async () => {
      const { data } = await api.get<AnalyzeResponse>('/ai/schedule/analyze', {
        params: { month: monthParam },
      });
      return data.data;
    },
    enabled: analysisEnabled,
  });

  // Suggestion mutation
  const suggestMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<SuggestResponse>('/ai/schedule/suggest', {
        month: monthParam,
      });
      return data.data;
    },
    onSuccess: (result) => {
      setSuggestion(result);
    },
  });

  const conflicts = analyzeQuery.data?.conflicts ?? [];

  function renderConflict({ item }: { item: ScheduleConflict }) {
    const borderColor = conflictBorderColor(item.severity);
    return (
      <View style={[styles.conflictCard, { borderLeftColor: borderColor }]}>
        <View style={styles.conflictHeader}>
          <View style={[styles.severityBadge, { backgroundColor: borderColor + '20' }]}>
            <Text style={[styles.severityText, { color: borderColor }]}>
              {conflictSeverityLabel(item.severity)}
            </Text>
          </View>
          <Text style={styles.conflictType} numberOfLines={1}>{item.type}</Text>
        </View>
        <Text style={styles.conflictStaff}>{item.staffName}</Text>
        <Text style={styles.conflictDescription}>{item.description}</Text>
      </View>
    );
  }

  function renderSuggestedEntry({ item }: { item: SuggestedEntry }) {
    return (
      <View style={styles.entryRow}>
        <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
        <Text style={styles.entryShift}>{shiftEmoji(item.shift)}</Text>
        <Text style={styles.entryStaff} numberOfLines={1}>{item.staffName}</Text>
        <Text style={styles.entryConfidence}>{item.confidence.toFixed(0)}%</Text>
      </View>
    );
  }

  return (
    <Screen title="IA • Escalas">
      {/* Month picker */}
      <View style={styles.monthPicker}>
        <TouchableOpacity style={styles.monthBtn} onPress={prevMonth} activeOpacity={0.7}>
          <Text style={styles.monthBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{formatMonth(year, month)}</Text>
        <TouchableOpacity style={styles.monthBtn} onPress={nextMonth} activeOpacity={0.7}>
          <Text style={styles.monthBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Analyze button */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => setAnalysisEnabled(true)}
          activeOpacity={0.8}
          disabled={analyzeQuery.isFetching}
        >
          {analyzeQuery.isFetching ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>🔍  Analisar Escalas</Text>
          )}
        </TouchableOpacity>

        {/* Conflicts section */}
        {analyzeQuery.isSuccess && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Conflitos Encontrados</Text>
              {analyzeQuery.data && (
                <View style={styles.summaryPills}>
                  {analyzeQuery.data.summary.high > 0 && (
                    <View style={[styles.pill, { backgroundColor: colors.dangerLight }]}>
                      <Text style={[styles.pillText, { color: colors.danger }]}>
                        {analyzeQuery.data.summary.high} alta
                      </Text>
                    </View>
                  )}
                  {analyzeQuery.data.summary.medium > 0 && (
                    <View style={[styles.pill, { backgroundColor: colors.warningLight }]}>
                      <Text style={[styles.pillText, { color: colors.warning }]}>
                        {analyzeQuery.data.summary.medium} média
                      </Text>
                    </View>
                  )}
                  {analyzeQuery.data.summary.low > 0 && (
                    <View style={[styles.pill, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.pillText, { color: colors.primary }]}>
                        {analyzeQuery.data.summary.low} baixa
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {conflicts.length === 0 ? (
              <EmptyState
                icon="✅"
                title="Sem conflitos"
                subtitle="Nenhum conflito encontrado neste mês."
              />
            ) : (
              conflicts.map((conflict) => (
                <View key={conflict.id}>
                  {renderConflict({ item: conflict })}
                </View>
              ))
            )}

            {/* Suggest button */}
            <TouchableOpacity
              style={[styles.secondaryBtn, suggestMutation.isPending && styles.btnDisabled]}
              onPress={() => suggestMutation.mutate()}
              activeOpacity={0.8}
              disabled={suggestMutation.isPending}
            >
              {suggestMutation.isPending ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.purple} size="small" />
                  <Text style={styles.secondaryBtnText}>Gerando sugestão...</Text>
                </View>
              ) : (
                <Text style={styles.secondaryBtnText}>🤖  Gerar Sugestão IA</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {analyzeQuery.isError && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>Erro ao analisar escalas. Tente novamente.</Text>
          </Card>
        )}

        {/* Suggestion result */}
        {suggestion && (
          <>
            <Text style={styles.sectionTitle}>Sugestão Gerada</Text>

            <Card style={styles.scoreCard}>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Pontuação</Text>
                <Text style={styles.scoreValue}>{suggestion.score.toFixed(0)}/100</Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(suggestion.score, 100)}%` as unknown as number,
                      backgroundColor: riskColor(100 - suggestion.score),
                    },
                  ]}
                />
              </View>
              <Text style={styles.coverageText}>
                Cobertura: {suggestion.coverageRate.toFixed(1)}%
              </Text>
            </Card>

            {/* Suggested entries */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Entradas Sugeridas</Text>
              <TouchableOpacity onPress={() => setExpandedEntries((v) => !v)}>
                <Text style={styles.expandText}>
                  {expandedEntries ? 'Ver menos' : `Ver todas (${suggestion.entries.length})`}
                </Text>
              </TouchableOpacity>
            </View>

            <Card style={styles.entriesCard}>
              <View style={styles.entryHeaderRow}>
                <Text style={[styles.entryColHeader, { flex: 1.2 }]}>Data</Text>
                <Text style={[styles.entryColHeader, { width: 30 }]}>T</Text>
                <Text style={[styles.entryColHeader, { flex: 2 }]}>Funcionário</Text>
                <Text style={[styles.entryColHeader, { width: 44, textAlign: 'right' }]}>Conf.</Text>
              </View>
              <FlatList
                data={expandedEntries ? suggestion.entries : suggestion.entries.slice(0, 8)}
                keyExtractor={(item) => item.id}
                renderItem={renderSuggestedEntry}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.entrySep} />}
              />
            </Card>

            {/* Absence risks */}
            {suggestion.absenceRisks && suggestion.absenceRisks.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Ausência em Risco</Text>
                {suggestion.absenceRisks.map((risk) => (
                  <Card key={risk.staffId} style={styles.riskCard}>
                    <View style={styles.riskRow}>
                      <Text style={styles.riskName} numberOfLines={1}>{risk.staffName}</Text>
                      <View style={styles.riskRight}>
                        <View
                          style={[
                            styles.riskDot,
                            { backgroundColor: riskColor(risk.riskPercent) },
                          ]}
                        />
                        <Text style={[styles.riskPercent, { color: riskColor(risk.riskPercent) }]}>
                          {risk.riskPercent.toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${Math.min(risk.riskPercent, 100)}%` as unknown as number,
                            backgroundColor: riskColor(risk.riskPercent),
                          },
                        ]}
                      />
                    </View>
                  </Card>
                ))}
              </>
            )}
          </>
        )}

        {suggestMutation.isError && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>Erro ao gerar sugestão. Tente novamente.</Text>
          </Card>
        )}

        {!analysisEnabled && (
          <EmptyState
            icon="🤖"
            title="Análise de Escalas"
            subtitle="Toque em 'Analisar Escalas' para identificar conflitos e gerar sugestões com IA."
          />
        )}
      </ScrollView>
    </Screen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xl,
  },
  monthBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthBtnText: {
    fontSize: fontSize.xl,
    color: colors.text,
    lineHeight: 24,
  },
  monthLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    minWidth: 140,
    textAlign: 'center',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  primaryBtn: {
    backgroundColor: colors.purple,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  secondaryBtn: {
    backgroundColor: colors.purpleLight,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: colors.purple,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  btnDisabled: { opacity: 0.6 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  summaryPills: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  conflictCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    marginBottom: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  severityBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  severityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  conflictType: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  conflictStaff: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  conflictDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  errorCard: {
    backgroundColor: colors.dangerLight,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    fontWeight: fontWeight.medium,
  },
  scoreCard: {
    gap: spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  scoreValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.purple,
  },
  barTrack: {
    height: 8,
    backgroundColor: colors.gray200,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: radius.full,
  },
  coverageText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  expandText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  entriesCard: {
    padding: 0,
    overflow: 'hidden',
  },
  entryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray100,
    gap: spacing.sm,
  },
  entryColHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  entryDate: {
    flex: 1.2,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  entryShift: {
    width: 30,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  entryStaff: {
    flex: 2,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  entryConfidence: {
    width: 44,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.secondary,
    textAlign: 'right',
  },
  entrySep: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  riskCard: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  riskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginRight: spacing.sm,
  },
  riskRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  riskPercent: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
