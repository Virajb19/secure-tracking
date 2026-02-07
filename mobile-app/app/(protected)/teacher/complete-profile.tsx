/**
 * Complete Profile Screen
 * 
 * Form for teachers to complete their profile with:
 * - District selection
 * - School selection
 * - Years of experience
 * - Highest qualification
 * - Teaching classes and subjects
 */

import React, { useState, useEffect } from 'react';
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

// Multi-select modal for subjects
interface MultiSelectModalProps {
    visible: boolean;
    title: string;
    data: string[];
    selectedValues: string[];
    onSelect: (values: string[]) => void;
    onClose: () => void;
    loading?: boolean;
}

function MultiSelectModal({ visible, title, data, selectedValues, onSelect, onClose, loading }: MultiSelectModalProps) {
    const [tempSelected, setTempSelected] = useState<string[]>(selectedValues);

    useEffect(() => {
        if (visible) {
            setTempSelected(selectedValues);
        }
    }, [visible, selectedValues]);

    const toggleItem = (item: string) => {
        setTempSelected(prev =>
            prev.includes(item)
                ? prev.filter(v => v !== item)
                : [...prev, item]
        );
    };

    const handleDone = () => {
        onSelect(tempSelected);
        onClose();
    };

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
                        <ActivityIndicator size="large" color="#3b82f6" style={{ padding: 40 }} />
                    ) : (
                        <>
                            <FlatList
                                data={data}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.modalItem,
                                            tempSelected.includes(item) && styles.modalItemSelected,
                                        ]}
                                        onPress={() => toggleItem(item)}
                                    >
                                        <View style={styles.checkboxRow}>
                                            <View style={[
                                                styles.checkbox,
                                                tempSelected.includes(item) && styles.checkboxSelected,
                                            ]}>
                                                {tempSelected.includes(item) && (
                                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                                )}
                                            </View>
                                            <Text style={styles.modalItemText}>{item}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                style={{ maxHeight: 300 }}
                            />
                            <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                                <Text style={styles.doneButtonText}>Done ({tempSelected.length} selected)</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}

// Predefined class levels
const CLASS_LEVELS = [
    { label: 'Pre-Primary to Class 7', value: 0, key: 'pre_primary' },
    { label: 'Class 8', value: 8, key: 'class_8' },
    { label: 'Class 9', value: 9, key: 'class_9' },
    { label: 'Class 10', value: 10, key: 'class_10' },
    { label: 'Class 11', value: 11, key: 'class_11' },
    { label: 'Class 12', value: 12, key: 'class_12' },
];

