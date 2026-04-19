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
import { api } from '@/lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface FinancialRecord {
  id: string;
  residentId: string;
  description: string;
  amount: number | string;
  dueDate?: string | null;
  status: string;
  category?: string | null;
  type: 'charge' | 'payment';
}

interface FinancialApiResponse {
  success: boolean;
  data: {
    resident: { id: string; name: string };
    records: FinancialRecord[];
    summary: {
      total_charges: number;
      total_paid: number;
      total_pending: number;
      total_overdue: number;
    };
  };
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

type TabType = 'charges' | 'payments';

const CATEGORIES = [
  { value: 'monthly_fee', label: 'Mensalidade' },
  { value: 'medicine', label: 'Medicamento' },
  { value: 'supplies', label: 'Suprimentos' },
  { value: 'extra_service', label: 'Serviço extra' },
  { value: 'other', label: 'Outro' },
];

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dt: string): string {
  return new Date(dt).toLocaleDateString('pt-BR');
}

function statusColor(status: string): 'yellow' | 'green' | 'red' | 'gray' {
  switch (status) {
    case 'pending': return 'yellow';
    case 'paid': return 'green';
    case 'overdue': return 'red';
    default: return 'gray';
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pendente',
    paid: 'Pago',
    overdue: 'Vencido',
    cancelled: 'Cancelado',
  };
  return map[status] ?? status;
}

