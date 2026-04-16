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

interface CreateResidentPayload {
  name: string;
  birthDate: string;
  gender: string;
  cpf?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
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
      const error = err as { response?: { data?: { message?: string } } };
      Alert.alert('Erro', error?.response?.data?.message ?? 'Não foi possível criar o residente.');
    },
  });

  function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Nome é obrigatório.');
      return;
    }
    if (!birthDate.trim()) {
      Alert.alert('Atenção', 'Data de nascimento é obrigatória.');
      return;
    }
    if (!gender) {
      Alert.alert('Atenção', 'Selecione o gênero.');
      return;
    }

    mutation.mutate({
      name: name.trim(),
      birthDate,
      gender,
      cpf: cpf.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
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
          label="Data de nascimento (AAAA-MM-DD)"
          required
          placeholder="Ex.: 1940-05-12"
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

        <InputField label="CPF" placeholder="000.000.000-00" value={cpf} onChangeText={setCpf} />
        <InputField
          label="Telefone"
          placeholder="(00) 00000-0000"
          value={phone}
          onChangeText={setPhone}
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

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Contato de emergência</Text>
        <InputField
          label="Nome"
          placeholder="Nome do contato"
          value={emergencyContactName}
          onChangeText={setEmergencyContactName}
        />
        <InputField
          label="Telefone"
          placeholder="(00) 00000-0000"
          value={emergencyContactPhone}
          onChangeText={setEmergencyContactPhone}
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
