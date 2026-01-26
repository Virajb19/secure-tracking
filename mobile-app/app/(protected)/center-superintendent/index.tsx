/**
 * Center Superintendent Index
 * 
 * Redirects to the tabs layout.
 */

import { useEffect } from 'react';
import { router } from 'expo-router';

export default function CenterSuperintendentIndexRedirect() {
    useEffect(() => {
        router.replace('/(protected)/center-superintendent/(tabs)/home');
    }, []);

    return null;
}