interface TeachingClass {
    class_level: number;
    subjects: string[];
}

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
                        <ActivityIndicator size="large" color="#3b82f6" style={{ padding: 40 }} />
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
                                        <Ionicons name="checkmark" size={20} color="#3b82f6" />
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
    const [teachingClasses, setTeachingClasses] = useState<Record<string, boolean>>({});
    const [selectedSubjects, setSelectedSubjects] = useState<Record<number, string[]>>({});

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

    // Fetch subjects for teaching classes
    const { data: subjects = [], isLoading: loadingSubjects } = useQuery<string[]>({
        queryKey: ['subjects'],
        queryFn: async () => {
            const response = await apiClient.get('/master-data/subjects');
            return response.data;
        },
    });

    // Subject modal state - which class level is being edited
    const [subjectModalClass, setSubjectModalClass] = useState<{ key: string; value: number } | null>(null);

    // Get selected district and school names for display
    const selectedDistrictName = districts.find(d => d.id === selectedDistrict)?.name || '';
    const selectedSchoolName = schools.find(s => s.id === selectedSchool)?.name || '';

    // Submit profile mutation
    const submitMutation = useMutation({
        mutationFn: async (data: {
            school_id: string;
            highest_qualification: string;
            years_of_experience: number;
            teaching_classes: TeachingClass[];
        }) => {
            const response = await apiClient.post('/faculty/profile/complete', data);
            return response.data;
        },
        onSuccess: () => {
            Alert.alert('Success', 'Profile completed successfully! Your account is now pending admin approval.', [
                { text: 'OK', onPress: () => router.replace('/pending-approval') },
            ]);
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['profile-status'] });
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to complete profile';
            Alert.alert('Error', Array.isArray(message) ? message[0] : message);
        },
    });

    const toggleTeachingClass = (key: string, value: number, turnOn: boolean) => {
        setTeachingClasses(prev => ({
            ...prev,
            [key]: turnOn,
        }));
        // Clear selected subjects when turning off
        if (!turnOn) {
            setSelectedSubjects(prev => {
                const newSubjects = { ...prev };
                delete newSubjects[value];
                return newSubjects;
            });
        }
    };

    const handleSubmit = () => {
        // Validation
        if (!selectedSchool) {
            Alert.alert('Error', 'Please select a school');
            return;
        }
        if (highestQualification.trim().length < 2) {
            Alert.alert('Error', 'Qualification must be at least 2 characters');
            return;
        }
        const experience = parseInt(yearsOfExperience);
        if (isNaN(experience) || experience < 0 || experience > 60) {
            Alert.alert('Error', 'Years of experience must be between 0 and 60');
            return;
        }

        // Check if at least one subject is selected for each enabled class
        for (const level of CLASS_LEVELS) {
            if (teachingClasses[level.key] && level.value > 0) {
                const subjectsForLevel = selectedSubjects[level.value] || [];
                if (subjectsForLevel.length === 0) {
                    Alert.alert('Error', `Please select at least one subject for ${level.label}`);
                    return;
                }
            }
        }

        // Build teaching classes array
        const teachingClassesData: TeachingClass[] = [];

        CLASS_LEVELS.forEach(level => {
            if (teachingClasses[level.key] && level.value > 0) {
                const subjectsForClass = selectedSubjects[level.value] || [];
                teachingClassesData.push({
                    class_level: level.value,
                    subjects: subjectsForClass,
                });
            }
        });

        submitMutation.mutate({
            school_id: selectedSchool,
            highest_qualification: highestQualification.trim(),
            years_of_experience: experience,
            teaching_classes: teachingClassesData,
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
                        <ActivityIndicator size="small" color="#3b82f6" />
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
                        <ActivityIndicator size="small" color="#3b82f6" />
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

            {/* Teaching Classes */}
            {CLASS_LEVELS.map(level => (
                <View key={level.key} style={styles.radioContainer}>
                    <Text style={styles.radioLabel}>
                        Are you teaching any subject for {level.label}?
                    </Text>
                    <View style={styles.radioGroup}>
                        <TouchableOpacity
                            style={styles.radioOption}
                            onPress={() => toggleTeachingClass(level.key, level.value, true)}
                        >
                            <View style={[
                                styles.radioCircle,
                                teachingClasses[level.key] && styles.radioCircleSelected,
                            ]}>
                                {teachingClasses[level.key] && (
                                    <View style={styles.radioInner} />
                                )}
                            </View>
                            <Text style={styles.radioText}>Yes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.radioOption}
                            onPress={() => toggleTeachingClass(level.key, level.value, false)}
                        >
                            <View style={[
                                styles.radioCircle,
                                !teachingClasses[level.key] && styles.radioCircleSelected,
                            ]}>
                                {!teachingClasses[level.key] && (
                                    <View style={styles.radioInner} />
                                )}
                            </View>
                            <Text style={styles.radioText}>No</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Subject Selection - appears when Yes is selected */}
                    {teachingClasses[level.key] && (
                        <View style={styles.subjectSection}>
                            <Text style={styles.subjectLabel}>Select subjects you teach:</Text>
                            <TouchableOpacity
                                style={styles.subjectPickerButton}
                                onPress={() => setSubjectModalClass(level)}
                            >
                                <Text style={
                                    (selectedSubjects[level.value]?.length ?? 0) > 0
                                        ? styles.subjectPickerText
                                        : styles.subjectPickerPlaceholder
                                }>
                                    {(selectedSubjects[level.value]?.length ?? 0) > 0
                                        ? selectedSubjects[level.value].join(', ')
                                        : 'Select Subjects'}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color="#6b7280" />
                            </TouchableOpacity>
                            {(selectedSubjects[level.value]?.length ?? 0) > 0 && (
                                <View style={styles.selectedSubjectTags}>
                                    {selectedSubjects[level.value].map(subj => (
                                        <View key={subj} style={styles.subjectTag}>
                                            <Text style={styles.subjectTagText}>{subj}</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setSelectedSubjects(prev => ({
                                                        ...prev,
                                                        [level.value]: prev[level.value].filter(s => s !== subj),
                                                    }));
                                                }}
                                            >
                                                <Ionicons name="close-circle" size={16} color="#6b7280" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                </View>
            ))}

            {/* Subject Multi-Select Modal */}
            <MultiSelectModal
                visible={subjectModalClass !== null}
                title={`Select Subjects for ${subjectModalClass?.key ? CLASS_LEVELS.find(l => l.key === subjectModalClass.key)?.label : ''}`}
                data={subjects}
                selectedValues={subjectModalClass ? (selectedSubjects[subjectModalClass.value] || []) : []}
                onSelect={(values) => {
                    if (subjectModalClass) {
                        setSelectedSubjects(prev => ({
                            ...prev,
                            [subjectModalClass.value]: values,
                        }));
                    }
                }}
                onClose={() => setSubjectModalClass(null)}
                loading={loadingSubjects}
            />

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
    radioContainer: {
        marginBottom: 20,
    },
    radioLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    radioGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 32,
    },
    radioCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#d1d5db',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    radioCircleSelected: {
        borderColor: '#3b82f6',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#3b82f6',
    },
    radioText: {
        fontSize: 14,
        color: '#374151',
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
        backgroundColor: '#1f2937',
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
    },
    modalItemSelected: {
        backgroundColor: '#eff6ff',
    },
    modalItemText: {
        fontSize: 16,
        color: '#374151',
    },
    modalItemTextSelected: {
        color: '#3b82f6',
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
    // Subject selection styles
    subjectSection: {
        marginTop: 12,
        paddingLeft: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#3b82f6',
    },
    subjectLabel: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 8,
    },
    subjectPickerButton: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subjectPickerText: {
        fontSize: 14,
        color: '#1f2937',
        flex: 1,
    },
    subjectPickerPlaceholder: {
        fontSize: 14,
        color: '#9ca3af',
        flex: 1,
    },
    selectedSubjectTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 6,
    },
    subjectTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 4,
        gap: 4,
    },
    subjectTagText: {
        fontSize: 12,
        color: '#3b82f6',
    },
    // Multi-select modal styles
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#d1d5db',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    doneButton: {
        backgroundColor: '#3b82f6',
        margin: 16,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    doneButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
