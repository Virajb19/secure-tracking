/**
 * Headmaster Circulars Tab Screen
 * 
 * Displays important circulars and notices.
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
        queryKey: ['circulars'],
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
        return { bg: '#ccfbf1', text: '#0d9488', border: '#99f6e4' };
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
                <ActivityIndicator size="large" color="#0d9488" />
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
                                    <Text style={styles.circularContent}>{circular.description}</Text>
                                )}
                                <View style={styles.metaInfo}>
                                    <Text style={styles.issuedByText}>Issued by: {circular.issued_by}</Text>
                                    {circular.school?.name && (
                                        <Text style={styles.schoolText}>{circular.school.name}</Text>
                                    )}
                                </View>
                                {circular.file_url && (
                                    <TouchableOpacity
                                        style={styles.downloadButton}
                                        onPress={() => handleViewFile(circular.file_url!)}
                                    >
                                        <Ionicons name="download-outline" size={16} color="#0d9488" />
                                        <Text style={styles.downloadText}>View Attachment</Text>
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
                            {searchQuery
                                ? 'No circulars match your search.'
                                : 'No circulars available at this time.'}
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
        color: '#0d9488',
        fontWeight: '500',
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
        elevation: 1,
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
    circularTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
    },
    circularContent: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#ccfbf1',
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    downloadText: {
        fontSize: 13,
        color: '#0d9488',
        fontWeight: '500',
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
        backgroundColor: '#0d9488',
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
        paddingTop: 80,
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
});
