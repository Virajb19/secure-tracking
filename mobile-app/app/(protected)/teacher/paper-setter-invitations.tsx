/**
 * Paper Setter Invitations Screen
 * 
 * Shows pending paper setter/examiner invitations for teachers.
 * Teachers can accept invitations if they have bank details on file.
 * 
 * Features:
 * - List of pending invitations
 * - Accept invitation button
 * - Bank details requirement check
 * - Navigate to bank details form if needed
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
    fetchMyInvitations,
    acceptInvitation,
    getMyBankDetails,
    PaperSetterInvitation,
} from '../../../src/services/paper-setter.service';

/**
 * Type label mapping
 */
const TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    PAPER_SETTER: { label: 'Paper Setter', color: '#3b82f6', icon: '📝' },
    HEAD_EXAMINER: { label: 'Head Examiner', color: '#8b5cf6', icon: '👨‍🏫' },
    ADDITIONAL_HE: { label: 'Additional HE', color: '#f59e0b', icon: '📋' },
    SCRUTINIZER: { label: 'Scrutinizer', color: '#10b981', icon: '🔍' },
};

export default function PaperSetterInvitationsScreen() {
    const [invitations, setInvitations] = useState<PaperSetterInvitation[]>([]);
    const [hasBankDetails, setHasBankDetails] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * Load invitations and check bank details status
     */
    const loadData = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setError(null);

        // Fetch invitations and bank details in parallel
        const [invitationsResult, bankDetailsResult] = await Promise.all([
            fetchMyInvitations(),
            getMyBankDetails(),
        ]);

        if (invitationsResult.success) {
            // Show only INVITED (pending) invitations
            const pending = invitationsResult.invitations?.filter(
                inv => inv.status === 'INVITED'
            ) || [];
            setInvitations(pending);
        } else {
            setError(invitationsResult.error || 'Failed to load invitations');
        }

        if (bankDetailsResult.success) {
            setHasBankDetails(!!bankDetailsResult.bankDetails);
        }

        setIsLoading(false);
        setIsRefreshing(false);
    }, []);

    // Load on focus
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    /**
     * Handle accept invitation
     */
    const handleAccept = async (invitation: PaperSetterInvitation) => {
        if (!hasBankDetails) {
            Alert.alert(
                'Bank Details Required',
                'You must add your bank details before accepting an invitation. This is required for payment processing.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Add Bank Details',
                        onPress: () => router.push('/(protected)/teacher/bank-details' as any),
                    },
                ]
            );
            return;
        }

        Alert.alert(
            'Accept Invitation',
            `Are you sure you want to accept the ${TYPE_LABELS[invitation.type]?.label || invitation.type} role for ${invitation.subject}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Accept',
                    onPress: async () => {
                        setAcceptingId(invitation.id);
                        const result = await acceptInvitation(invitation.id);
                        setAcceptingId(null);

                        if (result.success) {
                            Alert.alert(
                                'Invitation Accepted',
                                'You have successfully accepted the invitation. You will be notified with further details.',
                                [{ text: 'OK' }]
                            );
                            // Reload to update list
                            loadData();
                        } else {
                            // Check if error is about missing bank details
                            const isBankDetailsError = result.error?.toLowerCase().includes('bank details');
                            
                            Alert.alert(
                                isBankDetailsError ? 'Bank Details Required' : 'Error',
                                result.error || 'Failed to accept invitation. Please try again.',
                                [
                                    { text: 'OK' },
                                    ...(isBankDetailsError ? [{
                                        text: 'Add Bank Details',
                                        onPress: () => router.push('/(protected)/teacher/bank-details' as any),
                                    }] : [])
                                ]
                            );
                        }
                    },
                },
            ]
        );
    };

    /**
     * Render loading state
     */
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1e3a5f" />
                <Text style={styles.loadingText}>Loading invitations...</Text>
            </View>
        );
    }

    /**
     * Render error state
     */
    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="warning-outline" size={48} color="#ef4444" />
                <Text style={styles.errorTitle}>Failed to Load</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => loadData()}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={() => loadData(true)}
                    colors={['#1e3a5f']}
                    tintColor="#1e3a5f"
                />
            }
        >
            {/* Bank Details Warning */}
            {!hasBankDetails && (
                <TouchableOpacity
                    style={styles.warningCard}
                    onPress={() => router.push('/(protected)/teacher/bank-details' as any)}
                >
                    <View style={styles.warningIcon}>
                        <Ionicons name="alert-circle" size={24} color="#f59e0b" />
                    </View>
                    <View style={styles.warningContent}>
                        <Text style={styles.warningTitle}>Bank Details Required</Text>
                        <Text style={styles.warningText}>
                            Add your bank details to accept invitations
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
                </TouchableOpacity>
            )}

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Pending Invitations</Text>
                <Text style={styles.headerSubtitle}>
                    {invitations.length} invitation{invitations.length !== 1 ? 's' : ''} pending
                </Text>
            </View>

            {/* Invitations List */}
            {invitations.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="mail-open-outline" size={64} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>No Pending Invitations</Text>
                    <Text style={styles.emptyText}>
                        You don't have any pending invitations at the moment.
                    </Text>
                </View>
            ) : (
                invitations.map((invitation) => {
                    const typeInfo = TYPE_LABELS[invitation.type] || {
                        label: invitation.type,
                        color: '#6b7280',
                        icon: '📄',
                    };
                    const isAccepting = acceptingId === invitation.id;

                    return (
                        <View key={invitation.id} style={styles.invitationCard}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardIcon}>{typeInfo.icon}</Text>
                                <View style={styles.cardTitleContainer}>
                                    <Text style={[styles.cardType, { color: typeInfo.color }]}>
                                        {typeInfo.label}
                                    </Text>
                                    <Text style={styles.cardSubject}>{invitation.subject}</Text>
                                </View>
                            </View>

                            <View style={styles.cardDetails}>
                                <View style={styles.detailRow}>
                                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                                    <Text style={styles.detailText}>
                                        Academic Year: {invitation.academic_year}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="time-outline" size={16} color="#6b7280" />
                                    <Text style={styles.detailText}>
                                        Invited on: {new Date(invitation.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.acceptButton,
                                    !hasBankDetails && styles.acceptButtonDisabled,
                                ]}
                                onPress={() => handleAccept(invitation)}
                                disabled={isAccepting}
                            >
                                {isAccepting ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                                        <Text style={styles.acceptButtonText}>Accept Invitation</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    );
                })
            )}

            {/* Bottom padding */}
            <View style={{ height: 24 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    content: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        padding: 24,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginTop: 16,
    },
    errorText: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 8,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#1e3a5f',
        borderRadius: 8,
    },
    retryText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    warningCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#fcd34d',
    },
    warningIcon: {
        marginRight: 12,
    },
    warningContent: {
        flex: 1,
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#92400e',
    },
    warningText: {
        fontSize: 12,
        color: '#b45309',
        marginTop: 2,
    },
    header: {
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 8,
        textAlign: 'center',
    },
    invitationCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    cardTitleContainer: {
        flex: 1,
    },
    cardType: {
        fontSize: 16,
        fontWeight: '600',
    },
    cardSubject: {
        fontSize: 14,
        color: '#374151',
        marginTop: 2,
    },
    cardDetails: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    detailText: {
        fontSize: 13,
        color: '#6b7280',
        marginLeft: 8,
    },
    acceptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10b981',
        borderRadius: 8,
        paddingVertical: 12,
        gap: 8,
    },
    acceptButtonDisabled: {
        backgroundColor: '#d1d5db',
    },
    acceptButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
});
