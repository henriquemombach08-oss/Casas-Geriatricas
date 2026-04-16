import { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  customRole?: string;
  phone?: string;
  active: boolean;
}

interface StaffResponse {
  data: StaffMember[];
}

const ROLES = [
  { value: 'admin', label: 'Administrador', color: 'purple' as const },
  { value: 'nurse', label: 'Enfermeiro(a)', color: 'blue' as const },
  { value: 'caregiver', label: 'Cuidador(a)', color: 'green' as const },
  { value: 'cook', label: 'Cozinheiro(a)', color: 'yellow' as const },
  { value: 'other', label: 'Outro', color: 'gray' as const },
];

function getRoleInfo(role: string): { label: string; color: 'purple' | 'blue' | 'green' | 'yellow' | 'gray' } {
  const found = ROLES.find((r) => r.value === role);
  return found ?? { label: role, color: 'gray' };
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = ['#2563EB', '#10B981', '#7C3AED', '#F59E0B', '#EF4444'];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

export default function StaffScreen() {
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('caregiver');
  const [customRole, setCustomRole] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const staffQuery = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data } = await api.get<StaffResponse>('/users', {
        params: { active: 'all' },
      });
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/users', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        customRole: role === 'other' ? customRole.trim() : undefined,
        phone: phone.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['dashboard-staff'] });
      setModalVisible(false);
      resetForm();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      Alert.alert('Erro', error?.response?.data?.message ?? 'Erro ao criar funcionário.');
    },
  });

  function resetForm() {
    setName('');
    setEmail('');
    setPassword('');
    setRole('caregiver');
    setCustomRole('');
    setPhone('');
  }

  function handleSubmit() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Nome, e-mail e senha são obrigatórios.');
      return;
    }
    if (role === 'other' && !customRole.trim()) {
      Alert.alert('Atenção', 'Informe o cargo personalizado.');
      return;
    }
    createMutation.mutate();
  }

  const staff = staffQuery.data ?? [];
  const selectedRole = ROLES.find((r) => r.value === role);

  function renderItem({ item }: { item: StaffMember }) {
    const roleInfo = getRoleInfo(item.role);
    const initials = getInitials(item.name);
    const bg = avatarColor(item.name);

    return (
      <Card style={styles.item}>
        <View style={styles.itemRow}>
          <View style={[styles.avatar, { backgroundColor: bg }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.name}</Text>
              {!item.active && (
                <Badge label="Inativo" color="gray" />
              )}
            </View>
            <Text style={styles.email}>{item.email}</Text>
            {item.phone ? <Text style={styles.phone}>{item.phone}</Text> : null}
          </View>
          <Badge
            label={item.customRole ?? roleInfo.label}
            color={roleInfo.color}
          />
        </View>
      </Card>
    );
  }

  return (
    <>
      {staffQuery.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={staff.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={staffQuery.isRefetching}
              onRefresh={() => staffQuery.refetch()}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <EmptyState icon="🧑‍💼" title="Sem funcionários" subtitle="Nenhum funcionário cadastrado." />
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
            <Text style={styles.sheetTitle}>Novo Funcionário</Text>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Nome *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome completo"
                placeholderTextColor={colors.gray400}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.fieldLabel}>E-mail *</Text>
              <TextInput
                style={styles.input}
                placeholder="email@exemplo.com"
                placeholderTextColor={colors.gray400}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.fieldLabel}>Senha *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={colors.gray400}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <Pressable style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                  <Text>{showPassword ? '🙈' : '👁'}</Text>
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Cargo</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowRolePicker((v) => !v)}
              >
                <Text style={styles.pickerValue}>{selectedRole?.label ?? 'Selecionar...'}</Text>
                <Text>{showRolePicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showRolePicker && (
                <View style={styles.pickerList}>
                  {ROLES.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[styles.pickerItem, role === r.value && styles.pickerItemSelected]}
                      onPress={() => {
                        setRole(r.value);
                        setShowRolePicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          role === r.value && styles.pickerItemTextSelected,
                        ]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {role === 'other' && (
                <>
                  <Text style={styles.fieldLabel}>Cargo personalizado *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex.: Fisioterapeuta"
                    placeholderTextColor={colors.gray400}
                    value={customRole}
                    onChangeText={setCustomRole}
                  />
                </>
              )}

              <Text style={styles.fieldLabel}>Telefone</Text>
              <TextInput
                style={styles.input}
                placeholder="(00) 00000-0000"
                placeholderTextColor={colors.gray400}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

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
                    {createMutation.isPending ? 'Salvando...' : 'Cadastrar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  emptyContainer: { flex: 1 },
  item: {},
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  itemInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, flex: 1 },
  email: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  phone: { fontSize: fontSize.sm, color: colors.textSecondary },
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
  passwordContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  passwordInput: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.text },
  eyeBtn: { paddingHorizontal: spacing.md },
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
  pickerList: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.card, maxHeight: 220 },
  pickerItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerItemSelected: { backgroundColor: colors.primaryLight },
  pickerItemText: { fontSize: fontSize.md, color: colors.text },
  pickerItemTextSelected: { color: colors.primary, fontWeight: fontWeight.semibold },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl, marginBottom: spacing.sm },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  cancelBtnText: { fontSize: fontSize.md, color: colors.text },
  confirmBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
