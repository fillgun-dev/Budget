import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Pencil, Plus } from 'lucide-react'
import DeleteButton from './DeleteButton'
import SearchFilterBar from './SearchFilterBar'
import MonthPicker from './MonthPicker'

type FilterType = 'all' | 'expense' | 'income'
type DisplayCurrency = 'TRY' | 'KRW'

const SYMBOL: Record<string, string> = { KRW: '₩', TRY: '₺', USD: '$', EUR: '€' }

interface Props {
    searchParams: Promise<{
        year?: string
        month?: string
        type?: string
        display?: string
        category?: string
        search?: string
        period?: string
    }>
}

export default async function TransactionsPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const params = await searchParams
    const now = new Date()
    const year = parseInt(params.year ?? String(now.getFullYear()))
    const month = parseInt(params.month ?? String(now.getMonth() + 1))
    const filterType: FilterType = (params.type as FilterType) ?? 'all'
    const display: DisplayCurrency = params.display === 'KRW' ? 'KRW' : 'TRY'
    const categoryFilter = params.category ?? ''
    const searchFilter = params.search?.trim() ?? ''
    const isAllPeriod = params.period === 'all'

    // 월 범위
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
    const nextDate = new Date(year, month, 1)
    const monthEnd = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`

    // 이전/다음 달
    const prevDate = new Date(year, month - 2, 1)
    const nextMonthDate = new Date(year, month, 1)
    const prevParams = new URLSearchParams({ year: String(prevDate.getFullYear()), month: String(prevDate.getMonth() + 1), type: filterType, display })
    const nextParams = new URLSearchParams({ year: String(nextMonthDate.getFullYear()), month: String(nextMonthDate.getMonth() + 1), type: filterType, display })

    // 카테고리 목록 (필터용)
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name, type')
        .eq('is_active', true)
        .order('name')

    // 거래 조회
    let query = supabase
        .from('transactions')
        .select('*, categories(name), payment_methods(name)')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

    if (!isAllPeriod) {
        query = query.gte('date', monthStart).lt('date', monthEnd)
    } else {
        query = query.limit(300)
    }

    if (filterType !== 'all') {
        query = query.eq('type', filterType)
    }
    if (categoryFilter) {
        query = query.eq('category_id', categoryFilter)
    }
    if (searchFilter) {
        query = query.or(`content.ilike.%${searchFilter}%,memo.ilike.%${searchFilter}%`)
    }

    const { data: transactions } = await query

    const rows = transactions ?? []

    // 합계 (TRY 모드: try_amount 우선, 없으면 TRY 거래만 original_amount)
    function getDisplayAmount(t: { krw_amount: number; try_amount: number | null; original_amount: number; currency: string }) {
        if (display === 'KRW') return t.krw_amount
        return t.try_amount ?? (t.currency === 'TRY' ? t.original_amount : 0)
    }

    const totalExpense = rows.filter(t => t.type === 'expense').reduce((s, t) => s + getDisplayAmount(t), 0)
    const totalIncome = rows.filter(t => t.type === 'income').reduce((s, t) => s + getDisplayAmount(t), 0)

    // 날짜별 그룹핑
    const grouped: Record<string, typeof rows> = {}
    for (const t of rows) {
        if (!grouped[t.date]) grouped[t.date] = []
        grouped[t.date].push(t)
    }
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

    const fmt = (n: number) => n.toLocaleString('ko-KR')
    const sym = SYMBOL[display]

    function makeUrl(overrides: Record<string, string>) {
        const p = new URLSearchParams({ year: String(year), month: String(month), type: filterType, display })
        if (categoryFilter) p.set('category', categoryFilter)
        if (searchFilter) p.set('search', searchFilter)
        if (isAllPeriod) p.set('period', 'all')
        for (const [k, v] of Object.entries(overrides)) {
            if (!v) p.delete(k)
            else p.set(k, v)
        }
        return `/transactions?${p.toString()}`
    }

    const isFiltered = !!(categoryFilter || searchFilter || isAllPeriod)

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 pb-16">
            {/* 상단 헤더 */}
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">내역 조회</h1>
                <div className="flex items-center gap-2">
                    {/* 통화 토글 */}
                    <div className="flex rounded-lg overflow-hidden ring-1 ring-gray-300 dark:ring-gray-600 text-xs font-semibold">
                        <Link href={makeUrl({ display: 'TRY' })} className={`px-2.5 py-1.5 transition-colors ${display === 'TRY' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>₺ TRY</Link>
                        <Link href={makeUrl({ display: 'KRW' })} className={`px-2.5 py-1.5 transition-colors ${display === 'KRW' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>₩ KRW</Link>
                    </div>
                    <Link href="/transactions/new" className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
                        + 추가
                    </Link>
                </div>
            </div>

            {/* 월 네비게이션 / 전체 기간 표시 */}
            {isAllPeriod ? (
                <div className="flex items-center justify-center mb-4 py-2">
                    <span className="text-base font-semibold text-indigo-600 dark:text-indigo-400">
                        전체 기간
                    </span>
                </div>
            ) : (
                <div className="flex items-center justify-between mb-4">
                    <Link href={`/transactions?${prevParams}`} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <MonthPicker year={year} month={month} filterType={filterType} display={display} />
                    <Link href={`/transactions?${nextParams}`} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <ChevronRight className="w-5 h-5" />
                    </Link>
                </div>
            )}

            {/* 요약 카드 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">지출</div>
                    <div className="text-sm font-bold text-red-600 dark:text-red-400">{sym}{fmt(totalExpense)}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">수입</div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{sym}{fmt(totalIncome)}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">합계</div>
                    <div className={`text-sm font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {sym}{fmt(totalIncome - totalExpense)}
                    </div>
                </div>
            </div>

            {/* 타입 필터 탭 */}
            <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {(['all', 'expense', 'income'] as const).map((t) => (
                    <Link
                        key={t}
                        href={makeUrl({ type: t })}
                        className={`flex-1 text-center text-xs font-medium py-1.5 rounded-md transition-colors ${filterType === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        {t === 'all' ? '전체' : t === 'expense' ? '지출' : '수입'}
                    </Link>
                ))}
            </div>

            {/* 검색 & 카테고리 필터 */}
            <SearchFilterBar categories={categories ?? []} />

            {/* 필터 적용 중 표시 */}
            {isFiltered && (
                <div className="flex items-center gap-2 mb-3 text-xs text-indigo-600 dark:text-indigo-400">
                    <span>필터 적용됨</span>
                    <span className="text-gray-400">—</span>
                    <span>{rows.length}건</span>
                    <Link
                        href={makeUrl({ category: '', search: '', period: '' })}
                        className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
                    >
                        필터 초기화
                    </Link>
                </div>
            )}

            {/* 내역 리스트 */}
            {sortedDates.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-400">
                    {isFiltered ? (
                        <>
                            검색 결과가 없습니다.
                            <br />
                            <Link href={makeUrl({ category: '', search: '', period: '' })} className="mt-2 inline-block text-indigo-600 dark:text-indigo-400 underline">
                                필터 초기화
                            </Link>
                        </>
                    ) : (
                        <>
                            이 달의 내역이 없습니다.
                            <br />
                            <Link href="/transactions/new" className="mt-2 inline-block text-indigo-600 dark:text-indigo-400 underline">
                                내역 추가하기
                            </Link>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedDates.map((date) => {
                        const dayRows = grouped[date]
                        const dayExpense = dayRows.filter(t => t.type === 'expense').reduce((s, t) => s + getDisplayAmount(t), 0)

                        return (
                            <div key={date} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                {/* 날짜 헤더 */}
                                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                        {date} ({['일', '월', '화', '수', '목', '금', '토'][new Date(date).getDay()]})
                                    </span>
                                    {dayExpense > 0 && (
                                        <span className="text-xs text-red-500">-{sym}{fmt(dayExpense)}</span>
                                    )}
                                </div>

                                {/* 거래 목록 */}
                                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {dayRows.map((t) => {
                                        const amount = getDisplayAmount(t)
                                        const amtSym = display === 'TRY' ? '₺' : '₩'

                                        return (
                                            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                                                <span className={`flex-shrink-0 w-2 h-2 rounded-full ${t.type === 'expense' ? 'bg-red-400' : 'bg-blue-400'}`} />
                                                <Link href={`/transactions/${t.id}`} className="flex-1 min-w-0 group">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                                        {t.content}
                                                    </p>
                                                    <p className="text-xs text-gray-400 truncate">
                                                        {(t.categories as any)?.name ?? '-'}
                                                        {(t.payment_methods as any)?.name && ` · ${(t.payment_methods as any).name}`}
                                                    </p>
                                                </Link>
                                                <div className="text-right flex-shrink-0">
                                                    <p className={`text-sm font-semibold ${t.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                                        {t.type === 'expense' ? '-' : '+'}{amtSym}{fmt(amount)}
                                                    </p>
                                                    {/* 보조 통화: 원화 모드엔 원래 통화, TRY 모드엔 원화 */}
                                                    {display === 'KRW' && t.currency !== 'KRW' && (
                                                        <p className="text-xs text-gray-400">{SYMBOL[t.currency] ?? t.currency}{fmt(t.original_amount)}</p>
                                                    )}
                                                    {display === 'TRY' && t.currency !== 'TRY' && (
                                                        <p className="text-xs text-gray-400">{SYMBOL[t.currency] ?? t.currency}{fmt(t.original_amount)}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <Link
                                                        href={`/transactions/${t.id}/edit`}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                                        title="수정"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Link>
                                                    <DeleteButton id={t.id} />
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        )
                    })}
                </div>
            )}
        {/* FAB - 내역 추가 */}
        <Link
            href="/transactions/new"
            className="fixed bottom-safe-6 right-6 z-50 flex items-center gap-2 rounded-full bg-indigo-600 pl-4 pr-5 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 active:scale-95 transition-all"
        >
            <Plus className="w-5 h-5 flex-shrink-0" />
            <span>내역 추가</span>
        </Link>
        </div>
    )
}
