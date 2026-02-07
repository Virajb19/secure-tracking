/**
 * SEBA Officer Complete Profile Screen
 * 
 * Form for SEBA Officers to complete their profile with:
 * - District selection
 * - School/Office selection
 * - Years of experience
 * - Designation
 * 
 * WARNING: Profile cannot be modified after submission!
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    FlatList,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../src/api/client';
import { District, School } from '../../../src/types';

interface SelectModalProps {
    visible: boolean;
    title: string;
    data: { id: string; name: string }[];
    selectedValue: string;
    onSelect: (value: string) => void;
    onClose: () => void;
    loading?: boolean;
}

function SelectModal({ visible, title, data, selectedValue, onSelect, onClose, loading }: SelectModalProps) {
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>
                    {loading ? (
                        <ActivityIndicator size="large" color="#3b82f6" style={{ marginVertical: 20 }} />
                    ) : (
                        <FlatList
                            data={data}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.modalItem,
                                        selectedValue === item.id && styles.modalItemSelected,
                                    ]}
                                    onPress={() => {
                                        onSelect(item.id);
                                        onClose();
                                    }}
                                >
                                    <Text style={styles.modalItemText}>{item.name}</Text>
                                    {selectedValue === item.id && (
                                        <Ionicons name="checkmark" size={20} color="#3b82f6" />
                                    )}
                                </TouchableOpacity>
                            )}
                            style={{ maxHeight: 400 }}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const DESIGNATIONS = [
    'SEBA Officer',
    'Senior SEBA Officer',
    'Assistant SEBA Officer',
    'District Education Officer',
    'Inspector of Schools',
];

export default function SEBAOfficerCompleteProfileScreen() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedSchool, setSelectedSchool] = useState('');
    const [yearsOfExperience, setYearsOfExperience] = useState('');
    const [designation, setDesignation] = useState('');

    const [showDistrictModal, setShowDistrictModal] = useState(false);
    const [showSchoolModal, setShowSchoolModal] = useState(false);
    const [showDesignationModal, setShowDesignationModal] = useState(false);

    // Fetch districts
    const { data: districts = [], isLoading: loadingDistricts } = useQuery({
        queryKey: ['districts'],
        queryFn: async () => {
            const response = await apiClient.get('/master-data/districts');
            return response.data;
        },
    });

    // Fetch schools for selected district
    const { data: schools = [], isLoading: loadingSchools } = useQuery({
        queryKey: ['schools', selectedDistrict],
        queryFn: async () => {
            const params = selectedDistrict ? { districtId: selectedDistrict } : {};
            const response = await apiClient.get('/master-data/schools', { params });
            return response.data;
        },
        enabled: !!selectedDistrict,
    });

    // Check if profile already exists
    const { data: profileStatus, isLoading: loadingProfile } = useQuery({
        queryKey: ['profile-status'],
        queryFn: async () => {
            const response = await apiClient.get('/faculty/profile/status');
            return response.data;
        },
    });

    // Submit profile mutation
    const submitMutation = useMutation({
        mutationFn: async (data: {
            school_id: string;
            highest_qualification: string;
            years_of_experience: number;
            teaching_classes: { class_level: number; subjects: string[] }[];
        }) => {
            const response = await apiClient.post('/faculty/profile/complete', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile-status'] });
            Alert.alert(
                'Profile Completed',
                'Your profile has been submitted successfully. Please wait for admin approval.',
                [{ text: 'OK', onPress: () => router.replace('/pending-approval') }]
            );
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || 'Failed to submit profile';
            Alert.alert('Error', message);
        },
    });

    // Redirect if profile already completed
    useEffect(() => {
        if (!loadingProfile && profileStatus?.has_completed_profile) {
            Alert.alert(
                'Profile Already Completed',
                'You have already completed your profile.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        }
    }, [loadingProfile, profileStatus]);

    const handleSubmit = () => {
        if (!selectedSchool) {
            Alert.alert('Error', 'Please select a school/office');
            return;
        }
        if (!designation) {
            Alert.alert('Error', 'Please select your designation');
            return;
        }
        const experience = parseInt(yearsOfExperience);
        if (isNaN(experience) || experience < 0 || experience > 60) {
            Alert.alert('Error', 'Years of experience must be between 0 and 60');
            return;
        }

        // Confirm submission since profile will be locked
        Alert.alert(
            'Confirm Submission',
            '⚠️ Your profile information CANNOT be modified after submission. Are you sure all details are correct?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Submit',
                    style: 'default',
                    onPress: () => {
                        submitMutation.mutate({
                            school_id: selectedSchool,
                            highest_qualification: designation.trim(), // Using designation as qualification for SEBA
                            years_of_experience: experience,
                            teaching_classes: [], // SEBA officers don't have teaching classes
                        });
                    },
                },
            ]
        );
    };

    const selectedDistrictName = districts.find((d: District) => d.id === selectedDistrict)?.name || '';
    const selectedSchoolName = schools.find((s: School) => s.id === selectedSchool)?.name || '';

    if (loadingProfile) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Complete Profile</Text>
            </View>

            {/* Warning Banner */}
            <View style={styles.warningBanner}>
                <Ionicons name="warning" size={24} color="#856404" />
                <View style={styles.warningContent}>
                    <Text style={styles.warningTitle}>Important Notice</Text>
                    <Text style={styles.warningText}>
                        Your profile information cannot be modified after submission. Please ensure all details are correct before submitting.
                    </Text>
                </View>
            </View>

            {/* Form */}
            <View style={styles.form}>
                {/* District Selection */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>District *</Text>
                    <TouchableOpacity
                        style={styles.select}
                        onPress={() => setShowDistrictModal(true)}
                    >
                        <Text style={selectedDistrict ? styles.selectText : styles.selectPlaceholder}>
                            {selectedDistrictName || 'Select District'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                {/* School Selection */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>School/Office *</Text>
                    <TouchableOpacity
                        style={[styles.select, !selectedDistrict && styles.selectDisabled]}
                        onPress={() => selectedDistrict && setShowSchoolModal(true)}
                        disabled={!selectedDistrict}
                    >
                        <Text style={selectedSchool ? styles.selectText : styles.selectPlaceholder}>
                            {selectedSchoolName || 'Select School/Office'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                {/* Designation */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Designation *</Text>
                    <TouchableOpacity
                        style={styles.select}
                        onPress={() => setShowDesignationModal(true)}
                    >
                        <Text style={designation ? styles.selectText : styles.selectPlaceholder}>
                            {designation || 'Select Designation'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                {/* Years of Experience */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Years of Experience *</Text>
                    <TextInput
                        style={styles.input}
                        value={yearsOfExperience}
                        onChangeText={setYearsOfExperience}
                        placeholder="Enter years of experience"
                        keyboardType="number-pad"
                        maxLength={2}
                    />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitButton, submitMutation.isPending && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitMutation.isPending}
                >
                    {submitMutation.isPending ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <>
                            <Text style={styles.submitButtonText}>Submit Profile</Text>
                            <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Modals */}
            <SelectModal
                visible={showDistrictModal}
                title="Select District"
                data={districts}
                selectedValue={selectedDistrict}
                onSelect={(val) => {
                    setSelectedDistrict(val);
                    setSelectedSchool(''); // Reset school when district changes
                }}
                onClose={() => setShowDistrictModal(false)}
                loading={loadingDistricts}
            />

            <SelectModal
                visible={showSchoolModal}
                title="Select School/Office"
                data={schools}
                selectedValue={selectedSchool}
                onSelect={setSelectedSchool}
                onClose={() => setShowSchoolModal(false)}
                loading={loadingSchools}
            />

            <Modal visible={showDesignationModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Designation</Text>
                            <TouchableOpacity onPress={() => setShowDesignationModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={DESIGNATIONS}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.modalItem,
                                        designation === item && styles.modalItemSelected,
                                    ]}
                                    onPress={() => {
                                        setDesignation(item);
                                        setShowDesignationModal(false);
                                    }}
                                >
                                    <Text style={styles.modalItemText}>{item}</Text>
                                    {designation === item && (
                                        <Ionicons name="checkmark" size={20} color="#3b82f6" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a',
    },
    content: {
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0f0f1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#9ca3af',
        marginTop: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 16,
        backgroundColor: '#1a1a2e',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
    },
    warningBanner: {
        flexDirection: 'row',
        backgroundColor: '#fff3cd',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    warningContent: {
        flex: 1,
    },
    warningTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#856404',
        marginBottom: 4,
    },
    warningText: {
        fontSize: 14,
        color: '#856404',
        lineHeight: 20,
    },
    form: {
        padding: 16,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#d1d5db',
        marginBottom: 8,
    },
    select: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
        borderWidth: 1,
        borderColor: '#2d2d44',
        borderRadius: 12,
        padding: 16,
    },
    selectDisabled: {
        opacity: 0.5,
    },
    selectText: {
        color: '#ffffff',
        fontSize: 16,
    },
    selectPlaceholder: {
        color: '#6b7280',
        fontSize: 16,
    },
    input: {
        backgroundColor: '#1a1a2e',
        borderWidth: 1,
        borderColor: '#2d2d44',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#ffffff',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        gap: 8,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
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
        fontWeight: '600',
        color: '#1f2937',
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    modalItemSelected: {
        backgroundColor: '#eff6ff',
    },
    modalItemText: {
        fontSize: 16,
        color: '#374151',
    },
});
