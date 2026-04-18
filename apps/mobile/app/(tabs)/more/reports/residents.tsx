import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { Screen } from '@/components/Screen';
import { api } from '@/lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface ResidentsDashboard {
  summary: {
    total_residents: number;
    active_residents: number;
    inactive_residents: number;
    average_age: number;
    admitted_this_month: number;
    documents_status: {
      valid: number;
      expiring_soon: number;
      expired: number;
    };
  };
}

interface ApiResponse {
  success: boolean;
  data: ResidentsDashboard;
}

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  bgColor?: string;
}

function StatCard({ label, value, color, bgColor }: StatCardProps) {
  return (
    <Card style={[styles.statCard, bgColor ? { backgroundColor: bgColor } : undefined]}>
      <Text style={[styles.statValue, color ? { color } : undefined]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

export default function ResidentsReportScreen() {
  const query = useQuery({
    queryKey: ['report-residents'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>('/reports/residents/dashboard');
      return data.data;
    },
  });

  const data = query.data;

  return (
    <Screen title="Residentes">
      {query.isLoading ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {data?.summary ? (
            <>
              <Text style={styles.sectionTitle}>Visão Geral</Text>
              <View style={styles.grid}>
                <StatCard label="Total de Residentes" value={data.summary.total_residents} />
                <StatCard
                  label="Ativos"
                  value={data.summary.active_residents}
                  color={colors.secondary}
                  bgColor={colors.secondaryLight}
                />
                <StatCard
                  label="Inativos"
                  value={data.summary.inactive_residents}
                  color={colors.textSecondary}
                />
                <StatCard
                  label="Idade Média"
                  value={`${data.summary.average_age.toFixed(0)} anos`}
                  color={colors.primary}
                />
                <StatCard
                  label="Admitidos este Mês"
                  value={data.summary.admitted_this_month}
                  color={colors.purple}
                  bgColor={colors.purpleLight}
                />
              </View>

              {data.summary.documents_status ? (
                <>
                  <Text style={styles.sectionTitle}>Documentos</Text>
                  <Card style={styles.documentsCard}>
                    <View style={styles.docRow}>
                      <View style={styles.docItem}>
                        <View style={[styles.docDot, { backgroundColor: colors.secondary }]} />
                        <Text style={styles.docLabel}>Válidos</Text>
                        <Text style={[styles.docValue, { color: colors.secondary }]}>
                          {data.summary.documents_status.valid}
                        </Text>
                      </View>
                      <View style={styles.docItem}>
                        <View style={[styles.docDot, { backgroundColor: colors.warning }]} />
                        <Text style={styles.docLabel}>Vencendo</Text>
                        <Text style={[styles.docValue, { color: colors.warning }]}>
                          {data.summary.documents_status.expiring_soon}
                        </Text>
                      </View>
                      <View style={styles.docItem}>
                        <View style={[styles.docDot, { backgroundColor: colors.danger }]} />
                        <Text style={styles.docLabel}>Vencidos</Text>
                        <Text style={[styles.docValue, { color: colors.danger }]}>
                          {data.summary.documents_status.expired}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </>
              ) : null}
            </>
          ) : null}

          {!data && !query.isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👴</Text>
              <Text style={styles.emptyTitle}>Sem dados</Text>
              <Text style={styles.emptySubtitle}>Nenhum dado de residentes encontrado.</Text>
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
  documentsCard: {
    gap: spacing.sm,
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  docItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  docDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
  },
  docLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  docValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
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