export default function FinancialScreen() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('charges');
  const [modalVisible, setModalVisible] = useState(false);

  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('monthly_fee');
  const [showResidentPicker, setShowResidentPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [filterResidentId, setFilterResidentId] = useState('');
  const [showFilterPicker, setShowFilterPicker] = useState(false);

  const financialQuery = useQuery({
    queryKey: ['financial', filterResidentId],
    queryFn: async () => {
      if (!filterResidentId) return null;
      const { data } = await api.get<FinancialApiResponse>(`/financial/resident/${filterResidentId}`);
      return data.data;
    },
    enabled: !!filterResidentId,
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

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/financial', {
        resident_id: selectedResidentId,
        type: activeTab === 'charges' ? 'charge' : 'payment',
        description: description.trim(),
        amount: parseFloat(amount.replace(',', '.')),
        category,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: dueDate || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial'] });
      setModalVisible(false);
      resetForm();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      Alert.alert('Erro', error?.response?.data?.message ?? 'Erro ao criar cobrança.');
    },
  });

  function resetForm() {
    setSelectedResidentId('');
    setDescription('');
    setAmount('');
    setDueDate('');
    setCategory('monthly_fee');
  }

  function handleSubmit() {
    if (!selectedResidentId) {
      Alert.alert('Atenção', 'Selecione um residente.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Atenção', 'Informe a descrição.');
      return;
    }
    if (!amount.trim() || isNaN(parseFloat(amount.replace(',', '.')))) {
      Alert.alert('Atenção', 'Informe um valor válido.');
      return;
    }
    createMutation.mutate();
  }

  const allRecords = financialQuery.data?.records ?? [];
  const records = allRecords.filter((r) =>
    activeTab === 'charges' ? r.type === 'charge' : r.type === 'payment'
  );
  const residents = residentsQuery.data ?? [];
  const selectedResident = residents.find((r) => r.id === selectedResidentId);
  const filterResident = residents.find((r) => r.id === filterResidentId);
  const selectedCategory = CATEGORIES.find((c) => c.value === category);

  function renderItem({ item }: { item: FinancialRecord }) {
    return (
      <Card style={styles.item}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.description}>{item.description}</Text>
          </View>
          <Badge label={statusLabel(item.status)} color={statusColor(item.status)} />
        </View>
        <View style={styles.itemFooter}>
          <Text style={styles.amount}>{formatCurrency(Number(item.amount))}</Text>
          {item.dueDate ? (
            <Text style={styles.dueDate}>Vence: {formatDate(item.dueDate)}</Text>
          ) : null}
        </View>
      </Card>
    );
  }

  return (
    <View style={styles.root}>
      {/* Resident filter */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.filterPicker}
          onPress={() => setShowFilterPicker((v) => !v)}
        >
          <Text style={filterResidentId ? styles.filterValue : styles.filterPlaceholder}>
            {filterResident?.name ?? 'Selecionar residente...'}
          </Text>
          <Text>{showFilterPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {filterResidentId ? (
          <TouchableOpacity onPress={() => setFilterResidentId('')} style={styles.clearFilter}>
            <Text style={styles.clearFilterText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {showFilterPicker && (
        <View style={styles.filterList}>
          {residents.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.filterItem, filterResidentId === r.id && styles.filterItemSelected]}
              onPress={() => { setFilterResidentId(r.id); setShowFilterPicker(false); }}
            >
              <Text style={[styles.filterItemText, filterResidentId === r.id && styles.filterItemTextSelected]}>
                {r.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.tabBar}>
        {([
          { key: 'charges', label: 'Cobranças' },
          { key: 'payments', label: 'Pagamentos' },
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

      {financialQuery.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={records.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={financialQuery.isRefetching}
              onRefresh={() => financialQuery.refetch()}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <EmptyState
              icon="💰"
              title="Sem registros"
              subtitle={filterResidentId ? 'Nenhum registro financeiro encontrado.' : 'Selecione um residente para ver os registros.'}
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

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.sheet}
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Nova Cobrança</Text>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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

              <Text style={styles.fieldLabel}>Descrição *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: Mensalidade Outubro"
                placeholderTextColor={colors.gray400}
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.fieldLabel}>Valor (R$) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: 3500,00"
                placeholderTextColor={colors.gray400}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />

              <Text style={styles.fieldLabel}>Vencimento (AAAA-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: 2024-10-31"
                placeholderTextColor={colors.gray400}
                value={dueDate}
                onChangeText={setDueDate}
              />

              <Text style={styles.fieldLabel}>Categoria</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowCategoryPicker((v) => !v)}
              >
                <Text style={styles.pickerValue}>{selectedCategory?.label ?? 'Selecionar...'}</Text>
                <Text>{showCategoryPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showCategoryPicker && (
                <View style={styles.pickerList}>
                  {CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c.value}
                      style={[
                        styles.pickerItem,
                        category === c.value && styles.pickerItemSelected,
                      ]}
                      onPress={() => {
                        setCategory(c.value);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          category === c.value && styles.pickerItemTextSelected,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.actions}>
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
                    {createMutation.isPending ? 'Salvando...' : 'Criar Cobrança'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  filterPicker: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  filterValue: { fontSize: fontSize.sm, color: colors.text },
  filterPlaceholder: { fontSize: fontSize.sm, color: colors.gray400 },
  clearFilter: {
    padding: spacing.sm,
  },
  clearFilterText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  filterList: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 200,
  },
  filterItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  filterItemText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  filterItemTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
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
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  tabTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  emptyContainer: { flex: 1 },
  item: { gap: spacing.sm },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemInfo: { flex: 1, marginRight: spacing.sm },
  description: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  residentName: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  dueDate: { fontSize: fontSize.sm, color: colors.textSecondary },
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
  fabText: { color: colors.white, fontSize: 28, fontWeight: fontWeight.regular, lineHeight: 32 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xxl,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.lg },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.background,
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
  pickerValue: { fontSize: fontSize.md, color: colors.text },
  pickerPlaceholder: { fontSize: fontSize.md, color: colors.gray400 },
  pickerList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    maxHeight: 180,
  },
  pickerItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemSelected: { backgroundColor: colors.primaryLight },
  pickerItemText: { fontSize: fontSize.md, color: colors.text },
  pickerItemTextSelected: { color: colors.primary, fontWeight: fontWeight.semibold },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl, marginBottom: spacing.sm },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: fontSize.md, color: colors.text },
  confirmBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
