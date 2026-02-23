import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Pencil, Plus, Settings2 } from 'lucide-react'
import DeleteButton from '@/app/transactions/DeleteButton'
import SearchFilterBar from '@/app/transactions/SearchFilterBar'
import MonthPicker from '@/app/transactions/MonthPicker'

type FilterType = 'all' | 'expense' | 'income'
type DisplayCurrency = 'TRY' | 'KRW'

const SYMBOL: Record<string, string> = { KRW: '₩', TRY: '₺', USD: '$', EUR: '€' }

const COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
    '#8b5cf6', '#f97316', '#14b8a6', '#ec4899', '#84cc16',
]

interface Props {
    searchParams: Promise<{
        year?: string
        month?: string
        type?: string
        display?: string
        category?: string
        search?: string
    }>
}

export default async function Home({ searchParams }: Props) {
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

    const currentMonth = `${year}-${String(month).padStart(2, '0')}`
    const monthStart = `${currentMonth}-01`
    const nextDate = new Date(year, month, 1)
    const monthEnd = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`

    // 이전/다음달
    const prevDate = new Date(year, month - 2, 1)
    const nextMonthDate = new Date(year, month, 1)
    const prevParams = new URLSearchParams({ year: String(prevDate.getFullYear()), month: String(prevDate.getMonth() + 1), type: filterType, display })
    const nextParams = new URLSearchParams({ year: String(nextMonthDate.getFullYear()), month: String(nextMonthDate.getMonth() + 1), type: filterType, display })

    // 데이터 조회 (월 전체 거래 1회, 카테고리, 예산)
    const [allTransRes, categoriesRes, budgetRes] = await Promise.all([
        supabase
            .from('transactions')
            .select('*, categories(name), payment_methods(name)')
            .eq('user_id', user.id)
            .gte('date', monthStart)
            .lt('date', monthEnd)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false }),
        supabase
            .from('categories')
            .select('id, name, type')
            .eq('is_active', true)
            .order('name'),
        supabase
            .from('category_budgets')
            .select('category_id, amount, month')
            .eq('user_id', user.id)
            .or(`month.is.null,month.eq.${currentMonth}`),
    ])

    const allRows = allTransRes.data ?? []
    const categories = categoriesRes.data ?? []

    // 예산 맵
    const defaultBudgets = new Map<string, number>()
    const monthBudgets = new Map<string, number>()
    for (const b of budgetRes.data ?? []) {
        if (b.month === null) defaultBudgets.set(b.category_id, b.amount)
        else monthBudgets.set(b.category_id, b.amount)
    }
    const budgetMap = new Map([...defaultBudgets, ...monthBudgets])

    // 금액 헬퍼
    type AmountRow = { krw_amount: number; try_amount: number | null; original_amount: number; currency: string }
    function getAmount(t: AmountRow) {
        if (display === 'KRW') return t.krw_amount ?? 0
        return t.try_amount ?? (t.currency === 'TRY' ? t.original_amount : 0)
    }

    // 집계 (필터 미적용 — 요약 카드 & 카테고리 섹션용)
    const allExpenses = allRows.filter(t => t.type === 'expense')
    const allIncomes = allRows.filter(t => t.type === 'income')
    const monthlyExpense = allExpenses.reduce((s, t) => s + getAmount(t), 0)
    const monthlyIncome = allIncomes.reduce((s, t) => s + getAmount(t), 0)

    // 카테고리별 집계
    type CategoryEntry = { name: string; categoryId: string; amount: number }
    const categoryMap = new Map<string, CategoryEntry>()
    for (const t of allExpenses) {
        const id = (t.category_id as string) ?? '__none__'
        const name = (t.categories as any)?.name ?? '미분류'
        const entry = categoryMap.get(id)
        if (entry) entry.amount += getAmount(t)
        else categoryMap.set(id, { name, categoryId: id, amount: getAmount(t) })
    }
    const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount)
    const totalBudget = Array.from(budgetMap.values()).reduce((s, v) => s + v, 0)
    const showBudget = display === 'TRY'

    // 필터 적용 (내역 리스트용)
    let rows = allRows
    if (filterType !== 'all') rows = rows.filter(t => t.type === filterType)
    if (categoryFilter) rows = rows.filter(t => t.category_id === categoryFilter)
    if (searchFilter) {
        const q = searchFilter.toLowerCase()
        rows = rows.filter(t =>
            t.content?.toLowerCase().includes(q) ||
            (t.memo && t.memo.toLowerCase().includes(q))
        )
    }

    // 날짜별 그룹
    const grouped: Record<string, typeof rows> = {}
    for (const t of rows) {
        if (!grouped[t.date]) grouped[t.date] = []
        grouped[t.date].push(t)
    }
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

    const fmt = (n: number) => n.toLocaleString('ko-KR')
    const sym = SYMBOL[display]
    const isFiltered = !!(categoryFilter || searchFilter)

    function makeUrl(overrides: Record<string, string>) {
        const p = new URLSearchParams({ year: String(year), month: String(month), type: filterType, display })
        if (categoryFilter) p.set('category', categoryFilter)
        if (searchFilter) p.set('search', searchFilter)
        for (const [k, v] of Object.entries(overrides)) {
            if (!v) p.delete(k)
            else p.set(k, v)
        }
        return `/?${p.toString()}`
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 pb-28">

            {/* 상단: 제목 + 통화 토글 + 추가 버튼 */}
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">가계부</h1>
                <div className="flex items-center gap-2">
                    <div className="flex rounded-lg overflow-hidden ring-1 ring-gray-300 dark:ring-gray-600 text-xs font-semibold">
                        <Link href={makeUrl({ display: 'TRY' })} className={`px-2.5 py-1.5 transition-colors ${display === 'TRY' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>₺ TRY</Link>
                        <Link href={makeUrl({ display: 'KRW' })} className={`px-2.5 py-1.5 transition-colors ${display === 'KRW' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>₩ KRW</Link>
                    </div>
                    <Link href="/transactions/new" className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors">
                        + 추가
                    </Link>
                </div>
            </div>

            {/* 월 네비게이션 */}
            <div className="flex items-center justify-between mb-4">
                <Link href={`/?${prevParams}`} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <MonthPicker year={year} month={month} filterType={filterType} display={display} baseUrl="/" />
                <Link href={`/?${nextParams}`} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ChevronRight className="w-5 h-5" />
                </Link>
            </div>

            {/* 요약 카드 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">지출</div>
                    <div className="text-sm font-bold text-red-600 dark:text-red-400">{sym}{fmt(Math.round(monthlyExpense))}</div>
                    {showBudget && totalBudget > 0 && (
                        <div className="mt-1.5">
                            <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                                <span>예산</span>
                                <span>{Math.round((monthlyExpense / totalBudget) * 100)}%</span>
                            </div>
                            <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${monthlyExpense > totalBudget ? 'bg-red-500' : monthlyExpense / totalBudget > 0.8 ? 'bg-amber-400' : 'bg-green-400'}`}
                                    style={{ width: `${Math.min((monthlyExpense / totalBudget) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">수입</div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{sym}{fmt(Math.round(monthlyIncome))}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">잔액</div>
                    <div className={`text-sm font-bold ${monthlyIncome - monthlyExpense >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {sym}{fmt(Math.round(monthlyIncome - monthlyExpense))}
                    </div>
                </div>
            </div>

            {/* 항목별 지출 (접기/펼치기) */}
            {categoryBreakdown.length > 0 && (
                <details className="mb-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden" open>
                    <summary className="px-4 py-3 cursor-pointer list-none flex items-center justify-between border-b border-gray-100 dark:border-gray-700 select-none [&::-webkit-details-marker]:hidden">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">항목별 지출</span>
                        <span className="text-xs text-gray-400">▾ 접기</span>
                    </summary>

                    <div className="px-4 py-3 space-y-4">
                        {categoryBreakdown.map(({ name, categoryId, amount }, i) => {
                            const budget = showBudget ? budgetMap.get(categoryId) : undefined
                            const spendPct = monthlyExpense > 0 ? Math.round((amount / monthlyExpense) * 100) : 0
                            const budgetPct = budget && budget > 0 ? Math.round((amount / budget) * 100) : null
                            const isOverBudget = budget != null && amount > budget
                            const isWarning = budget != null && !isOverBudget && amount / budget > 0.8
                            const color = COLORS[i % COLORS.length]

                            // 바 너비: 예산 있으면 예산 소진율, 없으면 월 지출 비중
                            const barWidth = budgetPct != null ? Math.min(budgetPct, 100) : spendPct
                            const barColor = isOverBudget
                                ? 'bg-red-500'
                                : isWarning
                                ? 'bg-amber-400'
                                : budget != null
                                ? 'bg-green-400'
                                : 'bg-indigo-300 dark:bg-indigo-500'

                            return (
                                <div key={categoryId}>
                                    {/* 1행: 색상 점 + 이름 + 뱃지 + 금액 */}
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{name}</span>
                                            {isOverBudget && (
                                                <span className="text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded shrink-0">초과</span>
                                            )}
                                            {isWarning && (
                                                <span className="text-xs font-medium text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded shrink-0">주의</span>
                                            )}
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 shrink-0 ml-2">
                                            {sym}{fmt(Math.round(amount))}
                                        </span>
                                    </div>

                                    {/* 2행: 프로그레스 바 */}
                                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                                        <div
                                            className={`h-full rounded-full transition-all ${barColor}`}
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>

                                    {/* 3행: 예산 % (좌) + 지출 % (우) */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            {budgetPct != null ? (
                                                <span className={`text-xs font-medium ${
                                                    isOverBudget
                                                        ? 'text-red-500'
                                                        : isWarning
                                                        ? 'text-amber-500'
                                                        : 'text-green-600 dark:text-green-400'
                                                }`}>
                                                    예산 {budgetPct}%
                                                    {budget != null && (
                                                        <span className="text-gray-400 font-normal ml-1">
                                                            ({sym}{fmt(Math.round(amount))} / {sym}{fmt(budget)})
                                                        </span>
                                                    )}
                                                </span>
                                            ) : showBudget ? (
                                                <Link
                                                    href={`/categories?budget=${categoryId}`}
                                                    className="text-gray-300 hover:text-indigo-400 dark:text-gray-600 dark:hover:text-indigo-400 transition-colors"
                                                    title="예산 설정"
                                                >
                                                    <Settings2 className="w-3.5 h-3.5" />
                                                </Link>
                                            ) : null}
                                        </div>
                                        <span className="text-xs text-gray-400">지출 {spendPct}%</span>
                                    </div>
                                </div>
                            )
                        })}

                        {/* 합계 */}
                        <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">합계</span>
                            <div className="text-right">
                                <span className="text-sm font-bold text-red-600 dark:text-red-400">{sym}{fmt(Math.round(monthlyExpense))}</span>
                                {showBudget && totalBudget > 0 && (
                                    <span className="text-xs text-gray-400 ml-1">/ {sym}{fmt(totalBudget)} 예산</span>
                                )}
                            </div>
                        </div>
                    </div>
                </details>
            )}

            {/* 타입 필터 탭 */}
            <div className="flex gap-1 mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
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
            <SearchFilterBar categories={categories} baseUrl="/" showPeriodToggle={false} />

            {/* 필터 적용 표시 */}
            {isFiltered && (
                <div className="flex items-center gap-2 mb-3 text-xs text-indigo-600 dark:text-indigo-400">
                    <span>필터 적용됨</span>
                    <span className="text-gray-400">—</span>
                    <span>{rows.length}건</span>
                    <Link href={makeUrl({ category: '', search: '' })} className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline">
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
                            <Link href={makeUrl({ category: '', search: '' })} className="mt-2 inline-block text-indigo-600 dark:text-indigo-400 underline">
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
                        const dayExpense = dayRows
                            .filter(t => t.type === 'expense')
                            .reduce((s, t) => s + getAmount(t), 0)
                        return (
                            <div key={date} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                        {date} ({['일', '월', '화', '수', '목', '금', '토'][new Date(date).getDay()]})
                                    </span>
                                    {dayExpense > 0 && (
                                        <span className="text-xs text-red-500">-{sym}{fmt(Math.round(dayExpense))}</span>
                                    )}
                                </div>
                                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {dayRows.map((t) => {
                                        const amount = getAmount(t)
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

            {/* FAB */}
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
