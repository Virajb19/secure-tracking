/**
 * Headmaster Complete Profile Screen
 * 
 * Form for headmasters to complete their profile with:
 * - District selection
 * - School selection
 * - Years of experience
 * - Highest qualification
 * - Designation
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
    ActivityIndicator,
    Modal,
    FlatList,
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
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>
                    {loading ? (
                        <ActivityIndicator size="large" color="#0d9488" style={{ padding: 40 }} />
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
                                    <Text style={[
                                        styles.modalItemText,
                                        selectedValue === item.id && styles.modalItemTextSelected,
                                    ]}>
                                        {item.name}
                                    </Text>
                                    {selectedValue === item.id && (
                                        <Ionicons name="checkmark" size={20} color="#0d9488" />
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>No items available</Text>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

export default function CompleteProfileScreen() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Form state
    const [selectedDistrict, setSelectedDistrict] = useState<string>('');
    const [selectedSchool, setSelectedSchool] = useState<string>('');
    const [yearsOfExperience, setYearsOfExperience] = useState<string>('0');
    const [highestQualification, setHighestQualification] = useState<string>('');
    const [designation, setDesignation] = useState<string>('Principal');

    // Modal visibility state
    const [districtModalVisible, setDistrictModalVisible] = useState(false);
    const [schoolModalVisible, setSchoolModalVisible] = useState(false);

    // Fetch districts
    const { data: districts = [], isLoading: loadingDistricts } = useQuery<District[]>({
        queryKey: ['districts'],
        queryFn: async () => {
            const response = await apiClient.get('/master-data/districts');
            return response.data;
        },
    });

    // Fetch schools based on selected district
    const { data: schools = [], isLoading: loadingSchools } = useQuery<School[]>({
        queryKey: ['schools', selectedDistrict],
        queryFn: async () => {
            const params = selectedDistrict ? { districtId: selectedDistrict } : {};
            const response = await apiClient.get('/master-data/schools', { params });
            return response.data;
        },
        enabled: !!selectedDistrict,
    });

    // Get selected district and school names for display
    const selectedDistrictName = districts.find(d => d.id === selectedDistrict)?.name || '';
    const selectedSchoolName = schools.find(s => s.id === selectedSchool)?.name || '';

    // Submit profile mutation
    const submitMutation = useMutation({
        mutationFn: async (data: {
            school_id: string;
            highest_qualification: string;
            years_of_experience: number;
            designation: string;
        }) => {
            const response = await apiClient.post('/faculty/profile/complete', {
                ...data,
                teaching_classes: [], // Headmaster may not have teaching classes
            });
            return response.data;
        },
        onSuccess: () => {
            Alert.alert('Success', 'Profile completed successfully!', [
                { text: 'OK', onPress: () => router.replace('/pending-approval') },
            ]);
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['profile-status'] });
            queryClient.invalidateQueries({ queryKey: ['faculty-profile'] });
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to complete profile';
            Alert.alert('Error', Array.isArray(message) ? message[0] : message);
        },
    });

    const handleSubmit = () => {
        // Validation
        if (!selectedSchool) {
            Alert.alert('Error', 'Please select a school');
            return;
        }
        if (!highestQualification.trim()) {
            Alert.alert('Error', 'Please enter your highest qualification');
            return;
        }
        if (!designation.trim()) {
            Alert.alert('Error', 'Please enter your designation');
            return;
        }

        submitMutation.mutate({
            school_id: selectedSchool,
            highest_qualification: highestQualification,
            years_of_experience: parseInt(yearsOfExperience) || 0,
            designation: designation,
        });
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Add Experience</Text>
            <Text style={styles.subtitle}>
                Please make sure all the required fields are properly filled.
            </Text>

            {/* Warning Banner */}
            <View style={styles.warningBanner}>
                <Ionicons name="warning" size={20} color="#856404" />
                <Text style={styles.warningText}>
                    ⚠️ Important: You can only create your profile once. Please ensure all information is correct before submitting as it cannot be edited later.
                </Text>
            </View>

            {/* District Select */}
            <View style={styles.fieldContainer}>
                <Text style={styles.label}>District *</Text>
                {loadingDistricts ? (
                    <View style={styles.pickerButton}>
                        <ActivityIndicator size="small" color="#0d9488" />
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setDistrictModalVisible(true)}
                    >
                        <Text style={selectedDistrict ? styles.pickerButtonText : styles.pickerPlaceholder}>
                            {selectedDistrictName || 'Select District'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#6b7280" />
                    </TouchableOpacity>
                )}
            </View>

            <SelectModal
                visible={districtModalVisible}
                onClose={() => setDistrictModalVisible(false)}
                title="Select District"
                data={districts}
                selectedValue={selectedDistrict}
                onSelect={(value) => {
                    setSelectedDistrict(value);
                    setSelectedSchool(''); // Reset school when district changes
                }}
                loading={loadingDistricts}
            />

            {/* School Select */}
            <View style={styles.fieldContainer}>
                <Text style={styles.label}>School (Currently Employed In) *</Text>
                {loadingSchools && selectedDistrict ? (
                    <View style={styles.pickerButton}>
                        <ActivityIndicator size="small" color="#0d9488" />
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.pickerButton, !selectedDistrict && styles.pickerButtonDisabled]}
                        onPress={() => selectedDistrict && setSchoolModalVisible(true)}
                        disabled={!selectedDistrict}
                    >
                        <Text style={selectedSchool ? styles.pickerButtonText : styles.pickerPlaceholder}>
                            {selectedSchoolName || (selectedDistrict ? 'Select School' : 'Select District First')}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#6b7280" />
                    </TouchableOpacity>
                )}
            </View>

            <SelectModal
                visible={schoolModalVisible}
                onClose={() => setSchoolModalVisible(false)}
                title="Select School"
                data={schools}
                selectedValue={selectedSchool}
                onSelect={setSelectedSchool}
                loading={loadingSchools}
            />

            {/* Designation */}
            <View style={styles.fieldContainer}>
                <Text style={styles.label}>Designation *</Text>
                <TextInput
                    style={styles.input}
                    value={designation}
                    onChangeText={setDesignation}
                    placeholder="e.g., Principal, Headmaster"
                />
            </View>

            {/* Years of Experience */}
            <View style={styles.fieldContainer}>
                <Text style={styles.label}>Total Years of Experience *</Text>
                <TextInput
                    style={styles.input}
                    value={yearsOfExperience}
                    onChangeText={setYearsOfExperience}
                    keyboardType="numeric"
                    placeholder="0"
                />
            </View>

            {/* Highest Qualification */}
            <View style={styles.fieldContainer}>
                <Text style={styles.label}>Highest Qualification *</Text>
                <TextInput
                    style={styles.input}
                    value={highestQualification}
                    onChangeText={setHighestQualification}
                    placeholder="Enter Highest Qualification"
                />
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Personal Details (Read-only) */}
            <Text style={styles.sectionTitle}>Personal Details</Text>
            <Text style={styles.sectionSubtitle}>
                To update Personal Details, go to Settings {'>'} Edit Profile
            </Text>

            <View style={styles.fieldContainer}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.readOnlyInput}>
                    <Text style={styles.readOnlyText}>{user?.name || ''}</Text>
                </View>
            </View>

            <View style={styles.rowFields}>
                <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Gender</Text>
                    <View style={styles.readOnlyInput}>
                        <Text style={styles.readOnlyText}>
                            {user?.gender === 'MALE' ? 'Male' : user?.gender === 'FEMALE' ? 'Female' : '-'}
                        </Text>
                    </View>
                </View>
                <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Phone Number</Text>
                    <View style={styles.readOnlyInput}>
                        <Text style={styles.readOnlyText}>{user?.phone || ''}</Text>
                    </View>
                </View>
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
                    <Text style={styles.submitButtonText}>Submit</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 24,
    },
    fieldContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    pickerButton: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pickerButtonDisabled: {
        backgroundColor: '#f3f4f6',
    },
    pickerButtonText: {
        fontSize: 16,
        color: '#1f2937',
    },
    pickerPlaceholder: {
        fontSize: 16,
        color: '#9ca3af',
    },
    input: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#1f2937',
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 24,
        borderStyle: 'dashed',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 20,
    },
    rowFields: {
        flexDirection: 'row',
    },
    readOnlyInput: {
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    readOnlyText: {
        fontSize: 16,
        color: '#6b7280',
    },
    submitButton: {
        backgroundColor: '#0d9488',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    submitButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    // Modal styles
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
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalItemSelected: {
        backgroundColor: '#ccfbf1',
    },
    modalItemText: {
        fontSize: 16,
        color: '#374151',
    },
    modalItemTextSelected: {
        color: '#0d9488',
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        padding: 20,
        color: '#6b7280',
        fontSize: 14,
    },
    warningBanner: {
        backgroundColor: '#fff3cd',
        borderWidth: 1,
        borderColor: '#ffc107',
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
        gap: 8,
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        color: '#856404',
        lineHeight: 18,
    },
});
