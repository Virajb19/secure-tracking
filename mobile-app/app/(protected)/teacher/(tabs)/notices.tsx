import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../../src/api/client';

// No notices image URI
const NO_NOTICES_IMAGE_URI = 'https://raw.githubusercontent.com/AliARIOGLU/react-native-gif/main/assets/empty-box.gif';

interface Notice {
    id: string;
    title: string;
    content: string;
    type?: 'General' | 'Paper Setter' | 'Paper Checker' | 'Invitation' | 'Push Notification';
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
}

// Type-based styling configuration
const getTypeStyle = (type?: Notice['type']) => {
    switch (type) {
        case 'Paper Setter':
            return {
                bg: '#f0fdf4',
                text: '#16a34a',
                border: '#bbf7d0',
                icon: 'create-outline' as const,
                label: 'Paper Setter',
            };
        case 'Paper Checker':
            return {
                bg: '#fef3c7',
                text: '#d97706',
                border: '#fde68a',
                icon: 'checkmark-done-outline' as const,
                label: 'Paper Checker',
            };
        case 'Invitation':
            return {
                bg: '#fae8ff',
                text: '#a855f7',
                border: '#f5d0fe',
                icon: 'calendar-outline' as const,
                label: 'Invitation',
            };
        case 'Push Notification':
            return {
                bg: '#dbeafe',
                text: '#2563eb',
                border: '#bfdbfe',
                icon: 'notifications-outline' as const,
                label: 'Notification',
            };
        default: // General
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

    const openFile = async (url?: string) => {
        if (url) {
            try {
                await Linking.openURL(url);
            } catch (err) {
                console.log('Failed to open file:', err);
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
                                    {(notice.type === 'Paper Setter' || notice.type === 'Paper Checker') && notice.subject && (
                                        <View style={styles.subjectContainer}>
                                            <Ionicons name="book-outline" size={16} color="#6b7280" />
                                            <Text style={styles.subjectText}>Subject: {notice.subject}</Text>
                                        </View>
                                    )}

                                    {/* Invitation Details */}
                                    {notice.type === 'Invitation' && (
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
});
