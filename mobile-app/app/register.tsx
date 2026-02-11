/**
 * Registration Screen
 * 
 * Multi-field registration form with:
 * - Profile image upload
 * - Gender selection (tabs)
 * - Full name, email, password
 * - Role dropdown
 * - Phone number
 * 
 * Uses react-hook-form with zod validation.
 */

import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
    Image,
    Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    RegisterSchema,
    RegisterFormData,
    RegistrationRole,
    Gender,
} from '../src/lib/zod';
import { uploadProfileImage } from '../src/services/storage.service';
import apiClient from '../src/api/client';
import { X } from 'lucide-react-native';

/**
 * Role options for dropdown
 */
const ROLE_OPTIONS: { label: string; value: RegistrationRole }[] = [
    { label: 'SEBA Officer', value: 'SEBA_OFFICER' },
    { label: 'Headmaster', value: 'HEADMASTER' },
    { label: 'Teacher', value: 'TEACHER' },
];

/**
 * Gender options for tabs
 */
const GENDER_OPTIONS: { label: string; value: Gender }[] = [
    { label: 'Male', value: 'MALE' },
    { label: 'Female', value: 'FEMALE' },
];

export default function RegisterScreen() {
    // const [isSubmitting, setIsSubmitting] = useState(false);
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);

    const {
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting }, 
    } = useForm<RegisterFormData>({
        resolver: zodResolver(RegisterSchema),
        defaultValues: {
            profileImage: '',
            gender: 'MALE',
            fullName: '',
            email: '',
            password: '',
            role: 'TEACHER',
            phone: '',
        },
    });

    const selectedGender = watch('gender');
    const selectedRole = watch('role');
    const profileImage = watch('profileImage');

    /**
     * Pick image from gallery
     */
    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please grant access to your photo library.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setValue('profileImage', result.assets[0].uri);
        }
    };

    /**
     * Handle form submission
     */
    const onSubmit = async (data: RegisterFormData) => {

            console.log('[Health] Checking backend connectivity...');

            // 👇 TEMPORARY TEST
            // const healthRes = await apiClient.get('/health');
            // console.log('[Health] Response:', healthRes.data);

        try {
            let profileImageUrl: string | undefined;

            // Upload profile image if selected
            if (data.profileImage) {
                console.log('[Register] Uploading profile image...');
                const uploadResult = await uploadProfileImage(data.profileImage);
                
                if (!uploadResult.success) {
                    Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload profile image.');
                    return;
                }
                
                profileImageUrl = uploadResult.fileUrl;
                console.log('[Register] Image uploaded:', profileImageUrl);
            }

            // Prepare registration payload
            const payload = {
                name: data.fullName,
                email: data.email,
                password: data.password,
                phone: data.phone,
                role: data.role,
                gender: data.gender,
                profile_image_url: profileImageUrl,
            };

            console.log('[Register] Submitting registration...');
            
            // Call registration API
            await apiClient.post('/auth/register', payload);

            Alert.alert(
                'Registration Submitted',
                'Your registration has been submitted successfully. Please wait for admin approval.',
                [{ text: 'OK', onPress: () => router.replace('/login') }]
            );
        } catch (error: any) {
            console.log('[Register] Error:', error);
            
            // Extract error message
            let errorMessage = 'Failed to submit registration. Please try again.';
            
            if (error?.response?.data?.message) {
                const msg = error.response.data.message;
                errorMessage = Array.isArray(msg) ? msg[0] : msg;
            } else if (error?.message) {
                errorMessage = error.message;
            }
            
            Alert.alert('Registration Failed', errorMessage);
        } finally {
            // setIsSubmitting(false);
        }
    };

    /**
     * Get role label for display
     */
    const getRoleLabel = (value: RegistrationRole): string => {
        return ROLE_OPTIONS.find((opt) => opt.value === value)?.label || value;
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Register for the tracking system</Text>
                </View>

                {/* Profile Image */}
                <View style={styles.imageSection}>
                    <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
                        {profileImage ? (
                            <Image source={{ uri: profileImage }} style={styles.profileImage} />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <Text style={styles.imagePlaceholderText}>📷</Text>
                                <Text style={styles.imagePlaceholderLabel}>Add Photo</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                      {profileImage && (
                        <TouchableOpacity
                            onPress={() => setValue('profileImage', '')}
                            className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-red-500 items-center justify-center"
                        >
                            <Text className="text-white text-sm font-bold">
                                <X size={14} />
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Gender Selection Tabs */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Gender</Text>
                    <View style={styles.genderTabs}>
                        {GENDER_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.genderTab,
                                    selectedGender === option.value && styles.genderTabActive,
                                ]}
                                onPress={() => setValue('gender', option.value)}
                            >
                                <Text
                                    style={[
                                        styles.genderTabText,
                                        selectedGender === option.value && styles.genderTabTextActive,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Full Name */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Full Name</Text>
                    <Controller
                        control={control}
                        name="fullName"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                style={[styles.input, errors.fullName && styles.inputError]}
                                placeholder="Enter your full name"
                                placeholderTextColor="#6b7280"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                autoCapitalize="words"
                                editable={!isSubmitting}
                            />
                        )}
                    />
                    {errors.fullName && (
                        <Text style={styles.errorText}>{errors.fullName.message}</Text>
                    )}
                </View>

                {/* Email */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Email</Text>
                    <Controller
                        control={control}
                        name="email"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                style={[styles.input, errors.email && styles.inputError]}
                                placeholder="Enter your email"
                                placeholderTextColor="#6b7280"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                editable={!isSubmitting}
                            />
                        )}
                    />
                    {errors.email && (
                        <Text style={styles.errorText}>{errors.email.message}</Text>
                    )}
                </View>

                {/* Password */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Password</Text>
                    <Controller
                        control={control}
                        name="password"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                style={[styles.input, errors.password && styles.inputError]}
                                placeholder="Enter your password"
                                placeholderTextColor="#6b7280"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                secureTextEntry
                                autoCapitalize="none"
                                editable={!isSubmitting}
                            />
                        )}
                    />
                    {errors.password && (
                        <Text style={styles.errorText}>{errors.password.message}</Text>
                    )}
                </View>

                {/* Role Dropdown */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Role</Text>
                    <TouchableOpacity
                        style={[styles.dropdown, errors.role && styles.inputError]}
                        onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.dropdownText}>{getRoleLabel(selectedRole)}</Text>
                        <Text style={styles.dropdownIcon}>{showRoleDropdown ? '▲' : '▼'}</Text>
                    </TouchableOpacity>

                    {showRoleDropdown && (
                        <View style={styles.dropdownMenu}>
                            {ROLE_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.dropdownItem,
                                        selectedRole === option.value && styles.dropdownItemActive,
                                    ]}
                                    onPress={() => {
                                        setValue('role', option.value);
                                        setShowRoleDropdown(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.dropdownItemText,
                                            selectedRole === option.value && styles.dropdownItemTextActive,
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                    {errors.role && (
                        <Text style={styles.errorText}>{errors.role.message}</Text>
                    )}
                </View>

                {/* Phone Number */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Phone Number</Text>
                    <Controller
                        control={control}
                        name="phone"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                style={[styles.input, errors.phone && styles.inputError]}
                                placeholder="Enter your phone number"
                                placeholderTextColor="#6b7280"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                keyboardType="phone-pad"
                                autoComplete="tel"
                                editable={!isSubmitting}
                            />
                        )}
                    />
                    {errors.phone && (
                        <Text style={styles.errorText}>{errors.phone.message}</Text>
                    )}
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.button, isSubmitting && styles.buttonDisabled]}
                    onPress={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={styles.buttonText}>Register</Text>
                    )}
                </TouchableOpacity>

                {/* Login Link */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account?</Text>
                    <TouchableOpacity onPress={() => router.push('/login')}>
                        <Text style={styles.loginLink}>Login</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 2,
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
        borderWidth: 3,
        borderColor: '#4f8cff',
        borderStyle: 'dashed',
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholderText: {
        fontSize: 32,
        marginBottom: 4,
    },
    imagePlaceholderLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    fieldContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9ca3af',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 16,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: '#2d2d44',
    },
    inputError: {
        borderColor: '#ef4444',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
    },
    genderTabs: {
        flexDirection: 'row',
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: '#2d2d44',
    },
    genderTab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    genderTabActive: {
        backgroundColor: '#4f8cff',
    },
    genderTabText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
    },
    genderTabTextActive: {
        color: '#ffffff',
    },
    dropdown: {
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: '#2d2d44',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownText: {
        fontSize: 16,
        color: '#ffffff',
    },
    dropdownIcon: {
        fontSize: 12,
        color: '#6b7280',
    },
    dropdownMenu: {
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#2d2d44',
        overflow: 'hidden',
    },
    dropdownItem: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#2d2d44',
    },
    dropdownItemActive: {
        backgroundColor: '#4f8cff20',
    },
    dropdownItemText: {
        fontSize: 16,
        color: '#9ca3af',
    },
    dropdownItemTextActive: {
        color: '#4f8cff',
        fontWeight: '600',
    },
    button: {
        backgroundColor: '#4f8cff',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#3d5a80',
        opacity: 0.7,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        gap: 8,
    },
    footerText: {
        color: '#6b7280',
        fontSize: 14,
    },
    loginLink: {
        color: '#4f8cff',
        fontSize: 14,
        fontWeight: '600',
    },
});
