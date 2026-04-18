import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { Screen } from '@/components/Screen';
import { api } from '@/lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface AdherenceByResident {
  resident_id: string;
  resident_name: string;
  total_prescribed: number;
  administered: number;
  refused: number;
  missed: number;
  adherence_rate: number;
}

interface MostRefusedMedication {
  medication_name: string;
  refused_count: number;
  refusal_rate: number;
}

interface MedicationsDashboard {
  summary: {
    total_medications: number;
    active_medications: number;
    total_administrations: number;
    adherence_rate: number;
    medications_expiring_soon: number;
  };
  adherence_by_resident: AdherenceByResident[];
  most_refused_medications: MostRefusedMedication[];
}

interface ApiResponse {
  success: boolean;
  data: MedicationsDashboard;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function getAdherenceColor(rate: number): string {
  if (rate >= 80) return colors.secondary;
  if (rate >= 60) return colors.warning;
  return colors.danger;
}

function formatMonth(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function toMonthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export default function MedicationsReportScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const query = useQuery({
    queryKey: ['report-medications', year, month],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>('/reports/medications/dashboard', {
        params: { month: toMonthParam(year, month) },
      });
      return data.data;
    },
  });

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const data = query.data;

  return (
    <Screen title="Medicamentos">
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

      {query.isLoading ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Summary grid */}
          {data?.summary ? (
            <View style={styles.grid}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{data.summary.total_medications}</Text>
                <Text style={styles.statLabel}>Total Medicamentos</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.secondary }]}>
                  {data.summary.adherence_rate.toFixed(1)}%
                </Text>
                <Text style={styles.statLabel}>Taxa de Adesão</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{data.summary.total_administrations}</Text>
                <Text style={styles.statLabel}>Administrações</Text>
              </Card>
              <Card style={[styles.statCard, data.summary.medications_expiring_soon > 0 && styles.statCardWarning]}>
                <Text style={[styles.statValue, data.summary.medications_expiring_soon > 0 && { color: colors.warning }]}>
                  {data.summary.medications_expiring_soon}
                </Text>
                <Text style={styles.statLabel}>Vencendo em Breve</Text>
              </Card>
            </View>
          ) : null}

          {/* Adherence by resident */}
          {data?.adherence_by_resident && data.adherence_by_resident.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Adesão por Residente</Text>
              {data.adherence_by_resident.map((item) => (
                <Card key={item.resident_id} style={styles.residentCard}>
                  <View style={styles.residentRow}>
                    <Text style={styles.residentName} numberOfLines={1}>{item.resident_name}</Text>
                    <Text style={[styles.residentRate, { color: getAdherenceColor(item.adherence_rate) }]}>
                      {item.adherence_rate.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.min(item.adherence_rate, 100)}%`,
                          backgroundColor: getAdherenceColor(item.adherence_rate),
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.residentStats}>
                    <Text style={styles.residentStatText}>Prescritos: {item.total_prescribed}</Text>
                    <Text style={styles.residentStatText}>Admin.: {item.administered}</Text>
                    <Text style={styles.residentStatText}>Recusados: {item.refused}</Text>
                  </View>
                </Card>
              ))}
            </>
          ) : null}

          {/* Most refused medications */}
          {data?.most_refused_medications && data.most_refused_medications.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Mais Recusados</Text>
              {data.most_refused_medications.map((item) => (
                <Card key={item.medication_name} style={styles.refusedCard}>
                  <View style={styles.refusedRow}>
                    <Text style={styles.refusedName} numberOfLines={1}>{item.medication_name}</Text>
                    <View style={styles.refusedBadge}>
                      <Text style={styles.refusedBadgeText}>{item.refused_count} recusas</Text>
                    </View>
                  </View>
                  <Text style={styles.refusedRate}>Taxa de recusa: {item.refusal_rate.toFixed(1)}%</Text>
                </Card>
              ))}
            </>
          ) : null}

          {!data && !query.isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💊</Text>
              <Text style={styles.emptyTitle}>Sem dados</Text>
              <Text style={styles.emptySubtitle}>Nenhum dado encontrado para este período.</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

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
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '47.5%',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statCardWarning: {
    backgroundColor: colors.warningLight,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  residentCard: {
    gap: spacing.sm,
  },
  residentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  residentName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginRight: spacing.sm,
  },
  residentRate: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
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
  residentStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  residentStatText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  refusedCard: {
    gap: spacing.xs,
  },
  refusedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refusedName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginRight: spacing.sm,
  },
  refusedBadge: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  refusedBadgeText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    fontWeight: fontWeight.semibold,
  },
  refusedRate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
