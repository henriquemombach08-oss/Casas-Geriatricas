import { Stack } from 'expo-router';
import { colors, fontWeight } from '@/theme';

export default function MedicationsLayout() {
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
      <Stack.Screen name="new" options={{ title: 'Novo Medicamento' }} />
    </Stack>
  );
}
