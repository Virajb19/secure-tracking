/**
 * Center Superintendent Helpdesk Screen
 * 
 * Provides support options and ticket submission.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Linking,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '../../../src/api/client';

interface SupportOption {
    id: string;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBgColor: string;
    action: () => void;
}

interface HelpdeskTicket {
    id: string;
    full_name: string;
    phone: string;
    message: string;
    is_resolved: boolean;
    created_at: string;
}

export default function HelpdeskScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [showTicketForm, setShowTicketForm] = useState(false);
    const [message, setMessage] = useState('');

    // Fetch user's tickets
    const { data: myTickets, refetch: refetchTickets } = useQuery<HelpdeskTicket[]>({
        queryKey: ['my-helpdesk-tickets'],
        queryFn: async () => {
            const response = await apiClient.get('/helpdesk/my-tickets');
            return response.data;
        },
    });

    const submitTicketMutation = useMutation({
        mutationFn: async (data: { message: string }) => {
            const response = await apiClient.post('/helpdesk', data);
            return response.data;
        },
        onSuccess: () => {
            Alert.alert(
                'Success',
                'Your support ticket has been submitted. Our team will get back to you within 24-48 hours.',
                [{ text: 'OK', onPress: () => setShowTicketForm(false) }]
            );
            setMessage('');
            refetchTickets();
        },
        onError: (error: any) => {
            Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to submit ticket. Please try again.'
            );
        },
    });

    const handleSubmitTicket = () => {
        if (!message.trim() || message.length < 10) {
            Alert.alert('Error', 'Please describe your issue (minimum 10 characters)');
            return;
        }
        submitTicketMutation.mutate({ message });
    };

    const supportOptions: SupportOption[] = [
        {
            id: 'email',
            title: 'Email Support',
            description: 'Send us an email at support@nbse.edu.in',
            icon: 'mail-outline',
            iconColor: '#3b82f6',
            iconBgColor: '#dbeafe',
            action: () => {
                Linking.openURL('mailto:support@nbse.edu.in?subject=Support Request - NBSE Connect');
            },
        },
        {
            id: 'ticket',
            title: 'Submit Ticket',
            description: 'Create a support ticket for detailed assistance',
            icon: 'ticket-outline',
            iconColor: '#8b5cf6',
            iconBgColor: '#ede9fe',
            action: () => setShowTicketForm(true),
        },
    ];

    const faqItems = [
        {
            question: 'How do I complete my profile?',
            answer: 'Go to the Home tab and tap on "Complete Profile". Fill in all the required fields and submit.',
        },
        {
            question: 'How do I view events?',
            answer: 'Navigate to the Events tab from the bottom navigation to see all upcoming events.',
        },
        {
            question: 'How do I view circulars?',
            answer: 'Tap on the Circulars tab in the bottom navigation to view all circulars and notices.',
        },
        {
            question: 'How do I update my profile?',
            answer: 'Go to Settings tab and tap on "Edit Profile" to update your personal information.',
        },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Helpdesk</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {!showTicketForm ? (
                    <>
                        {/* Hero Section */}
                        <View style={styles.heroSection}>
                            <View style={styles.heroIcon}>
                                <Ionicons name="headset" size={48} color="#0d9488" />
                            </View>
                            <Text style={styles.heroTitle}>How can we help you?</Text>
                            <Text style={styles.heroSubtitle}>
                                Choose from the options below or browse our FAQs
                            </Text>
                        </View>

                        {/* Support Options */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Contact Us</Text>
                            <View style={styles.optionsGrid}>
                                {supportOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.id}
                                        style={styles.optionCard}
                                        onPress={option.action}
                                    >
                                        <View
                                            style={[
                                                styles.optionIcon,
                                                { backgroundColor: option.iconBgColor },
                                            ]}
                                        >
                                            <Ionicons
                                                name={option.icon}
                                                size={24}
                                                color={option.iconColor}
                                            />
                                        </View>
                                        <Text style={styles.optionTitle}>{option.title}</Text>
                                        <Text style={styles.optionDescription}>
                                            {option.description}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Quick FAQs */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Quick FAQs</Text>
                            {faqItems.map((item, index) => (
                                <View key={index} style={styles.faqCard}>
                                    <View style={styles.faqQuestion}>
                                        <Ionicons name="help-circle" size={20} color="#0d9488" />
                                        <Text style={styles.faqQuestionText}>{item.question}</Text>
                                    </View>
                                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                                </View>
                            ))}
                        </View>

                        {/* My Tickets */}
                        {myTickets && myTickets.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>My Recent Tickets</Text>
                                {myTickets.slice(0, 3).map((ticket) => (
                                    <View key={ticket.id} style={styles.ticketCard}>
                                        <View style={styles.ticketHeader}>
                                            <View style={[
                                                styles.ticketStatus,
                                                { backgroundColor: ticket.is_resolved ? '#dcfce7' : '#fef3c7' }
                                            ]}>
                                                <Text style={[
                                                    styles.ticketStatusText,
                                                    { color: ticket.is_resolved ? '#16a34a' : '#d97706' }
                                                ]}>
                                                    {ticket.is_resolved ? 'Resolved' : 'Pending'}
                                                </Text>
                                            </View>
                                            <Text style={styles.ticketDate}>
                                                {new Date(ticket.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <Text style={styles.ticketMessage} numberOfLines={2}>
                                            {ticket.message}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                ) : (
                    /* Ticket Form */
                    <View style={styles.ticketForm}>
                        <View style={styles.formHeader}>
                            <Text style={styles.formTitle}>Submit Support Ticket</Text>
                            <TouchableOpacity onPress={() => setShowTicketForm(false)}>
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Message */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Describe your issue</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Please describe your issue in detail (minimum 10 characters)..."
                                placeholderTextColor="#9ca3af"
                                multiline
                                numberOfLines={8}
                                textAlignVertical="top"
                                value={message}
                                onChangeText={setMessage}
                            />
                            <Text style={styles.charCount}>{message.length}/1000</Text>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                submitTicketMutation.isPending && styles.submitButtonDisabled,
                            ]}
                            onPress={handleSubmitTicket}
                            disabled={submitTicketMutation.isPending}
                        >
                            {submitTicketMutation.isPending ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <>
                                    <Ionicons name="send" size={20} color="#ffffff" />
                                    <Text style={styles.submitButtonText}>Submit Ticket</Text>
                                </>
                            )}
                        </TouchableOpacity>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#374151',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    heroIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ccfbf1',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    optionsGrid: {
        gap: 12,
    },
    optionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    optionIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    optionDescription: {
        fontSize: 13,
        color: '#6b7280',
    },
    faqCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    faqQuestion: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    faqQuestionText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        flex: 1,
    },
    faqAnswer: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
        marginLeft: 28,
    },
    ticketForm: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
    },
    formHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1f2937',
    },
    textArea: {
        minHeight: 160,
        paddingTop: 12,
    },
    charCount: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'right',
        marginTop: 4,
    },
    submitButton: {
        backgroundColor: '#0d9488',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 10,
        gap: 8,
        marginTop: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    ticketCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    ticketHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    ticketStatus: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    ticketStatusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    ticketDate: {
        fontSize: 12,
        color: '#6b7280',
    },
    ticketMessage: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
    },
});
