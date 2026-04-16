import { Stack } from 'expo-router';
import { colors, fontWeight } from '@/theme';

export default function MedicationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: fontWeight.semibold, color: colors.text },
      }}
    />
  );
}
