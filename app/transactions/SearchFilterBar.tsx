'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useTransition } from 'react'
import { Search, X } from 'lucide-react'

interface Category { id: string; name: string; type: string }

interface Props {
    categories: Category[]
    baseUrl?: string
    showPeriodToggle?: boolean
}

export default function SearchFilterBar({ categories, baseUrl = '/transactions', showPeriodToggle = true }: Props) {
    const router = useRouter()
    const params = useSearchParams()
    const [, startTransition] = useTransition()
    const searchInputRef = useRef<HTMLInputElement>(null)

    const currentCategory = params.get('category') ?? ''
    const currentSearch = params.get('search') ?? ''
    const isAllPeriod = params.get('period') === 'all'

    function buildUrl(overrides: Record<string, string>) {
        const p = new URLSearchParams(params.toString())
        for (const [k, v] of Object.entries(overrides)) {
            if (v) p.set(k, v)
            else p.delete(k)
        }
        return `${baseUrl}?${p.toString()}`
    }

    function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
        startTransition(() => {
            router.push(buildUrl({ category: e.target.value }))
        })
    }

    function handleSearchSubmit(e: React.FormEvent) {
        e.preventDefault()
        const val = searchInputRef.current?.value ?? ''
        startTransition(() => {
            router.push(buildUrl({ search: val }))
        })
    }

    function clearSearch() {
        if (searchInputRef.current) searchInputRef.current.value = ''
        startTransition(() => {
            router.push(buildUrl({ search: '' }))
        })
    }

    function handlePeriodToggle(e: React.ChangeEvent<HTMLInputElement>) {
        startTransition(() => {
            router.push(buildUrl({ period: e.target.checked ? 'all' : '' }))
        })
    }

    return (
        <div className="space-y-2 mb-4">
            {/* 1행: 카테고리 필터 + 전체 기간 토글 */}
            <div className="flex items-center gap-3">
                {/* 항목(카테고리) 필터 */}
                <div className="relative flex-1">
                    <select
                        value={currentCategory}
                        onChange={handleCategoryChange}
                        className="w-full py-2 pl-3 pr-8 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                    >
                        <option value="">전체 항목</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
                </div>

                {/* 전체 기간 토글 */}
                {showPeriodToggle && (
                    <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={isAllPeriod}
                                onChange={handlePeriodToggle}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer-checked:bg-indigo-600 transition-colors" />
                            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">전체 기간</span>
                    </label>
                )}
            </div>

            {/* 2행: 검색창 (전체 너비) */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="내용 또는 메모 검색"
                        defaultValue={currentSearch}
                        className="w-full pl-9 pr-9 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {currentSearch && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <button
                    type="submit"
                    className="px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors shrink-0"
                >
                    검색
                </button>
            </form>
        </div>
    )
}
