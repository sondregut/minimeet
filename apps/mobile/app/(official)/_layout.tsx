import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';

export default function OfficialLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // When authenticated, navigate to events list
    if (!isLoading && isAuthenticated) {
      router.replace('/(official)/events');
    }
  }, [isAuthenticated, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen
        name="events"
        options={{
          headerShown: true,
          title: 'Mine ovelser',
          headerBackTitle: 'Meny',
        }}
      />
    </Stack>
  );
}
