import { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { api } from '@/lib/api';

interface PinModalProps {
  visible: boolean;
  title?: string;
  description?: string;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
}

export function PinModal({
  visible,
  title = 'Confirmação de segurança',
  description = 'Digite seu PIN de 6 dígitos para confirmar.',
  onSuccess,
  onCancel,
}: PinModalProps) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (visible) {
      setDigits(['', '', '', '', '', '']);
      setError('');
      setTimeout(() => inputs.current[0]?.focus(), 100);
    }
  }, [visible]);

  const handleChange = async (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError('');

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== '')) {
      const pin = next.join('');
      setLoading(true);
      try {
        await api.post('/pin/verify', { pin });
        setLoading(false);
        onSuccess(pin);
      } catch {
        setLoading(false);
        setError('PIN incorreto. Tente novamente.');
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => inputs.current[0]?.focus(), 50);
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🔐</Text>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          <View style={styles.digitRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                style={[styles.digitInput, error ? styles.digitError : d ? styles.digitFilled : null]}
                value={d}
                onChangeText={(v) => handleChange(i, v)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                secureTextEntry
                editable={!loading}
                selectTextOnFocus
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {loading ? (
            <ActivityIndicator size="small" color="#3B82F6" style={{ marginTop: 8 }} />
          ) : null}

          <TouchableOpacity onPress={onCancel} disabled={loading} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  icon: { fontSize: 28 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  description: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  digitRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  digitInput: {
    width: 44,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  digitFilled: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  digitError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorText: { fontSize: 13, color: '#EF4444', fontWeight: '500' },
  cancelBtn: { marginTop: 8, padding: 8 },
  cancelText: { fontSize: 14, color: '#9CA3AF' },
});
