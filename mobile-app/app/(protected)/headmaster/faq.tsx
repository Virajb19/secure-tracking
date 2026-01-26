/**
 * FAQ Screen - Headmaster
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
        question: 'How do I submit Form 6?',
        answer: 'Go to the Home tab and tap on "Form 6 Submit". You will see different sections (6A, 6B, 6C, 6D) that need to be completed. Fill in each section with accurate information about your school\'s staff and students, then submit.',
    },
    {
        id: '2',
        question: 'How do I add a new event?',
        answer: 'Navigate to the Events tab from the bottom navigation bar. Tap the "+" button at the bottom right corner to create a new event. Fill in the event details like title, date, time, and description, then save.',
    },
    {
        id: '3',
        question: 'How do I view staff details?',
        answer: 'From the Home tab, tap on "View Colleagues" to see all teaching and non-teaching staff registered at your school. You can view their profiles, qualifications, and verification status.',
    },
    {
        id: '4',
        question: 'How do I update my profile?',
        answer: 'Go to the Profile tab (last icon in the bottom bar), then tap on "Edit Profile" to update your personal information, qualifications, and other details.',
    },
    {
        id: '5',
        question: 'What is the verification process for staff?',
        answer: 'As a headmaster, you can verify staff members by viewing their profiles and approving or rejecting their registrations. This helps maintain accurate records of your school\'s staff.',
    },
    {
        id: '6',
        question: 'How do I contact support?',
        answer: 'Go to Profile tab and tap on "Helpdesk". You can call our support team, send an email, submit a support ticket, or chat with us on WhatsApp.',
    },
    {
        id: '7',
        question: 'How do I view circulars?',
        answer: 'Tap on the "Circulars" tab in the bottom navigation to view all circulars and important notices from NBSE. You can search and filter circulars by type.',
    },
    {
        id: '8',
        question: 'What happens after I submit Form 6?',
        answer: 'After submission, your Form 6 will be reviewed by NBSE officials. You can track the status of your submission from the Form 6 section. You will receive notifications about any updates.',
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
                        onPress={() => router.push('/(protected)/headmaster/helpdesk')}
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
        marginLeft: 36,
    },
    answer: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 22,
    },
    contactSection: {
        marginTop: 24,
        alignItems: 'center',
    },
    contactTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0d9488',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 10,
        gap: 8,
    },
    contactButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
});
