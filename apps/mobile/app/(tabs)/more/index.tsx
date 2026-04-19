import { useRouter } from 'expo-router';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { clearTokens } from '@/lib/auth';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface MenuItem {
  icon: string;
  label: string;
  sub: string;
  route: string;
  color: string;
}

const menuGroups: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Gestão',
    items: [
      { icon: '👥', label: 'Funcionários', sub: 'Equipe e acessos', route: '/more/staff', color: colors.primary },
      { icon: '📅', label: 'Escala de Trabalho', sub: 'Turnos e folgas', route: '/more/schedules', color: colors.secondary },
      { icon: '💰', label: 'Financeiro', sub: 'Cobranças e pagamentos', route: '/more/financial', color: colors.accent },
    ],
  },
  {
    title: 'Cuidados',
    items: [
      { icon: '📋', label: 'Planos de Cuidados', sub: 'Por residente', route: '/more/care-plans', color: colors.secondary },
      { icon: '⚠️', label: 'Avaliação de Risco', sub: 'Segurança e alertas', route: '/more/risk-scores', color: colors.danger },
      { icon: '✨', label: 'Sugestão de Escala IA', sub: 'Gerado automaticamente', route: '/more/ai-schedule', color: colors.purple },
    ],
  },
  {
    title: 'Análise',
    items: [
      { icon: '📊', label: 'Relatórios', sub: 'Residentes, equipe e mais', route: '/more/reports', color: colors.stone600 },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { icon: '⚙️', label: 'Configurações', sub: 'Conta e preferências', route: '/more/settings', color: colors.stone500 },
    ],
  },
];

export default function MoreScreen() {
  const router = useRouter();

  async function handleLogout() {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await clearTokens();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  }

  return (
    <Screen title="Mais">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {menuGroups.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupCard}>
              {group.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.route}
                  style={[
                    styles.menuItem,
                    idx < group.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={() => router.push(item.route as never)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: item.color + '18' }]}>
                    <Text style={styles.icon}>{item.icon}</Text>
                  </View>
                  <View style={styles.menuTextCol}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuSub}>{item.sub}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  group: { gap: spacing.sm },
  groupTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.stone500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xs,
  },
  groupCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: colors.stone700,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.stone100,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: { fontSize: 18 },
  menuTextCol: { flex: 1 },
  menuLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.stone900,
  },
  menuSub: {
    fontSize: fontSize.xs,
    color: colors.stone500,
    marginTop: 1,
  },
  chevron: {
    fontSize: 20,
    color: colors.stone300,
    lineHeight: 22,
  },
  logoutBtn: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  logoutText: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
