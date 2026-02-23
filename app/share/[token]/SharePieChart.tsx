'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = [
    '#6366f1', '#f43f5e', '#f59e0b', '#10b981',
    '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
    '#f97316', '#84cc16',
]

interface Props {
    data: { name: string; value: number }[]
}

export default function SharePieChart({ data }: Props) {
    if (data.length === 0) return null

    const total = data.reduce((s, d) => s + d.value, 0)
    const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')

    return (
        <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="45%"
                        innerRadius="38%"
                        outerRadius="62%"
                        dataKey="value"
                        paddingAngle={2}
                    >
                        {data.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={((value: number) => [`₩${fmt(value)} (${((value / total) * 100).toFixed(1)}%)`]) as any}
                        contentStyle={{ fontSize: '12px' }}
                    />
                    <Legend
                        formatter={(value, entry: any) => (
                            <span style={{ fontSize: '11px', color: 'inherit' }}>
                                {value} {((entry.payload.value / total) * 100).toFixed(1)}%
                            </span>
                        )}
                        wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}
