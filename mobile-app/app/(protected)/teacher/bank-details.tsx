/**
 * Bank Details Screen
 * 
 * Form for teachers to enter/update their bank details.
 * Required before accepting paper setter/examiner invitations.
 * 
 * Features:
 * - React Hook Form with Zod validation
 * - Account holder name, number, IFSC, bank/branch name, UPI ID
 * - Secure data handling for payment processing
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BankDetailsSchema, BankDetailsFormData } from '../../../src/lib/zod';
import {
    getMyBankDetails,
    submitBankDetails,
    updateBankDetails,
    BankDetails,
} from '../../../src/services/paper-setter.service';

/**
 * Form field input component with error display
 */
interface FormInputProps {
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
    onBlur: () => void;
    error?: string;
    keyboardType?: 'default' | 'number-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    maxLength?: number;
    required?: boolean;
}

const FormInput = ({
    label,
    placeholder,
    value,
    onChangeText,
    onBlur,
    error,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    maxLength,
    required = false,
}: FormInputProps) => (
    <View style={styles.inputGroup}>
        <Text style={styles.label}>
            {label} {required && '*'}
        </Text>
        <TextInput
            style={[styles.input, error && styles.inputError]}
            value={value}
            onChangeText={onChangeText}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            maxLength={maxLength}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
);

export default function BankDetailsScreen() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingDetails, setExistingDetails] = useState<BankDetails | null>(null);

    // React Hook Form setup with Zod resolver
    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
    } = useForm<BankDetailsFormData>({
        resolver: zodResolver(BankDetailsSchema),
        defaultValues: {
            accountHolderName: '',
            accountNumber: '',
            confirmAccountNumber: '',
            ifscCode: '',
            bankName: '',
            branchName: '',
            upiId: '',
        },
    });

    /**
     * Load existing bank details
     */
    useEffect(() => {
        loadBankDetails();
    }, []);

    const loadBankDetails = async () => {
        setIsLoading(true);
        const result = await getMyBankDetails();

        if (result.success && result.bankDetails) {
            const details = result.bankDetails;
            setExistingDetails(details);
            // Populate form with existing data
            reset({
                accountHolderName: details.account_holder_name,
                accountNumber: details.account_number,
                confirmAccountNumber: details.account_number,
                ifscCode: details.ifsc_code,
                bankName: details.bank_name,
                branchName: details.branch_name,
                upiId: details.upi_id || '',
            });
        }

        setIsLoading(false);
    };

    /**
     * Handle form submission
     */
    const onSubmit = async (data: BankDetailsFormData) => {
        setIsSubmitting(true);

        const formData = {
            account_holder_name: data.accountHolderName.trim(),
            account_number: data.accountNumber.trim(),
            ifsc_code: data.ifscCode.toUpperCase().trim(),
            bank_name: data.bankName.trim(),
            branch_name: data.branchName.trim(),
            upi_id: data.upiId?.trim() || undefined,
        };

        const result = existingDetails
            ? await updateBankDetails(formData)
            : await submitBankDetails(formData);

        setIsSubmitting(false);

        if (result.success) {
            Alert.alert(
                'Success',
                existingDetails
                    ? 'Bank details updated successfully.'
                    : 'Bank details saved successfully. You can now accept paper setter invitations.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ]
            );
        } else {
            Alert.alert(
                'Error',
                result.error || 'Failed to save bank details. Please try again.',
                [{ text: 'OK' }]
            );
        }
    };

    /**
     * Render loading state
     */
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1e3a5f" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <Ionicons name="card-outline" size={48} color="#1e3a5f" />
                    <Text style={styles.headerTitle}>
                        {existingDetails ? 'Update Bank Details' : 'Add Bank Details'}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        Your bank details are required for payment processing
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    {/* Account Holder Name */}
                    <Controller
                        control={control}
                        name="accountHolderName"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <FormInput
                                label="Account Holder Name"
                                placeholder="Enter name as per bank account"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                error={errors.accountHolderName?.message}
                                autoCapitalize="words"
                                required
                            />
                        )}
                    />

                    {/* Account Number */}
                    <Controller
                        control={control}
                        name="accountNumber"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <FormInput
                                label="Account Number"
                                placeholder="Enter account number"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                error={errors.accountNumber?.message}
                                keyboardType="number-pad"
                                maxLength={18}
                                required
                            />
                        )}
                    />

                    {/* Confirm Account Number */}
                    <Controller
                        control={control}
                        name="confirmAccountNumber"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <FormInput
                                label="Confirm Account Number"
                                placeholder="Re-enter account number"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                error={errors.confirmAccountNumber?.message}
                                keyboardType="number-pad"
                                maxLength={18}
                                required
                            />
                        )}
                    />

                    {/* IFSC Code */}
                    <Controller
                        control={control}
                        name="ifscCode"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <FormInput
                                label="IFSC Code"
                                placeholder="e.g., SBIN0001234"
                                value={value}
                                onChangeText={(text) => onChange(text.toUpperCase())}
                                onBlur={onBlur}
                                error={errors.ifscCode?.message}
                                autoCapitalize="characters"
                                maxLength={11}
                                required
                            />
                        )}
                    />

                    {/* Bank Name */}
                    <Controller
                        control={control}
                        name="bankName"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <FormInput
                                label="Bank Name"
                                placeholder="Enter bank name"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                error={errors.bankName?.message}
                                autoCapitalize="words"
                                required
                            />
                        )}
                    />

                    {/* Branch Name */}
                    <Controller
                        control={control}
                        name="branchName"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <FormInput
                                label="Branch Name"
                                placeholder="Enter branch name"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                error={errors.branchName?.message}
                                autoCapitalize="words"
                                required
                            />
                        )}
                    />

                    {/* UPI ID */}
                    <Controller
                        control={control}
                        name="upiId"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <FormInput
                                label="UPI ID (Optional)"
                                placeholder="e.g., yourname@upi"
                                value={value || ''}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                error={errors.upiId?.message}
                                autoCapitalize="none"
                            />
                        )}
                    />
                </View>

                {/* Security Notice */}
                <View style={styles.securityNotice}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#6b7280" />
                    <Text style={styles.securityText}>
                        Your bank details are encrypted and stored securely. They will only be used for payment processing.
                    </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                        <>
                            <Ionicons name="save-outline" size={20} color="#ffffff" />
                            <Text style={styles.submitButtonText}>
                                {existingDetails ? 'Update Details' : 'Save Details'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => router.back()}
                    disabled={isSubmitting}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                {/* Bottom padding */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
        paddingTop: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1f2937',
        marginTop: 12,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
        textAlign: 'center',
    },
    form: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#1f2937',
    },
    inputError: {
        borderColor: '#ef4444',
        backgroundColor: '#fef2f2',
    },
    errorText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 4,
    },
    securityNotice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 12,
        marginBottom: 24,
        gap: 8,
    },
    securityText: {
        flex: 1,
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 18,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1e3a5f',
        borderRadius: 8,
        paddingVertical: 14,
        gap: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        alignItems: 'center',
        paddingVertical: 14,
        marginTop: 8,
    },
    cancelButtonText: {
        color: '#6b7280',
        fontSize: 16,
    },
});
