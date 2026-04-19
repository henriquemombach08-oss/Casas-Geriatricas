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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface Resident {
  id: string;
  name: string;
}

interface ResidentsApiResponse {
  success: boolean;
  data: { residents: Resident[] };
}

const UNITS = [
  { value: 'mg', label: 'mg' },
  { value: 'ml', label: 'ml' },
  { value: 'comp', label: 'comp' },
  { value: 'gotas', label: 'gotas' },
  { value: 'mcg', label: 'mcg' },
  { value: 'g', label: 'g' },
  { value: 'ui', label: 'UI' },
];

const TIMES_OPTIONS = [1, 2, 3, 4];

function InputField({
  label,
  required,
  ...props
}: { label: string; required?: boolean } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput style={styles.input} placeholderTextColor={colors.gray400} {...props} />
    </View>
  );
}

export default function NewMedicationScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [residentId, setResidentId] = useState('');
  const [showResidentPicker, setShowResidentPicker] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [unit, setUnit] = useState('mg');
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [frequencyDescription, setFrequencyDescription] = useState('');
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [scheduledTimes, setScheduledTimes] = useState(['08:00']);
  const [startDate] = useState(new Date().toISOString().split('T')[0]!);
  const [prescriberName, setPrescriberName] = useState('');
  const [notes, setNotes] = useState('');

  const residentsQuery = useQuery({
    queryKey: ['residents-active'],
    queryFn: async () => {
      const { data } = await api.get<ResidentsApiResponse>('/residents', {
        params: { status: 'active', limit: 100 },
      });
      return data.data.residents;
    },
  });

  const residents = residentsQuery.data ?? [];
  const selectedResident = residents.find((r) => r.id === residentId);

  function updateTimesPerDay(n: number) {
    setTimesPerDay(n);
    setScheduledTimes(Array.from({ length: n }, (_, i) => scheduledTimes[i] ?? '08:00'));
  }

  function updateScheduledTime(index: number, value: string) {
    const cleaned = value.replace(/[^0-9:]/g, '').slice(0, 5);
    const updated = [...scheduledTimes];
    updated[index] = cleaned;
    setScheduledTimes(updated);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/medications', {
        residentId,
        name: name.trim(),
        dosage: dosage.trim() || undefined,
        measurementUnit: unit,
        frequencyDescription: frequencyDescription.trim(),
        timesPerDay,
        scheduledTimes,
        startDate,
        prescriberName: prescriberName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medications-scheduled'] });
      Alert.alert('Sucesso', 'Medicamento cadastrado.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string; error?: string } } };
      const msg =
        error?.response?.data?.message ??
        error?.response?.data?.error ??
        'Erro ao cadastrar medicamento.';
      Alert.alert('Erro', msg);
    },
  });

  function handleSubmit() {
    if (!residentId) {
      Alert.alert('Atenção', 'Selecione o residente.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Atenção', 'Nome do medicamento é obrigatório.');
      return;
    }
    if (!frequencyDescription.trim()) {
      Alert.alert('Atenção', 'Informe a frequência (ex.: "1x ao dia").');
      return;
    }
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!scheduledTimes.every((t) => timeRegex.test(t))) {
      Alert.alert('Atenção', 'Horários devem estar no formato HH:MM.');
      return;
    }
    mutation.mutate();
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Medicamento</Text>

        {/* Resident picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Residente <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowResidentPicker((v) => !v)}
          >
            <Text style={selectedResident ? styles.pickerValue : styles.pickerPlaceholder}>
              {selectedResident?.name ?? 'Selecionar residente...'}
            </Text>
            <Text style={styles.pickerArrow}>{showResidentPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showResidentPicker && (
            <View style={styles.pickerList}>
              {residents.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.pickerItem, residentId === r.id && styles.pickerItemSelected]}
                  onPress={() => { setResidentId(r.id); setShowResidentPicker(false); }}
                >
                  <Text style={[styles.pickerItemText, residentId === r.id && styles.pickerItemTextSelected]}>
                    {r.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <InputField
          label="Nome do medicamento"
          required
          placeholder="Ex.: Losartana"
          value={name}
          onChangeText={setName}
        />

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Dosagem</Text>
            <TextInput
              style={styles.input}
              placeholder="50"
              placeholderTextColor={colors.gray400}
              keyboardType="numeric"
              value={dosage}
              onChangeText={setDosage}
            />
          </View>
          <View style={[styles.inputGroup, { width: 100 }]}>
            <Text style={styles.label}>Unidade</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowUnitPicker((v) => !v)}>
              <Text style={styles.pickerValue}>{unit}</Text>
              <Text style={styles.pickerArrow}>{showUnitPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {showUnitPicker && (
          <View style={styles.pickerList}>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u.value}
                style={[styles.pickerItem, unit === u.value && styles.pickerItemSelected]}
                onPress={() => { setUnit(u.value); setShowUnitPicker(false); }}
              >
                <Text style={[styles.pickerItemText, unit === u.value && styles.pickerItemTextSelected]}>
                  {u.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <InputField
          label="Frequência"
          required
          placeholder='Ex.: "1x ao dia", "2x ao dia"'
          value={frequencyDescription}
          onChangeText={setFrequencyDescription}
        />

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Doses por dia <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.radioRow}>
            {TIMES_OPTIONS.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.radioOption, timesPerDay === n && styles.radioSelected]}
                onPress={() => updateTimesPerDay(n)}
              >
                <Text style={[styles.radioText, timesPerDay === n && styles.radioTextSelected]}>
                  {n}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Horários <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.timesRow}>
            {scheduledTimes.map((t, i) => (
              <TextInput
                key={i}
                style={styles.timeInput}
                value={t}
                onChangeText={(v) => updateScheduledTime(i, v)}
                placeholder="HH:MM"
                placeholderTextColor={colors.gray400}
                keyboardType="numeric"
                maxLength={5}
              />
            ))}
          </View>
        </View>

        <InputField
          label="Médico prescritor"
          placeholder="Nome do médico"
          value={prescriberName}
          onChangeText={setPrescriberName}
        />

        <InputField
          label="Observações"
          placeholder="Instruções especiais..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>
            {mutation.isPending ? 'Salvando...' : 'Cadastrar Medicamento'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  inputGroup: { marginBottom: spacing.md },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  required: { color: colors.danger },
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
  row: { flexDirection: 'row', gap: spacing.md },
  picker: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  pickerValue: { fontSize: fontSize.md, color: colors.text },
  pickerPlaceholder: { fontSize: fontSize.md, color: colors.gray400 },
  pickerArrow: { color: colors.textSecondary },
  pickerList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    marginBottom: spacing.md,
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
  radioRow: { flexDirection: 'row', gap: spacing.sm },
  radioOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  radioText: { fontSize: fontSize.sm, color: colors.text },
  radioTextSelected: { color: colors.primary, fontWeight: fontWeight.semibold },
  timesRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  timeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.card,
    width: 80,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
