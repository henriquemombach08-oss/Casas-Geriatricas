import { Stack } from 'expo-router';
import { colors, fontWeight } from '@/theme';

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: fontWeight.semibold, color: colors.text },
        headerBackTitle: 'Voltar',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="financial" options={{ title: 'Financeiro' }} />
      <Stack.Screen name="staff" options={{ title: 'Funcionários' }} />
      <Stack.Screen name="schedules" options={{ title: 'Escala de Trabalho' }} />
      <Stack.Screen name="settings" options={{ title: 'Configurações' }} />
      <Stack.Screen name="ai-schedule" options={{ headerShown: false }} />
      <Stack.Screen name="care-plans" options={{ headerShown: false }} />
      <Stack.Screen name="risk-scores" options={{ headerShown: false }} />
      <Stack.Screen name="reports/index" options={{ headerShown: false }} />
      <Stack.Screen name="reports/financial" options={{ headerShown: false }} />
      <Stack.Screen name="reports/medications" options={{ headerShown: false }} />
      <Stack.Screen name="reports/residents" options={{ headerShown: false }} />
      <Stack.Screen name="reports/staff" options={{ headerShown: false }} />
    </Stack>
  );
}
