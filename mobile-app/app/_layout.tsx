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

export default function RootLayout() {
    return (
        <AuthProvider>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#0f0f1a' },
                    animation: 'slide_from_right',
                }}
            />
        </AuthProvider>
    );
}
