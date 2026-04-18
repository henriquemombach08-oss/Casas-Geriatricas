import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { Screen } from '@/components/Screen';
import { api } from '@/lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Resident {
  id: string;
  name: string;
}

interface CarePlanTask {
  id: string;
  title: string;
  category: string;
  frequency: string | null;
  completed: boolean;
  description: string | null;
}

interface CarePlan {
  id: string;
  title: string;
  diagnoses: string[];
  status: 'active' | 'completed' | 'archived';
  startDate: string;
  reviewDate: string | null;
  notes: string | null;
  tasks: CarePlanTask[];
  resident: { id: string; name: string };
}

const CATEGORY_ICONS: Record<string, string> = {
  medication: '💊',
  monitoring: '📊',
  therapy: '🏃',
  nutrition: '🥗',
  mobility: '🚶',
  hygiene: '🚿',
  social: '👥',
  other: '📌',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  completed: 'Concluído',
  archived: 'Arquivado',
};

const STATUS_COLOR: Record<string, string> = {
  active: colors.secondary,
  completed: colors.gray400,
  archived: colors.warning,
};

export default function CarePlansScreen() {
  const queryClient = useQueryClient();
  const [selectedResident, setSelectedResident] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const residentsQuery = useQuery({
    queryKey: ['residents-list-care'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: { residents: Resident[] } }>(
        '/residents',
        { params: { status: 'active', limit: 50 } },
      );
      return data.data.residents;
    },
  });

  const plansQuery = useQuery({
    queryKey: ['care-plans', selectedResident],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: CarePlan[] }>(
        '/care-plans',
        { params: { residentId: selectedResident } },
      );
      return data.data;
    },
    enabled: !!selectedResident,
  });

  const generateMutation = useMutation({
    mutationFn: async (residentId: string) => {
      const { data } = await api.post('/care-plans/auto-generate', { residentId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-plans', selectedResident] });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { data } = await api.put(`/care-plans/tasks/${taskId}`, { completed });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-plans', selectedResident] });
    },
  });

  const residents = residentsQuery.data ?? [];
  const plans = plansQuery.data ?? [];

  const completedTasks = (plan: CarePlan) => plan.tasks.filter((t) => t.completed).length;

  return (
    <Screen title="Planos de Cuidados">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Resident picker */}
        <Text style={styles.sectionLabel}>Selecionar Residente</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <View style={styles.chipRow}>
            {residentsQuery.isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              residents.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.chip,
                    selectedResident === r.id && styles.chipSelected,
                  ]}
                  onPress={() => setSelectedResident(r.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedResident === r.id && styles.chipTextSelected,
                    ]}
                  >
                    {r.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>

        {selectedResident ? (
          <>
            {/* Generate button */}
            <TouchableOpacity
              style={[styles.generateBtn, generateMutation.isPending && styles.generateBtnDisabled]}
              onPress={() => generateMutation.mutate(selectedResident)}
              disabled={generateMutation.isPending}
              activeOpacity={0.8}
            >
              {generateMutation.isPending ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.generateBtnText}>🤖 Gerar com IA</Text>
              )}
            </TouchableOpacity>

            {/* Plans list */}
            {plansQuery.isLoading ? (
              <Loading />
            ) : plans.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>Nenhum plano de cuidados</Text>
                <Text style={styles.emptySubtitle}>
                  Clique em "Gerar com IA" para criar automaticamente baseado nos diagnósticos.
                </Text>
              </Card>
            ) : (
              plans.map((plan) => {
                const done = completedTasks(plan);
                const total = plan.tasks.length;
                const pct = total > 0 ? (done / total) * 100 : 0;
                const isExpanded = expandedPlan === plan.id;

                return (
                  <Card key={plan.id} style={styles.planCard}>
                    <TouchableOpacity
                      onPress={() => setExpandedPlan(isExpanded ? null : plan.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.planHeader}>
                        <View style={styles.planTitleRow}>
                          <Text style={styles.planTitle} numberOfLines={2}>{plan.title}</Text>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: STATUS_COLOR[plan.status] + '20' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                { color: STATUS_COLOR[plan.status] },
                              ]}
                            >
                              {STATUS_LABEL[plan.status]}
                            </Text>
                          </View>
                        </View>

                        {plan.diagnoses.length > 0 && (
                          <View style={styles.diagnosesRow}>
                            {plan.diagnoses.slice(0, 3).map((d) => (
                              <View key={d} style={styles.diagnosisTag}>
                                <Text style={styles.diagnosisText}>{d}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        <View style={styles.progressRow}>
                          <Text style={styles.progressText}>{done}/{total} tarefas</Text>
                          <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: `${pct}%`,
                                backgroundColor:
                                  pct >= 70
                                    ? colors.secondary
                                    : pct >= 40
                                    ? colors.warning
                                    : colors.danger,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.taskList}>
                        {plan.tasks.map((task) => (
                          <TouchableOpacity
                            key={task.id}
                            style={styles.taskRow}
                            onPress={() =>
                              toggleTaskMutation.mutate({
                                taskId: task.id,
                                completed: !task.completed,
                              })
                            }
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.checkbox,
                                task.completed && styles.checkboxChecked,
                              ]}
                            >
                              {task.completed && (
                                <Text style={styles.checkmark}>✓</Text>
                              )}
                            </View>
                            <View style={styles.taskInfo}>
                              <Text
                                style={[
                                  styles.taskTitle,
                                  task.completed && styles.taskTitleDone,
                                ]}
                              >
                                {CATEGORY_ICONS[task.category] ?? '📌'} {task.title}
                              </Text>
                              {task.frequency ? (
                                <Text style={styles.taskFreq}>{task.frequency}</Text>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </Card>
                );
              })
            )}
          </>
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>👆</Text>
            <Text style={styles.emptyTitle}>Selecione um residente</Text>
            <Text style={styles.emptySubtitle}>Escolha acima para ver os planos de cuidados.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipScroll: { marginHorizontal: -spacing.lg },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: fontSize.sm, color: colors.text },
  chipTextSelected: { color: colors.white, fontWeight: fontWeight.semibold },
  generateBtn: {
    backgroundColor: colors.purple ?? colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
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
  planCard: { gap: spacing.sm },
  planHeader: { gap: spacing.sm },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  planTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  diagnosesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  diagnosisTag: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  diagnosisText: { fontSize: fontSize.xs, color: colors.textSecondary },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: { fontSize: fontSize.sm, color: colors.textSecondary },
  chevron: { fontSize: fontSize.sm, color: colors.gray400 },
  barTrack: {
    height: 6,
    backgroundColor: colors.gray200,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: radius.full },
  taskList: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  checkmark: { fontSize: 13, color: colors.white, fontWeight: fontWeight.bold },
  taskInfo: { flex: 1, gap: 2 },
  taskTitle: { fontSize: fontSize.sm, color: colors.text },
  taskTitleDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
  taskFreq: { fontSize: fontSize.xs, color: colors.textSecondary },
});
