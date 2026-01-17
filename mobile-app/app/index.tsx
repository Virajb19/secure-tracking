/**
 * Index Screen (Entry Point)
 * 
 * Redirects based on authentication state:
 * - Authenticated → Tasks list
 * - Not authenticated → Login
 * - Loading → Splash screen
 */

import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

export default function Index() {
    const { isAuthenticated, isLoading } = useAuth();

    // Show loading screen while checking auth
    if (isLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.title}>Secure Delivery</Text>
                    <Text style={styles.subtitle}>Government Tracking System</Text>
                    <ActivityIndicator
                        size="large"
                        color="#4f8cff"
                        style={styles.loader}
                    />
                    <Text style={styles.loadingText}>Initializing...</Text>
                </View>
            </View>
        );
    }

    // Redirect based on auth state
    if (isAuthenticated) {
        return <Redirect href="/(protected)/tasks" />;
    }

    return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 40,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    loader: {
        marginBottom: 16,
    },
    loadingText: {
        fontSize: 14,
        color: '#9ca3af',
    },
});
