'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
    year: number
    month: number
    filterType: string
    display: string
    baseUrl?: string
}

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

export default function MonthPicker({ year, month, filterType, display, baseUrl = '/transactions' }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [pickerYear, setPickerYear] = useState(year)
    const ref = useRef<HTMLDivElement>(null)
    const now = new Date()

    useEffect(() => {
        if (!open) return
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    function handleOpen() {
        setPickerYear(year)
        setOpen(v => !v)
    }

    function selectMonth(y: number, m: number) {
        const p = new URLSearchParams({ year: String(y), month: String(m), type: filterType, display })
        router.push(`${baseUrl}?${p.toString()}`)
        setOpen(false)
    }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={handleOpen}
                className="text-base font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
                {year}년 {month}월 ▾
            </button>

            {open && (
                <div className="absolute left-1/2 -translate-x-1/2 top-10 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-60">
                    {/* 연도 선택 */}
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={() => setPickerYear(y => y - 1)}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{pickerYear}년</span>
                        <button
                            onClick={() => setPickerYear(y => y + 1)}
                            disabled={pickerYear >= now.getFullYear()}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* 월 그리드 */}
                    <div className="grid grid-cols-3 gap-1.5">
                        {MONTHS.map((label, i) => {
                            const m = i + 1
                            const isSelected = pickerYear === year && m === month
                            const isFuture =
                                pickerYear > now.getFullYear() ||
                                (pickerYear === now.getFullYear() && m > now.getMonth() + 1)
                            return (
                                <button
                                    key={m}
                                    onClick={() => !isFuture && selectMonth(pickerYear, m)}
                                    disabled={isFuture}
                                    className={`py-2 rounded-lg text-sm font-medium transition-colors
                                        ${isSelected
                                            ? 'bg-indigo-600 text-white'
                                            : isFuture
                                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400'
                                        }`}
                                >
                                    {label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
