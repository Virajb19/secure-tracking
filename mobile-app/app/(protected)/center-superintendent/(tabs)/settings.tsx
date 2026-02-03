/**
 * Center Superintendent Settings/Profile Tab Screen
 * 
 * Displays profile information and settings options including Helpdesk.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../../src/contexts/AuthContext';

interface SettingsItem {
    id: string;
    title: string;
    subtitle?: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBgColor: string;
    route?: string;
    action?: () => void;
    showBadge?: boolean;
}

export default function SettingsTabScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        // Navigate first, then logout to avoid race condition
                        router.replace('/login');
                        await logout();
                    },
                },
            ]
        );
    };

    const settingsSections: { title: string; items: SettingsItem[] }[] = [
        {
            title: 'Profile',
            items: [
                {
                    id: 'view-profile',
                    title: 'View Profile',
                    subtitle: 'View your personal information',
                    icon: 'person-outline',
                    iconColor: '#0d9488',
                    iconBgColor: '#ccfbf1',
                    route: '/(protected)/center-superintendent/view-profile',
                },
                {
                    id: 'edit-personal-details',
                    title: 'Edit Personal Details',
                    subtitle: 'Update your name, phone, and gender',
                    icon: 'create-outline',
                    iconColor: '#3b82f6',
                    iconBgColor: '#dbeafe',
                    route: '/(protected)/center-superintendent/edit-personal-details',
                },
            ],
        },
        {
            title: 'Support',
            items: [
                {
                    id: 'helpdesk',
                    title: 'Helpdesk',
                    subtitle: 'Get help and support',
                    icon: 'headset-outline',
                    iconColor: '#8b5cf6',
                    iconBgColor: '#ede9fe',
                    route: '/(protected)/center-superintendent/helpdesk',
                },
                {
                    id: 'faq',
                    title: 'FAQs',
                    subtitle: 'Frequently asked questions',
                    icon: 'help-circle-outline',
                    iconColor: '#f59e0b',
                    iconBgColor: '#fef3c7',
                    route: '/(protected)/center-superintendent/faq',
                },
            ],
        },
        {
            title: 'App Settings',
            items: [
                {
                    id: 'notifications',
                    title: 'Notifications',
                    subtitle: 'Manage notification preferences',
                    icon: 'notifications-outline',
                    iconColor: '#ef4444',
                    iconBgColor: '#fee2e2',
                    route: '/(protected)/center-superintendent/notification-settings',
                },
                {
                    id: 'about',
                    title: 'About App',
                    subtitle: 'Version 1.0.0',
                    icon: 'information-circle-outline',
                    iconColor: '#6b7280',
                    iconBgColor: '#f3f4f6',
                    action: () => {
                        Alert.alert(
                            'NBSE Connect',
                            'Version 1.0.0\n\n© 2024 NBSE. All rights reserved.\n\nBuilt for the Nagaland Board of School Education.',
                            [{ text: 'OK' }]
                        );
                    },
                },
            ],
        },
    ];

    const handleItemPress = (item: SettingsItem) => {
        if (item.action) {
            item.action();
        } else if (item.route) {
            router.push(item.route as any);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            {/* Profile Card */}
            <View style={styles.profileCard}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user?.name?.charAt(0)?.toUpperCase() || 'C'}
                        </Text>
                    </View>
                    <View style={styles.onlineIndicator} />
                </View>
                <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{user?.name || 'Center Superintendent'}</Text>
                    <Text style={styles.profileRole}>Center Superintendent</Text>
                    <Text style={styles.profileEmail}>{user?.email || 'cs@school.edu'}</Text>
                </View>
            </View>

            {/* Settings Sections */}
            {settingsSections.map((section) => (
                <View key={section.title} style={styles.section}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <View style={styles.sectionContent}>
                        {section.items.map((item, index) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.settingsItem,
                                    index < section.items.length - 1 && styles.settingsItemBorder,
                                ]}
                                onPress={() => handleItemPress(item)}
                            >
                                <View
                                    style={[
                                        styles.itemIconContainer,
                                        { backgroundColor: item.iconBgColor },
                                    ]}
                                >
                                    <Ionicons
                                        name={item.icon}
                                        size={20}
                                        color={item.iconColor}
                                    />
                                </View>
                                <View style={styles.itemContent}>
                                    <Text style={styles.itemTitle}>{item.title}</Text>
                                    {item.subtitle && (
                                        <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                                    )}
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ))}

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            {/* Footer */}
            <Text style={styles.footerText}>NBSE Connect v1.0.0</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    profileCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#0d9488',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#22c55e',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    profileInfo: {
        marginLeft: 16,
        flex: 1,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    profileRole: {
        fontSize: 14,
        color: '#0d9488',
        fontWeight: '500',
        marginTop: 2,
    },
    profileEmail: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 4,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginLeft: 4,
    },
    sectionContent: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    settingsItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    itemIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemContent: {
        flex: 1,
        marginLeft: 12,
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1f2937',
    },
    itemSubtitle: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fee2e2',
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 8,
        gap: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ef4444',
    },
    footerText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 24,
    },
});
