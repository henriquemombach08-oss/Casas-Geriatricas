import { useRouter } from 'expo-router';
import { useEffect } from 'react';
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
import { useCallback, useState } from 'react';

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
    { label: 'Residentes Ativos', value: residentsCount, emoji: '👴', color: colors.primary },
    { label: 'Funcionários', value: staffCount, emoji: '🧑‍💼', color: colors.secondary },
    { label: 'Visitantes agora', value: visitorsCount, emoji: '👥', color: colors.warning },
    { label: 'Medicamentos (2h)', value: medsCount, emoji: '💊', color: colors.danger },
  ];

  const quickActions = [
    { label: '+ Residente', route: '/(tabs)/residents/new' as const, color: colors.primary },
    { label: '+ Visita', route: '/(tabs)/visitors' as const, color: colors.secondary },
    { label: '+ Funcionário', route: '/(tabs)/more/staff' as const, color: colors.warning },
  ];

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {getGreeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}!
          </Text>
          <Text style={styles.headerSub}>Visão geral da casa</Text>
        </View>

        <Text style={styles.sectionTitle}>Resumo</Text>
        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <Card key={stat.label} style={styles.statCard}>
              <Text style={styles.statEmoji}>{stat.emoji}</Text>
              <Text style={[styles.statValue, { color: stat.color }]}>
                {isLoading ? '–' : String(stat.value)}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Card>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Ações rápidas</Text>
        <View style={styles.actionsRow}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.actionBtn, { backgroundColor: action.color }]}
              onPress={() => router.push(action.route)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSub: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
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
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  actionBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
