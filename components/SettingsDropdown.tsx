'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Settings, Wallet, BarChart2, CreditCard, ChevronDown, UserCog, Zap } from 'lucide-react'

export default function SettingsDropdown() {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1 text-indigo-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
            >
                <Settings className="w-4 h-4 mr-1" />
                설정
                <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                    <Link
                        href="/settings"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                        <UserCog className="w-4 h-4" />
                        개인 설정
                    </Link>
                    <div className="border-t border-gray-100 dark:border-gray-700 mx-2" />
                    <Link
                        href="/categories"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                        <Wallet className="w-4 h-4" />
                        항목 관리
                    </Link>
                    <Link
                        href="/budget"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                        <BarChart2 className="w-4 h-4" />
                        예산 관리
                    </Link>
                    <Link
                        href="/payment-methods"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                        <CreditCard className="w-4 h-4" />
                        결제수단
                    </Link>
                    <Link
                        href="/templates"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                        <Zap className="w-4 h-4" />
                        빠른 내역
                    </Link>
                </div>
            )}
        </div>
    )
}
