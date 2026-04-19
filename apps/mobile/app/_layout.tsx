import { useEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { queryClient } from '@/lib/queryClient';
import { registerForPushNotifications, addResponseListener } from '@/services/notifications';

export default function RootLayout() {
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Hide navigation bar for edge-to-edge look
    NavigationBar.setVisibilityAsync('hidden').catch(() => {});
    NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});

    registerForPushNotifications().then(async (token) => {
      if (!token) return;
      try {
        const { api } = await import('@/lib/api');
        await api.post('/users/push-token', { token });
      } catch {
        // silently fail — not critical
      }
    });

    responseListener.current = addResponseListener(() => {
      // navigate on notification tap — extend as needed
    });

    return () => {
      responseListener.current?.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
