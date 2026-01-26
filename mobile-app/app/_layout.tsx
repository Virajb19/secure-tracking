/**
 * Root Layout
 * 
 * App-wide layout that wraps all screens.
 * Provides AuthProvider context.
 */
import 'react-native-get-random-values';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { NotificationHandler } from '../src/components/NotificationHandler';
import Toast from 'react-native-toast-message';

export default function RootLayout() {
    return (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <AuthProvider>
                <NotificationHandler>
                    <StatusBar style="light" />
                    <QueryClientProvider client={queryClient}>
                        <Stack
                            screenOptions={{
                                headerShown: false,
                                contentStyle: { backgroundColor: '#0f0f1a' },
                                animation: 'slide_from_right',
                            }}
                        />
                    </QueryClientProvider>
                    <Toast />
                </NotificationHandler>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
