/**
 * Teacher Routes Layout
 * 
 * Layout for all teacher-specific screens.
 * Includes tabs and stack screens.
 */

import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function TeacherLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#1e3a5f',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                    fontWeight: '600',
                },
                contentStyle: { backgroundColor: '#f3f4f6' },
            }}
        >
            <Stack.Screen
                name="(tabs)"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="complete-profile"
                options={{
                    title: 'Complete Profile',
                    headerBackTitle: 'Back',
                }}
            />
            <Stack.Screen
                name="view-profile"
                options={{
                    title: 'View Profile',
                    headerBackTitle: 'Back',
                }}
            />
            <Stack.Screen
                name="helpdesk"
                options={{
                    title: 'Helpdesk',
                    headerBackTitle: 'Back',
                }}
            />
            <Stack.Screen
                name="events"
                options={{
                    title: 'School Events',
                    headerBackTitle: 'Back',
                }}
            />
            <Stack.Screen
                name="paper-setter-invitations"
                options={{
                    title: 'Paper Setter Invitations',
                    headerBackTitle: 'Back',
                }}
            />
            <Stack.Screen
                name="bank-details"
                options={{
                    title: 'Bank Details',
                    headerBackTitle: 'Back',
                }}
            />
            <Stack.Screen
                name="colleagues"
                options={{
                    title: 'Colleagues',
                    headerBackTitle: 'Back',
                }}
            />
            <Stack.Screen
                name="notices"
                options={{
                    title: 'Important Notices',
                    headerBackTitle: 'Back',
                }}
            />
        </Stack>
    );
}

const styles = StyleSheet.create({
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    logo: {
        width: 32,
        height: 32,
        marginRight: 8,
    },
    logoutButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    logoutText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '500',
    },
});
