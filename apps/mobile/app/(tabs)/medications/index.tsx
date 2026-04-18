import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Loading';
import { PinModal } from '@/components/PinModal';
import { Screen } from '@/components/Screen';
import { api } from '@/lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface ScheduledMedication {
  id: string;
  medication_name: string;
  dosage: string | null;
  measurement_unit: string | null;
  scheduled_time: string;
  resident_name: string;
  is_overdue: boolean;
  already_administered: boolean;
  minutes_until: number;
}

interface MedsApiResponse {
  success: boolean;
  data: {
    date: string;
    next_medications: ScheduledMedication[];
    total: number;
    urgent_count: number;
  };
}

type FilterTab = 'all' | 'overdue' | 'upcoming';

const STATUS_OPTIONS = [
  { value: 'administered', label: 'Administrado' },
  { value: 'refused', label: 'Recusado' },
  { value: 'missed', label: 'Não tomado' },
  { value: 'delayed', label: 'Atrasado' },
  { value: 'partially_administered', label: 'Parcialmente administrado' },
  { value: 'not_available', label: 'Não disponível' },
];

/** scheduled_time is "HH:MM" — compute diff in ms vs now */
function getTimeDiff(scheduledTime: string): number {
  const [hh, mm] = scheduledTime.split(':').map(Number);
  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(hh ?? 0, mm ?? 0, 0, 0);
  return scheduled.getTime() - now.getTime();
}

function formatTime(scheduledTime: string): string {
  return scheduledTime; // already "HH:MM"
}

function getTimeBadge(diff: number): { label: string; color: 'red' | 'yellow' | 'green' } {
  if (diff < 0) {
    const mins = Math.abs(Math.floor(diff / 60000));
    return { label: `Atrasado ${mins}min`, color: 'red' };
  }
  const mins = Math.floor(diff / 60000);
  if (mins < 30) return { label: `${mins}min`, color: 'yellow' };
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (hours > 0) return { label: `${hours}h${remaining > 0 ? ` ${remaining}min` : ''}`, color: 'green' };
  return { label: `${mins}min`, color: 'green' };
}

export default function MedicationsScreen() {
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedMed, setSelectedMed] = useState<ScheduledMedication | null>(null);
  const [logStatus, setLogStatus] = useState('administered');
  const [logNotes, setLogNotes] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['medications-scheduled'],
    queryFn: async () => {
      const { data } = await api.get<MedsApiResponse>('/medications/scheduled/next');
      return data.data.next_medications;
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const meds = data ?? [];
    const hasOverdue = meds.some((m) => m.is_overdue);
    if (hasOverdue) {
      Vibration.vibrate([0, 300, 200, 300]);
    }
  }, [data]);

  const logMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
      pin,
    }: {
      id: string;
      status: string;
      notes: string;
      pin: string;
    }) => {
      await api.post(`/medications/${id}/logs`, { status, notes }, { headers: { 'x-pin': pin } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medications-scheduled'] });
      setModalVisible(false);
      setSelectedMed(null);
      setLogNotes('');
      setLogStatus('administered');
      Alert.alert('Sucesso', 'Administração registrada.');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      Alert.alert('Erro', error?.response?.data?.message ?? 'Erro ao registrar.');
    },
  });

  const meds = data ?? [];

  const filteredMeds = meds.filter((m) => {
    if (activeFilter === 'overdue') return m.is_overdue;
    if (activeFilter === 'upcoming') return !m.is_overdue;
    return true;
  });

  const openModal = useCallback((med: ScheduledMedication) => {
    setSelectedMed(med);
    setLogStatus('administered');
    setLogNotes('');
    setModalVisible(true);
  }, []);

  function renderMed({ item }: { item: ScheduledMedication }) {
    const diff = getTimeDiff(item.scheduled_time);
    const timeBadge = getTimeBadge(diff);

    return (
      <TouchableOpacity onPress={() => openModal(item)} activeOpacity={0.75}>
        <Card style={styles.medCard}>
          <View style={styles.medHeader}>
            <Text style={styles.medName}>{item.medication_name}</Text>
            <Badge label={timeBadge.label} color={timeBadge.color} />
          </View>
          <Text style={styles.medResident}>👴 {item.resident_name}</Text>
          <View style={styles.medFooter}>
            <Text style={styles.medDosage}>
              {item.dosage} {item.measurement_unit}
            </Text>
            <Text style={styles.medTime}>🕐 {formatTime(item.scheduled_time)}</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'overdue', label: 'Atrasados' },
    { key: 'upcoming', label: 'Próximos' },
  ];

  return (
    <Screen title="Medicamentos">
      <View style={styles.filterBar}>
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, activeFilter === tab.key && styles.filterTabActive]}
            onPress={() => setActiveFilter(tab.key)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === tab.key && styles.filterTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={filteredMeds}
          keyExtractor={(item) => item.id}
          renderItem={renderMed}
          contentContainerStyle={
            filteredMeds.length === 0 ? styles.emptyContainer : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <EmptyState
              icon="💊"
              title="Nenhum medicamento"
              subtitle="Não há medicamentos agendados para as próximas horas."
            />
          }
        />
      )}

      {/* Log Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalSheet}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Registrar Administração</Text>
            {selectedMed && (
              <Text style={styles.modalSubtitle}>
                {selectedMed.medication_name} — {selectedMed.resident_name}
              </Text>
            )}

            <Text style={styles.inputLabel}>Status</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statusScroll}
            >
              {STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.statusOption,
                    logStatus === opt.value && styles.statusOptionSelected,
                  ]}
                  onPress={() => setLogStatus(opt.value)}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      logStatus === opt.value && styles.statusOptionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Observações</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Opcional..."
              placeholderTextColor={colors.gray400}
              value={logNotes}
              onChangeText={setLogNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, logMutation.isPending && styles.btnDisabled]}
                onPress={() => setPinVisible(true)}
                disabled={logMutation.isPending}
              >
                <Text style={styles.confirmBtnText}>
                  {logMutation.isPending ? 'Salvando...' : 'Confirmar'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <PinModal
        visible={pinVisible}
        title="Confirmar administração"
        description="Digite seu PIN para registrar a administração do medicamento."
        onSuccess={(pin) => {
          setPinVisible(false);
          if (selectedMed) {
            logMutation.mutate({ id: selectedMed.id, status: logStatus, notes: logNotes, pin });
          }
        }}
        onCancel={() => setPinVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterTab: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: colors.primary,
  },
  filterTabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  list: {
    padding: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
  },
  medCard: {
    gap: spacing.sm,
  },
  medHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  medResident: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  medFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  medDosage: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  medTime: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  statusScroll: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  statusOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  statusOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  statusOptionText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  statusOptionTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
