'use client';

import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { useState, useMemo } from 'react';

interface DistrictUserStats {
    district_id: string;
    district_name: string;
    user_count: number;
}

interface AssamDistrictMapProps {
    districtUserStats: DistrictUserStats[];
}

// Assam district paths - simplified SVG paths for each district
// These are approximate positions, you can replace with actual GeoJSON later
const DISTRICT_PATHS: Record<string, { path: string; cx: number; cy: number }> = {
    'Baksa': { path: 'M120,60 L160,55 L175,70 L165,90 L130,95 L115,80 Z', cx: 145, cy: 75 },
    'Barpeta': { path: 'M80,90 L115,80 L130,95 L125,115 L95,120 L75,105 Z', cx: 100, cy: 100 },
    'Biswanath': { path: 'M280,55 L320,50 L340,65 L335,85 L295,90 L275,75 Z', cx: 305, cy: 70 },
    'Bongaigaon': { path: 'M45,100 L75,95 L85,115 L75,135 L50,130 L40,115 Z', cx: 60, cy: 115 },
    'Cachar': { path: 'M380,220 L420,210 L440,235 L430,265 L395,270 L375,245 Z', cx: 405, cy: 240 },
    'Charaideo': { path: 'M420,90 L455,85 L470,100 L460,120 L430,125 L415,110 Z', cx: 440, cy: 105 },
    'Chirang': { path: 'M95,70 L120,60 L130,75 L125,95 L100,100 L90,85 Z', cx: 110, cy: 82 },
    'Darrang': { path: 'M175,70 L210,65 L225,80 L220,100 L185,105 L170,90 Z', cx: 195, cy: 85 },
    'Dhemaji': { path: 'M340,40 L380,35 L400,50 L395,70 L355,75 L335,60 Z', cx: 365, cy: 55 },
    'Dhubri': { path: 'M10,110 L45,100 L55,125 L45,150 L20,155 L5,135 Z', cx: 30, cy: 130 },
    'Dibrugarh': { path: 'M400,70 L440,65 L460,85 L450,110 L415,115 L395,95 Z', cx: 425, cy: 90 },
    'Dima Hasao': { path: 'M340,180 L380,170 L400,195 L390,225 L355,230 L335,205 Z', cx: 365, cy: 200 },
    'Goalpara': { path: 'M40,130 L70,120 L85,140 L75,165 L50,170 L35,150 Z', cx: 60, cy: 145 },
    'Golaghat': { path: 'M335,100 L375,95 L395,115 L385,140 L350,145 L330,125 Z', cx: 360, cy: 120 },
    'Hailakandi': { path: 'M395,265 L425,260 L440,280 L430,305 L400,310 L385,290 Z', cx: 410, cy: 285 },
    'Hojai': { path: 'M290,130 L320,125 L335,145 L325,165 L295,170 L280,150 Z', cx: 305, cy: 148 },
    'Jorhat': { path: 'M375,110 L410,105 L425,125 L415,150 L380,155 L365,135 Z', cx: 392, cy: 130 },
    'Kamrup': { path: 'M130,95 L175,90 L190,115 L180,145 L140,150 L125,125 Z', cx: 155, cy: 120 },
    'Kamrup Metropolitan': { path: 'M150,130 L180,125 L190,145 L180,165 L155,168 L145,150 Z', cx: 167, cy: 147 },
    'Karbi Anglong': { path: 'M280,140 L340,130 L365,165 L350,210 L295,220 L270,180 Z', cx: 315, cy: 175 },
    'Karimganj': { path: 'M420,265 L460,255 L480,280 L470,310 L435,315 L415,290 Z', cx: 445, cy: 285 },
    'Kokrajhar': { path: 'M55,75 L95,70 L105,90 L95,115 L60,120 L50,100 Z', cx: 75, cy: 95 },
    'Lakhimpur': { path: 'M330,50 L370,45 L390,65 L380,90 L345,95 L325,75 Z', cx: 355, cy: 70 },
    'Majuli': { path: 'M360,70 L390,65 L400,80 L395,95 L365,100 L355,85 Z', cx: 375, cy: 82 },
    'Morigaon': { path: 'M210,100 L245,95 L260,115 L250,140 L215,145 L200,125 Z', cx: 228, cy: 120 },
    'Nagaon': { path: 'M245,110 L290,105 L310,135 L295,170 L255,175 L235,145 Z', cx: 270, cy: 140 },
    'Nalbari': { path: 'M115,80 L145,75 L155,95 L145,115 L120,118 L110,100 Z', cx: 132, cy: 97 },
    'Sivasagar': { path: 'M395,85 L430,80 L448,100 L438,125 L405,130 L388,110 Z', cx: 415, cy: 105 },
    'Sonitpur': { path: 'M225,65 L280,55 L300,80 L290,110 L240,118 L215,95 Z', cx: 255, cy: 88 },
    'South Salmara-Mankachar': { path: 'M5,145 L35,140 L45,160 L35,180 L10,185 L0,165 Z', cx: 22, cy: 162 },
    'Tinsukia': { path: 'M450,60 L490,55 L510,75 L500,100 L465,105 L445,85 Z', cx: 475, cy: 80 },
    'Udalguri': { path: 'M165,55 L200,50 L215,65 L210,85 L175,90 L160,75 Z', cx: 185, cy: 70 },
    'West Karbi Anglong': { path: 'M250,145 L285,140 L295,165 L285,190 L255,195 L245,170 Z', cx: 268, cy: 168 },
};

