import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import CopyLinkButton from './CopyLinkButton'
import { createSharedLink } from './actions'
import DeleteSharedLinkButton from './DeleteSharedLinkButton'
import ReportCharts, { type StackedMonthData } from './ReportCharts'

interface Props {
    searchParams: Promise<{ year?: string; display?: string }>
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

type DisplayCurrency = 'TRY' | 'KRW'

export default async function ReportPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const params = await searchParams
    const now = new Date()
    const year = parseInt(params.year ?? String(now.getFullYear()))
    const display: DisplayCurrency = params.display === 'TRY' ? 'TRY' : 'KRW'

    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`

    const [transRes, linksRes] = await Promise.all([
        supabase
            .from('transactions')
            .select('type, category_id, krw_amount, try_amount, original_amount, currency, date, categories(name)')
            .eq('user_id', user.id)
            .gte('date', yearStart)
            .lte('date', yearEnd)
            .order('date')
            .limit(10000),
        supabase
            .from('shared_links')
            .select('id, start_date, end_date, created_at, expires_at, show_income, show_summary, show_stacked_chart, display_currency')
            .eq('created_by', user.id)
            .order('created_at', { ascending: false }),
    ])

    const transactions = transRes.data ?? []
    const sharedLinks = linksRes.data ?? []

    function getAmount(t: { krw_amount: number; try_amount: number | null; original_amount: number; currency: string }) {
        if (display === 'KRW') return t.krw_amount ?? 0
        return t.try_amount ?? (t.currency === 'TRY' ? t.original_amount : 0)
    }

    const sym = display === 'KRW' ? '₩' : '₺'

    // --- 지출 매트릭스: categoryId → month(1~12) → amount ---
    type CatEntry = { name: string; months: Map<number, number> }
    const expenseMatrix = new Map<string, CatEntry>()
    // --- 수입: month → amount ---
    const incomeByMonth = new Map<number, number>()

    for (const t of transactions) {
        const month = parseInt(t.date.split('-')[1])
        const amt = getAmount(t)

        if (t.type === 'expense') {
            const catId = t.category_id ?? '__none__'
            const catName = (t.categories as any)?.name ?? '미분류'
            if (!expenseMatrix.has(catId)) expenseMatrix.set(catId, { name: catName, months: new Map() })
            const entry = expenseMatrix.get(catId)!
            entry.months.set(month, (entry.months.get(month) ?? 0) + amt)
        } else {
            incomeByMonth.set(month, (incomeByMonth.get(month) ?? 0) + amt)
        }
    }

    // 카테고리 목록 (연간 합계 기준 내림차순)
    const categoryList = Array.from(expenseMatrix.entries())
        .map(([id, { name, months }]) => ({
            id, name, months,
            total: Array.from(months.values()).reduce((s, v) => s + v, 0)
        }))
        .sort((a, b) => b.total - a.total)

    // 월별 지출 합계
    const colTotals = new Map<number, number>()
    for (const { months } of categoryList) {
        for (const [m, v] of months) {
            colTotals.set(m, (colTotals.get(m) ?? 0) + v)
        }
    }
    const grandExpense = Array.from(colTotals.values()).reduce((s, v) => s + v, 0)
    const grandIncome = Array.from(incomeByMonth.values()).reduce((s, v) => s + v, 0)

    const fmt = (n: number) => n > 0 ? Math.round(n).toLocaleString('ko-KR') : '-'
    const fmtTotal = (n: number) => Math.round(n).toLocaleString('ko-KR')

    // 차트용 직렬화 가능한 데이터
    const categoryChartData = categoryList.map(c => ({ name: c.name, value: c.total }))

    // 누적 막대 차트용 데이터 (데이터 있는 월만, _income 포함)
    const categoryNames = categoryList.map(c => c.name)
    const stackedChartData: StackedMonthData[] = MONTHS
        .filter(m => colTotals.has(m) || incomeByMonth.has(m))
        .map(m => {
            const entry: StackedMonthData = {
                month: `${m}월`,
                _income: Math.round(incomeByMonth.get(m) ?? 0),
            }
            for (const { name, months } of categoryList) {
                entry[name] = Math.round(months.get(m) ?? 0)
            }
            return entry
        })

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    return (
        <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-full mx-auto pb-16">
            <div className="max-w-6xl mx-auto">
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">재정 보고서</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">연도별·항목별 지출 현황을 확인합니다.</p>
                    </div>
                    {/* 통화 토글 */}
                    <div className="flex rounded-lg overflow-hidden ring-1 ring-gray-300 dark:ring-gray-600 text-sm font-semibold">
                        <Link href={`/report?year=${year}&display=KRW`} className={`px-3 py-1.5 transition-colors ${display === 'KRW' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>₩ KRW</Link>
                        <Link href={`/report?year=${year}&display=TRY`} className={`px-3 py-1.5 transition-colors ${display === 'TRY' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>₺ TRY</Link>
                    </div>
                </div>

                {/* 연도 네비게이션 */}
                <div className="flex items-center justify-center gap-6 mb-6">
                    <Link href={`/report?year=${year - 1}&display=${display}`} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">{year}년</span>
                    <Link href={`/report?year=${year + 1}&display=${display}`} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <ChevronRight className="w-5 h-5" />
                    </Link>
                </div>

                {/* 차트 */}
                <ReportCharts categories={categoryChartData} stacked={stackedChartData} categoryNames={categoryNames} sym={sym} />

                {/* 지출 매트릭스 테이블 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">지출 현황</h2>
                    </div>

                    {categoryList.length === 0 ? (
                        <div className="px-5 py-10 text-center text-sm text-gray-400">{year}년 지출 내역이 없습니다.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-750">
                                        <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 border-b border-r border-gray-200 dark:border-gray-600 min-w-[110px]">
                                            항목
                                        </th>
                                        {MONTHS.map(m => (
                                            <th key={m} className="px-3 py-2.5 text-center font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 min-w-[80px]">
                                                {m}월
                                            </th>
                                        ))}
                                        <th className="px-3 py-2.5 text-center font-semibold text-gray-700 dark:text-gray-200 border-b border-l border-gray-200 dark:border-gray-600 min-w-[90px] bg-gray-100 dark:bg-gray-700">
                                            합계
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categoryList.map(({ id, name, months, total }, idx) => (
                                        <tr key={id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-750'}>
                                            <td className={`sticky left-0 z-10 px-4 py-2 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}`}>
                                                {name}
                                            </td>
                                            {MONTHS.map(m => (
                                                <td key={m} className="px-3 py-2 text-right text-gray-600 dark:text-gray-400 tabular-nums">
                                                    {months.has(m) ? fmt(months.get(m)!) : <span className="text-gray-200 dark:text-gray-700">-</span>}
                                                </td>
                                            ))}
                                            <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-100 border-l border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 tabular-nums">
                                                {fmtTotal(total)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100 dark:bg-gray-700 border-t-2 border-gray-200 dark:border-gray-600">
                                        <td className="sticky left-0 z-10 px-4 py-2.5 font-bold text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
                                            월 합계
                                        </td>
                                        {MONTHS.map(m => (
                                            <td key={m} className="px-3 py-2.5 text-right font-bold text-red-600 dark:text-red-400 tabular-nums">
                                                {colTotals.has(m) ? fmtTotal(colTotals.get(m)!) : <span className="text-gray-300 dark:text-gray-600 font-normal">-</span>}
                                            </td>
                                        ))}
                                        <td className="px-3 py-2.5 text-right font-bold text-red-700 dark:text-red-300 border-l border-gray-200 dark:border-gray-600 tabular-nums">
                                            {sym}{fmtTotal(grandExpense)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                {/* 월별 수입 현황 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">월별 수입 현황</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-750">
                                    <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 border-b border-r border-gray-200 dark:border-gray-600 min-w-[110px]">항목</th>
                                    {MONTHS.map(m => (
                                        <th key={m} className="px-3 py-2.5 text-center font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 min-w-[80px]">{m}월</th>
                                    ))}
                                    <th className="px-3 py-2.5 text-center font-semibold text-gray-700 dark:text-gray-200 border-b border-l border-gray-200 dark:border-gray-600 min-w-[90px] bg-gray-100 dark:bg-gray-700">합계</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* 수입 행 */}
                                <tr className="bg-white dark:bg-gray-800">
                                    <td className="sticky left-0 z-10 px-4 py-2 font-medium text-blue-600 dark:text-blue-400 border-r border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">수입</td>
                                    {MONTHS.map(m => (
                                        <td key={m} className="px-3 py-2 text-right text-blue-600 dark:text-blue-400 tabular-nums">
                                            {incomeByMonth.has(m) ? fmt(incomeByMonth.get(m)!) : <span className="text-gray-200 dark:text-gray-700">-</span>}
                                        </td>
                                    ))}
                                    <td className="px-3 py-2 text-right font-bold text-blue-700 dark:text-blue-300 border-l border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 tabular-nums">
                                        {sym}{fmtTotal(grandIncome)}
                                    </td>
                                </tr>
                                {/* 지출 행 */}
                                <tr className="bg-gray-50/50 dark:bg-gray-750">
                                    <td className="sticky left-0 z-10 px-4 py-2 font-medium text-red-500 dark:text-red-400 border-r border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">지출</td>
                                    {MONTHS.map(m => (
                                        <td key={m} className="px-3 py-2 text-right text-red-500 dark:text-red-400 tabular-nums">
                                            {colTotals.has(m) ? fmt(colTotals.get(m)!) : <span className="text-gray-200 dark:text-gray-700">-</span>}
                                        </td>
                                    ))}
                                    <td className="px-3 py-2 text-right font-bold text-red-600 dark:text-red-300 border-l border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 tabular-nums">
                                        {sym}{fmtTotal(grandExpense)}
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot>
                                {/* 잔액 행 */}
                                <tr className="bg-gray-100 dark:bg-gray-700 border-t-2 border-gray-200 dark:border-gray-600">
                                    <td className="sticky left-0 z-10 px-4 py-2.5 font-bold text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">잔액</td>
                                    {MONTHS.map(m => {
                                        const inc = incomeByMonth.get(m) ?? 0
                                        const exp = colTotals.get(m) ?? 0
                                        const net = inc - exp
                                        const hasData = incomeByMonth.has(m) || colTotals.has(m)
                                        return (
                                            <td key={m} className={`px-3 py-2.5 text-right font-bold tabular-nums ${net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {hasData ? fmtTotal(net) : <span className="text-gray-300 dark:text-gray-600 font-normal">-</span>}
                                            </td>
                                        )
                                    })}
                                    <td className={`px-3 py-2.5 text-right font-bold border-l border-gray-200 dark:border-gray-600 tabular-nums ${grandIncome - grandExpense >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {sym}{fmtTotal(grandIncome - grandExpense)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* 연간 요약 */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-center">
                        <p className="text-xs text-gray-400 mb-1">연간 지출</p>
                        <p className="text-base font-bold text-red-600 dark:text-red-400">{sym}{fmtTotal(grandExpense)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-center">
                        <p className="text-xs text-gray-400 mb-1">연간 수입</p>
                        <p className="text-base font-bold text-blue-600 dark:text-blue-400">{sym}{fmtTotal(grandIncome)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-center">
                        <p className="text-xs text-gray-400 mb-1">연간 잔액</p>
                        <p className={`text-base font-bold ${grandIncome - grandExpense >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {sym}{fmtTotal(grandIncome - grandExpense)}
                        </p>
                    </div>
                </div>

                {/* 공유 링크 관리 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">외부 공유 링크</h2>
                        <p className="text-xs text-gray-400 mt-0.5">로그인 없이 원화 기준 보고서를 볼 수 있는 링크를 생성합니다.</p>
                    </div>

                    {/* 링크 생성 폼 */}
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                        <form action={createSharedLink} className="space-y-3">
                            {/* 기간 + 유효기간 + 통화 */}
                            <div className="flex flex-wrap items-end gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">시작일</label>
                                    <input type="date" name="start_date" defaultValue={`${year}-01-01`}
                                        className="rounded-md border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 text-sm dark:bg-gray-700 dark:text-gray-100" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">종료일</label>
                                    <input type="date" name="end_date" defaultValue={`${year}-12-31`}
                                        className="rounded-md border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 text-sm dark:bg-gray-700 dark:text-gray-100" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">유효기간</label>
                                    <select name="expiry" className="rounded-md border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 text-sm dark:bg-gray-700 dark:text-gray-100">
                                        <option value="30">30일</option>
                                        <option value="90">90일</option>
                                        <option value="never">무기한</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">통화</label>
                                    <select name="display_currency" className="rounded-md border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 text-sm dark:bg-gray-700 dark:text-gray-100">
                                        <option value="KRW">₩ 원화(KRW)</option>
                                        <option value="TRY">₺ 리라(TRY)</option>
                                    </select>
                                </div>
                            </div>
                            {/* 표시 설정 + 생성 버튼 */}
                            <div className="flex flex-wrap items-center gap-4">
                                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                                    <input type="checkbox" name="show_income" defaultChecked className="rounded border-gray-300 text-indigo-600 w-4 h-4" />
                                    수입 항목 표시
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                                    <input type="checkbox" name="show_summary" defaultChecked className="rounded border-gray-300 text-indigo-600 w-4 h-4" />
                                    총 요약 카드 표시
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                                    <input type="checkbox" name="show_stacked_chart" defaultChecked className="rounded border-gray-300 text-indigo-600 w-4 h-4" />
                                    월별 지출 · 수입 차트
                                </label>
                                <button type="submit" className="ml-auto flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    링크 생성
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* 생성된 링크 목록 */}
                    {sharedLinks.length === 0 ? (
                        <div className="px-5 py-6 text-center text-sm text-gray-400">생성된 공유 링크가 없습니다.</div>
                    ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                            {sharedLinks.map((link) => {
                                const isExpired = link.expires_at && new Date(link.expires_at) < new Date()
                                const shareUrl = `${baseUrl}/share/${link.id}`
                                return (
                                    <li key={link.id} className={`px-5 py-3 ${isExpired ? 'opacity-50' : ''}`}>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {link.start_date} ~ {link.end_date}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    생성: {new Date(link.created_at).toLocaleDateString('ko-KR')}
                                                    {link.expires_at
                                                        ? <span className={`ml-2 ${isExpired ? 'text-red-500' : ''}`}>· {isExpired ? '만료됨' : `${new Date(link.expires_at).toLocaleDateString('ko-KR')}까지`}</span>
                                                        : <span className="ml-2">· 무기한</span>
                                                    }
                                                </p>
                                                <div className="flex gap-1.5 mt-0.5">
                                                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">
                                                        {link.display_currency === 'TRY' ? '₺ TRY' : '₩ KRW'}
                                                    </span>
                                                    {!link.show_income && (
                                                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">수입 숨김</span>
                                                    )}
                                                    {!link.show_summary && (
                                                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">요약 숨김</span>
                                                    )}
                                                    {link.show_stacked_chart === false && (
                                                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">차트 숨김</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {!isExpired && <CopyLinkButton url={shareUrl} />}
                                                <DeleteSharedLinkButton id={link.id} />
                                            </div>
                                        </div>
                                        {!isExpired && (
                                            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1 font-mono truncate">{shareUrl}</p>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
