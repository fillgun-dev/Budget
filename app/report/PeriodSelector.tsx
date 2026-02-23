'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
    from: string
    to: string
}

function getPresets() {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()

    const lastDay = (year: number, month: number) =>
        new Date(year, month + 1, 0).toISOString().split('T')[0]
    const firstDay = (year: number, month: number) =>
        new Date(year, month, 1).toISOString().split('T')[0]

    const q = Math.floor(m / 3)

    return [
        { label: '이번 달', from: firstDay(y, m), to: lastDay(y, m) },
        { label: '지난 달', from: firstDay(y, m - 1), to: lastDay(y, m - 1) },
        { label: '이번 분기', from: firstDay(y, q * 3), to: lastDay(y, q * 3 + 2) },
        { label: '지난 분기', from: firstDay(y, (q - 1) * 3), to: lastDay(y, (q - 1) * 3 + 2) },
        { label: '지난 6개월', from: firstDay(y, m - 5), to: lastDay(y, m) },
        { label: '올해 전체', from: `${y}-01-01`, to: `${y}-12-31` },
    ]
}

export default function PeriodSelector({ from, to }: Props) {
    const router = useRouter()
    const [customFrom, setCustomFrom] = useState(from)
    const [customTo, setCustomTo] = useState(to)

    const presets = getPresets()

    function navigate(f: string, t: string) {
        router.push(`/report?from=${f}&to=${t}`)
    }

    function handleCustomSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (customFrom && customTo && customFrom <= customTo) {
            navigate(customFrom, customTo)
        }
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            {/* 프리셋 버튼 */}
            <div className="flex flex-wrap gap-2 mb-3">
                {presets.map((p) => (
                    <button
                        key={p.label}
                        onClick={() => navigate(p.from, p.to)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            from === p.from && to === p.to
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:text-indigo-600'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* 직접 입력 */}
            <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 flex-wrap">
                <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="rounded-md border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                />
                <span className="text-gray-400 text-sm">~</span>
                <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="rounded-md border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                />
                <button
                    type="submit"
                    className="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
                >
                    조회
                </button>
            </form>
        </div>
    )
}
