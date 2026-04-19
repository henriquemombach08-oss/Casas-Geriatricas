import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert,
  Image,
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
  photoUrl?: string;
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
      <TextInput style={formStyles.input} placeholderTextColor={colors.stone400} {...props} />
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
  const [photo, setPhoto] = useState<string | null>(null);

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos acessar sua galeria para escolher uma foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setPhoto(`data:image/jpeg;base64,${asset.base64}`);
      }
    }
  }

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
        'Não foi possível salvar o residente agora. Verifique os dados e tente de novo.';
      Alert.alert('Ops, algo deu errado', msg);
    },
  });

  function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Faltou uma coisa', 'Precisamos do nome completo do residente.');
      return;
    }
    if (!birthDate.trim()) {
      Alert.alert('Faltou uma coisa', 'Informe a data de nascimento no formato AAAA-MM-DD.');
      return;
    }
    if (!gender) {
      Alert.alert('Faltou uma coisa', 'Selecione o gênero do residente.');
      return;
    }
    const cpfDigits = stripDigits(cpf);
    if (cpfDigits.length !== 11) {
      Alert.alert('CPF incompleto', 'O CPF precisa ter 11 dígitos.');
      return;
    }
    if (!emergencyContactName.trim() || emergencyContactName.trim().length < 3) {
      Alert.alert('Faltou uma coisa', 'Informe o nome do contato de emergência.');
      return;
    }
    const ecPhone = stripDigits(emergencyContactPhone);
    if (ecPhone.length < 10) {
      Alert.alert('Faltou uma coisa', 'Informe o telefone do contato de emergência.');
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
      photoUrl: photo ?? undefined,
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoContainer} onPress={handlePickPhoto} activeOpacity={0.8}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderIcon}>📷</Text>
                <Text style={styles.photoPlaceholderText}>Adicionar foto</Text>
              </View>
            )}
          </TouchableOpacity>
          {photo && (
            <TouchableOpacity onPress={() => setPhoto(null)} style={styles.removePhotoBtn}>
              <Text style={styles.removePhotoText}>Remover foto</Text>
            </TouchableOpacity>
          )}
        </View>

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
                <Text style={[styles.radioText, gender === opt.value && styles.radioTextSelected]}>
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
  inputGroup: { marginBottom: spacing.md },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.stone700,
    marginBottom: spacing.xs,
  },
  required: { color: colors.danger },
  input: {
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.stone50,
  },
});

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  photoPreview: { width: 100, height: 100 },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.stone100,
    borderWidth: 2,
    borderColor: colors.stone200,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoPlaceholderIcon: { fontSize: 24 },
  photoPlaceholderText: {
    fontSize: fontSize.xs,
    color: colors.stone500,
    textAlign: 'center',
  },
  removePhotoBtn: { paddingVertical: spacing.xs },
  removePhotoText: { fontSize: fontSize.sm, color: colors.danger },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.stone500,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  radioRow: { flexDirection: 'row', gap: spacing.sm },
  radioOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.stone50,
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  radioText: { fontSize: fontSize.sm, color: colors.stone700 },
  radioTextSelected: { color: colors.primary, fontWeight: fontWeight.semibold },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
