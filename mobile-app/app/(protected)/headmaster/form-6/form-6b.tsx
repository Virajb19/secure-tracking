/**
 * Form 6B - Non-Teaching Staff
 * 
 * Form to add/edit non-teaching staff details including fourth-grade staff.
 */

import React, { useState, useCallback } from 'react';
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

interface NonTeachingStaff {
    id: string;
    full_name: string;
    qualification: string;
    nature_of_work: string;
    years_of_service: number;
    phone: string;
}

type FormStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED';

export default function Form6BScreen() {
    const insets = useSafeAreaInsets();
    const [fullName, setFullName] = useState('');
    const [qualification, setQualification] = useState('');
    const [yearsOfService, setYearsOfService] = useState('');
    const [natureOfWork, setNatureOfWork] = useState('');
    const [phone, setPhone] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formStatus, setFormStatus] = useState<FormStatus>('NOT_SUBMITTED');
    const [rejectionReason, setRejectionReason] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // Fetch existing non-teaching staff
    const { data: staffData, isLoading, refetch } = useQuery({
        queryKey: ['form-6b-staff'],
        queryFn: async () => {
            const response = await apiClient.get('/form-6/non-teaching-staff');
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

    const existingStaff: NonTeachingStaff | null = staffData?.staff || null;

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    // Load existing data when available
    React.useEffect(() => {
        if (existingStaff) {
            setFullName(existingStaff.full_name);
            setQualification(existingStaff.qualification);
            setYearsOfService((existingStaff.years_of_service ?? 0).toString());
            setNatureOfWork(existingStaff.nature_of_work);
            setPhone(existingStaff.phone);
            setEditingId(existingStaff.id);
        }
        if (staffData?.form_status) {
            setFormStatus(staffData.form_status);
            if (staffData.rejection_reason) {
                setRejectionReason(staffData.rejection_reason);
            }
        }
    }, [existingStaff, staffData]);

    // Save non-teaching staff
    const saveMutation = useMutation({
        mutationFn: async (data: {
            full_name: string;
            qualification: string;
            nature_of_work: string;
            years_of_service: number;
            phone: string;
        }) => {
            if (editingId) {
                const response = await apiClient.patch(`/form-6/non-teaching-staff/${editingId}`, data);
                return response.data;
            } else {
                const response = await apiClient.post('/form-6/non-teaching-staff', data);
                return response.data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['form-6b-staff'] });
            Alert.alert('Success', 'Non-teaching staff details saved successfully!');
        },
        onError: (error: any) => {
            Alert.alert('Error', error.response?.data?.message || 'Failed to save details');
        },
    });

    // Submit Form 6B
    const submitMutation = useMutation({
        mutationFn: async () => {
            const response = await apiClient.post('/form-6/submit-6b');
            return response.data;
        },
        onSuccess: () => {
            setFormStatus('SUBMITTED');
            Alert.alert('Success', 'Form 6B submitted successfully!');
        },
        onError: (error: any) => {
            Alert.alert('Error', error.response?.data?.message || 'Failed to submit Form 6B');
        },
    });

    const handleSave = () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Please enter full name');
            return;
        }
        if (!qualification.trim()) {
            Alert.alert('Error', 'Please enter qualification');
            return;
        }
        if (!natureOfWork.trim()) {
            Alert.alert('Error', 'Please enter nature of work');
            return;
        }
        if (!phone.trim()) {
            Alert.alert('Error', 'Please enter phone number');
            return;
        }

        saveMutation.mutate({
            full_name: fullName.trim(),
            qualification: qualification.trim(),
            nature_of_work: natureOfWork.trim(),
            years_of_service: parseInt(yearsOfService) || 0,
            phone: phone.trim(),
        });
    };

    const handleSubmit = () => {
        if (!editingId) {
            Alert.alert('Error', 'Please save the details first before submitting.');
            return;
        }
        submitMutation.mutate();
    };

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
                    <Text style={styles.headerTitle}>Form 6B</Text>
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
                    <Text style={styles.sectionTitle}>Non-Teaching Staff</Text>

                    {(() => {
                        const isEditable = formStatus !== 'SUBMITTED' && formStatus !== 'APPROVED';
                        return (
                            <>
                                {/* Full Name */}
                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Full Name *</Text>
                                    <TextInput
                                        style={[styles.input, !isEditable && styles.inputDisabled]}
                                        value={fullName}
                                        onChangeText={setFullName}
                                        placeholder="Enter full name"
                                        editable={isEditable}
                                    />
                                </View>

                                {/* Two-column row */}
                                <View style={styles.row}>
                                    <View style={styles.halfField}>
                                        <Text style={styles.label}>Highest Qualification *</Text>
                                        <TextInput
                                            style={[styles.input, !isEditable && styles.inputDisabled]}
                                            value={qualification}
                                            onChangeText={setQualification}
                                            placeholder="e.g. PU, BA"
                                            editable={isEditable}
                                        />
                                    </View>
                                    <View style={styles.halfField}>
                                        <Text style={styles.label}>Length of Service *</Text>
                                        <TextInput
                                            style={[styles.input, !isEditable && styles.inputDisabled]}
                                            value={yearsOfService}
                                            onChangeText={setYearsOfService}
                                            placeholder="Years"
                                            keyboardType="numeric"
                                            editable={isEditable}
                                        />
                                    </View>
                                </View>

                                {/* Nature of Work & Phone */}
                                <View style={styles.row}>
                                    <View style={styles.halfField}>
                                        <Text style={styles.label}>Nature of Work *</Text>
                                        <TextInput
                                            style={[styles.input, !isEditable && styles.inputDisabled]}
                                            value={natureOfWork}
                                            onChangeText={setNatureOfWork}
                                            placeholder="e.g. UDA, Peon"
                                            editable={isEditable}
                                        />
                                    </View>
                                    <View style={styles.halfField}>
                                        <Text style={styles.label}>Phone Number *</Text>
                                        <TextInput
                                            style={[styles.input, !isEditable && styles.inputDisabled]}
                                            value={phone}
                                            onChangeText={setPhone}
                                            placeholder="Phone number"
                                            keyboardType="phone-pad"
                                            editable={isEditable}
                                        />
                                    </View>
                                </View>
                            </>
                        );
                    })()}

                    {/* Status Display based on form status */}
                    {formStatus === 'APPROVED' ? (
                        <>
                            <TouchableOpacity style={styles.submittedButton} disabled>
                                <Text style={styles.submittedButtonText}>Form 6B Submitted</Text>
                            </TouchableOpacity>
                            <View style={styles.acceptedBanner}>
                                <Text style={styles.acceptedText}>Your Form 6B Submission is approved</Text>
                            </View>
                        </>
                    ) : formStatus === 'REJECTED' ? (
                        <>
                            <View style={styles.rejectedBanner}>
                                <Ionicons name="alert-circle" size={20} color="#dc2626" />
                                <Text style={styles.rejectedText}>Your Form 6B Submission was rejected</Text>
                            </View>
                            {rejectionReason && (
                                <View style={styles.rejectionReasonBox}>
                                    <Text style={styles.rejectionReasonLabel}>Reason:</Text>
                                    <Text style={styles.rejectionReasonText}>{rejectionReason}</Text>
                                </View>
                            )}
                            <TouchableOpacity 
                                style={styles.saveButton}
                                onPress={handleSave}
                                disabled={saveMutation.isPending}
                            >
                                {saveMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Save Details</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.submitButton}
                                onPress={handleSubmit}
                                disabled={submitMutation.isPending}
                            >
                                {submitMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Resubmit Form 6B</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : formStatus === 'SUBMITTED' ? (
                        <>
                            <TouchableOpacity style={styles.pendingButton} disabled>
                                <Text style={styles.pendingButtonText}>Form 6B Submitted</Text>
                            </TouchableOpacity>
                            <View style={styles.pendingBanner}>
                                <Ionicons name="time-outline" size={18} color="#d97706" />
                                <Text style={styles.pendingText}>Your Form 6B Submission is pending approval</Text>
                            </View>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity 
                                style={styles.saveButton}
                                onPress={handleSave}
                                disabled={saveMutation.isPending}
                            >
                                {saveMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Save Details</Text>
                                )}
                            </TouchableOpacity>

                            {editingId && (
                                <TouchableOpacity 
                                    style={styles.submitButton}
                                    onPress={handleSubmit}
                                    disabled={submitMutation.isPending}
                                >
                                    {submitMutation.isPending ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>Submit Form 6B</Text>
                                    )}
                                </TouchableOpacity>
                            )}
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 16,
    },
    fieldContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1f2937',
        backgroundColor: '#ffffff',
    },
    inputDisabled: {
        backgroundColor: '#f3f4f6',
        color: '#6b7280',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    halfField: {
        flex: 1,
    },
    saveButton: {
        backgroundColor: '#0d9488',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: '#374151',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 12,
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
        marginTop: 8,
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
    rejectedBanner: {
        backgroundColor: '#fee2e2',
        borderWidth: 1,
        borderColor: '#dc2626',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rejectedText: {
        color: '#dc2626',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    rejectionReasonBox: {
        backgroundColor: '#fef2f2',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 8,
    },
    rejectionReasonLabel: {
        color: '#991b1b',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    rejectionReasonText: {
        color: '#7f1d1d',
        fontSize: 14,
        lineHeight: 20,
    },
    pendingButton: {
        backgroundColor: '#fbbf24',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    pendingButtonText: {
        color: '#78350f',
        fontSize: 16,
        fontWeight: '600',
    },
    pendingBanner: {
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#d97706',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pendingText: {
        color: '#b45309',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
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
