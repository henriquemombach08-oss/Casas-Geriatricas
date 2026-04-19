import { useRouter } from 'expo-router';
import { useEffect, useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { Screen } from '@/components/Screen';
import { api } from '@/lib/api';
import { decodeTokenPayload, getToken } from '@/lib/auth';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

interface ResidentsPaginatedData {
  residents: unknown[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

interface ResidentsDashResponse {
  success: boolean;
  data: ResidentsPaginatedData;
}

interface UsersResponse {
  success: boolean;
  data: unknown[];
}

interface VisitorsResponse {
  data: unknown[];
}

interface MedsScheduledData {
  date: string;
  next_medications: unknown[];
  total: number;
  urgent_count: number;
}

interface MedsResponse {
  success: boolean;
  data: MedsScheduledData;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    getToken().then((token) => {
      if (token) {
        const payload = decodeTokenPayload(token);
        if (payload && typeof payload['name'] === 'string') {
          setUserName(payload['name']);
        }
      }
    });
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const residentsQuery = useQuery({
    queryKey: ['dashboard-residents'],
    queryFn: async () => {
      const { data } = await api.get<ResidentsDashResponse>('/residents', {
        params: { status: 'active', limit: 1 },
      });
      return data.data;
    },
    refetchInterval: 60000,
  });

  const staffQuery = useQuery({
    queryKey: ['dashboard-staff'],
    queryFn: async () => {
      const { data } = await api.get<UsersResponse>('/users', {
        params: { active: 'true' },
      });
      return data.data as unknown[];
    },
    refetchInterval: 60000,
  });

  const visitorsQuery = useQuery({
    queryKey: ['dashboard-visitors'],
    queryFn: async () => {
      const { data } = await api.get<VisitorsResponse>('/visitors', {
        params: { date: todayStr },
      });
      return data.data as unknown[];
    },
    refetchInterval: 60000,
  });

  const medsQuery = useQuery({
    queryKey: ['dashboard-meds'],
    queryFn: async () => {
      const { data } = await api.get<MedsResponse>('/medications/scheduled/next');
      return data.data;
    },
    refetchInterval: 60000,
  });

  const isLoading =
    residentsQuery.isLoading ||
    staffQuery.isLoading ||
    visitorsQuery.isLoading ||
    medsQuery.isLoading;

  const onRefresh = useCallback(() => {
    residentsQuery.refetch();
    staffQuery.refetch();
    visitorsQuery.refetch();
    medsQuery.refetch();
  }, [residentsQuery, staffQuery, visitorsQuery, medsQuery]);

  const residentsCount = residentsQuery.data?.pagination?.total ?? 0;
  const staffCount = staffQuery.data?.length ?? 0;
  const visitorsCount = visitorsQuery.data?.length ?? 0;
  const medsCount = medsQuery.data?.total ?? 0;

  const stats = [
    { label: 'Residentes', value: residentsCount, icon: '🏡', color: colors.primary, bg: colors.primaryLight },
    { label: 'Equipe', value: staffCount, icon: '🤝', color: colors.secondary, bg: colors.secondaryLight },
    { label: 'Visitas hoje', value: visitorsCount, icon: '👥', color: colors.accent, bg: colors.accentLight },
    { label: 'Medicamentos', value: medsCount, icon: '💊', color: colors.danger, bg: colors.dangerLight },
  ];

  const quickActions = [
    { label: 'Novo residente', route: '/(tabs)/residents/new' as const, color: colors.primary },
    { label: 'Registrar visita', route: '/(tabs)/visitors' as const, color: colors.secondary },
    { label: 'Novo funcionário', route: '/(tabs)/more/staff' as const, color: colors.stone600 },
  ];

  const firstName = userName ? userName.split(' ')[0] : '';

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </Text>
          <Text style={styles.headerSub}>Como está a casa hoje?</Text>
        </View>

        <Text style={styles.sectionTitle}>Visão geral</Text>
        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <Card key={stat.label} style={styles.statCard}>
              <View style={[styles.iconCircle, { backgroundColor: stat.bg }]}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
              </View>
              <Text style={[styles.statValue, { color: stat.color }]}>
                {isLoading ? '—' : String(stat.value)}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Card>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Acesso rápido</Text>
        <View style={styles.actionsCol}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.actionBtn, { borderLeftColor: action.color }]}
              onPress={() => router.push(action.route)}
              activeOpacity={0.75}
            >
              <Text style={[styles.actionBtnText, { color: action.color }]}>{action.label}</Text>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone200,
  },
  greeting: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.stone900,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: fontSize.md,
    color: colors.stone500,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.stone500,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statIcon: { fontSize: 22 },
  statValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.stone500,
    textAlign: 'center',
  },
  actionsCol: {
    gap: spacing.sm,
  },
  actionBtn: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderLeftWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.stone700,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  actionArrow: {
    fontSize: 22,
    color: colors.stone400,
    lineHeight: 24,
  },
});
