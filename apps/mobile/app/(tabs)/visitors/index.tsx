import { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Loading';
import { Screen } from '@/components/Screen';
import { api } from '@/lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface Visitor {
  id: string;
  name: string;
  phone?: string | null;
  relationship?: string | null;
  visitDate: string;
  visitTimeIn?: string | null;
  visitTimeOut?: string | null;
  residentId: string;
  resident?: { id: string; name: string };
  notes?: string | null;
}

interface VisitorsResponse {
  data: Visitor[];
}

interface Resident {
  id: string;
  name: string;
}

interface ResidentsApiResponse {
  success: boolean;
  data: {
    residents: Resident[];
    pagination: { total: number; page: number; limit: number; pages: number };
  };
}

function deriveStatus(v: Visitor): 'inside' | 'checked_out' {
  return v.visitTimeOut ? 'checked_out' : 'inside';
}

type TabType = 'today' | 'inside';


function statusColor(status: 'inside' | 'checked_out'): 'green' | 'gray' {
  return status === 'inside' ? 'green' : 'gray';
}

function statusLabel(status: 'inside' | 'checked_out'): string {
  return status === 'inside' ? 'Dentro' : 'Saiu';
}

export default function VisitorsScreen() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [modalVisible, setModalVisible] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRelationship, setNewRelationship] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [noSchedule, setNoSchedule] = useState(true);
  const [showResidentPicker, setShowResidentPicker] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const todayQuery = useQuery({
    queryKey: ['visitors-today'],
    queryFn: async () => {
      const { data } = await api.get<VisitorsResponse>('/visitors', {
        params: { date: todayStr },
      });
      return data.data;
    },
    refetchInterval: 30000,
  });

  const residentsQuery = useQuery({
    queryKey: ['residents-active'],
    queryFn: async () => {
      const { data } = await api.get<ResidentsApiResponse>('/residents', {
        params: { status: 'active', limit: 100 },
      });
      return data.data.residents;
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (id: string) => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      await api.post(`/visitors/${id}/checkout`, { visitTimeOut: `${hh}:${mm}` });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitors-today'] });
      qc.invalidateQueries({ queryKey: ['visitors-inside'] });
      qc.invalidateQueries({ queryKey: ['dashboard-visitors'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      Alert.alert('Ops', error?.response?.data?.message ?? 'Não foi possível registrar a saída agora. Tente de novo.');
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      await api.post('/visitors', {
        name: newName.trim(),
        phone: newPhone.trim() || undefined,
        relationship: newRelationship.trim() || undefined,
        residentId: selectedResidentId,
        notes: newNotes.trim() || undefined,
        visitDate: now.toISOString().split('T')[0],
        visitTimeIn: noSchedule ? undefined : `${hh}:${mm}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitors-today'] });
      qc.invalidateQueries({ queryKey: ['visitors-inside'] });
      qc.invalidateQueries({ queryKey: ['dashboard-visitors'] });
      setModalVisible(false);
      resetForm();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      Alert.alert('Ops, algo deu errado', error?.response?.data?.message ?? 'Não foi possível registrar a visita. Verifique os dados e tente de novo.');
    },
  });

  function resetForm() {
    setNewName('');
    setNewPhone('');
    setNewRelationship('');
    setNewNotes('');
    setSelectedResidentId('');
    setNoSchedule(true);
  }

  function handleSubmit() {
    if (!newName.trim()) {
      Alert.alert('Faltou uma coisa', 'Informe o nome de quem está visitando.');
      return;
    }
    createMutation.mutate();
  }

  const allToday = todayQuery.data ?? [];
  const currentData =
    activeTab === 'inside'
      ? allToday.filter((v) => !v.visitTimeOut)
      : allToday;
  const isLoading = todayQuery.isLoading;
  const isRefetching = todayQuery.isRefetching;
  const refetch = todayQuery.refetch;

  const selectedResident = residentsQuery.data?.find((r) => r.id === selectedResidentId);

  function renderItem({ item }: { item: Visitor }) {
    const status = deriveStatus(item);
    return (
      <Card style={styles.item}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.visitorName}>{item.name}</Text>
            {item.resident?.name ? (
              <Text style={styles.residentName}>👴 {item.resident.name}</Text>
            ) : null}
          </View>
          <Badge label={statusLabel(status)} color={statusColor(status)} />
        </View>
        <View style={styles.itemFooter}>
          <Text style={styles.detail}>
            {item.relationship ? `${item.relationship} • ` : ''}
            {item.visitTimeIn ? `Entrada: ${item.visitTimeIn}` : 'Sem horário'}
          </Text>
          {status === 'inside' && (
            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={() =>
                Alert.alert('Check-out', `Confirmar saída de ${item.name}?`, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Confirmar', onPress: () => checkoutMutation.mutate(item.id) },
                ])
              }
            >
              <Text style={styles.checkoutBtnText}>Check-out</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  }

  const residents = residentsQuery.data ?? [];

  return (
    <Screen title="Visitas">
      <View style={styles.tabBar}>
        {([
          { key: 'today', label: 'Hoje' },
          { key: 'inside', label: 'Dentro agora' },
        ] as { key: TabType; label: string }[]).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={
            currentData.length === 0 ? styles.emptyContainer : styles.list
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
              icon="👥"
              title="Nenhuma visita"
              subtitle={
                activeTab === 'inside'
                  ? 'Nenhum visitante dentro agora.'
                  : 'Sem visitas registradas hoje.'
              }
            />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Visitor Modal */}
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
            <Text style={styles.modalTitle}>Nova Visita</Text>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Resident Picker */}
              <Text style={styles.fieldLabel}>Residente</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowResidentPicker((v) => !v)}
              >
                <Text style={selectedResidentId ? styles.pickerValue : styles.pickerPlaceholder}>
                  {selectedResident?.name ?? 'Selecionar residente...'}
                </Text>
                <Text>{showResidentPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showResidentPicker && (
                <View style={styles.pickerList}>
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedResidentId('');
                      setShowResidentPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>Nenhum</Text>
                  </TouchableOpacity>
                  {residents.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[
                        styles.pickerItem,
                        selectedResidentId === r.id && styles.pickerItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedResidentId(r.id);
                        setShowResidentPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedResidentId === r.id && styles.pickerItemTextSelected,
                        ]}
                      >
                        {r.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.fieldLabel}>Nome do visitante *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Nome completo"
                placeholderTextColor={colors.gray400}
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={styles.fieldLabel}>Telefone</Text>
              <TextInput
                style={styles.textInput}
                placeholder="(00) 00000-0000"
                placeholderTextColor={colors.gray400}
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
              />

              <Text style={styles.fieldLabel}>Parentesco / Relação</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex.: Filho, Amigo..."
                placeholderTextColor={colors.gray400}
                value={newRelationship}
                onChangeText={setNewRelationship}
              />

              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Sem horário agendado</Text>
                <Switch
                  value={noSchedule}
                  onValueChange={setNoSchedule}
                  trackColor={{ true: colors.primary }}
                />
              </View>

              <Text style={styles.fieldLabel}>Observações</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Opcional..."
                placeholderTextColor={colors.gray400}
                value={newNotes}
                onChangeText={setNewNotes}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, createMutation.isPending && styles.btnDisabled]}
                  onPress={handleSubmit}
                  disabled={createMutation.isPending}
                >
                  <Text style={styles.confirmBtnText}>
                    {createMutation.isPending ? 'Salvando...' : 'Registrar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  list: {
    padding: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
  },
  item: {
    gap: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  visitorName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  residentName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  checkoutBtn: {
    backgroundColor: colors.secondaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  checkoutBtnText: {
    color: colors.secondaryDark,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xxl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  fabText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: fontWeight.regular,
    lineHeight: 32,
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
    maxHeight: '90%',
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
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerTrigger: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  pickerValue: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  pickerPlaceholder: {
    fontSize: fontSize.md,
    color: colors.gray400,
  },
  pickerList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    maxHeight: 180,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  pickerItemText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  pickerItemTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
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
