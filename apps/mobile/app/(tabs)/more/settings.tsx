import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { api } from '@/lib/api';
import { clearTokens, decodeTokenPayload, getToken } from '@/lib/auth';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface MeResponse {
  data: {
    id: string;
    name: string;
    email: string;
    role: string;
    customRole?: string;
  };
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  nurse: 'Enfermeiro(a)',
  caregiver: 'Cuidador(a)',
  cook: 'Cozinheiro(a)',
  other: 'Outro',
};

export default function SettingsScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    getToken().then((token) => {
      if (token) {
        const payload = decodeTokenPayload(token);
        if (payload && typeof payload['id'] === 'string') {
          setUserId(payload['id']);
        } else if (payload && typeof payload['sub'] === 'string') {
          setUserId(payload['sub']);
        }
      }
    });
  }, []);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<MeResponse>('/auth/me');
      return data.data;
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ password }: { password: string }) => {
      if (userId) {
        await api.post(`/users/${userId}/reset-password`, { newPassword: password });
      } else {
        await api.post('/auth/change-password', { newPassword: password });
      }
    },
    onSuccess: () => {
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Sucesso', 'Senha alterada com sucesso.');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      Alert.alert('Erro', error?.response?.data?.message ?? 'Erro ao alterar senha.');
    },
  });

  function handleChangePassword() {
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert('Atenção', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }
    Alert.alert('Confirmar', 'Deseja alterar sua senha?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => changePasswordMutation.mutate({ password: newPassword }) },
    ]);
  }

  async function handleLogout() {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await clearTokens();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const user = meQuery.data;
  const roleLabel = user
    ? (user.customRole ?? ROLE_LABELS[user.role] ?? user.role)
    : null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Profile Card */}
        <Text style={styles.sectionTitle}>Perfil</Text>
        {meQuery.isLoading ? (
          <Loading size="small" />
        ) : user ? (
          <Card style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {user.name
                  .split(' ')
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              {roleLabel ? <Text style={styles.profileRole}>{roleLabel}</Text> : null}
            </View>
          </Card>
        ) : null}

        {/* Change Password */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Alterar senha</Text>
        <Card>
          <Text style={styles.fieldLabel}>Nova senha</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={colors.gray400}
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowNew((v) => !v)}>
              <Text>{showNew ? '🙈' : '👁'}</Text>
            </Pressable>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Confirmar nova senha</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Repita a senha"
              placeholderTextColor={colors.gray400}
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowConfirm((v) => !v)}>
              <Text>{showConfirm ? '🙈' : '👁'}</Text>
            </Pressable>
          </View>

          <TouchableOpacity
            style={[styles.changePassBtn, changePasswordMutation.isPending && styles.btnDisabled]}
            onPress={handleChangePassword}
            disabled={changePasswordMutation.isPending}
            activeOpacity={0.8}
          >
            <Text style={styles.changePassBtnText}>
              {changePasswordMutation.isPending ? 'Salvando...' : 'Alterar senha'}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  profileRole: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: 4,
    fontWeight: fontWeight.medium,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  passwordContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  eyeBtn: {
    paddingHorizontal: spacing.md,
  },
  changePassBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  changePassBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  logoutBtn: {
    marginTop: spacing.xxl,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