// Get color based on user count
function getColorForCount(count: number, maxCount: number): string {
    if (maxCount === 0) return '#e2e8f0'; // slate-200

    const intensity = count / maxCount;

    if (intensity === 0) return '#e2e8f0';
    if (intensity < 0.2) return '#bfdbfe'; // blue-200
    if (intensity < 0.4) return '#93c5fd'; // blue-300
    if (intensity < 0.6) return '#60a5fa'; // blue-400
    if (intensity < 0.8) return '#3b82f6'; // blue-500
    return '#2563eb'; // blue-600
}

export default function AssamDistrictMap({ districtUserStats }: AssamDistrictMapProps) {
    const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    // Create a map of district name to user count
    const districtCountMap = useMemo(() => {
        const map: Record<string, number> = {};
        districtUserStats.forEach(stat => {
            map[stat.district_name] = stat.user_count;
        });
        return map;
    }, [districtUserStats]);

    // Get max count for color scaling
    const maxCount = useMemo(() => {
        return Math.max(...districtUserStats.map(s => s.user_count), 1);
    }, [districtUserStats]);

    // Get total users
    const totalUsers = useMemo(() => {
        return districtUserStats.reduce((sum, s) => sum + s.user_count, 0);
    }, [districtUserStats]);

    const handleMouseMove = (e: React.MouseEvent, districtName: string) => {
        setHoveredDistrict(districtName);
        const rect = e.currentTarget.getBoundingClientRect();
        const svgRect = e.currentTarget.closest('svg')?.getBoundingClientRect();
        if (svgRect) {
            setTooltipPos({
                x: e.clientX - svgRect.left,
                y: e.clientY - svgRect.top - 40
            });
        }
    };

    const handleMouseLeave = () => {
        setHoveredDistrict(null);
    };

    return (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-500" />
                    Users by District
                </h3>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                    {totalUsers.toLocaleString()} total
                </span>
            </div>

            <div className="relative">
                <svg
                    viewBox="0 0 520 330"
                    className="w-full h-auto"
                    style={{ maxHeight: '350px' }}
                >
                    {/* Background */}
                    <rect x="0" y="0" width="520" height="330" fill="transparent" />

                    {/* District paths */}
                    {Object.entries(DISTRICT_PATHS).map(([name, { path, cx, cy }]) => {
                        const count = districtCountMap[name] || 0;
                        const fillColor = getColorForCount(count, maxCount);
                        const isHovered = hoveredDistrict === name;

                        return (
                            <motion.g
                                key={name}
                                onMouseMove={(e) => handleMouseMove(e, name)}
                                onMouseLeave={handleMouseLeave}
                                style={{ cursor: 'pointer' }}
                            >
                                <motion.path
                                    d={path}
                                    fill={fillColor}
                                    stroke={isHovered ? '#1e40af' : '#64748b'}
                                    strokeWidth={isHovered ? 2 : 0.5}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{
                                        opacity: 1,
                                        scale: isHovered ? 1.02 : 1,
                                    }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        transformOrigin: `${cx}px ${cy}px`,
                                        filter: isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'none'
                                    }}
                                />
                            </motion.g>
                        );
                    })}

                    {/* Tooltip */}
                    {hoveredDistrict && (
                        <g>
                            <rect
                                x={tooltipPos.x - 60}
                                y={tooltipPos.y - 10}
                                width="120"
                                height="45"
                                rx="6"
                                fill="#1e293b"
                                opacity="0.95"
                            />
                            <text
                                x={tooltipPos.x}
                                y={tooltipPos.y + 8}
                                textAnchor="middle"
                                fill="white"
                                fontSize="11"
                                fontWeight="600"
                            >
                                {hoveredDistrict}
                            </text>
                            <text
                                x={tooltipPos.x}
                                y={tooltipPos.y + 25}
                                textAnchor="middle"
                                fill="#94a3b8"
                                fontSize="10"
                            >
                                {(districtCountMap[hoveredDistrict] || 0).toLocaleString()} users
                            </text>
                        </g>
                    )}
                </svg>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-600" />
                        <span>0</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-blue-200" />
                        <span>Low</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-blue-400" />
                        <span>Medium</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-blue-600" />
                        <span>High</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
