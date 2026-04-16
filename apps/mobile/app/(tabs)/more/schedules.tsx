import { StyleSheet, FlatList, RefreshControl, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Loading';
import { api } from '@/lib/api';
import { colors, fontSize, fontWeight, spacing, radius } from '@/theme';

interface Schedule {
  id: string;
  userId?: string;
  userName?: string;
  staffName?: string;
  date: string;
  shift: string;
  notes?: string;
}

interface SchedulesResponse {
  data: Schedule[];
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

function shiftLabel(shift: string): string {
  switch (shift) {
    case 'morning': return '🌅 Manhã';
    case 'afternoon': return '🌤 Tarde';
    case 'night': return '🌙 Noite';
    default: return shift;
  }
}

function shiftColor(shift: string): string {
  switch (shift) {
    case 'morning': return colors.warning;
    case 'afternoon': return colors.primary;
    case 'night': return colors.purple;
    default: return colors.gray500;
  }
}

function getWeekDates(): string[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]!);
  }
  return dates;
}

interface DayGroup {
  date: string;
  schedules: Schedule[];
}

export default function SchedulesScreen() {
  const weekDates = getWeekDates();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const { data } = await api.get<SchedulesResponse>('/schedules', {
        params: {
          startDate: weekDates[0],
          endDate: weekDates[6],
        },
      });
      return data.data;
    },
  });

  const schedules = data ?? [];

  const grouped: DayGroup[] = weekDates.map((date) => ({
    date,
    schedules: schedules.filter((s) => s.date.startsWith(date)),
  }));

  function renderDay({ item }: { item: DayGroup }) {
    const isToday = item.date === new Date().toISOString().split('T')[0];
    return (
      <View style={styles.daySection}>
        <View style={[styles.dayHeader, isToday && styles.dayHeaderToday]}>
          <Text style={[styles.dayTitle, isToday && styles.dayTitleToday]}>
            {formatWeekday(item.date)}
          </Text>
          {isToday && <View style={styles.todayDot} />}
        </View>
        {item.schedules.length === 0 ? (
          <Text style={styles.noSchedule}>Sem escala</Text>
        ) : (
          item.schedules.map((s) => (
            <Card key={s.id} style={styles.scheduleCard}>
              <View style={styles.scheduleRow}>
                <View
                  style={[
                    styles.shiftIndicator,
                    { backgroundColor: shiftColor(s.shift) + '20' },
                  ]}
                >
                  <Text style={styles.shiftLabel}>{shiftLabel(s.shift)}</Text>
                </View>
                <View style={styles.scheduleInfo}>
                  <Text style={styles.staffName}>
                    {s.userName ?? s.staffName ?? 'Funcionário'}
                  </Text>
                  {s.notes ? (
                    <Text style={styles.scheduleNotes}>{s.notes}</Text>
                  ) : null}
                </View>
              </View>
            </Card>
          ))
        )}
      </View>
    );
  }

  if (isLoading) return <Loading />;

  return (
    <FlatList
      data={grouped}
      keyExtractor={(item) => item.date}
      renderItem={renderDay}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />
      }
      ListEmptyComponent={
        <EmptyState icon="📅" title="Sem escalas" subtitle="Nenhuma escala encontrada para esta semana." />
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  daySection: {
    marginBottom: spacing.lg,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  dayHeaderToday: {},
  dayTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  dayTitleToday: {
    color: colors.primary,
  },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  noSchedule: {
    fontSize: fontSize.sm,
    color: colors.gray400,
    paddingLeft: spacing.xs,
    paddingBottom: spacing.sm,
  },
  scheduleCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  shiftIndicator: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  shiftLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  scheduleInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  scheduleNotes: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
