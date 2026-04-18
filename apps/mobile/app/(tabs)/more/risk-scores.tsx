import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { api } from '@/lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface RiskScore {
  id: string;
  residentId: string;
  fallRisk: number;
  infectionRisk: number;
  malnutritionRisk: number;
  overallRisk: number;
  riskFactors: string[];
  recommendations: string[];
  calculatedAt: string;
  resident: { id: string; name: string; status: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskColor(score: number): string {
  if (score >= 60) return colors.danger;
  if (score >= 30) return colors.warning;
  return colors.secondary;
}

function riskLabel(score: number): string {
  if (score >= 60) return 'Alto';
  if (score >= 30) return 'Médio';
  return 'Baixo';
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label}>{label}</Text>
      <View style={barStyles.track}>
        <View
          style={[barStyles.fill, { width: `${Math.min(100, value)}%`, backgroundColor: riskColor(value) }]}
        />
      </View>
      <Text style={[barStyles.value, { color: riskColor(value) }]}>{value}%</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: fontSize.xs, color: colors.textSecondary, width: 80 },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: colors.gray200,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: radius.full },
  value: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, width: 36, textAlign: 'right' },
});

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function RiskScoresScreen() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['risk-scores'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: RiskScore[] }>('/ai/risk-scores');
      return data.data;
    },
  });

  function handleRecalculate() {
    queryClient.invalidateQueries({ queryKey: ['risk-scores'] });
    query.refetch();
  }

  const scores = query.data ?? [];

  return (
    <Screen title="Avaliação de Risco">
      {/* Header actions */}
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>
          {scores.length > 0 ? `${scores.length} residente(s) avaliado(s)` : 'Nenhuma avaliação'}
        </Text>
        <TouchableOpacity
          style={[styles.recalcBtn, query.isFetching && styles.recalcBtnDisabled]}
          onPress={handleRecalculate}
          disabled={query.isFetching}
          activeOpacity={0.8}
        >
          {query.isFetching ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.recalcBtnText}>⟳ Calcular</Text>
          )}
        </TouchableOpacity>
      </View>

      {query.isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Calculando riscos...</Text>
        </View>
      ) : (
        <FlatList
          data={scores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={styles.emptyTitle}>Sem avaliações</Text>
              <Text style={styles.emptySubtitle}>
                Toque em "Calcular" para avaliar os residentes ativos.
              </Text>
            </Card>
          }
          renderItem={({ item }) => {
            const isExpanded = expanded === item.id;
            return (
              <Card style={styles.card}>
                <TouchableOpacity
                  onPress={() => setExpanded(isExpanded ? null : item.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.residentInfo}>
                      <Text style={styles.residentName}>{item.resident.name}</Text>
                      <Text style={styles.calcDate}>
                        Atualizado: {new Date(item.calculatedAt).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.overallBadge,
                        { backgroundColor: riskColor(item.overallRisk) + '20' },
                      ]}
                    >
                      <Text
                        style={[styles.overallScore, { color: riskColor(item.overallRisk) }]}
                      >
                        {item.overallRisk}%
                      </Text>
                      <Text style={[styles.overallLabel, { color: riskColor(item.overallRisk) }]}>
                        {riskLabel(item.overallRisk)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.miniBars}>
                    <MiniBar label="Queda" value={item.fallRisk} />
                    <MiniBar label="Infecção" value={item.infectionRisk} />
                    <MiniBar label="Desnutrição" value={item.malnutritionRisk} />
                  </View>

                  {scores.length > 0 && (
                    <Text style={styles.expandHint}>
                      {isExpanded ? '▲ Ocultar detalhes' : '▼ Ver fatores e recomendações'}
                    </Text>
                  )}
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.details}>
                    {item.riskFactors.length > 0 && (
                      <>
                        <Text style={styles.detailTitle}>Fatores de Risco</Text>
                        {item.riskFactors.map((f, i) => (
                          <Text key={i} style={styles.detailItem}>• {f}</Text>
                        ))}
                      </>
                    )}
                    {item.recommendations.length > 0 && (
                      <>
                        <Text style={[styles.detailTitle, { marginTop: spacing.sm }]}>
                          Recomendações
                        </Text>
                        {item.recommendations.map((r, i) => (
                          <Text key={i} style={styles.detailItem}>→ {r}</Text>
                        ))}
                      </>
                    )}
                  </View>
                )}
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary },
  recalcBtn: {
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 90,
    alignItems: 'center',
  },
  recalcBtnDisabled: { opacity: 0.6 },
  recalcBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  loadingText: { fontSize: fontSize.sm, color: colors.textSecondary },
  list: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  residentInfo: { flex: 1 },
  residentName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  calcDate: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  overallBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overallScore: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    lineHeight: 22,
  },
  overallLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  miniBars: { gap: spacing.xs },
  expandHint: {
    fontSize: fontSize.xs,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: 4,
  },
  detailTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  detailItem: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 18 },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
