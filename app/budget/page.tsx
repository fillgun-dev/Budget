import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react'
import { upsertBudget } from './actions'

interface Props {
    searchParams: Promise<{ year?: string; month?: string; edit?: string }>
}

export default async function BudgetPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const params = await searchParams
    const now = new Date()
    const year = parseInt(params.year ?? String(now.getFullYear()))
    const month = parseInt(params.month ?? String(now.getMonth() + 1))
    const editingId = params.edit

    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const monthStart = `${monthStr}-01`
    const nextDate = new Date(year, month, 1)
    const monthEnd = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`

    const prevDate = new Date(year, month - 2, 1)
    const nextMonthDate = new Date(year, month, 1)
    const prevHref = `/budget?year=${prevDate.getFullYear()}&month=${prevDate.getMonth() + 1}`
    const nextHref = `/budget?year=${nextMonthDate.getFullYear()}&month=${nextMonthDate.getMonth() + 1}`

    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`

    const [categoriesRes, transactionsRes, budgetsRes, yearTxRes, yearBudgetRes] = await Promise.all([
        supabase
            .from('categories')
            .select('id, name')
            .eq('type', 'expense')
            .eq('is_active', true)
            .order('name'),
        supabase
            .from('transactions')
            .select('category_id, try_amount, krw_amount, original_amount, currency')
            .eq('user_id', user.id)
            .eq('type', 'expense')
            .gte('date', monthStart)
            .lt('date', monthEnd),
        supabase
            .from('category_budgets')
            .select('category_id, amount, month')
            .eq('user_id', user.id)
            .or(`month.is.null,month.eq.${monthStr}`),
        // 연간 지출 (연간 모니터링용)
        supabase
            .from('transactions')
            .select('category_id, try_amount, original_amount, currency, date')
            .eq('user_id', user.id)
            .eq('type', 'expense')
            .gte('date', yearStart)
            .lte('date', yearEnd),
        // 연간 예산 레코드 (월별 + 기본값)
        supabase
            .from('category_budgets')
            .select('category_id, amount, month')
            .eq('user_id', user.id),
    ])

    const categories = categoriesRes.data ?? []
    const transactions = transactionsRes.data ?? []

    // 카테고리별 실지출 합산 (TRY 기준)
    const spendingMap = new Map<string, number>()
    for (const t of transactions) {
        const amt = t.try_amount ?? (t.currency === 'TRY' ? t.original_amount : 0)
        spendingMap.set(t.category_id, (spendingMap.get(t.category_id) ?? 0) + amt)
    }

    // 예산 맵: 월별 우선, 없으면 기본값(null)
    const defaultBudgets = new Map<string, number>()
    const monthBudgets = new Map<string, number>()
    for (const b of budgetsRes.data ?? []) {
        if (b.month === null) defaultBudgets.set(b.category_id, b.amount)
        else monthBudgets.set(b.category_id, b.amount)
    }
    const budgetMap = new Map<string, number>([...defaultBudgets, ...monthBudgets])

    const totalBudget = Array.from(budgetMap.values()).reduce((s, v) => s + v, 0)
    const totalSpent = Array.from(spendingMap.values()).reduce((s, v) => s + v, 0)

    const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')
    const label = `${year}년 ${month}월`

    // ── 연간 모니터링 매트릭스 ──────────────────────────────────────
    const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

    // 연간 지출: categoryId → month → amount
    const yearSpending = new Map<string, Map<number, number>>()
    for (const t of yearTxRes.data ?? []) {
        if (!t.category_id) continue
        const m = parseInt(t.date.split('-')[1])
        const amt = t.try_amount ?? (t.currency === 'TRY' ? t.original_amount : 0)
        if (!yearSpending.has(t.category_id)) yearSpending.set(t.category_id, new Map())
        const mMap = yearSpending.get(t.category_id)!
        mMap.set(m, (mMap.get(m) ?? 0) + amt)
    }

    // 연간 예산: categoryId → month(null=default) → amount
    const yearBudgetDefault = new Map<string, number>() // month=null
    const yearBudgetMonthly = new Map<string, Map<string, number>>() // month='YYYY-MM'
    for (const b of yearBudgetRes.data ?? []) {
        if (b.month === null) {
            yearBudgetDefault.set(b.category_id, b.amount)
        } else {
            if (!yearBudgetMonthly.has(b.category_id)) yearBudgetMonthly.set(b.category_id, new Map())
            yearBudgetMonthly.get(b.category_id)!.set(b.month, b.amount)
        }
    }

    function getBudgetForMonth(catId: string, m: number): number | null {
        const monthKey = `${year}-${String(m).padStart(2, '0')}`
        const monthly = yearBudgetMonthly.get(catId)?.get(monthKey)
        if (monthly != null) return monthly
        return yearBudgetDefault.get(catId) ?? null
    }

    // 지출이 있거나 예산이 설정된 카테고리만 표시
    const monitoredCategories = categories.filter(cat =>
        yearSpending.has(cat.id) || yearBudgetDefault.has(cat.id)
    )

    const totalPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
    const totalIsOver = totalBudget > 0 && totalSpent > totalBudget
    const totalIsWarn = totalBudget > 0 && !totalIsOver && totalSpent / totalBudget > 0.8

    return (
        <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
            {/* 헤더 */}
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">예산 관리</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    항목별 월 예산을 설정하고 지출 현황을 확인합니다. 예산은 ₺ TRY 기준입니다.
                </p>
            </div>

            {/* 월 네비게이션 */}
            <div className="flex items-center justify-between mb-6">
                <Link href={prevHref} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <span className="text-base font-semibold text-gray-900 dark:text-white">{label}</span>
                <Link href={nextHref} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ChevronRight className="w-5 h-5" />
                </Link>
            </div>

            {/* 전체 요약 카드 */}
            {totalBudget > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-5 py-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">총 예산 대비 지출</span>
                        <span className={`text-sm font-semibold ${totalIsOver ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                            ₺{fmt(totalSpent)} / ₺{fmt(totalBudget)}
                            <span className="ml-1.5 text-xs font-normal text-gray-400">({totalPct}%)</span>
                        </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${totalIsOver ? 'bg-red-500' : totalIsWarn ? 'bg-amber-400' : 'bg-green-400'}`}
                            style={{ width: `${Math.min(totalPct, 100)}%` }}
                        />
                    </div>
                    {totalIsOver ? (
                        <p className="text-xs text-red-500 mt-1">₺{fmt(totalSpent - totalBudget)} 초과</p>
                    ) : (
                        <p className="text-xs text-gray-400 mt-1">잔여 ₺{fmt(totalBudget - totalSpent)}</p>
                    )}
                </div>
            )}

            {/* 항목별 예산 목록 */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">항목별 예산</h2>
                    <span className="text-xs text-gray-400">단위: ₺ TRY</span>
                </div>

                {categories.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">
                        활성화된 지출 항목이 없습니다.{' '}
                        <Link href="/categories" className="text-indigo-600 dark:text-indigo-400 underline">
                            항목 관리
                        </Link>
                        에서 추가해주세요.
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                        {categories.map((cat) => {
                            const spent = spendingMap.get(cat.id) ?? 0
                            const budget = budgetMap.get(cat.id)
                            const isEditing = editingId === cat.id
                            const pct = budget && budget > 0 ? Math.round((spent / budget) * 100) : 0
                            const isOver = budget != null && spent > budget
                            const isWarn = budget != null && !isOver && spent / budget > 0.8

                            return (
                                <li key={cat.id} className="px-4 py-4">
                                    {isEditing ? (
                                        /* 예산 수정 폼 */
                                        <form action={upsertBudget} className="flex items-center gap-2">
                                            <input type="hidden" name="category_id" value={cat.id} />
                                            <input type="hidden" name="year" value={year} />
                                            <input type="hidden" name="month" value={month} />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0 w-24 truncate">{cat.name}</span>
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₺</span>
                                                <input
                                                    name="amount"
                                                    type="number"
                                                    inputMode="numeric"
                                                    min="0"
                                                    step="1"
                                                    defaultValue={budget ?? ''}
                                                    placeholder="금액 (0이면 삭제)"
                                                    autoFocus
                                                    className="w-full rounded-md border-0 py-1.5 pl-7 pr-3 text-sm text-gray-900 ring-1 ring-inset ring-indigo-400 focus:ring-2 focus:ring-indigo-600 dark:bg-gray-700 dark:text-gray-100"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                                            >
                                                <Check className="w-3 h-3" />
                                                저장
                                            </button>
                                            <Link
                                                href={`/budget?year=${year}&month=${month}`}
                                                className="flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                            >
                                                <X className="w-3 h-3" />
                                                취소
                                            </Link>
                                        </form>
                                    ) : (
                                        /* 일반 표시 */
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{cat.name}</span>
                                                    {isOver && (
                                                        <span className="text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded shrink-0">예산 초과</span>
                                                    )}
                                                    {isWarn && (
                                                        <span className="text-xs font-medium text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded shrink-0">주의</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0 ml-2">
                                                    <div className="text-right">
                                                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                            ₺{fmt(spent)}
                                                        </span>
                                                        {budget != null ? (
                                                            <span className={`text-xs ml-1 ${isOver ? 'text-red-500' : 'text-gray-400'}`}>
                                                                / ₺{fmt(budget)} ({pct}%)
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 ml-1">/ 예산 없음</span>
                                                        )}
                                                    </div>
                                                    <Link
                                                        href={`/budget?year=${year}&month=${month}&edit=${cat.id}`}
                                                        className="text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline shrink-0"
                                                    >
                                                        {budget != null ? '수정' : '설정'}
                                                    </Link>
                                                </div>
                                            </div>

                                            {/* 진행 바 */}
                                            {budget != null && (
                                                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : isWarn ? 'bg-amber-400' : 'bg-green-400'}`}
                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                    />
                                                </div>
                                            )}

                                            {/* 잔여 / 초과 */}
                                            {budget != null && !isOver && (
                                                <p className="text-xs text-gray-400 mt-0.5">잔여 ₺{fmt(budget - spent)}</p>
                                            )}
                                            {isOver && (
                                                <p className="text-xs text-red-500 mt-0.5">₺{fmt(spent - budget!)} 초과</p>
                                            )}
                                        </div>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                )}

                {/* 합계 행 */}
                {categories.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-750">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">합계</span>
                        <div className="text-right">
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">₺{fmt(totalSpent)}</span>
                            {totalBudget > 0 && (
                                <span className="text-xs text-gray-400 ml-1.5">/ ₺{fmt(totalBudget)} 예산</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 연간 예산 모니터링 테이블 */}
            {monitoredCategories.length > 0 && (
                <div className="mt-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{year}년 연간 예산 현황</h2>
                        <p className="text-xs text-gray-400 mt-0.5">예산 대비 실지출 · 단위: ₺TRY</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                    <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 min-w-[90px] border-r border-gray-200 dark:border-gray-600">항목</th>
                                    {MONTHS.map(m => (
                                        <th key={m} className={`px-2 py-2 text-center font-semibold min-w-[60px] ${m === month ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {m}월
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {monitoredCategories.map((cat, idx) => (
                                    <tr key={cat.id} className={`border-t border-gray-100 dark:border-gray-700 ${idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-750'}`}>
                                        <td className={`sticky left-0 z-10 px-3 py-2 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}`}>
                                            {cat.name}
                                        </td>
                                        {MONTHS.map(m => {
                                            const spent = yearSpending.get(cat.id)?.get(m) ?? 0
                                            const budget = getBudgetForMonth(cat.id, m)
                                            const isCurrentMonth = m === month && year === new Date().getFullYear()
                                            const isFuture = new Date(year, m - 1, 1) > new Date()
                                            const isOver = budget != null && spent > budget
                                            const isWarn = budget != null && !isOver && budget > 0 && spent / budget > 0.8
                                            return (
                                                <td key={m} className={`px-2 py-2 text-center ${m === month ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                                                    {isFuture && budget == null ? (
                                                        <span className="text-gray-200 dark:text-gray-700">-</span>
                                                    ) : (
                                                        <div className="space-y-0.5">
                                                            {/* 실지출 */}
                                                            <div className={`tabular-nums font-medium ${
                                                                isOver ? 'text-red-600 dark:text-red-400'
                                                                : isWarn ? 'text-amber-600 dark:text-amber-400'
                                                                : spent > 0 ? 'text-gray-700 dark:text-gray-300'
                                                                : 'text-gray-300 dark:text-gray-600'
                                                            }`}>
                                                                {spent > 0 ? fmt(spent) : '-'}
                                                            </div>
                                                            {/* 예산 */}
                                                            {budget != null && (
                                                                <div className="tabular-nums text-gray-400 dark:text-gray-500">
                                                                    /{fmt(budget)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex gap-4 text-xs text-gray-400">
                        <span><span className="text-gray-700 dark:text-gray-300 font-medium">실지출</span> / 예산 순으로 표시</span>
                        <span className="text-red-500">빨강: 초과</span>
                        <span className="text-amber-500">주황: 80% 이상</span>
                    </div>
                </div>
            )}

            {/* 안내 */}
            <p className="mt-4 text-xs text-center text-gray-400">
                설정한 예산은 기본값으로 저장되어 매월 자동 적용됩니다. 예산을 변경하면 변경 이력이 기록됩니다.
            </p>
        </div>
    )
}
