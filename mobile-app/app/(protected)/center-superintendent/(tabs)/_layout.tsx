/**
 * Center Superintendent Tabs Layout
 * 
 * Bottom tab navigation with:
 * - Home
 * - Events
 * - Circulars
 * - Settings
 */

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function CenterSuperintendentTabsLayout() {
    const insets = useSafeAreaInsets();
    
    return (
        <Tabs
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#374151',
                    height: Platform.OS === 'android' 
                        ? 56 + (StatusBar.currentHeight || insets.top)
                        : undefined,
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                    fontWeight: '600',
                },
                headerStatusBarHeight: Platform.OS === 'android' 
                    ? (StatusBar.currentHeight || insets.top)
                    : undefined,
                tabBarStyle: {
                    backgroundColor: '#ffffff',
                    borderTopWidth: 1,
                    borderTopColor: '#e5e7eb',
                    paddingTop: 8,
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom || 8 : 8,
                    height: Platform.OS === 'ios' ? 70 + (insets.bottom > 0 ? insets.bottom - 8 : 0) : 70,
                },
                tabBarActiveTintColor: '#374151',
                tabBarInactiveTintColor: '#9ca3af',
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                    marginTop: 4,
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'NBSE CONNECT',
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="grid-outline" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="events"
                options={{
                    title: 'Events',
                    tabBarLabel: 'Events',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar-outline" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="circulars"
                options={{
                    title: 'Circulars',
                    tabBarLabel: 'Circulars',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="document-text-outline" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notices"
                options={{
                    href: null, // Hide from tab bar - notices only created by admin
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarLabel: 'Settings',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-outline" size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
