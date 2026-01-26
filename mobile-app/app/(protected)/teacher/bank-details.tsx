/**
 * Bank Details Screen
 * 
 * Form for teachers to enter/update their bank details.
 * Required before accepting paper setter/examiner invitations.
 * 
 * Fields:
 * - Account Holder Name
 * - Account Number
 * - Confirm Account Number
 * - IFSC Code
 * - Bank Name
 * - Branch Name
 * - UPI ID (optional)
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
import {
    getMyBankDetails,
    submitBankDetails,
    updateBankDetails,
    BankDetails,
    BankDetailsFormData,
} from '../../../src/services/paper-setter.service';

export default function BankDetailsScreen() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingDetails, setExistingDetails] = useState<BankDetails | null>(null);
    
    // Form state
    const [accountHolderName, setAccountHolderName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [bankName, setBankName] = useState('');
    const [branchName, setBranchName] = useState('');
    const [upiId, setUpiId] = useState('');
    
    // Validation errors
    const [errors, setErrors] = useState<Record<string, string>>({});

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
            setAccountHolderName(details.account_holder_name);
            setAccountNumber(details.account_number);
            setConfirmAccountNumber(details.account_number);
            setIfscCode(details.ifsc_code);
            setBankName(details.bank_name);
            setBranchName(details.branch_name);
            setUpiId(details.upi_id || '');
        }
        
        setIsLoading(false);
    };

    /**
     * Validate IFSC Code format (11 characters, first 4 letters, 5th is 0, last 6 alphanumeric)
     */
    const validateIFSC = (code: string): boolean => {
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        return ifscRegex.test(code.toUpperCase());
    };

    /**
     * Validate UPI ID format
     */
    const validateUPI = (upi: string): boolean => {
        if (!upi) return true; // Optional field
        const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
        return upiRegex.test(upi);
    };

    /**
     * Validate form
     */
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!accountHolderName.trim()) {
            newErrors.accountHolderName = 'Account holder name is required';
        }

        if (!accountNumber.trim()) {
            newErrors.accountNumber = 'Account number is required';
        } else if (accountNumber.length < 9 || accountNumber.length > 18) {
            newErrors.accountNumber = 'Account number should be 9-18 digits';
        } else if (!/^\d+$/.test(accountNumber)) {
            newErrors.accountNumber = 'Account number should contain only digits';
        }

        if (accountNumber !== confirmAccountNumber) {
            newErrors.confirmAccountNumber = 'Account numbers do not match';
        }

        if (!ifscCode.trim()) {
            newErrors.ifscCode = 'IFSC code is required';
        } else if (!validateIFSC(ifscCode)) {
            newErrors.ifscCode = 'Invalid IFSC code format';
        }

        if (!bankName.trim()) {
            newErrors.bankName = 'Bank name is required';
        }

        if (!branchName.trim()) {
            newErrors.branchName = 'Branch name is required';
        }

        if (upiId && !validateUPI(upiId)) {
            newErrors.upiId = 'Invalid UPI ID format';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Handle form submission
     */
    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        const formData: BankDetailsFormData = {
            account_holder_name: accountHolderName.trim(),
            account_number: accountNumber.trim(),
            ifsc_code: ifscCode.toUpperCase().trim(),
            bank_name: bankName.trim(),
            branch_name: branchName.trim(),
            upi_id: upiId.trim() || undefined,
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
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Account Holder Name *</Text>
                        <TextInput
                            style={[styles.input, errors.accountHolderName && styles.inputError]}
                            value={accountHolderName}
                            onChangeText={setAccountHolderName}
                            placeholder="Enter name as per bank account"
                            placeholderTextColor="#9ca3af"
                            autoCapitalize="words"
                        />
                        {errors.accountHolderName && (
                            <Text style={styles.errorText}>{errors.accountHolderName}</Text>
                        )}
                    </View>

                    {/* Account Number */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Account Number *</Text>
                        <TextInput
                            style={[styles.input, errors.accountNumber && styles.inputError]}
                            value={accountNumber}
                            onChangeText={setAccountNumber}
                            placeholder="Enter account number"
                            placeholderTextColor="#9ca3af"
                            keyboardType="number-pad"
                            maxLength={18}
                        />
                        {errors.accountNumber && (
                            <Text style={styles.errorText}>{errors.accountNumber}</Text>
                        )}
                    </View>

                    {/* Confirm Account Number */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm Account Number *</Text>
                        <TextInput
                            style={[styles.input, errors.confirmAccountNumber && styles.inputError]}
                            value={confirmAccountNumber}
                            onChangeText={setConfirmAccountNumber}
                            placeholder="Re-enter account number"
                            placeholderTextColor="#9ca3af"
                            keyboardType="number-pad"
                            maxLength={18}
                        />
                        {errors.confirmAccountNumber && (
                            <Text style={styles.errorText}>{errors.confirmAccountNumber}</Text>
                        )}
                    </View>

                    {/* IFSC Code */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>IFSC Code *</Text>
                        <TextInput
                            style={[styles.input, errors.ifscCode && styles.inputError]}
                            value={ifscCode}
                            onChangeText={(text) => setIfscCode(text.toUpperCase())}
                            placeholder="e.g., SBIN0001234"
                            placeholderTextColor="#9ca3af"
                            autoCapitalize="characters"
                            maxLength={11}
                        />
                        {errors.ifscCode && (
                            <Text style={styles.errorText}>{errors.ifscCode}</Text>
                        )}
                    </View>

                    {/* Bank Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Bank Name *</Text>
                        <TextInput
                            style={[styles.input, errors.bankName && styles.inputError]}
                            value={bankName}
                            onChangeText={setBankName}
                            placeholder="Enter bank name"
                            placeholderTextColor="#9ca3af"
                            autoCapitalize="words"
                        />
                        {errors.bankName && (
                            <Text style={styles.errorText}>{errors.bankName}</Text>
                        )}
                    </View>

                    {/* Branch Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Branch Name *</Text>
                        <TextInput
                            style={[styles.input, errors.branchName && styles.inputError]}
                            value={branchName}
                            onChangeText={setBranchName}
                            placeholder="Enter branch name"
                            placeholderTextColor="#9ca3af"
                            autoCapitalize="words"
                        />
                        {errors.branchName && (
                            <Text style={styles.errorText}>{errors.branchName}</Text>
                        )}
                    </View>

                    {/* UPI ID */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>UPI ID (Optional)</Text>
                        <TextInput
                            style={[styles.input, errors.upiId && styles.inputError]}
                            value={upiId}
                            onChangeText={setUpiId}
                            placeholder="e.g., yourname@upi"
                            placeholderTextColor="#9ca3af"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {errors.upiId && (
                            <Text style={styles.errorText}>{errors.upiId}</Text>
                        )}
                    </View>
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
                    onPress={handleSubmit}
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
