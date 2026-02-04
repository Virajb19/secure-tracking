import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Linking,
    TextInput,
    Image,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import apiClient from '../../../../src/api/client';
import { getFileViewUrl } from '../../../../src/lib/appwrite';
import { 
    getMyBankDetails, 
    acceptPaperSetterNotice 
} from '../../../../src/services/paper-setter.service';

// No notices image URI
const NO_NOTICES_IMAGE_URI = 'https://raw.githubusercontent.com/AliARIOGLU/react-native-gif/main/assets/empty-box.gif';

interface Notice {
    id: string;
    title: string;
    content: string;
    type?: 'GENERAL' | 'PAPER_SETTER' | 'PAPER_CHECKER' | 'INVITATION' | 'PUSH_NOTIFICATION';
    subject?: string;
    venue?: string;
    event_time?: string;
    event_date?: string;
    file_url?: string;
    file_name?: string;
    published_at: string;
    created_at: string;
    creator?: {
        id: string;
        name: string;
    };
    // Paper Setter/Checker acceptance status
    acceptance_status?: 'PENDING' | 'ACCEPTED';
}

// Type-based styling configuration
const getTypeStyle = (type?: Notice['type']) => {
    switch (type) {
        case 'PAPER_SETTER':
            return {
                bg: '#dcfce7',
                text: '#15803d',
                border: '#86efac',
                icon: 'create-outline' as const,
                label: 'Paper Setter',
            };
        case 'PAPER_CHECKER':
            return {
                bg: '#fef3c7',
                text: '#b45309',
                border: '#fcd34d',
                icon: 'checkmark-done-outline' as const,
                label: 'Paper Checker',
            };
        case 'INVITATION':
            return {
                bg: '#f3e8ff',
                text: '#7c3aed',
                border: '#d8b4fe',
                icon: 'calendar-outline' as const,
                label: 'Invitation',
            };
        case 'PUSH_NOTIFICATION':
            return {
                bg: '#dbeafe',
                text: '#1d4ed8',
                border: '#93c5fd',
                icon: 'notifications-outline' as const,
                label: 'Notification',
            };
        default: // GENERAL
            return {
                bg: '#f1f5f9',
                text: '#475569',
                border: '#cbd5e1',
                icon: 'document-text-outline' as const,
                label: 'General',
            };
    }
};

