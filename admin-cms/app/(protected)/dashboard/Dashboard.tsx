'use client';

import { motion } from 'framer-motion';
import { 
    LayoutDashboard, 
    Users,
    UserCheck,
    Headphones,
    ThumbsUp,
    Clock,
    HelpCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Types
interface RoleStats {
    role: string;
    count: number;
}

interface ActiveUsersStats {
    active: number;
    total: number;
    inactive: number;
}

interface HelpdeskSummary {
    total: number;
    pending: number;
    resolved: number;
}

interface GenderStats {
    MALE: number;
    FEMALE: number;
    OTHER: number;
    total: number;
}

interface DistrictUserStats {
    district_id: string;
    district_name: string;
    user_count: number;
}

interface DashboardProps {
    roleStats: RoleStats[];
    activeUsersStats: ActiveUsersStats;
    helpdeskSummary: HelpdeskSummary;
    genderStats: GenderStats;
    districtUserStats: DistrictUserStats[];
}

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
        opacity: 1, 
        scale: 1,
        transition: { duration: 0.3 }
    }
};

// Role colors for pie chart
const ROLE_COLORS: Record<string, string> = {
    TEACHER: '#3b82f6',
    HEADMASTER: '#22c55e',
    CENTER_SUPERINTENDENT: '#f59e0b',
    SEBA_OFFICER: '#8b5cf6',
};

// Role labels for display
const ROLE_LABELS: Record<string, string> = {
    TEACHER: 'Teachers',
    HEADMASTER: 'Headmasters',
    CENTER_SUPERINTENDENT: 'Center Superintendents',
    SEBA_OFFICER: 'SEBA Officers',
};

// Gender colors
const GENDER_COLORS: Record<string, string> = {
    Male: '#3b82f6',
    Female: '#ec4899',
    Other: '#8b5cf6',
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 shadow-lg">
                <p className="text-slate-900 dark:text-white font-medium text-sm">{data.name || data.payload?.name || label}</p>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Count: <span className="text-slate-900 dark:text-white font-semibold">{data.value}</span>
                </p>
            </div>
        );
    }
    return null;
};

export default function Dashboard({ 
    roleStats, 
    activeUsersStats, 
    helpdeskSummary, 
    genderStats, 
    districtUserStats 
}: DashboardProps) {
    // Transform role stats for pie chart
    const rolePieChartData = roleStats?.map(r => ({
        name: ROLE_LABELS[r.role] || r.role,
        value: r.count,
        color: ROLE_COLORS[r.role] || '#64748b',
    })) || [];

    // Transform gender stats for pie chart  
    const genderPieChartData = genderStats ? [
        { name: 'Male', value: genderStats.MALE, color: GENDER_COLORS.Male },
        { name: 'Female', value: genderStats.FEMALE, color: GENDER_COLORS.Female },
        { name: 'Other', value: genderStats.OTHER, color: GENDER_COLORS.Other },
    ].filter(item => item.value > 0) : [];

    return (
        <motion.div 
            className="space-y-6 p-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants}>
                <div className="flex items-center gap-3">
                    <motion.div
                        className="p-2 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg"
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <LayoutDashboard className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Overview of system statistics</p>
                    </div>
                </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                variants={itemVariants}
            >
                {/* Total Users */}
                <motion.div 
                    className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm"
                    variants={cardVariants}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Users</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                                {activeUsersStats?.total || 0}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center">
                            <Users className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                        </div>
                    </div>
                </motion.div>

                {/* Active Users */}
                <motion.div 
                    className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-xl p-5 shadow-sm"
                    variants={cardVariants}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 dark:text-green-400">Active Users</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                                {activeUsersStats?.active || 0}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                            <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </motion.div>

                {/* Helpdesk Tickets */}
                <motion.div 
                    className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-xl p-5 shadow-sm"
                    variants={cardVariants}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400">Helpdesk Tickets</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                                {helpdeskSummary?.total || 0}
                            </p>
                            <div className="flex gap-3 mt-2 text-xs">
                                <span className="flex items-center gap-1 text-amber-600 dark:text-yellow-400">
                                    <Clock className="w-3 h-3" />
                                    {helpdeskSummary?.pending || 0} pending
                                </span>
                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                    <ThumbsUp className="w-3 h-3" />
                                    {helpdeskSummary?.resolved || 0} resolved
                                </span>
                            </div>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                            <HelpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Charts Row - Roles and Gender */}
            <motion.div 
                className="grid grid-cols-1 lg:grid-cols-2 gap-4"
                variants={itemVariants}
            >
                {/* User Roles Pie Chart */}
                <motion.div 
                    className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm"
                    variants={cardVariants}
                >
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Users by Role</h3>
                    {rolePieChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={rolePieChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, value }) => `${value}`}
                                    labelLine={false}
                                >
                                    {rolePieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend 
                                    verticalAlign="middle" 
                                    align="right"
                                    layout="vertical"
                                    wrapperStyle={{ paddingLeft: '20px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                            No data available
                        </div>
                    )}
                </motion.div>

                {/* Gender Pie Chart */}
                <motion.div 
                    className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm"
                    variants={cardVariants}
                >
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Users by Gender</h3>
                    {genderPieChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={genderPieChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                    labelLine={false}
                                >
                                    {genderPieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend 
                                    verticalAlign="bottom" 
                                    align="center"
                                    layout="horizontal"
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                            No data available
                        </div>
                    )}
                </motion.div>
            </motion.div>

            {/* District-wise Users - Full Width Bar Chart */}
            <motion.div variants={itemVariants}>
                <motion.div 
                    className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm"
                    variants={cardVariants}
                >
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Users by District</h3>
                    {districtUserStats && districtUserStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart 
                                data={districtUserStats.map(d => ({ 
                                    name: d.district_name, 
                                    Users: d.user_count 
                                }))}
                                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                            >
                                <XAxis 
                                    dataKey="name" 
                                    stroke="#64748b" 
                                    fontSize={11} 
                                    angle={-45}
                                    textAnchor="end"
                                    interval={0}
                                    height={80}
                                />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar 
                                    dataKey="Users" 
                                    fill="#60a5fa" 
                                    radius={[4, 4, 0, 0]}
                                    name="Users"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-80 text-slate-500 dark:text-slate-400">
                            No data available
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
