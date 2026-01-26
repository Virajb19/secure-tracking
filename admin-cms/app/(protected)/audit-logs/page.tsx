'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { auditLogsApi } from '@/services/api';
import { AuditLog } from '@/types';

// Action type colors
const actionColors: Record<string, string> = {
    'USER_LOGIN': 'bg-green-500/20 text-green-400',
    'USER_LOGIN_FAILED': 'bg-red-500/20 text-red-400',
    'USER_CREATED': 'bg-blue-500/20 text-blue-400',
    'TASK_CREATED': 'bg-purple-500/20 text-purple-400',
    'EVENT_UPLOADED': 'bg-yellow-500/20 text-yellow-400',
    'DEVICE_ID_MISMATCH': 'bg-red-500/20 text-red-400',
    'DEVICE_ID_BOUND': 'bg-blue-500/20 text-blue-400',
};

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const pageSize = 50;

    const fetchLogs = async (offset: number) => {
        try {
            setLoading(true);
            const data = await auditLogsApi.getAll(pageSize, offset);
            if (offset === 0) {
                setLogs(data);
            } else {
                setLogs(prev => [...prev, ...data]);
            }
            setHasMore(data.length === pageSize);
        } catch {
            setError('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(0);
    }, []);

    const loadMore = () => {
        const newPage = page + 1;
        setPage(newPage);
        fetchLogs(newPage * pageSize);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const getActionColor = (action: string) => {
        return actionColors[action] || 'bg-slate-700 text-slate-300';
    };

    return (
        <MainLayout title="Audit Logs" subtitle="System activity and security logs">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {/* Header Info */}
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-700 flex items-center justify-center">
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white font-medium">Immutable Audit Trail</p>
                            <p className="text-xs text-slate-400">All records are permanent and cannot be modified</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                {logs.length === 0 && !loading ? (
                    <div className="p-8 text-center">
                        <p className="text-slate-400">No audit logs found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Timestamp</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Action</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Entity Type</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Entity ID</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">User ID</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">IP Address</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-slate-300">{formatDate(log.created_at)}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-slate-300">{log.entity_type}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-xs font-mono text-slate-400">
                                                {log.entity_id ? log.entity_id.slice(0, 8) + '...' : '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-xs font-mono text-slate-400">
                                                {log.user_id ? log.user_id.slice(0, 8) + '...' : '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-slate-400 font-mono">{log.ip_address || '-'}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Loading / Load More */}
                <div className="px-6 py-4 border-t border-slate-800">
                    {loading ? (
                        <div className="flex items-center justify-center gap-3">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500"></div>
                            <span className="text-slate-400 text-sm">Loading logs...</span>
                        </div>
                    ) : error ? (
                        <p className="text-red-400 text-center text-sm">{error}</p>
                    ) : hasMore ? (
                        <button
                            onClick={loadMore}
                            className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            Load More
                        </button>
                    ) : (
                        <p className="text-center text-sm text-slate-500">
                            Showing all {logs.length} records
                        </p>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
