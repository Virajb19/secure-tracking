/**
 * Teacher Circulars Tab Screen
 * 
 * Displays important circulars and notices for teachers.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../../src/api/client';

interface Circular {
    id: string;
    circular_no: string;
    title: string;
    description?: string;
    file_url?: string;
    issued_by: string;
    issued_date: string;
    effective_date?: string;
    is_active: boolean;
    district_id?: string;
    school_id?: string;
    created_at: string;
    district?: { name: string };
    school?: { name: string };
    creator?: { name: string };
}

export default function CircularsTabScreen() {
    const [searchQuery, setSearchQuery] = useState('');

    const {
        data: circulars,
        isLoading,
        error,
        refetch,
        isRefetching,
    } = useQuery<Circular[]>({
        queryKey: ['teacher-circulars'],
        queryFn: async () => {
            try {
                const response = await apiClient.get('/circulars');
                // Backend returns { data, total, hasMore } - extract the data array
                return response.data?.data || response.data || [];
            } catch (err: any) {
                if (err.response?.status === 404) {
                    return [];
                }
                throw err;
            }
        },
    });

    const filteredCirculars = React.useMemo(() => {
        if (!circulars) return [];
        if (!searchQuery.trim()) return circulars;

        const query = searchQuery.toLowerCase();
        return circulars.filter(
            circular =>
                circular.title.toLowerCase().includes(query) ||
                (circular.description?.toLowerCase().includes(query)) ||
                circular.circular_no.toLowerCase().includes(query) ||
                circular.issued_by.toLowerCase().includes(query)
        );
    }, [circulars, searchQuery]);

    const getCircularStyle = () => {
        return { bg: '#e0f2fe', text: '#1e3a5f', border: '#bae6fd' };
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

    const handleViewFile = (fileUrl: string) => {
        if (fileUrl) {
            Linking.openURL(fileUrl);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1e3a5f" />
                <Text style={styles.loadingText}>Loading circulars...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text style={styles.errorText}>Failed to load circulars</Text>
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
                        placeholder="Search circulars..."
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

            {/* Circulars List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
            >
                {filteredCirculars && filteredCirculars.length > 0 ? (
                    filteredCirculars.map((circular) => {
                        const typeStyle = getCircularStyle();

                        return (
                            <View
                                key={circular.id}
                                style={[
                                    styles.circularCard,
                                    { borderLeftColor: typeStyle.text },
                                ]}
                            >
                                <View style={styles.circularHeader}>
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
                                            name="document-text"
                                            size={14}
                                            color={typeStyle.text}
                                        />
                                        <Text
                                            style={[
                                                styles.typeText,
                                                { color: typeStyle.text },
                                            ]}
                                        >
                                            {circular.circular_no}
                                        </Text>
                                    </View>
                                    <Text style={styles.dateText}>
                                        {formatDate(circular.issued_date)}
                                    </Text>
                                </View>

                                <Text style={styles.circularTitle}>{circular.title}</Text>
                                {circular.description && (
                                    <Text style={styles.circularContent} numberOfLines={3}>
                                        {circular.description}
                                    </Text>
                                )}

                                <View style={styles.metaInfo}>
                                    <Text style={styles.issuedByText}>Issued by: {circular.issued_by}</Text>
                                    {circular.school?.name && (
                                        <Text style={styles.schoolText}>{circular.school.name}</Text>
                                    )}
                                </View>

                                {circular.file_url && (
                                    <TouchableOpacity
                                        style={styles.attachmentButton}
                                        onPress={() => handleViewFile(circular.file_url!)}
                                    >
                                        <Ionicons name="attach" size={16} color="#1e3a5f" />
                                        <Text style={styles.attachmentText}>View Attachment</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
                        <Text style={styles.emptyTitle}>No Circulars</Text>
                        <Text style={styles.emptyText}>
                            No circulars available at the moment.
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
        backgroundColor: '#f3f4f6',
    },
    searchContainer: {
        padding: 16,
        paddingBottom: 8,
    },
    searchInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    searchTextInput: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
    },
    metaInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    issuedByText: {
        fontSize: 12,
        color: '#6b7280',
    },
    schoolText: {
        fontSize: 12,
        color: '#1e3a5f',
        fontWeight: '500',
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
    errorText: {
        marginTop: 12,
        fontSize: 16,
        color: '#ef4444',
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 16,
        backgroundColor: '#1e3a5f',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingTop: 8,
    },
    circularCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    circularHeader: {
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
        borderRadius: 6,
        borderWidth: 1,
        gap: 4,
    },
    typeText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    dateText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    circularTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
    },
    circularContent: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
    },
    attachmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        gap: 4,
    },
    attachmentText: {
        fontSize: 14,
        color: '#1e3a5f',
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 64,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6b7280',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 8,
    },
});
