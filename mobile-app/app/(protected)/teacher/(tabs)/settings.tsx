/**
 * Teacher Settings/Profile Tab Screen
 * 
 * Profile editing screen with:
 * - Avatar upload
 * - Gender selection
 * - Full Name
 * - Phone Number
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../../src/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../../../src/api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function SettingsTabScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const queryClient = useQueryClient();

    const [fullName, setFullName] = useState(user?.name || '');
    const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
    const [gender, setGender] = useState<'male' | 'female' | null>(
        user?.gender?.toLowerCase() as 'male' | 'female' | null
    );
    const [profileImage, setProfileImage] = useState<string | null>(user?.profile_image_url || null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (user) {
            setFullName(user.name || '');
            setPhoneNumber(user.phone || '');
            setGender(user.gender?.toLowerCase() as 'male' | 'female' | null);
            setProfileImage(user.profile_image_url || null);
        }
    }, [user]);

    const updateProfileMutation = useMutation({
        mutationFn: async (data: { name?: string; phone?: string; gender?: string }) => {
            const response = await apiClient.patch('/users/profile', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile-status'] });
            Alert.alert('Success', 'Profile updated successfully');
        },
        onError: (error: any) => {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to update profile');
        },
    });

    const handlePickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (!permissionResult.granted) {
                Alert.alert('Permission Required', 'Please allow access to your photos');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setIsUploading(true);
                // TODO: Upload image to server
                setProfileImage(result.assets[0].uri);
                setIsUploading(false);
            }
        } catch (error) {
            setIsUploading(false);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleSave = () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Please enter your full name');
            return;
        }

        updateProfileMutation.mutate({
            name: fullName.trim(),
            phone: phoneNumber.trim(),
            gender: gender?.toUpperCase(),
        });
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/login');
                    },
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            {/* Profile Image */}
            <View style={styles.imageSection}>
                <TouchableOpacity 
                    style={styles.imageContainer} 
                    onPress={handlePickImage}
                    disabled={isUploading}
                >
                    {isUploading ? (
                        <ActivityIndicator size="large" color="#1e3a5f" />
                    ) : profileImage ? (
                        <Image source={{ uri: profileImage }} style={styles.profileImage} />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Ionicons name="camera-outline" size={40} color="#9ca3af" />
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Gender Selection */}
            <View style={styles.genderSection}>
                <TouchableOpacity
                    style={[
                        styles.genderButton,
                        gender === 'male' && styles.genderButtonActive,
                    ]}
                    onPress={() => setGender('male')}
                >
                    <Ionicons 
                        name="male" 
                        size={18} 
                        color={gender === 'male' ? '#ffffff' : '#6b7280'} 
                    />
                    <Text
                        style={[
                            styles.genderText,
                            gender === 'male' && styles.genderTextActive,
                        ]}
                    >
                        Male
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.genderButton,
                        gender === 'female' && styles.genderButtonActive,
                    ]}
                    onPress={() => setGender('female')}
                >
                    <Ionicons 
                        name="female" 
                        size={18} 
                        color={gender === 'female' ? '#ffffff' : '#6b7280'} 
                    />
                    <Text
                        style={[
                            styles.genderText,
                            gender === 'female' && styles.genderTextActive,
                        ]}
                    >
                        Female
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View style={styles.formSection}>
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Enter your full name"
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <View style={styles.phoneInputContainer}>
                        <Text style={styles.phonePrefix}>+91 |</Text>
                        <TextInput
                            style={styles.phoneInput}
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            placeholder="Phone Number"
                            placeholderTextColor="#9ca3af"
                            keyboardType="phone-pad"
                            maxLength={10}
                        />
                    </View>
                </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleSave}
                disabled={updateProfileMutation.isPending}
            >
                {updateProfileMutation.isPending ? (
                    <ActivityIndicator color="#ffffff" />
                ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                )}
            </TouchableOpacity>

            {/* Settings Options */}
            <View style={styles.settingsSection}>
                <TouchableOpacity
                    style={styles.settingsItem}
                    onPress={() => router.push('/(protected)/teacher/helpdesk')}
                >
                    <View style={[styles.settingsIcon, { backgroundColor: '#ede9fe' }]}>
                        <Ionicons name="headset-outline" size={20} color="#8b5cf6" />
                    </View>
                    <View style={styles.settingsContent}>
                        <Text style={styles.settingsTitle}>Helpdesk</Text>
                        <Text style={styles.settingsSubtitle}>Get help and support</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.settingsItem}
                    onPress={() => router.push('/(protected)/teacher/paper-setter-invitations')}
                >
                    <View style={[styles.settingsIcon, { backgroundColor: '#fce7f3' }]}>
                        <Ionicons name="document-text-outline" size={20} color="#ec4899" />
                    </View>
                    <View style={styles.settingsContent}>
                        <Text style={styles.settingsTitle}>Paper Setter</Text>
                        <Text style={styles.settingsSubtitle}>View invitations</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.settingsItem}
                    onPress={() => router.push('/(protected)/teacher/bank-details')}
                >
                    <View style={[styles.settingsIcon, { backgroundColor: '#dcfce7' }]}>
                        <Ionicons name="card-outline" size={20} color="#22c55e" />
                    </View>
                    <View style={styles.settingsContent}>
                        <Text style={styles.settingsTitle}>Bank Details</Text>
                        <Text style={styles.settingsSubtitle}>Manage payment info</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            {/* App Version */}
            <Text style={styles.versionText}>Version 1.0.0</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 48,
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    imageContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        overflow: 'hidden',
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#1e3a5f',
        borderRadius: 60,
        borderStyle: 'dashed',
    },
    genderSection: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 32,
    },
    genderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#e5e7eb',
        gap: 8,
    },
    genderButtonActive: {
        backgroundColor: '#374151',
    },
    genderText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    genderTextActive: {
        color: '#ffffff',
    },
    formSection: {
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1f2937',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    phonePrefix: {
        fontSize: 16,
        color: '#6b7280',
        marginRight: 8,
    },
    phoneInput: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1f2937',
    },
    saveButton: {
        backgroundColor: '#1e3a5f',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 32,
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    settingsSection: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 24,
        overflow: 'hidden',
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    settingsIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingsContent: {
        flex: 1,
    },
    settingsTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1f2937',
    },
    settingsSubtitle: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fef2f2',
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
        marginBottom: 16,
    },
    logoutText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '600',
    },
    versionText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#9ca3af',
    },
});
