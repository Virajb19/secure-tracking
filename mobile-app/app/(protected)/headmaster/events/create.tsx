/**
 * Create Event Screen
 * 
 * Form for headmaster to create a new school event.
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiClient from '../../../../src/api/client';

type EventType = 'MEETING' | 'EXAM' | 'HOLIDAY' | 'OTHER';

const EVENT_TYPES: { label: string; value: EventType }[] = [
    { label: 'Meeting', value: 'MEETING' },
    { label: 'Exam', value: 'EXAM' },
    { label: 'Holiday', value: 'HOLIDAY' },
    { label: 'Other', value: 'OTHER' },
];

export default function CreateEventScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [eventType, setEventType] = useState<EventType>('OTHER');
    const [eventDate, setEventDate] = useState(new Date());
    const [eventTime, setEventTime] = useState('');
    const [location, setLocation] = useState('');

    // UI state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTypePicker, setShowTypePicker] = useState(false);

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: async (data: {
            title: string;
            description: string;
            type: EventType;
            event_date: string;
            event_time?: string;
            location?: string;
        }) => {
            const response = await apiClient.post('/events', data);
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

        submitMutation.mutate({
            title: title.trim(),
            description: description.trim(),
            type: eventType,
            event_date: eventDate.toISOString().split('T')[0],
            event_time: eventTime.trim() || undefined,
            location: location.trim() || undefined,
        });
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setEventDate(selectedDate);
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
                    <Text style={styles.label}>Location (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={location}
                        onChangeText={setLocation}
                        placeholder="Enter event location"
                        placeholderTextColor="#9ca3af"
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
