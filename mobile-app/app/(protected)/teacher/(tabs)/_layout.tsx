/**
 * Teacher Tabs Layout
 * 
 * Bottom tab navigation for teacher with:
 * - Home
 * - Events
 * - Circulars
 * - Settings
 */

import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, StatusBar, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function TeacherTabsLayout() {
    const insets = useSafeAreaInsets();
    
    return (
        <Tabs
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#1e3a5f',
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
                tabBarActiveTintColor: '#1e3a5f',
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
                    headerLeft: () => (
                        <View style={styles.headerLeft}>
                            <Image
                                source={require('../../../../assets/icon.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                    ),
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
                    href: null, // Hide from tab bar
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

const styles = StyleSheet.create({
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 16,
    },
    logo: {
        width: 32,
        height: 32,
    },
});
