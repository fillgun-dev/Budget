'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

export interface PieEntry {
    name: string
    value: number
}

interface Props {
    data: PieEntry[]
    sym: string
}

const COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
    '#8b5cf6', '#f97316', '#14b8a6', '#ec4899', '#84cc16',
    '#06b6d4', '#a855f7',
]

function fmtFull(n: number) {
    return Math.round(n).toLocaleString('ko-KR')
}

function CustomTooltip({ active, payload, sym }: any) {
    if (!active || !payload?.length) return null
    const p = payload[0]
    const total = p.payload.total
    const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0'
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs">
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-0.5">{p.name}</p>
            <p style={{ color: p.payload.fill }}>{sym}{fmtFull(p.value)}</p>
            <p className="text-gray-400">{pct}%</p>
        </div>
    )
}

export default function DashboardPieChart({ data, sym }: Props) {
    if (data.length === 0) return null

    const total = data.reduce((s, d) => s + d.value, 0)
    // total을 각 항목에 심어서 tooltip에서 비율 계산에 사용
    const enriched = data.map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length], total }))

    return (
        <div className="flex flex-col items-center gap-4">
            {/* 높이: 모바일 180px, 데스크톱(lg+) 360px */}
            <div className="w-full h-[180px] lg:h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={enriched}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius="70%"
                            innerRadius="38%"
                            paddingAngle={2}
                        >
                            {enriched.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip sym={sym} />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* 범례 */}
            <div className="w-full space-y-1.5">
                {enriched.map((entry) => {
                    const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0
                    return (
                        <div key={entry.name} className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                            <span className="text-gray-600 dark:text-gray-400 truncate">{entry.name}</span>
                            <span className="ml-auto tabular-nums text-gray-500 dark:text-gray-400 shrink-0">
                                {sym}{fmtFull(entry.value)}
                                <span className="text-gray-300 dark:text-gray-600 ml-1">({pct}%)</span>
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