export default function NoticesScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [hasBankDetails, setHasBankDetails] = useState<boolean>(false);
    const [acceptingNoticeId, setAcceptingNoticeId] = useState<string | null>(null);
    const queryClient = useQueryClient();
    
    // Check if user has bank details
    useEffect(() => {
        const checkBankDetails = async () => {
            const result = await getMyBankDetails();
            if (result.success) {
                setHasBankDetails(!!result.bankDetails);
            }
        };
        checkBankDetails();
    }, []);
    
    const {
        data: notices,
        isLoading,
        error,
        refetch,
        isRefetching,
    } = useQuery<Notice[]>({
        queryKey: ['notices'],
        queryFn: async () => {
            try {
                const response = await apiClient.get('/notices');
                return response.data;
            } catch (err: any) {
                // Return empty array if endpoint not found (not implemented yet)
                if (err.response?.status === 404) {
                    return [];
                }
                throw err;
            }
        },
    });

    // Filter notices based on search query
    const filteredNotices = useMemo(() => {
        if (!notices) return [];
        if (!searchQuery.trim()) return notices;
        
        const query = searchQuery.toLowerCase();
        return notices.filter(
            notice =>
                notice.title.toLowerCase().includes(query) ||
                notice.content.toLowerCase().includes(query)
        );
    }, [notices, searchQuery]);

    const formatEventDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatEventTime = (timeString?: string) => {
        if (!timeString) return '';
        // Time is in HH:MM format
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const openFile = async (fileId?: string) => {
        if (fileId) {
            try {
                const fileUrl = getFileViewUrl(fileId);
                const canOpen = await Linking.canOpenURL(fileUrl);
                if (canOpen) {
                    await Linking.openURL(fileUrl);
                } else {
                    Alert.alert('Error', 'Unable to open this file. Please try again later.');
                }
            } catch (err) {
                console.log('Failed to open file:', err);
                Alert.alert('Error', 'Failed to open attachment.');
            }
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;
        
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    /**
     * Handle accepting a paper setter/checker notice
     */
    const handleAcceptNotice = async (notice: Notice) => {
        // Check if user has bank details first
        if (!hasBankDetails) {
            Alert.alert(
                'Bank Details Required',
                'You must add your bank details before accepting this notice. This is required for payment processing.',
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

        // Confirm acceptance
        Alert.alert(
            'Accept Notice',
            `Are you sure you want to accept this ${notice.type === 'PAPER_SETTER' ? 'Paper Setter' : 'Paper Checker'} notice for ${notice.subject || 'this subject'}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Accept',
                    onPress: async () => {
                        setAcceptingNoticeId(notice.id);
                        const result = await acceptPaperSetterNotice(notice.id);
                        setAcceptingNoticeId(null);

                        if (result.success) {
                            Alert.alert(
                                'Notice Accepted',
                                'You have successfully accepted the notice. The admin has been notified.',
                                [{ text: 'OK' }]
                            );
                            // Refresh notices and bank details check
                            refetch();
                            queryClient.invalidateQueries({ queryKey: ['paper-setter-invitations'] });
                        } else {
                            // Check if error is about missing bank details
                            const isBankDetailsError = result.error?.toLowerCase().includes('bank details');
                            
                            Alert.alert(
                                isBankDetailsError ? 'Bank Details Required' : 'Error',
                                result.error || 'Failed to accept notice. Please try again.',
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

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading notices...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text style={styles.errorText}>Failed to load notices</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInput}>
                    <Ionicons name="search" size={20} color="#9ca3af" />
                    <TextInput
                        style={styles.searchTextInput}
                        placeholder="Search notices..."
                        placeholderTextColor="#9ca3af"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Notices List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
            >
                {filteredNotices && filteredNotices.length > 0 ? (
                    <>
                        {filteredNotices.map((notice) => {
                            const typeStyle = getTypeStyle(notice.type);
                            
                            return (
                                <View
                                    key={notice.id}
                                    style={[
                                        styles.noticeCard,
                                        { borderLeftColor: typeStyle.text },
                                    ]}
                                >
                                    {/* Header with Type Badge and Date */}
                                    <View style={styles.noticeHeader}>
                                        <View
                                            style={[
                                                styles.typeBadge,
                                                {
                                                    backgroundColor: typeStyle.bg,
                                                    borderColor: typeStyle.border,
                                                },
                                            ]}
                                        >
                                            <Ionicons
                                                name={typeStyle.icon}
                                                size={14}
                                                color={typeStyle.text}
                                            />
                                            <Text
                                                style={[
                                                    styles.typeText,
                                                    { color: typeStyle.text },
                                                ]}
                                            >
                                                {typeStyle.label}
                                            </Text>
                                        </View>
                                        <Text style={styles.dateText}>
                                            {formatDate(notice.published_at || notice.created_at)}
                                        </Text>
                                    </View>

                                    {/* Title */}
                                    <Text style={styles.noticeTitle}>{notice.title}</Text>

                                    {/* Subject for Paper Setter/Checker */}
                                    {(notice.type === 'PAPER_SETTER' || notice.type === 'PAPER_CHECKER') && notice.subject && (
                                        <View style={styles.subjectContainer}>
                                            <Ionicons name="book-outline" size={16} color="#6b7280" />
                                            <Text style={styles.subjectText}>Subject: {notice.subject}</Text>
                                        </View>
                                    )}

                                    {/* Invitation Details */}
                                    {notice.type === 'INVITATION' && (
                                        <View style={styles.invitationDetails}>
                                            {notice.venue && (
                                                <View style={styles.invitationRow}>
                                                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                                                    <Text style={styles.invitationText}>{notice.venue}</Text>
                                                </View>
                                            )}
                                            {notice.event_date && (
                                                <View style={styles.invitationRow}>
                                                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                                                    <Text style={styles.invitationText}>{formatEventDate(notice.event_date)}</Text>
                                                </View>
                                            )}
                                            {notice.event_time && (
                                                <View style={styles.invitationRow}>
                                                    <Ionicons name="time-outline" size={16} color="#6b7280" />
                                                    <Text style={styles.invitationText}>{formatEventTime(notice.event_time)}</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    {/* Content/Message */}
                                    <Text style={styles.noticeContent}>{notice.content}</Text>

                                    {/* File Attachment */}
                                    {notice.file_url && (
                                        <TouchableOpacity 
                                            style={styles.fileButton}
                                            onPress={() => openFile(notice.file_url)}
                                        >
                                            <Ionicons name="attach" size={16} color="#3b82f6" />
                                            <Text style={styles.fileButtonText}>
                                                {notice.file_name || 'View Attachment'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Accept Button for Paper Setter/Checker */}
                                    {(notice.type === 'PAPER_SETTER' || notice.type === 'PAPER_CHECKER') && (
                                        <View style={styles.acceptSection}>
                                            {notice.acceptance_status === 'ACCEPTED' ? (
                                                <View style={styles.acceptedBadge}>
                                                    <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                                                    <Text style={styles.acceptedText}>Accepted</Text>
                                                </View>
                                            ) : (
                                                <>
                                                    {!hasBankDetails && (
                                                        <TouchableOpacity
                                                            style={styles.bankDetailsWarning}
                                                            onPress={() => router.push('/(protected)/teacher/bank-details' as any)}
                                                        >
                                                            <Ionicons name="alert-circle" size={16} color="#f59e0b" />
                                                            <Text style={styles.bankDetailsWarningText}>
                                                                Add bank details to accept
                                                            </Text>
                                                            <Ionicons name="chevron-forward" size={16} color="#f59e0b" />
                                                        </TouchableOpacity>
                                                    )}
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.acceptButton,
                                                            !hasBankDetails && styles.acceptButtonDisabled,
                                                        ]}
                                                        onPress={() => handleAcceptNotice(notice)}
                                                        disabled={acceptingNoticeId === notice.id}
                                                    >
                                                        {acceptingNoticeId === notice.id ? (
                                                            <ActivityIndicator size="small" color="#ffffff" />
                                                        ) : (
                                                            <>
                                                                <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                                                                <Text style={styles.acceptButtonText}>Accept Notice</Text>
                                                            </>
                                                        )}
                                                    </TouchableOpacity>
                                                </>
                                            )}
                                        </View>
                                    )}

                                    {/* Author */}
                                    {/* {notice.creator?.name && (
                                        <Text style={styles.authorText}>— {notice.creator.name}</Text>
                                    )} */}
                                </View>
                            );
                        })}
                    </>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Image 
                            source={{ uri: NO_NOTICES_IMAGE_URI }}
                            style={styles.emptyGif}
                            resizeMode="contain"
                        />
                        <Text style={styles.emptyTitle}>No Notices</Text>
                        <Text style={styles.emptyText}>
                            {searchQuery
                                ? 'No notices match your search.'
                                : 'There are no important notices at this time. Check back later for updates.'}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    searchInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
    },
    searchTextInput: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    noticeCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    noticeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        gap: 4,
    },
    typeText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    dateText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    noticeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
    },
    noticeContent: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
    },
    authorText: {
        fontSize: 13,
        color: '#6b7280',
        fontStyle: 'italic',
        marginTop: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
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
        backgroundColor: '#f9fafb',
        padding: 24,
    },
    errorText: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 12,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 40,
    },
    emptyGif: {
        width: 200,
        height: 200,
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
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 32,
    },
    // New styles for type-based UI
    subjectContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 12,
        gap: 8,
    },
    subjectText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    invitationDetails: {
        backgroundColor: '#faf5ff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        gap: 8,
    },
    invitationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    invitationText: {
        fontSize: 14,
        color: '#374151',
    },
    fileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 12,
        gap: 6,
        alignSelf: 'flex-start',
    },
    fileButtonText: {
        fontSize: 13,
        color: '#3b82f6',
        fontWeight: '500',
    },
    // Accept Button Styles
    acceptSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    acceptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#16a34a',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    acceptButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    acceptButtonText: {
        fontSize: 14,
        color: '#ffffff',
        fontWeight: '600',
    },
    acceptedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#dcfce7',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    acceptedText: {
        fontSize: 14,
        color: '#16a34a',
        fontWeight: '600',
    },
    bankDetailsWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        marginBottom: 12,
        gap: 8,
    },
    bankDetailsWarningText: {
        flex: 1,
        fontSize: 13,
        color: '#b45309',
        fontWeight: '500',
    },
});
