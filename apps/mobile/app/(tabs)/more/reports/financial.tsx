import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { Screen } from '@/components/Screen';
import { api } from '@/lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface TopDebtor {
  resident_name: string;
  amount_due: number;
  days_overdue: number;
}

interface CashFlowTrend {
  month: string;
  revenue: number;
  expenses: number;
}

interface FinancialDashboard {
  summary: {
    actual_revenue: number;
    expected_revenue: number;
    pending_amount: number;
    overdue_amount: number;
    revenue_rate: number;
  };
  top_debtors: TopDebtor[];
  cash_flow: {
    this_month: number;
    last_month: number;
    difference: number;
    trend: 'up' | 'down';
    chart_data: CashFlowTrend[];
  };
}

interface ApiResponse {
  success: boolean;
  data: FinancialDashboard;
}

function formatCurrency(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FinancialReportScreen() {
  const query = useQuery({
    queryKey: ['report-financial'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>('/reports/financial/dashboard');
      return data.data;
    },
  });

  const data = query.data;

  return (
    <Screen title="Financeiro">
      {query.isLoading ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {data?.summary ? (
            <>
              <Text style={styles.sectionTitle}>Resumo</Text>

              <Card style={styles.revenueCard}>
                <Text style={styles.revenueLabel}>Receita Realizada</Text>
                <Text style={[styles.revenueValue, { color: colors.secondary }]}>
                  {formatCurrency(data.summary.actual_revenue)}
                </Text>
              </Card>

              <View style={styles.row}>
                <Card style={[styles.halfCard, styles.pendingCard]}>
                  <Text style={styles.halfLabel}>Pendente</Text>
                  <Text style={[styles.halfValue, { color: colors.warning }]}>
                    {formatCurrency(data.summary.pending_amount)}
                  </Text>
                </Card>
                <Card style={[styles.halfCard, styles.overdueCard]}>
                  <Text style={styles.halfLabel}>Inadimplente</Text>
                  <Text style={[styles.halfValue, { color: colors.danger }]}>
                    {formatCurrency(data.summary.overdue_amount)}
                  </Text>
                </Card>
              </View>

              <Card style={styles.collectionCard}>
                <Text style={styles.collectionLabel}>Taxa de Cobrança</Text>
                <View style={styles.collectionRow}>
                  <Text style={[styles.collectionValue, { color: (data.summary.revenue_rate ?? 0) >= 80 ? colors.secondary : colors.warning }]}>
                    {(data.summary.revenue_rate ?? 0).toFixed(1)}%
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.min(data.summary.revenue_rate ?? 0, 100)}%`,
                          backgroundColor: (data.summary.revenue_rate ?? 0) >= 80 ? colors.secondary : colors.warning,
                        },
                      ]}
                    />
                  </View>
                </View>
              </Card>
            </>
          ) : null}

          {/* Top debtors */}
          {data?.top_debtors && data.top_debtors.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Maiores Inadimplentes</Text>
              {data.top_debtors.map((item, index) => (
                <Card key={`${item.resident_name}-${index}`} style={styles.debtorCard}>
                  <View style={styles.debtorRow}>
                    <View style={styles.debtorInfo}>
                      <Text style={styles.debtorName} numberOfLines={1}>{item.resident_name}</Text>
                      <Text style={styles.debtorDays}>{item.days_overdue} dias em atraso</Text>
                    </View>
                    <Text style={styles.debtorAmount}>{formatCurrency(item.amount_due)}</Text>
                  </View>
                </Card>
              ))}
            </>
          ) : null}

          {!data && !query.isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={styles.emptyTitle}>Sem dados</Text>
              <Text style={styles.emptySubtitle}>Nenhum dado financeiro encontrado.</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  revenueCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.secondaryLight,
  },
  revenueLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  revenueValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  halfLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  halfValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  expenseCard: {},
  positiveCard: {
    backgroundColor: colors.secondaryLight,
  },
  negativeCard: {
    backgroundColor: colors.dangerLight,
  },
  pendingCard: {
    backgroundColor: colors.warningLight,
  },
  overdueCard: {
    backgroundColor: colors.dangerLight,
  },
  collectionCard: {
    gap: spacing.sm,
  },
  collectionLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  collectionValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    minWidth: 60,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.gray200,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: radius.full,
  },
  debtorCard: {},
  debtorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  debtorInfo: {
    flex: 1,
  },
  debtorName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  debtorDays: {
    fontSize: fontSize.sm,
    color: colors.danger,
    marginTop: 2,
  },
  debtorAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.danger,
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
