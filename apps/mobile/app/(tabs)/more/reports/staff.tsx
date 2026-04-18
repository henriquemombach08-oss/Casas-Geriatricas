import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { Screen } from '@/components/Screen';
import { api } from '@/lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface StaffPerformance {
  user_id: string;
  user_name: string;
  user_role: string;
  scheduled_count: number;
  no_show_count: number;
  punctuality_rate: number;
}

interface StaffDashboard {
  summary: {
    total_staff: number;
    total_scheduled: number;
    total_confirmed: number;
    total_no_show: number;
    absence_rate: number;
  };
  staff_performance: StaffPerformance[];
}

interface ApiResponse {
  success: boolean;
  data: StaffDashboard;
}

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

function getPunctualityColor(rate: number): string {
  if (rate >= 80) return colors.secondary;
  if (rate >= 60) return colors.warning;
  return colors.danger;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  nurse: 'Enfermeiro(a)',
  caregiver: 'Cuidador(a)',
  cook: 'Cozinheiro(a)',
  other: 'Outro',
};

export default function StaffReportScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const query = useQuery({
    queryKey: ['report-staff', year, month],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>('/reports/staff/dashboard', {
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
    <Screen title="Pessoal">
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
          {data?.summary ? (
            <>
              <Text style={styles.sectionTitle}>Resumo</Text>
              <View style={styles.grid}>
                <Card style={styles.statCard}>
                  <Text style={styles.statValue}>{data.summary.total_staff}</Text>
                  <Text style={styles.statLabel}>Funcionários</Text>
                </Card>
                <Card style={styles.statCard}>
                  <Text style={styles.statValue}>{data.summary.total_scheduled}</Text>
                  <Text style={styles.statLabel}>Escalas</Text>
                </Card>
                <Card style={[styles.statCard, { backgroundColor: colors.secondaryLight }]}>
                  <Text style={[styles.statValue, { color: colors.secondary }]}>
                    {data.summary.total_confirmed}
                  </Text>
                  <Text style={styles.statLabel}>Confirmadas</Text>
                </Card>
                <Card style={[styles.statCard, data.summary.total_no_show > 0 && { backgroundColor: colors.dangerLight }]}>
                  <Text style={[styles.statValue, data.summary.total_no_show > 0 && { color: colors.danger }]}>
                    {data.summary.total_no_show}
                  </Text>
                  <Text style={styles.statLabel}>Faltas</Text>
                </Card>
              </View>

              <Card style={styles.absenceCard}>
                <Text style={styles.absenceLabel}>Taxa de Absenteísmo</Text>
                <View style={styles.absenceRow}>
                  <Text style={[styles.absenceValue, { color: data.summary.absence_rate <= 10 ? colors.secondary : colors.danger }]}>
                    {data.summary.absence_rate.toFixed(1)}%
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.min(data.summary.absence_rate, 100)}%`,
                          backgroundColor: data.summary.absence_rate <= 10 ? colors.secondary : colors.danger,
                        },
                      ]}
                    />
                  </View>
                </View>
              </Card>
            </>
          ) : null}

          {/* Staff performance */}
          {data?.staff_performance && data.staff_performance.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Desempenho Individual</Text>
              {data.staff_performance.map((item) => (
                <Card key={item.user_id} style={styles.performanceCard}>
                  <View style={styles.performanceHeader}>
                    <View style={styles.performanceInfo}>
                      <Text style={styles.performanceName} numberOfLines={1}>{item.user_name}</Text>
                      <Text style={styles.performanceRole}>
                        {ROLE_LABELS[item.user_role] ?? item.user_role}
                      </Text>
                    </View>
                    <Text style={[styles.punctualityRate, { color: getPunctualityColor(item.punctuality_rate) }]}>
                      {item.punctuality_rate.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.min(item.punctuality_rate, 100)}%`,
                          backgroundColor: getPunctualityColor(item.punctuality_rate),
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.performanceStats}>
                    <Text style={styles.performanceStatText}>Escalas: {item.scheduled_count}</Text>
                    <Text style={styles.performanceStatText}>Faltas: {item.no_show_count}</Text>
                    <Text style={styles.performanceStatText}>Pontualidade: {item.punctuality_rate.toFixed(0)}%</Text>
                  </View>
                </Card>
              ))}
            </>
          ) : null}

          {!data && !query.isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Sem dados</Text>
              <Text style={styles.emptySubtitle}>Nenhum dado de pessoal encontrado para este período.</Text>
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
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
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
  absenceCard: {
    gap: spacing.sm,
  },
  absenceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  absenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  absenceValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    minWidth: 60,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.gray200,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: radius.full,
  },
  performanceCard: {
    gap: spacing.sm,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  performanceInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  performanceName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  performanceRole: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  punctualityRate: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  performanceStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  performanceStatText: {
    fontSize: fontSize.xs,
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
