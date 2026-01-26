/**
 * FAQ Screen - Center Superintendent
 * 
 * Frequently asked questions and answers.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

const faqData: FAQItem[] = [
    {
        id: '1',
        question: 'How do I complete my profile?',
        answer: 'Go to the Home tab and tap on "Complete Profile". Fill in all required fields including your school, qualification, and experience details, then submit.',
    },
    {
        id: '2',
        question: 'How do I view upcoming events?',
        answer: 'Navigate to the Events tab from the bottom navigation bar. You will see all upcoming events, meetings, and important dates.',
    },
    {
        id: '3',
        question: 'How do I view colleagues?',
        answer: 'From the Home tab, tap on "View Colleagues" to see faculty members at your school who share similar roles or subjects.',
    },
    {
        id: '4',
        question: 'How do I update my profile?',
        answer: 'Go to the Settings tab (last icon in the bottom bar), then tap on "Edit Profile" to update your personal information.',
    },
    {
        id: '5',
        question: 'How do I view circulars?',
        answer: 'Tap on the "Circulars" tab in the bottom navigation to view all circulars and important notices from NBSE.',
    },
    {
        id: '6',
        question: 'How do I contact support?',
        answer: 'Go to Settings tab and tap on "Helpdesk". You can call our support team, send an email, or chat with us on WhatsApp.',
    },
];

export default function FAQScreen() {
    const insets = useSafeAreaInsets();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

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
                <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.subtitle}>
                    Find answers to commonly asked questions
                </Text>

                {faqData.map((faq) => (
                    <TouchableOpacity
                        key={faq.id}
                        style={styles.faqCard}
                        onPress={() => toggleExpand(faq.id)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.questionRow}>
                            <View style={styles.questionIcon}>
                                <Ionicons
                                    name="help-circle"
                                    size={24}
                                    color="#0d9488"
                                />
                            </View>
                            <Text style={styles.question}>{faq.question}</Text>
                            <Ionicons
                                name={expandedId === faq.id ? 'chevron-up' : 'chevron-down'}
                                size={20}
                                color="#6b7280"
                            />
                        </View>
                        {expandedId === faq.id && (
                            <View style={styles.answerContainer}>
                                <Text style={styles.answer}>{faq.answer}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}

                {/* Contact Section */}
                <View style={styles.contactSection}>
                    <Text style={styles.contactTitle}>Still have questions?</Text>
                    <TouchableOpacity
                        style={styles.contactButton}
                        onPress={() => router.push('/(protected)/center-superintendent/helpdesk')}
                    >
                        <Ionicons name="headset-outline" size={20} color="#ffffff" />
                        <Text style={styles.contactButtonText}>Contact Support</Text>
                    </TouchableOpacity>
                </View>
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
        backgroundColor: '#374151',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 16,
        paddingHorizontal: 16,
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
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 20,
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
    questionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    questionIcon: {
        marginRight: 12,
    },
    question: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
    },
    answerContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    answer: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
        marginLeft: 36,
    },
    contactSection: {
        alignItems: 'center',
        marginTop: 24,
        padding: 24,
        backgroundColor: '#ffffff',
        borderRadius: 12,
    },
    contactTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 16,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0d9488',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        gap: 8,
    },
    contactButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
    },
});
