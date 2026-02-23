'use client'

import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export interface StackedMonthData {
    month: string
    [key: string]: string | number
}

interface Props {
    data: StackedMonthData[]
    categoryNames: string[]
    sym: string
    showIncome?: boolean
}

const COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
    '#8b5cf6', '#f97316', '#14b8a6', '#ec4899', '#84cc16',
    '#06b6d4', '#a855f7',
]

function fmtShort(n: number) {
    if (n >= 100_000_000) return `${Math.round(n / 100_000_000)}억`
    if (n >= 10_000) return `${Math.round(n / 10_000)}만`
    return Math.round(n).toLocaleString('ko-KR')
}

function fmtFull(n: number) {
    return Math.round(n).toLocaleString('ko-KR')
}

function StackedTooltip({ active, payload, label, sym }: any) {
    if (!active || !payload?.length) return null
    const incomeEntry = payload.find((p: any) => p.dataKey === '_income')
    const expenses = [...payload].reverse().filter((p: any) => p.dataKey !== '_income' && p.value > 0)
    const total = payload
        .filter((p: any) => p.dataKey !== '_income')
        .reduce((s: number, p: any) => s + (p.value || 0), 0)
    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-xs max-w-[200px]">
            <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
            {expenses.map((p: any) => (
                <div key={p.dataKey} className="flex justify-between gap-3 mb-0.5">
                    <span style={{ color: p.fill }} className="truncate">{p.name}</span>
                    <span className="tabular-nums shrink-0">{sym}{fmtFull(p.value)}</span>
                </div>
            ))}
            <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex justify-between font-semibold">
                <span className="text-gray-500">지출합계</span>
                <span className="tabular-nums text-red-500">{sym}{fmtFull(total)}</span>
            </div>
            {incomeEntry && incomeEntry.value > 0 && (
                <div className="flex justify-between mt-1 text-blue-400">
                    <span>수입</span>
                    <span className="tabular-nums">{sym}{fmtFull(incomeEntry.value)}</span>
                </div>
            )}
        </div>
    )
}

export default function ShareStackedChart({ data, categoryNames, sym, showIncome }: Props) {
    const hasIncome = showIncome && data.some(m => (m['_income'] as number) > 0)

    return (
        <div>
            <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip content={<StackedTooltip sym={sym} />} />
                    {categoryNames.map((name, i) => (
                        <Bar
                            key={name}
                            dataKey={name}
                            name={name}
                            stackId="stack"
                            fill={COLORS[i % COLORS.length]}
                            radius={i === categoryNames.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                        />
                    ))}
                    {hasIncome && (
                        <Line
                            dataKey="_income"
                            name="수입"
                            type="monotone"
                            stroke="#60a5fa"
                            strokeWidth={2}
                            dot={{ fill: '#60a5fa', r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
            {/* 범례 */}
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-2 pb-1 text-xs text-gray-500">
                {categoryNames.map((name, i) => (
                    <span key={name} className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        {name}
                    </span>
                ))}
                {hasIncome && (
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block w-4 h-0.5 bg-blue-400 rounded" />
                        수입
                    </span>
                )}
            </div>
        </div>
    )
}
