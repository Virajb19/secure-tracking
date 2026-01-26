/**
 * Form 6C - Students (Class 11 & 12)
 * 
 * Form to enter student strength details for Class 11 and 12 by stream.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../src/api/client';
import { Ionicons } from '@expo/vector-icons';

interface ClassStrength {
    class_level: number;
    stream: string;
    class_name: string;
    boys: string;
    girls: string;
    sections: string;
}

const HIGHER_CLASSES = [
    { level: 11, stream: 'Arts', name: 'Class 11 (Arts)' },
    { level: 11, stream: 'Science', name: 'Class 11 (Science)' },
    { level: 11, stream: 'Commerce', name: 'Class 11 (Commerce)' },
    { level: 12, stream: 'Arts', name: 'Class 12 (Arts)' },
    { level: 12, stream: 'Science', name: 'Class 12 (Science)' },
    { level: 12, stream: 'Commerce', name: 'Class 12 (Commerce)' },
];

export default function Form6CHigherScreen() {
    const insets = useSafeAreaInsets();
    const [classData, setClassData] = useState<ClassStrength[]>(
        HIGHER_CLASSES.map(c => ({
            class_level: c.level,
            stream: c.stream,
            class_name: c.name,
            boys: '0',
            girls: '0',
            sections: '0',
        }))
    );
    const [confirmed, setConfirmed] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const queryClient = useQueryClient();

    // Fetch existing data
    const { data: existingData, isLoading, refetch } = useQuery({
        queryKey: ['form-6c-higher'],
        queryFn: async () => {
            const response = await apiClient.get('/form-6/student-strength-higher');
            return response.data;
        },
    });

    // Fetch school info
    const { data: profile } = useQuery({
        queryKey: ['faculty-profile'],
        queryFn: async () => {
            const response = await apiClient.get('/faculty/profile');
            return response.data;
        },
    });

    const schoolName = profile?.faculty?.school 
        ? `${profile.faculty.school.registration_code} - ${profile.faculty.school.name}`
        : 'Your School';

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    // Load existing data
    useEffect(() => {
        if (existingData?.strengths) {
            const updatedData = [...classData];
            existingData.strengths.forEach((s: any) => {
                const index = updatedData.findIndex(
                    c => c.class_level === s.class_level && c.stream === s.stream
                );
                if (index !== -1) {
                    updatedData[index] = {
                        ...updatedData[index],
                        boys: s.boys.toString(),
                        girls: s.girls.toString(),
                        sections: s.sections.toString(),
                    };
                }
            });
            setClassData(updatedData);
            setIsSubmitted(existingData.form_status === 'SUBMITTED' || existingData.form_status === 'APPROVED');
        }
    }, [existingData]);

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: async () => {
            const data = classData.map(c => ({
                class_level: c.class_level,
                stream: c.stream,
                boys: parseInt(c.boys) || 0,
                girls: parseInt(c.girls) || 0,
                sections: parseInt(c.sections) || 0,
            }));
            const response = await apiClient.post('/form-6/submit-6c-higher', { strengths: data });
            return response.data;
        },
        onSuccess: () => {
            setIsSubmitted(true);
            Alert.alert('Success', 'Form 6C (Class 11 & 12) submitted successfully!');
        },
        onError: (error: any) => {
            Alert.alert('Error', error.response?.data?.message || 'Failed to submit Form 6C');
        },
    });

    const updateClassData = (index: number, field: 'boys' | 'girls' | 'sections', value: string) => {
        const updated = [...classData];
        updated[index] = { ...updated[index], [field]: value };
        setClassData(updated);
    };

    const getTotals = () => {
        return classData.reduce(
            (acc, c) => ({
                boys: acc.boys + (parseInt(c.boys) || 0),
                girls: acc.girls + (parseInt(c.girls) || 0),
                sections: acc.sections + (parseInt(c.sections) || 0),
            }),
            { boys: 0, girls: 0, sections: 0 }
        );
    };

    const handleSubmit = () => {
        if (!confirmed) {
            Alert.alert('Confirmation Required', 'Please confirm the student data before submitting.');
            return;
        }
        submitMutation.mutate();
    };

    const totals = getTotals();

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0d9488" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

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
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Form 6C</Text>
                    <Text style={styles.headerSubtitle}>{schoolName}</Text>
                </View>
            </View>

            {/* Content */}
            <KeyboardAvoidingView 
                style={styles.cardContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView 
                    style={styles.scrollView} 
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {classData.map((classItem, index) => (
                        <View key={`${classItem.class_level}-${classItem.stream}`} style={styles.classSection}>
                            <Text style={styles.className}>{classItem.class_name}</Text>
                            
                            <View style={styles.inputRow}>
                                <View style={styles.inputColumn}>
                                    <Text style={styles.inputLabel}>Boys *</Text>
                                    <TextInput
                                        style={[styles.input, isSubmitted && styles.inputDisabled]}
                                        value={classItem.boys}
                                        onChangeText={(v) => updateClassData(index, 'boys', v)}
                                        keyboardType="numeric"
                                        editable={!isSubmitted}
                                    />
                                </View>
                                <View style={styles.inputColumn}>
                                    <Text style={styles.inputLabel}>Girls *</Text>
                                    <TextInput
                                        style={[styles.input, isSubmitted && styles.inputDisabled]}
                                        value={classItem.girls}
                                        onChangeText={(v) => updateClassData(index, 'girls', v)}
                                        keyboardType="numeric"
                                        editable={!isSubmitted}
                                    />
                                </View>
                                <View style={styles.inputColumn}>
                                    <Text style={styles.inputLabel}>Sections *</Text>
                                    <TextInput
                                        style={[styles.input, isSubmitted && styles.inputDisabled]}
                                        value={classItem.sections}
                                        onChangeText={(v) => updateClassData(index, 'sections', v)}
                                        keyboardType="numeric"
                                        editable={!isSubmitted}
                                    />
                                </View>
                            </View>
                            
                            <View style={styles.divider} />
                        </View>
                    ))}

                    {/* Totals Table */}
                    <View style={styles.totalsTable}>
                        <View style={styles.totalsHeader}>
                            <Text style={styles.totalsHeaderCell}>Total Boys</Text>
                            <Text style={styles.totalsHeaderCell}>Total Girls</Text>
                            <Text style={styles.totalsHeaderCell}>Total Sections</Text>
                        </View>
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsCell}>{totals.boys}</Text>
                            <Text style={styles.totalsCell}>{totals.girls}</Text>
                            <Text style={styles.totalsCell}>{totals.sections}</Text>
                        </View>
                    </View>

                    {/* Confirmation & Submit */}
                    {isSubmitted ? (
                        <>
                            <TouchableOpacity style={styles.submittedButton} disabled>
                                <Text style={styles.submittedButtonText}>Form 6C Submitted</Text>
                            </TouchableOpacity>
                            <View style={styles.acceptedBanner}>
                                <Text style={styles.acceptedText}>Your Form 6C Submission is accepted</Text>
                            </View>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity 
                                style={styles.confirmRow}
                                onPress={() => setConfirmed(!confirmed)}
                            >
                                <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
                                    {confirmed && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                                </View>
                                <Text style={styles.confirmText}>
                                    I confirm that all the mentioned students are part of the school as of 22nd January, 2026
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.submitButton, !confirmed && styles.submitButtonDisabled]}
                                onPress={handleSubmit}
                                disabled={!confirmed || submitMutation.isPending}
                            >
                                {submitMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Submit Form 6C (Class 11 & 12)</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
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
        paddingHorizontal: 16,
        paddingBottom: 40,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#d1d5db',
    },
    cardContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
        marginTop: -24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    classSection: {
        marginBottom: 4,
    },
    className: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    inputColumn: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: '#1f2937',
        backgroundColor: '#f9fafb',
        textAlign: 'center',
    },
    inputDisabled: {
        backgroundColor: '#e5e7eb',
        color: '#6b7280',
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        borderStyle: 'dashed',
        marginTop: 16,
        marginBottom: 16,
    },
    totalsTable: {
        borderWidth: 1,
        borderColor: '#1f2937',
        borderRadius: 4,
        marginTop: 8,
        overflow: 'hidden',
    },
    totalsHeader: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderBottomWidth: 1,
        borderBottomColor: '#1f2937',
    },
    totalsHeaderCell: {
        flex: 1,
        textAlign: 'center',
        paddingVertical: 10,
        fontSize: 13,
        fontWeight: '600',
        color: '#1f2937',
        borderRightWidth: 1,
        borderRightColor: '#1f2937',
    },
    totalsRow: {
        flexDirection: 'row',
    },
    totalsCell: {
        flex: 1,
        textAlign: 'center',
        paddingVertical: 12,
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        borderRightWidth: 1,
        borderRightColor: '#1f2937',
    },
    confirmRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 20,
        gap: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#0d9488',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#0d9488',
    },
    confirmText: {
        flex: 1,
        fontSize: 13,
        color: '#374151',
        lineHeight: 18,
    },
    submitButton: {
        backgroundColor: '#374151',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    submitButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    submittedButton: {
        backgroundColor: '#9ca3af',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    submittedButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    acceptedBanner: {
        backgroundColor: '#d1fae5',
        borderWidth: 1,
        borderColor: '#22c55e',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 12,
        alignItems: 'center',
    },
    acceptedText: {
        color: '#16a34a',
        fontSize: 14,
        fontWeight: '600',
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
});
