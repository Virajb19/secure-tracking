/**
 * Login Screen
 * 
 * Email + Password + Phone login with device binding.
 * Device ID is automatically included in request.
 * 
 * SECURITY:
 * - All non-admin users can login
 * - Admin users are blocked (must use admin portal)
 * - Device binding enforced by backend
 * - Inactive users (not approved by admin) are blocked
 * - Clear error messages for all failure cases
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
    Alert,
    ScrollView,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

export default function LoginScreen() {
    const { login, isLoading, deviceId } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /**
     * Validate email format.
     */
    const validateEmail = (value: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value.trim());
    };

    /**
     * Validate phone number format.
     */
    const validatePhone = (value: string): boolean => {
        // Remove spaces and dashes for validation
        const cleaned = value.replace(/[\s-]/g, '');
        // Must be 10-15 digits, optionally starting with +
        const phoneRegex = /^\+?\d{10,15}$/;
        return phoneRegex.test(cleaned);
    };

    /**
     * Validate password.
     */
    const validatePassword = (value: string): boolean => {
        return value.length >= 8 && value.length <= 15;
    };

    /**
     * Handle login submission.
     */
    const handleLogin = async () => {
        // Clear previous error
        setError(null);

        // Validate email
        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }

        if (!validateEmail(email)) {
            setError('Please enter a valid email address.');
            return;
        }

        // Validate password
        if (!password) {
            setError('Please enter your password.');
            return;
        }

        if (!validatePassword(password)) {
            setError('Password must be 8-15 characters long.');
            return;
        }

        // Validate phone
        if (!phone.trim()) {
            setError('Please enter your phone number.');
            return;
        }

        if (!validatePhone(phone)) {
            setError('Please enter a valid phone number (10-15 digits).');
            return;
        }

        // Check device ID is ready
        if (!deviceId) {
            setError('Device not ready. Please restart the app.');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await login({ email, password, phone });

            if (result.success) {
                // Navigate to protected area
                router.replace('/(protected)/tasks');
            } else {
                // Check if user is inactive/not approved
                if (result.isInactive) {
                    Toast.show({
                        type: 'info',
                        text1: 'Account Pending Approval',
                        text2: 'Your account is awaiting admin approval. Please try again later.',
                        visibilityTime: 5000,
                        position: 'top',
                    });
                }
                // Show error
                setError(result.error || 'Login failed. Please try again.');
            }
        } catch (err) {
            setError('An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Show device ID info (for debugging).
     */
    const showDeviceInfo = () => {
        Alert.alert(
            'Device Information',
            `Device ID: ${deviceId || 'Loading...'}`,
            [{ text: 'OK' }]
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.logo}>🔒</Text>
                        <Text style={styles.title}>Secure Delivery</Text>
                        <Text style={styles.subtitle}>Government Tracking System</Text>
                    </View>

                    {/* Login Form */}
                    <View style={styles.form}>
                        {/* Email Field */}
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your registered email"
                            placeholderTextColor="#6b7280"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                setError(null);
                            }}
                            editable={!isSubmitting}
                        />

                        {/* Password Field */}
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your password"
                            placeholderTextColor="#6b7280"
                            secureTextEntry
                            autoCapitalize="none"
                            autoComplete="password"
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                setError(null);
                            }}
                            editable={!isSubmitting}
                        />

                        {/* Phone Field */}
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your registered phone"
                            placeholderTextColor="#6b7280"
                            keyboardType="phone-pad"
                            autoComplete="tel"
                            value={phone}
                            onChangeText={(text) => {
                                setPhone(text);
                                setError(null);
                            }}
                            editable={!isSubmitting}
                        />

                        {/* Error Message */}
                        {error && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[
                                styles.button,
                                (isSubmitting || isLoading) && styles.buttonDisabled,
                            ]}
                            onPress={handleLogin}
                            disabled={isSubmitting || isLoading}
                        >
                            {isSubmitting || isLoading ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text style={styles.buttonText}>Login</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Register Link */}
                    <View style={styles.registerSection}>
                        <Text style={styles.footerText}>Don't have an account?</Text>
                        <TouchableOpacity onPress={() => router.push({ pathname: '/register' as any })}>
                            <Text style={styles.registerLink}>Register</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Secure Tracking Mobile Application
                        </Text>
                        <TouchableOpacity onPress={showDeviceInfo}>
                            <Text style={styles.deviceInfoLink}>Device Info</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
            <Toast />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 32,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logo: {
        fontSize: 64,
        marginBottom: 16,
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
    form: {
        marginBottom: 32,
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
        fontSize: 18,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: '#2d2d44',
        marginBottom: 16,
    },
    errorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#4f8cff',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
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
    registerSection: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        gap: 8,
    },
    registerLink: {
        color: '#4f8cff',
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
    },
    footerText: {
        color: '#6b7280',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 8,
    },
    deviceInfoLink: {
        color: '#4f8cff',
        fontSize: 12,
        textDecorationLine: 'underline',
    },
});
