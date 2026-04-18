import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

interface ReportItem {
  icon: string;
  label: string;
  subtitle: string;
  route: string;
  color: string;
}

const reportItems: ReportItem[] = [
  {
    icon: '💊',
    label: 'Medicamentos',
    subtitle: 'Taxa de adesão, administrações',
    route: '/(tabs)/more/reports/medications',
    color: colors.primary,
  },
  {
    icon: '👴',
    label: 'Residentes',
    subtitle: 'Ocupação, distribuição',
    route: '/(tabs)/more/reports/residents',
    color: colors.secondary,
  },
  {
    icon: '💰',
    label: 'Financeiro',
    subtitle: 'Fluxo de caixa, inadimplência',
    route: '/(tabs)/more/reports/financial',
    color: colors.warning,
  },
  {
    icon: '📋',
    label: 'Pessoal',
    subtitle: 'Escalas, absenteísmo',
    route: '/(tabs)/more/reports/staff',
    color: colors.purple,
  },
];

export default function ReportsScreen() {
  const router = useRouter();

  return (
    <Screen title="Relatórios">
      <ScrollView contentContainerStyle={styles.content}>
        {reportItems.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.card}
            onPress={() => router.push(item.route as never)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
  },
  cardLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: colors.gray400,
  },
});
