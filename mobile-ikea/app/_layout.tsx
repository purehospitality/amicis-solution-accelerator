import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export default function RootLayout() {
  const loadAuth = useAuthStore((state) => state.loadAuth);

  useEffect(() => {
    loadAuth();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="login" 
        options={{ 
          presentation: 'modal',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="checkout" 
        options={{ 
          headerShown: false,
        }} 
      />
    </Stack>
  );
}
