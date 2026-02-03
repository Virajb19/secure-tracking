'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MainLayout } from '@/components/layout';
import { tasksApi, usersApi } from '@/services/api';
import { User, UserRole } from '@/types';

// Dynamic import to avoid SSR issues with Leaflet
const LocationPickerMap = dynamic(
    () => import('@/components/LocationPickerMap').then(mod => mod.LocationPickerMap),
    { ssr: false, loading: () => <div className="h-64 bg-slate-800 animate-pulse rounded-lg" /> }
);

export default function CreateTaskPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Helper to get local datetime string for input
    const getLocalDateTimeString = (date: Date) => {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - offset * 60 * 1000);
        return localDate.toISOString().slice(0, 16);
    };

    // Default start time: now, end time: now + 4 hours
    const getDefaultStartTime = () => getLocalDateTimeString(new Date());
    const getDefaultEndTime = () => {
        const endDate = new Date();
        endDate.setHours(endDate.getHours() + 4);
        return getLocalDateTimeString(endDate);
    };

    // Form state with smart defaults
    const [formData, setFormData] = useState({
        sealed_pack_code: '',
        source_location: '',
        destination_location: '',
        assigned_user_id: '',
        exam_type: 'REGULAR' as 'REGULAR' | 'COMPARTMENTAL',
        start_time: getDefaultStartTime(),
        end_time: getDefaultEndTime(),
        // Geo-fence coordinates (optional)
        pickup_latitude: '',
        pickup_longitude: '',
        destination_latitude: '',
        destination_longitude: '',
        geofence_radius: '100',
    });

    // Load delivery users on mount
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // Fetch all SEBA_OFFICER users with active status
                const response = await usersApi.getAll({
                    role: UserRole.SEBA_OFFICER,
                    is_active: true,
                    limit: 100, // Fetch up to 100 active SEBA officers
                });
                setUsers(response.data);
            } catch {
                setError('Failed to load users');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            // Convert local datetime to ISO string
            const payload: Record<string, any> = {
                ...formData,
                start_time: new Date(formData.start_time).toISOString(),
                end_time: new Date(formData.end_time).toISOString(),
            };

            // Add coordinates only if provided
            if (formData.pickup_latitude && formData.pickup_longitude) {
                payload.pickup_latitude = parseFloat(formData.pickup_latitude);
                payload.pickup_longitude = parseFloat(formData.pickup_longitude);
            }
            if (formData.destination_latitude && formData.destination_longitude) {
                payload.destination_latitude = parseFloat(formData.destination_latitude);
                payload.destination_longitude = parseFloat(formData.destination_longitude);
            }
            if (formData.geofence_radius) {
                payload.geofence_radius = parseInt(formData.geofence_radius);
            }

            await tasksApi.create(payload as any);
            router.push('/tasks');
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string | string[] } } };
            const message = error.response?.data?.message;
            setError(Array.isArray(message) ? message[0] : message || 'Failed to create task');
        } finally {
            setSubmitting(false);
        }
    };

    // Get min datetime (now)
    const getMinDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    return (
        <MainLayout title="Create Task" subtitle="Assign a new delivery task">
            <div className="max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Sealed Pack Code */}
                    <div>
                        <label htmlFor="sealed_pack_code" className="block text-sm font-medium text-slate-300 mb-2">
                            Sealed Pack Code *
                        </label>
                        <input
                            type="text"
                            id="sealed_pack_code"
                            name="sealed_pack_code"
                            value={formData.sealed_pack_code}
                            onChange={handleChange}
                            required
                            placeholder="e.g., PACK-2026-001"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {/* Source Location */}
                    <div>
                        <label htmlFor="source_location" className="block text-sm font-medium text-slate-300 mb-2">
                            Source Location (Pickup) *
                        </label>
                        <textarea
                            id="source_location"
                            name="source_location"
                            value={formData.source_location}
                            onChange={handleChange}
                            required
                            rows={2}
                            placeholder="Enter pickup address"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Destination Location */}
                    <div>
                        <label htmlFor="destination_location" className="block text-sm font-medium text-slate-300 mb-2">
                            Destination Location (Delivery) *
                        </label>
                        <textarea
                            id="destination_location"
                            name="destination_location"
                            value={formData.destination_location}
                            onChange={handleChange}
                            required
                            rows={2}
                            placeholder="Enter delivery address"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Assigned User */}
                    <div>
                        <label htmlFor="assigned_user_id" className="block text-sm font-medium text-slate-300 mb-2">
                            Assign to Delivery User *
                        </label>
                        {loading ? (
                            <div className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-500">
                                Loading users...
                            </div>
                        ) : users.length === 0 ? (
                            <div className="w-full px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                                No delivery users available. Please create a DELIVERY user first.
                            </div>
                        ) : (
                            <select
                                id="assigned_user_id"
                                name="assigned_user_id"
                                value={formData.assigned_user_id}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">Select a delivery user</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.phone})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Exam Type */}
                    <div>
                        <label htmlFor="exam_type" className="block text-sm font-medium text-slate-300 mb-2">
                            Exam Type *
                        </label>
                        <select
                            id="exam_type"
                            name="exam_type"
                            value={formData.exam_type}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="REGULAR">Regular Exam</option>
                            <option value="COMPARTMENTAL">Compartmental Exam</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            Determines which tracking page will show this task
                        </p>
                    </div>

                    {/* Time Window */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start_time" className="block text-sm font-medium text-slate-300 mb-2">
                                Start Time *
                            </label>
                            <input
                                type="datetime-local"
                                id="start_time"
                                name="start_time"
                                value={formData.start_time}
                                onChange={handleChange}
                                required
                                min={getMinDateTime()}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="end_time" className="block text-sm font-medium text-slate-300 mb-2">
                                End Time *
                            </label>
                            <input
                                type="datetime-local"
                                id="end_time"
                                name="end_time"
                                value={formData.end_time}
                                onChange={handleChange}
                                required
                                min={formData.start_time || getMinDateTime()}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Geo-fence Settings (Collapsible) */}
                    <details className="bg-slate-800/50 border border-slate-700 rounded-lg">
                        <summary className="px-4 py-3 cursor-pointer text-slate-300 font-medium flex items-center gap-2">
                            📍 Geo-fence Settings (Optional)
                        </summary>
                        <div className="p-4 pt-0 space-y-4">
                            <p className="text-xs text-slate-500 mb-3">
                                Click on map to select location, or use "Use My Location" button.
                            </p>

                            {/* Geo-fence Radius - First so it applies to map circles */}
                            <div className="mb-4">
                                <label className="block text-xs text-slate-400 mb-1">Geo-fence Radius (meters)</label>
                                <input
                                    type="number"
                                    name="geofence_radius"
                                    value={formData.geofence_radius}
                                    onChange={handleChange}
                                    min="10"
                                    max="1000"
                                    placeholder="100"
                                    className="w-32 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                />
                                <span className="text-xs text-slate-500 ml-2">Default: 100m</span>
                            </div>

                            {/* Pickup Location Map Picker */}
                            <LocationPickerMap
                                label="📍 Pickup Location (Source)"
                                latitude={formData.pickup_latitude}
                                longitude={formData.pickup_longitude}
                                radius={parseInt(formData.geofence_radius) || 100}
                                onLocationChange={(lat, lng) => {
                                    if (lat === 0 && lng === 0) {
                                        setFormData(prev => ({ ...prev, pickup_latitude: '', pickup_longitude: '' }));
                                    } else {
                                        setFormData(prev => ({
                                            ...prev,
                                            pickup_latitude: lat.toFixed(7),
                                            pickup_longitude: lng.toFixed(7),
                                        }));
                                    }
                                }}
                            />

                            {/* Destination Location Map Picker */}
                            <LocationPickerMap
                                label="🎯 Destination Location"
                                latitude={formData.destination_latitude}
                                longitude={formData.destination_longitude}
                                radius={parseInt(formData.geofence_radius) || 100}
                                onLocationChange={(lat, lng) => {
                                    if (lat === 0 && lng === 0) {
                                        setFormData(prev => ({ ...prev, destination_latitude: '', destination_longitude: '' }));
                                    } else {
                                        setFormData(prev => ({
                                            ...prev,
                                            destination_latitude: lat.toFixed(7),
                                            destination_longitude: lng.toFixed(7),
                                        }));
                                    }
                                }}
                            />
                        </div>
                    </details>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || loading || users.length === 0}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Creating...' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
        </MainLayout>
    );
}
