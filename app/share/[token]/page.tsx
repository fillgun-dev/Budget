import { createAdminClient } from '@/utils/supabase/admin'
import { notFound } from 'next/navigation'
import ShareStackedChart, { type StackedMonthData } from './ShareStackedChart'

interface Props {
    params: Promise<{ token: string }>
}

function getMonthsInRange(startDate: string, endDate: string) {
    const result: Array<{ year: number; month: number; key: string }> = []
    const end = new Date(endDate)
    let d = new Date(startDate.substring(0, 7) + '-01')
    while (d.getFullYear() < end.getFullYear() || (d.getFullYear() === end.getFullYear() && d.getMonth() <= end.getMonth())) {
        result.push({
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        })
        d.setMonth(d.getMonth() + 1)
    }
    return result
}

function fmtDate(iso: string) {
    const d = new Date(iso)
    return `${d.getUTCFullYear()}. ${d.getUTCMonth() + 1}. ${d.getUTCDate()}.`
}

export default async function SharePage({ params }: Props) {
    const { token } = await params

    // admin 클라이언트로 통일 — 공유 페이지는 비로그인 접근이므로 RLS 우회 필요
    const admin = createAdminClient()

    const { data: link, error } = await admin
        .from('shared_links')
        .select('*')
        .eq('id', token)
        .single()

    if (error || !link) notFound()

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="text-center">
                    <p className="text-3xl mb-3">🔒</p>
                    <h1 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">만료된 링크</h1>
                    <p className="text-sm text-gray-400">이 보고서 링크의 유효기간이 지났습니다.</p>
                </div>
            </div>
        )
    }

    const [{ data: transactions }, { data: ownerProfile }] = await Promise.all([
        admin
            .from('transactions')
            .select('type, category_id, krw_amount, try_amount, date, categories(name)')
            .eq('user_id', link.created_by)
            .gte('date', link.start_date)
            .lte('date', link.end_date)
            .order('date'),
        admin
            .from('users')
            .select('display_name')
            .eq('id', link.created_by)
            .single(),
    ])

    const rows = transactions ?? []
    const months = getMonthsInRange(link.start_date, link.end_date)
    const singleYear = months.every(m => m.year === months[0].year)

    const displayCurrency = link.display_currency ?? 'KRW'
    const sym = displayCurrency === 'TRY' ? '₺' : '₩'
    const showIncome = link.show_income !== false
    const showSummary = link.show_summary !== false
    const showStackedChart = link.show_stacked_chart !== false

    function getAmt(t: { krw_amount: number; try_amount: number | null }) {
        return displayCurrency === 'TRY' ? (t.try_amount ?? 0) : t.krw_amount
    }

    function colLabel(year: number, month: number) {
        return singleYear ? `${month}월` : `${String(year).slice(2)}/${month}월`
    }

    type CatEntry = { name: string; months: Map<string, number> }
    const expenseMatrix = new Map<string, CatEntry>()
    const incomeByMonth = new Map<string, number>()
    let grandExpense = 0
    let grandIncome = 0

    for (const t of rows) {
        const monthKey = t.date.substring(0, 7)
        const amt = getAmt(t)
        if (t.type === 'expense') {
            grandExpense += amt
            const catId = t.category_id ?? '__none__'
            const catName = (t.categories as any)?.name ?? '미분류'
            if (!expenseMatrix.has(catId)) expenseMatrix.set(catId, { name: catName, months: new Map() })
            const entry = expenseMatrix.get(catId)!
            entry.months.set(monthKey, (entry.months.get(monthKey) ?? 0) + amt)
        } else {
            grandIncome += amt
            incomeByMonth.set(monthKey, (incomeByMonth.get(monthKey) ?? 0) + amt)
        }
    }

    const categoryList = Array.from(expenseMatrix.entries())
        .map(([id, { name, months: mMap }]) => ({
            id, name, months: mMap,
            total: Array.from(mMap.values()).reduce((s, v) => s + v, 0),
        }))
        .sort((a, b) => b.total - a.total)

    const colTotals = new Map<string, number>()
    for (const { months: mMap } of categoryList) {
        for (const [k, v] of mMap) colTotals.set(k, (colTotals.get(k) ?? 0) + v)
    }

    const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')

    // 제목 구성: 연도 + 이름 + 재정보고서
    const yearLabel = singleYear
        ? `${months[0].year}년`
        : `${months[0].year}~${months[months.length - 1].year}년`
    const displayName = ownerProfile?.display_name
    const reportTitle = displayName
        ? `${yearLabel} ${displayName} 재정보고서`
        : `${yearLabel} 재정보고서`
    const isFullYear = singleYear
        && link.start_date === `${months[0].year}-01-01`
        && link.end_date === `${months[0].year}-12-31`
    const subLabel = isFullYear ? null : `${link.start_date} ~ ${link.end_date}`

    // 카테고리 랭킹 데이터
    const categoryRanking = categoryList.map(c => ({ name: c.name, value: c.total }))
    const totalExpense = categoryRanking.reduce((s, c) => s + c.value, 0)

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

    // 누적 막대 차트 데이터 (데이터 있는 월만, _income 포함)
    const categoryNames = categoryList.map(c => c.name)
    const stackedChartData: StackedMonthData[] = months
        .filter(({ key }) => colTotals.has(key) || incomeByMonth.has(key))
        .map(({ year, month, key }) => {
            const entry: StackedMonthData = {
                month: colLabel(year, month),
                _income: Math.round(incomeByMonth.get(key) ?? 0),
            }
            for (const { name, months: mMap } of categoryList) {
                entry[name] = Math.round(mMap.get(key) ?? 0)
            }
            return entry
        })

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-2 sm:px-4">
            <div className="max-w-2xl mx-auto">

                {/* 헤더 */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{reportTitle}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {subLabel ? `${subLabel} · ` : ''}{displayCurrency === 'TRY' ? '리라(TRY) 기준' : '원화(KRW) 기준'}
                    </p>
                </div>

                {/* 요약 카드 */}
                {showSummary && (
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-2 py-3 text-center shadow-sm">
                            <p className="text-xs text-gray-400 mb-1">총 지출</p>
                            <p className="text-xs font-bold text-red-600 dark:text-red-400">{sym}{fmt(grandExpense)}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-2 py-3 text-center shadow-sm">
                            <p className="text-xs text-gray-400 mb-1">총 수입</p>
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{sym}{fmt(grandIncome)}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-2 py-3 text-center shadow-sm">
                            <p className="text-xs text-gray-400 mb-1">잔액</p>
                            <p className={`text-xs font-bold ${grandIncome - grandExpense >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {sym}{fmt(grandIncome - grandExpense)}
                            </p>
                        </div>
                    </div>
                )}

                {/* 항목별 월 지출 변화 누적 막대 차트 */}
                {showStackedChart && categoryNames.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6 px-4 pt-4 pb-3">
                        <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">월별 지출 · 수입</h2>
                        <ShareStackedChart data={stackedChartData} categoryNames={categoryNames} sym={sym} showIncome={showIncome} />
                    </div>
                )}

                {/* 연간 지출 비중 — 수평 랭킹 바 */}
                {categoryRanking.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6 px-4 pt-4 pb-4">
                        <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">지출 비중</h2>
                        <div className="space-y-3">
                            {categoryRanking.map((cat, i) => {
                                const pct = totalExpense > 0 ? (cat.value / totalExpense) * 100 : 0
                                return (
                                    <div key={cat.name}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{cat.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-3">
                                                <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{sym}{Math.round(cat.value).toLocaleString('ko-KR')}</span>
                                                <span className="text-xs tabular-nums text-gray-400 w-9 text-right">{pct.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full"
                                                style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 지출 현황 테이블 */}
                <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">지출 현황</h2>
                {categoryList.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-10 text-center text-sm text-gray-400 mb-6">
                        지출 내역이 없습니다.
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm mb-6">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                        <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 text-left px-2 py-2 font-semibold text-gray-600 dark:text-gray-300 min-w-[64px]">항목</th>
                                        {months.map(({ year, month, key }) => (
                                            <th key={key} className="text-right px-1 py-2 font-semibold text-gray-500 dark:text-gray-400 min-w-[28px] whitespace-nowrap">
                                                {colLabel(year, month)}
                                            </th>
                                        ))}
                                        <th className="text-right px-2 py-2 font-semibold text-gray-600 dark:text-gray-300 min-w-[40px]">합계</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categoryList.map(({ id, name, months: mMap, total }) => (
                                        <tr key={id} className="border-t border-gray-100 dark:border-gray-700">
                                            <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-2 py-1.5 text-gray-700 dark:text-gray-300 max-w-[64px] truncate">{name}</td>
                                            {months.map(({ key }) => (
                                                <td key={key} className="text-right px-1 py-1.5 tabular-nums text-gray-700 dark:text-gray-300">
                                                    {mMap.has(key) ? fmt(mMap.get(key)!) : <span className="text-gray-200 dark:text-gray-700">-</span>}
                                                </td>
                                            ))}
                                            <td className="text-right px-2 py-1.5 tabular-nums font-semibold text-red-600 dark:text-red-400">
                                                {fmt(total)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-700/60">
                                        <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 px-2 py-2 font-bold text-gray-700 dark:text-gray-300">월 합계</td>
                                        {months.map(({ key }) => (
                                            <td key={key} className="text-right px-1 py-2 tabular-nums font-bold text-red-600 dark:text-red-400">
                                                {colTotals.has(key) ? fmt(colTotals.get(key)!) : <span className="text-gray-200 dark:text-gray-700">-</span>}
                                            </td>
                                        ))}
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {/* 월별 수입 현황 */}
                {showIncome && <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">월별 수입 현황</h2>}
                {showIncome && <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm mb-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                    <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 text-left px-2 py-2 font-semibold text-gray-600 dark:text-gray-300 min-w-[48px]">항목</th>
                                    {months.map(({ year, month, key }) => (
                                        <th key={key} className="text-right px-1 py-2 font-semibold text-gray-500 dark:text-gray-400 min-w-[28px] whitespace-nowrap">
                                            {colLabel(year, month)}
                                        </th>
                                    ))}
                                    <th className="text-right px-2 py-2 font-semibold text-gray-600 dark:text-gray-300 min-w-[40px]">합계</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* 수입 행 */}
                                <tr className="border-t border-gray-100 dark:border-gray-700">
                                    <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-2 py-1.5 font-medium text-blue-600 dark:text-blue-400">수입</td>
                                    {months.map(({ key }) => (
                                        <td key={key} className="text-right px-1 py-1.5 tabular-nums text-blue-600 dark:text-blue-400">
                                            {incomeByMonth.has(key) ? fmt(incomeByMonth.get(key)!) : <span className="text-gray-200 dark:text-gray-700">-</span>}
                                        </td>
                                    ))}
                                    <td className="text-right px-2 py-1.5 tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                                        {fmt(grandIncome)}
                                    </td>
                                </tr>
                                {/* 지출 행 */}
                                <tr className="border-t border-gray-100 dark:border-gray-700">
                                    <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-2 py-1.5 font-medium text-red-500 dark:text-red-400">지출</td>
                                    {months.map(({ key }) => (
                                        <td key={key} className="text-right px-1 py-1.5 tabular-nums text-red-500 dark:text-red-400">
                                            {colTotals.has(key) ? fmt(colTotals.get(key)!) : <span className="text-gray-200 dark:text-gray-700">-</span>}
                                        </td>
                                    ))}
                                    <td className="text-right px-2 py-1.5 tabular-nums font-semibold text-red-500 dark:text-red-400">
                                        {fmt(grandExpense)}
                                    </td>
                                </tr>
                                {/* 잔액 행 */}
                                <tr className="border-t-2 border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-700/60">
                                    <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 px-2 py-2 font-bold text-gray-700 dark:text-gray-300">잔액</td>
                                    {months.map(({ key }) => {
                                        const inc = incomeByMonth.get(key) ?? 0
                                        const exp = colTotals.get(key) ?? 0
                                        const net = inc - exp
                                        const hasData = incomeByMonth.has(key) || colTotals.has(key)
                                        return (
                                            <td key={key} className={`text-right px-1 py-2 tabular-nums font-bold ${net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {hasData ? fmt(net) : <span className="text-gray-200 dark:text-gray-700">-</span>}
                                            </td>
                                        )
                                    })}
                                    <td className={`text-right px-2 py-2 tabular-nums font-bold ${grandIncome - grandExpense >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {fmt(grandIncome - grandExpense)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>}

                {/* 푸터 */}
                <div className="text-center text-xs text-gray-400 space-y-1 pb-8">
                    <p>생성일: {fmtDate(link.created_at)}</p>
                    {link.expires_at && (
                        <p>유효기간: {fmtDate(link.expires_at)}까지</p>
                    )}
                    <p className="text-gray-300 dark:text-gray-600 mt-2">읽기 전용 · {displayCurrency === 'TRY' ? '리라(TRY)' : '원화(KRW)'} 기준</p>
                </div>
            </div>
        </div>
    )
}
