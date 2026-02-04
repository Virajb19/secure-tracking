/**
 * Form 6B - Non-Teaching Staff
 * 
 * Form to add/edit multiple non-teaching staff details.
 * Principal can add as many non-teaching staff as needed using the + button.
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
    Modal,
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

const emptyStaffForm = {
    full_name: '',
    qualification: '',
    nature_of_work: '',
    years_of_service: '',
    phone: '',
};

export default function Form6BScreen() {
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    
    // Form state
    const [formStatus, setFormStatus] = useState<FormStatus>('NOT_SUBMITTED');
    const [rejectionReason, setRejectionReason] = useState<string | null>(null);
    
    // Modal state for add/edit
    const [modalVisible, setModalVisible] = useState(false);
    const [editingStaff, setEditingStaff] = useState<NonTeachingStaff | null>(null);
    const [formData, setFormData] = useState(emptyStaffForm);

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

    const staffList: NonTeachingStaff[] = staffData?.staff || [];

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    // Update form status when data loads
    React.useEffect(() => {
        if (staffData?.form_status) {
            setFormStatus(staffData.form_status);
            if (staffData.rejection_reason) {
                setRejectionReason(staffData.rejection_reason);
            }
        }
    }, [staffData]);

    // Add new staff mutation
    const addMutation = useMutation({
        mutationFn: async (data: {
            full_name: string;
            qualification: string;
            nature_of_work: string;
            years_of_service: number;
            phone: string;
        }) => {
            const response = await apiClient.post('/form-6/non-teaching-staff', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['form-6b-staff'] });
            closeModal();
            Alert.alert('Success', 'Non-teaching staff added successfully!');
        },
        onError: (error: any) => {
            Alert.alert('Error', error.response?.data?.message || 'Failed to add staff');
        },
    });

    // Update staff mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: {
            full_name: string;
            qualification: string;
            nature_of_work: string;
            years_of_service: number;
            phone: string;
        }}) => {
            const response = await apiClient.patch(`/form-6/non-teaching-staff/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['form-6b-staff'] });
            closeModal();
            Alert.alert('Success', 'Staff details updated successfully!');
        },
        onError: (error: any) => {
            Alert.alert('Error', error.response?.data?.message || 'Failed to update staff');
        },
    });

    // Delete staff mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await apiClient.delete(`/form-6/non-teaching-staff/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['form-6b-staff'] });
            Alert.alert('Success', 'Staff removed successfully!');
        },
        onError: (error: any) => {
            Alert.alert('Error', error.response?.data?.message || 'Failed to delete staff');
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
            queryClient.invalidateQueries({ queryKey: ['form-6b-staff'] });
            Alert.alert('Success', 'Form 6B submitted successfully!');
        },
        onError: (error: any) => {
            Alert.alert('Error', error.response?.data?.message || 'Failed to submit Form 6B');
        },
    });

    const openAddModal = () => {
        setEditingStaff(null);
        setFormData(emptyStaffForm);
        setModalVisible(true);
    };

    const openEditModal = (staff: NonTeachingStaff) => {
        setEditingStaff(staff);
        setFormData({
            full_name: staff.full_name,
            qualification: staff.qualification,
            nature_of_work: staff.nature_of_work,
            years_of_service: staff.years_of_service.toString(),
            phone: staff.phone,
        });
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setEditingStaff(null);
        setFormData(emptyStaffForm);
    };

    const handleSave = () => {
        if (!formData.full_name.trim()) {
            Alert.alert('Error', 'Please enter full name');
            return;
        }
        if (!formData.qualification.trim()) {
            Alert.alert('Error', 'Please enter qualification');
            return;
        }
        if (!formData.nature_of_work.trim()) {
            Alert.alert('Error', 'Please enter nature of work');
            return;
        }
        if (!formData.phone.trim()) {
            Alert.alert('Error', 'Please enter phone number');
            return;
        }

        const data = {
            full_name: formData.full_name.trim(),
            qualification: formData.qualification.trim(),
            nature_of_work: formData.nature_of_work.trim(),
            years_of_service: parseInt(formData.years_of_service) || 0,
            phone: formData.phone.trim(),
        };

        if (editingStaff) {
            updateMutation.mutate({ id: editingStaff.id, data });
        } else {
            addMutation.mutate(data);
        }
    };

    const handleDelete = (staff: NonTeachingStaff) => {
        Alert.alert(
            'Delete Staff',
            `Are you sure you want to remove ${staff.full_name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => deleteMutation.mutate(staff.id)
                },
            ]
        );
    };

    const handleSubmit = () => {
        if (staffList.length === 0) {
            Alert.alert('Error', 'Please add at least one non-teaching staff before submitting.');
            return;
        }
        
        Alert.alert(
            'Submit Form 6B',
            `You are about to submit ${staffList.length} non-teaching staff record(s). Continue?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Submit', onPress: () => submitMutation.mutate() },
            ]
        );
    };

    const isEditable = formStatus !== 'SUBMITTED' && formStatus !== 'APPROVED';
    const isSaving = addMutation.isPending || updateMutation.isPending;

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
            <View style={styles.cardContainer}>
                <ScrollView 
                    style={styles.scrollView} 
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Section Title with Add Button */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Non-Teaching Staff</Text>
                        {isEditable && (
                            <TouchableOpacity 
                                style={styles.addButton}
                                onPress={openAddModal}
                            >
                                <Ionicons name="add-circle" size={32} color="#0d9488" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Staff Count */}
                    <Text style={styles.staffCount}>
                        {staffList.length} staff member{staffList.length !== 1 ? 's' : ''} added
                    </Text>

                    {/* Staff List */}
                    {staffList.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={48} color="#9ca3af" />
                            <Text style={styles.emptyText}>No non-teaching staff added yet</Text>
                            {isEditable && (
                                <Text style={styles.emptySubtext}>
                                    Tap the + button to add staff
                                </Text>
                            )}
                        </View>
                    ) : (
                        staffList.map((staff, index) => (
                            <View key={staff.id} style={styles.staffCard}>
                                <View style={styles.staffCardHeader}>
                                    <View style={styles.staffNumber}>
                                        <Text style={styles.staffNumberText}>{index + 1}</Text>
                                    </View>
                                    <Text style={styles.staffName}>{staff.full_name}</Text>
                                    {isEditable && (
                                        <View style={styles.staffActions}>
                                            <TouchableOpacity 
                                                style={styles.editBtn}
                                                onPress={() => openEditModal(staff)}
                                            >
                                                <Ionicons name="pencil" size={18} color="#0d9488" />
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                style={styles.deleteBtn}
                                                onPress={() => handleDelete(staff)}
                                            >
                                                <Ionicons name="trash-outline" size={18} color="#dc2626" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.staffDetails}>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Qualification:</Text>
                                        <Text style={styles.detailValue}>{staff.qualification}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Nature of Work:</Text>
                                        <Text style={styles.detailValue}>{staff.nature_of_work}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Experience:</Text>
                                        <Text style={styles.detailValue}>{staff.years_of_service} years</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Phone:</Text>
                                        <Text style={styles.detailValue}>{staff.phone}</Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}

                    {/* Status Display based on form status */}
                    {formStatus === 'APPROVED' && (
                        <View style={styles.acceptedBanner}>
                            <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                            <Text style={styles.acceptedText}>Your Form 6B Submission is approved</Text>
                        </View>
                    )}

                    {formStatus === 'REJECTED' && (
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
                        </>
                    )}

                    {formStatus === 'SUBMITTED' && (
                        <View style={styles.pendingBanner}>
                            <Ionicons name="time-outline" size={20} color="#d97706" />
                            <Text style={styles.pendingText}>Your Form 6B Submission is pending approval</Text>
                        </View>
                    )}

                    {/* Submit/Resubmit Button */}
                    {isEditable && staffList.length > 0 && (
                        <TouchableOpacity 
                            style={styles.submitButton}
                            onPress={handleSubmit}
                            disabled={submitMutation.isPending}
                        >
                            {submitMutation.isPending ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    {formStatus === 'REJECTED' ? 'Resubmit Form 6B' : 'Submit Form 6B'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </View>

            {/* Add/Edit Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView 
                        style={styles.modalContent}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingStaff ? 'Edit Staff Details' : 'Add Non-Teaching Staff'}
                            </Text>
                            <TouchableOpacity onPress={closeModal}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                            {/* Full Name */}
                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>Full Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.full_name}
                                    onChangeText={(text) => setFormData({...formData, full_name: text})}
                                    placeholder="Enter full name"
                                />
                            </View>

                            {/* Qualification */}
                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>Highest Qualification *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.qualification}
                                    onChangeText={(text) => setFormData({...formData, qualification: text})}
                                    placeholder="e.g. PU, BA, MA"
                                />
                            </View>

                            {/* Nature of Work */}
                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>Nature of Work *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.nature_of_work}
                                    onChangeText={(text) => setFormData({...formData, nature_of_work: text})}
                                    placeholder="e.g. UDA, Peon, Watchman"
                                />
                            </View>

                            {/* Years of Service */}
                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>Years of Service</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.years_of_service}
                                    onChangeText={(text) => setFormData({...formData, years_of_service: text})}
                                    placeholder="Enter years"
                                    keyboardType="numeric"
                                />
                            </View>

                            {/* Phone Number */}
                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>Phone Number *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.phone}
                                    onChangeText={(text) => setFormData({...formData, phone: text})}
                                    placeholder="Enter phone number"
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity 
                                style={styles.cancelButton}
                                onPress={closeModal}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.saveButton}
                                onPress={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text style={styles.saveButtonText}>
                                        {editingStaff ? 'Update' : 'Add Staff'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
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
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
    },
    addButton: {
        padding: 4,
    },
    staffCount: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 4,
    },
    staffCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    staffCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    staffNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#0d9488',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    staffNumberText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    staffName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    staffActions: {
        flexDirection: 'row',
        gap: 8,
    },
    editBtn: {
        padding: 6,
        backgroundColor: '#d1fae5',
        borderRadius: 6,
    },
    deleteBtn: {
        padding: 6,
        backgroundColor: '#fee2e2',
        borderRadius: 6,
    },
    staffDetails: {
        gap: 6,
    },
    detailRow: {
        flexDirection: 'row',
    },
    detailLabel: {
        fontSize: 13,
        color: '#6b7280',
        width: 110,
    },
    detailValue: {
        fontSize: 13,
        color: '#1f2937',
        flex: 1,
    },
    acceptedBanner: {
        backgroundColor: '#d1fae5',
        borderWidth: 1,
        borderColor: '#22c55e',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    acceptedText: {
        color: '#16a34a',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
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
    pendingBanner: {
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#d97706',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 16,
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
    submitButton: {
        backgroundColor: '#374151',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 16,
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
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
    },
    modalBody: {
        padding: 16,
        maxHeight: 400,
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
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
    cancelButton: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#374151',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#0d9488',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
