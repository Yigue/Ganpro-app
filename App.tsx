import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { DatabaseProvider } from '@data/database/DatabaseProvider';
import { RootNavigator } from '@navigation/RootNavigator';
import { useSyncronization } from '@shared/hooks/useSyncronization';
import { useSettingsStore } from '@store/settingsStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

/**
 * AppInner mounts inside DatabaseProvider so it can access the database.
 * useSyncronization is initialized here once at the root level.
 */
function AppInner() {
  const hydrated = useSettingsStore(s => s._hydrated);
  useSyncronization();
  if (!hydrated) return null;
  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <QueryClientProvider client={queryClient}>
          <DatabaseProvider>
            <BottomSheetModalProvider>
              <AppInner />
            </BottomSheetModalProvider>
          </DatabaseProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
