import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Vibration,
  StyleSheet,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

type LogStatus =
  | 'administered'
  | 'refused'
  | 'missed'
  | 'delayed'
  | 'partially_administered'
  | 'not_available';

interface MedItem {
  id: string;
  medication_id: string;
  resident_id: string;
  resident_name: string;
  resident_photo: string | null;
  medication_name: string;
  dosage: string | null;
  measurement_unit: string | null;
  scheduled_time: string;
  minutes_until: number;
  special_instructions: string | null;
  interaction_warnings: string | null;
  is_overdue: boolean;
}

interface ScheduleResponse {
  date: string;
  next_medications: MedItem[];
  total: number;
  urgent_count: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const API_BASE = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001/api';

async function fetchSchedule(): Promise<ScheduleResponse> {
  const res = await fetch(`${API_BASE}/medications/scheduled/next?upcoming_in_minutes=1440`, {
    credentials: 'include',
  });
  const json = await res.json() as { data: ScheduleResponse };
  return json.data;
}

async function registerLog(
  medicationId: string,
  data: {
    scheduledTime?: string;
    status: LogStatus;
    administeredAt?: string;
    reasonIfNotGiven?: string;
    notes?: string;
  },
): Promise<void> {
  await fetch(`${API_BASE}/medications/${medicationId}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
}

// ─── Administration Modal ─────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: LogStatus; label: string }> = [
  { value: 'administered', label: '✓ Administrado' },
  { value: 'refused', label: '✕ Recusado' },
  { value: 'missed', label: '⊘ Omitido' },
  { value: 'delayed', label: '⏱ Atrasado' },
  { value: 'partially_administered', label: '◐ Parcialmente' },
  { value: 'not_available', label: '🚫 Indisponível' },
];

interface AdministrationModalProps {
  medication: MedItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

function AdministrationModal({ medication, onClose, onSuccess }: AdministrationModalProps) {
  const [status, setStatus] = useState<LogStatus>('administered');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const qc = useQueryClient();

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () =>
      registerLog(medication!.medication_id, {
        scheduledTime: medication!.scheduled_time,
        status,
        administeredAt:
          status === 'administered' || status === 'partially_administered'
            ? new Date().toISOString()
            : undefined,
        reasonIfNotGiven: status !== 'administered' ? reason : undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['med-schedule'] });
      onSuccess();
      onClose();
    },
    onError: (err) =>
      Alert.alert('Erro', (err as Error).message),
  });

  const handleConfirm = () => {
    if (status !== 'administered' && !reason.trim()) {
      Alert.alert('Atenção', 'Informe o motivo.');
      return;
    }
    submit();
  };

  if (!medication) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>Registrar Medicamento</Text>

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoName}>{medication.resident_name}</Text>
            <Text style={styles.infoMed}>{medication.medication_name}</Text>
            {medication.dosage && (
              <Text style={styles.infoMed}>
                {medication.dosage} {medication.measurement_unit ?? ''}
              </Text>
            )}
            <Text style={styles.infoTime}>
              Horário: {medication.scheduled_time}
              {medication.is_overdue && (
                <Text style={styles.overdueText}>
                  {' '}(ATRASADO {Math.abs(medication.minutes_until)}min)
                </Text>
              )}
            </Text>
            {medication.special_instructions ? (
              <Text style={styles.warningText}>
                ⚠️ {medication.special_instructions}
              </Text>
            ) : null}
            {medication.interaction_warnings ? (
              <Text style={styles.dangerText}>
                ⚠️ Interação: {medication.interaction_warnings}
              </Text>
            ) : null}
          </View>

          {/* Status selection */}
          <Text style={styles.label}>Status *</Text>
          {STATUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setStatus(opt.value)}
              style={[
                styles.statusOption,
                status === opt.value && styles.statusOptionSelected,
              ]}
            >
              <Text
                style={[
                  styles.statusOptionText,
                  status === opt.value && styles.statusOptionTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Reason */}
          {status !== 'administered' && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Motivo *</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Ex: Residente recusou, sem estoque..."
                multiline
                numberOfLines={3}
                style={styles.textArea}
              />
            </View>
          )}

          {/* Notes */}
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>Observações (opcional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Ex: Tomou com água, reagiu bem..."
              multiline
              numberOfLines={2}
              style={styles.textArea}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.btnCancel}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isPending}
              style={[styles.btnConfirm, isPending && { opacity: 0.5 }]}
            >
              <Text style={styles.btnConfirmText}>
                {isPending ? 'Salvando...' : 'Confirmar'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Medication Card ──────────────────────────────────────────────────────────

interface CardProps {
  item: MedItem;
  onPress: () => void;
}

function MedCard({ item, onPress }: CardProps) {
  const isOverdue = item.is_overdue;
  const isSoon = !isOverdue && item.minutes_until <= 15;

  const cardBg = isOverdue ? '#FEE2E2' : isSoon ? '#FEF3C7' : '#F0FDF4';
  const borderColor = isOverdue ? '#EF4444' : isSoon ? '#F59E0B' : '#22C55E';
  const badgeBg = isOverdue ? '#DC2626' : isSoon ? '#D97706' : '#16A34A';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: cardBg, borderColor }]}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardResident}>{item.resident_name}</Text>
          <Text style={styles.cardMed}>{item.medication_name}</Text>
          {item.dosage && (
            <Text style={styles.cardDose}>
              {item.dosage} {item.measurement_unit ?? ''}
            </Text>
          )}
          <Text style={styles.cardTime}>Horário: {item.scheduled_time}</Text>
          {item.special_instructions ? (
            <Text style={styles.cardWarning}>⚠️ {item.special_instructions}</Text>
          ) : null}
        </View>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={styles.badgeText}>
            {isOverdue
              ? `+${Math.abs(item.minutes_until)}m`
              : `${item.minutes_until}m`}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={onPress} style={styles.adminBtn}>
        <Text style={styles.adminBtnText}>Registrar administração</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MedicationScheduleScreen() {
  const [selectedMed, setSelectedMed] = useState<MedItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'upcoming'>('all');
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['med-schedule'],
    queryFn: fetchSchedule,
    refetchInterval: 30_000,
    staleTime: 0,
  });

  // Vibrate on overdue medications
  useEffect(() => {
    if ((data?.urgent_count ?? 0) > 0) {
      Vibration.vibrate([300, 200, 300]);
    }
  }, [data?.urgent_count]);

  const allMeds = data?.next_medications ?? [];
  const filtered =
    filter === 'overdue'
      ? allMeds.filter((m) => m.is_overdue)
      : filter === 'upcoming'
        ? allMeds.filter((m) => !m.is_overdue && m.minutes_until <= 30)
        : allMeds;

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <View style={styles.container}>
      {/* Urgent banner */}
      {(data?.urgent_count ?? 0) > 0 && (
        <TouchableOpacity
          style={styles.urgentBanner}
          onPress={() => setFilter('overdue')}
        >
          <Text style={styles.urgentText}>
            ⚠️ {data?.urgent_count} medicamento{data!.urgent_count !== 1 ? 's' : ''} ATRASADO{data!.urgent_count !== 1 ? 'S' : ''}
          </Text>
          <Text style={styles.urgentSub}>Toque para ver</Text>
        </TouchableOpacity>
      )}

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['all', 'overdue', 'upcoming'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f === 'all' ? 'Todos' : f === 'overdue' ? 'Atrasados' : 'Próximos 30m'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <MedCard item={item} onPress={() => setSelectedMed(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyText}>
              {filter === 'overdue'
                ? 'Nenhum medicamento atrasado'
                : 'Nenhum medicamento pendente'}
            </Text>
          </View>
        }
      />

      <AdministrationModal
        medication={selectedMed}
        onClose={() => setSelectedMed(null)}
        onSuccess={() => void qc.invalidateQueries({ queryKey: ['med-schedule'] })}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  urgentBanner: {
    backgroundColor: '#DC2626',
    padding: 16,
    alignItems: 'center',
  },
  urgentText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  urgentSub: { color: '#FEE2E2', fontSize: 12, marginTop: 2 },
  filterRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: { backgroundColor: '#2563EB' },
  filterTabText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  filterTabTextActive: { color: '#FFF' },
  list: { padding: 12, gap: 12 },
  card: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FFF',
  },
  cardHeader: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  cardResident: { fontWeight: 'bold', fontSize: 16, color: '#111827' },
  cardMed: { fontSize: 14, color: '#374151', marginTop: 2 },
  cardDose: { fontSize: 13, color: '#6B7280', marginTop: 1 },
  cardTime: { fontSize: 13, fontWeight: '600', color: '#1D4ED8', marginTop: 4 },
  cardWarning: { fontSize: 12, color: '#B45309', marginTop: 4 },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    minWidth: 50,
    alignItems: 'center',
  },
  badgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  adminBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  adminBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  emptyState: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12, color: '#22C55E' },
  emptyText: { fontSize: 16, color: '#6B7280', textAlign: 'center' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  infoName: { fontWeight: 'bold', fontSize: 16, color: '#111827' },
  infoMed: { fontSize: 14, color: '#374151', marginTop: 2 },
  infoTime: { fontSize: 14, fontWeight: '600', color: '#1D4ED8', marginTop: 6 },
  overdueText: { color: '#DC2626' },
  warningText: { fontSize: 12, color: '#B45309', marginTop: 4 },
  dangerText: { fontSize: 12, color: '#DC2626', marginTop: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  statusOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 6,
  },
  statusOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  statusOptionText: { fontSize: 14, color: '#374151' },
  statusOptionTextSelected: { color: '#1D4ED8', fontWeight: '600' },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 70,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingBottom: 20,
  },
  btnCancel: {
    flex: 1,
    padding: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCancelText: { fontWeight: '600', color: '#374151' },
  btnConfirm: {
    flex: 1,
    padding: 14,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
  },
  btnConfirmText: { fontWeight: '700', color: '#FFF', fontSize: 15 },
});
