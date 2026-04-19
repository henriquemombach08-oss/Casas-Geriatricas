import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

// ─── Formatters ──────────────────────────────────────────────────────────────

function maskCPF(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function stripDigits(v: string): string {
  return v.replace(/\D/g, '');
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateResidentPayload {
  name: string;
  birthDate: string;
  gender: string;
  cpf: string;
  phone?: string;
  email?: string;
  address?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  admissionDate: string;
}

interface CreateResidentResponse {
  data: { id: string };
}

const genderOptions = [
  { label: 'Masculino', value: 'M' },
  { label: 'Feminino', value: 'F' },
  { label: 'Outro', value: 'O' },
];

function InputField({
  label,
  required,
  ...props
}: { label: string; required?: boolean } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={formStyles.inputGroup}>
      <Text style={formStyles.label}>
        {label}
        {required ? <Text style={formStyles.required}> *</Text> : null}
      </Text>
      <TextInput style={formStyles.input} placeholderTextColor={colors.gray400} {...props} />
    </View>
  );
}

export default function NewResidentScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  const mutation = useMutation({
    mutationFn: async (payload: CreateResidentPayload) => {
      const { data } = await api.post<CreateResidentResponse>('/residents', payload);
      return data.data;
    },
    onSuccess: (newResident) => {
      qc.invalidateQueries({ queryKey: ['residents'] });
      router.replace(`/(tabs)/residents/${newResident.id}`);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string; error?: string } } };
      const msg =
        error?.response?.data?.message ??
        error?.response?.data?.error ??
        'Não foi possível criar o residente.';
      Alert.alert('Erro', msg);
    },
  });

  function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Nome é obrigatório.');
      return;
    }
    if (!birthDate.trim()) {
      Alert.alert('Atenção', 'Data de nascimento é obrigatória (AAAA-MM-DD).');
      return;
    }
    if (!gender) {
      Alert.alert('Atenção', 'Selecione o gênero.');
      return;
    }
    const cpfDigits = stripDigits(cpf);
    if (cpfDigits.length !== 11) {
      Alert.alert('Atenção', 'CPF deve ter 11 dígitos.');
      return;
    }
    if (!emergencyContactName.trim() || emergencyContactName.trim().length < 3) {
      Alert.alert('Atenção', 'Nome do contato de emergência é obrigatório (mín. 3 caracteres).');
      return;
    }
    const ecPhone = stripDigits(emergencyContactPhone);
    if (ecPhone.length < 10) {
      Alert.alert('Atenção', 'Telefone de emergência é obrigatório (10 ou 11 dígitos).');
      return;
    }

    const today = new Date().toISOString().split('T')[0]!;

    mutation.mutate({
      name: name.trim(),
      birthDate,
      gender,
      cpf: cpfDigits,
      phone: stripDigits(phone) || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: ecPhone,
      admissionDate: today,
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Dados pessoais</Text>

        <InputField
          label="Nome completo"
          required
          placeholder="Ex.: Maria Oliveira"
          value={name}
          onChangeText={setName}
        />

        <InputField
          label="Data de nascimento"
          required
          placeholder="AAAA-MM-DD (Ex.: 1940-05-12)"
          value={birthDate}
          onChangeText={setBirthDate}
          keyboardType="numeric"
        />

        <View style={formStyles.inputGroup}>
          <Text style={formStyles.label}>
            Gênero <Text style={formStyles.required}>*</Text>
          </Text>
          <View style={styles.radioRow}>
            {genderOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.radioOption, gender === opt.value && styles.radioSelected]}
                onPress={() => setGender(opt.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.radioText,
                    gender === opt.value && styles.radioTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <InputField
          label="CPF"
          required
          placeholder="000.000.000-00"
          value={cpf}
          onChangeText={(v) => setCpf(maskCPF(v))}
          keyboardType="numeric"
        />
        <InputField
          label="Telefone"
          placeholder="(00) 00000-0000"
          value={phone}
          onChangeText={(v) => setPhone(maskPhone(v))}
          keyboardType="phone-pad"
        />
        <InputField
          label="E-mail"
          placeholder="email@exemplo.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <InputField
          label="Endereço"
          placeholder="Rua, número, bairro, cidade"
          value={address}
          onChangeText={setAddress}
        />

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
          Contato de emergência
        </Text>
        <InputField
          label="Nome"
          required
          placeholder="Nome completo do contato"
          value={emergencyContactName}
          onChangeText={setEmergencyContactName}
        />
        <InputField
          label="Telefone"
          required
          placeholder="(00) 00000-0000"
          value={emergencyContactPhone}
          onChangeText={(v) => setEmergencyContactPhone(maskPhone(v))}
          keyboardType="phone-pad"
        />

        <TouchableOpacity
          style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>
            {mutation.isPending ? 'Salvando...' : 'Cadastrar Residente'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const formStyles = StyleSheet.create({
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.danger,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.card,
  },
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  radioRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  radioOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  radioText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  radioTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
