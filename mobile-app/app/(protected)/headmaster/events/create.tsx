/**
 * Create Event Screen
 * 
 * Form for headmaster to create a new school event with photo upload.
 * Photos are uploaded to Appwrite bucket.
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
    Platform,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../../../src/api/client';

type EventType = 'MEETING' | 'EXAM' | 'HOLIDAY' | 'SEMINAR' | 'WORKSHOP' | 'SPORTS' | 'CULTURAL' | 'OTHER';

const EVENT_TYPES: { label: string; value: EventType }[] = [
    { label: 'Meeting', value: 'MEETING' },
    { label: 'Exam', value: 'EXAM' },
    { label: 'Holiday', value: 'HOLIDAY' },
    { label: 'Seminar', value: 'SEMINAR' },
    { label: 'Workshop', value: 'WORKSHOP' },
    { label: 'Sports', value: 'SPORTS' },
    { label: 'Cultural', value: 'CULTURAL' },
    { label: 'Other', value: 'OTHER' },
];

const ACTIVITY_TYPES = [
    'Teachers Training Program',
    'Parent-Teacher Meeting',
    'Annual Day Celebration',
    'Sports Day',
    'Science Exhibition',
    'Cultural Festival',
    'Workshop on NEP 2020',
    'Orientation Program',
    'Career Guidance Seminar',
    'Health Camp',
    'Other',
];

export default function CreateEventScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [eventType, setEventType] = useState<EventType>('OTHER');
    const [activityType, setActivityType] = useState('');
    const [eventDate, setEventDate] = useState(new Date());
    const [eventEndDate, setEventEndDate] = useState<Date | null>(null);
    const [eventTime, setEventTime] = useState('');
    const [location, setLocation] = useState('');
    const [maleParticipants, setMaleParticipants] = useState('');
    const [femaleParticipants, setFemaleParticipants] = useState('');
    const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);

    // UI state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [showActivityPicker, setShowActivityPicker] = useState(false);

    // Submit mutation with FormData for photo upload
    const submitMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await apiClient.post('/events', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['school-events'] });
            Alert.alert('Success', 'Event created successfully!', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to create event';
            Alert.alert('Error', Array.isArray(message) ? message[0] : message);
        },
    });

    const pickImage = async () => {
        // Request permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera roll permissions to upload photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setPhoto(result.assets[0]);
        }
    };

    const takePhoto = async () => {
        // Request permission
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera permissions to take photos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setPhoto(result.assets[0]);
        }
    };

    const showImageOptions = () => {
        Alert.alert(
            'Add Photo',
            'Choose how you want to add a photo',
            [
                { text: 'Take Photo', onPress: takePhoto },
                { text: 'Choose from Gallery', onPress: pickImage },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleSubmit = () => {
        // Validation
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter event title');
            return;
        }
        if (!description.trim()) {
            Alert.alert('Error', 'Please enter event description');
            return;
        }

        // Create FormData
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        formData.append('type', eventType);
        formData.append('event_date', eventDate.toISOString().split('T')[0]);
        
        if (eventEndDate) {
            formData.append('event_end_date', eventEndDate.toISOString().split('T')[0]);
        }
        if (eventTime.trim()) {
            formData.append('event_time', eventTime.trim());
        }
        if (location.trim()) {
            formData.append('location', location.trim());
        }
        if (activityType.trim()) {
            formData.append('activity_type', activityType.trim());
        }
        if (maleParticipants.trim()) {
            formData.append('male_participants', maleParticipants.trim());
        }
        if (femaleParticipants.trim()) {
            formData.append('female_participants', femaleParticipants.trim());
        }

        // Add photo if selected
        if (photo) {
            const uri = photo.uri;
            const filename = uri.split('/').pop() || 'photo.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            formData.append('photo', {
                uri,
                name: filename,
                type,
            } as any);
        }

        submitMutation.mutate(formData);
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setEventDate(selectedDate);
        }
    };

    const onEndDateChange = (event: any, selectedDate?: Date) => {
        setShowEndDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setEventEndDate(selectedDate);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Event</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {/* Photo Upload Section */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Event Photo (Optional)</Text>
                    <TouchableOpacity
                        style={styles.photoUploadButton}
                        onPress={showImageOptions}
                    >
                        {photo ? (
                            <Image
                                source={{ uri: photo.uri }}
                                style={styles.photoPreview}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={styles.photoPlaceholder}>
                                <Ionicons name="camera-outline" size={40} color="#9ca3af" />
                                <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    {photo && (
                        <TouchableOpacity
                            style={styles.removePhotoButton}
                            onPress={() => setPhoto(null)}
                        >
                            <Ionicons name="close-circle" size={24} color="#ef4444" />
                            <Text style={styles.removePhotoText}>Remove photo</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Title */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Event Title *</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Enter event title"
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* Description */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Description *</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Enter event description"
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Event Type */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Event Type *</Text>
                    <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowTypePicker(true)}
                    >
                        <Text style={styles.pickerButtonText}>
                            {EVENT_TYPES.find(t => t.value === eventType)?.label || 'Select Type'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                {/* Activity Type */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Activity Type (Optional)</Text>
                    <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowActivityPicker(true)}
                    >
                        <Text style={styles.pickerButtonText}>
                            {activityType || 'Select Activity Type'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                {/* Event Date */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Event Date *</Text>
                    <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={styles.pickerButtonText}>
                            {formatDate(eventDate)}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={eventDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        minimumDate={new Date()}
                    />
                )}

                {/* Event End Date (Optional - for multi-day events) */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>End Date (Optional - for multi-day events)</Text>
                    <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowEndDatePicker(true)}
                    >
                        <Text style={[styles.pickerButtonText, !eventEndDate && styles.placeholderText]}>
                            {eventEndDate ? formatDate(eventEndDate) : 'Same as event date'}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                {showEndDatePicker && (
                    <DateTimePicker
                        value={eventEndDate || eventDate}
                        mode="date"
                        display="default"
                        onChange={onEndDateChange}
                        minimumDate={eventDate}
                    />
                )}

                {/* Event Time (Optional) */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Event Time (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={eventTime}
                        onChangeText={setEventTime}
                        placeholder="e.g., 10:00 AM"
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* Location (Optional) */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Venue / Location (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={location}
                        onChangeText={setLocation}
                        placeholder="Enter event venue"
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* Participants Count */}
                <View style={styles.participantsContainer}>
                    <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Male Participants</Text>
                        <TextInput
                            style={styles.input}
                            value={maleParticipants}
                            onChangeText={setMaleParticipants}
                            placeholder="0"
                            placeholderTextColor="#9ca3af"
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Female Participants</Text>
                        <TextInput
                            style={styles.input}
                            value={femaleParticipants}
                            onChangeText={setFemaleParticipants}
                            placeholder="0"
                            placeholderTextColor="#9ca3af"
                            keyboardType="numeric"
                        />
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
                        <Text style={styles.submitButtonText}>Create Event</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* Type Picker Modal */}
            <Modal visible={showTypePicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Event Type</Text>
                            <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {EVENT_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type.value}
                                    style={[
                                        styles.modalItem,
                                        eventType === type.value && styles.modalItemSelected,
                                    ]}
                                    onPress={() => {
                                        setEventType(type.value);
                                        setShowTypePicker(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.modalItemText,
                                            eventType === type.value && styles.modalItemTextSelected,
                                        ]}
                                    >
                                        {type.label}
                                    </Text>
                                    {eventType === type.value && (
                                        <Ionicons name="checkmark" size={20} color="#0d9488" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Activity Type Picker Modal */}
            <Modal visible={showActivityPicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Activity Type</Text>
                            <TouchableOpacity onPress={() => setShowActivityPicker(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {ACTIVITY_TYPES.map((activity) => (
                                <TouchableOpacity
                                    key={activity}
                                    style={[
                                        styles.modalItem,
                                        activityType === activity && styles.modalItemSelected,
                                    ]}
                                    onPress={() => {
                                        setActivityType(activity);
                                        setShowActivityPicker(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.modalItemText,
                                            activityType === activity && styles.modalItemTextSelected,
                                        ]}
                                    >
                                        {activity}
                                    </Text>
                                    {activityType === activity && (
                                        <Ionicons name="checkmark" size={20} color="#0d9488" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
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
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
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
    textArea: {
        minHeight: 100,
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
    pickerButtonText: {
        fontSize: 16,
        color: '#1f2937',
    },
    placeholderText: {
        color: '#9ca3af',
    },
    participantsContainer: {
        flexDirection: 'row',
    },
    // Photo upload styles
    photoUploadButton: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#d1d5db',
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    photoPlaceholder: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoPlaceholderText: {
        marginTop: 8,
        fontSize: 14,
        color: '#9ca3af',
    },
    photoPreview: {
        width: '100%',
        height: 200,
    },
    removePhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        padding: 8,
    },
    removePhotoText: {
        marginLeft: 4,
        color: '#ef4444',
        fontSize: 14,
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
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
});
