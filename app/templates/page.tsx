import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus, X, Check } from 'lucide-react'
import { createTemplate, deleteTemplate } from './actions'

interface Props {
    searchParams: Promise<{ add?: string; type?: string }>
}

const CURRENCIES = ['KRW', 'TRY', 'USD', 'EUR']

export default async function TemplatesPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const params = await searchParams
    const isAdding = params.add === '1'
    const addType = params.type === 'income' ? 'income' : 'expense'

    const [{ data: templates }, { data: categories }] = await Promise.all([
        supabase
            .from('transaction_templates')
            .select('id, name, type, category_id, currency, default_amount, categories(name)')
            .order('created_at'),
        supabase
            .from('categories')
            .select('id, name, type')
            .eq('is_active', true)
            .order('name'),
    ])

    const expenseTemplates = (templates ?? []).filter(t => t.type === 'expense')
    const incomeTemplates = (templates ?? []).filter(t => t.type === 'income')
    const expenseCategories = (categories ?? []).filter(c => c.type === 'expense')
    const incomeCategories = (categories ?? []).filter(c => c.type === 'income')

    return (
        <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto pb-16">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/" className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">빠른 내역 관리</h1>
                        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">내역 추가 시 한 번에 입력되는 자주 쓰는 내역을 등록합니다.</p>
                    </div>
                </div>
                {!isAdding && (
                    <Link
                        href="/templates?add=1"
                        className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                    >
                        <Plus className="w-4 h-4" />
                        새 내역
                    </Link>
                )}
            </div>

            {/* 추가 폼 */}
            {isAdding && (
                <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800 p-4">
                    <h2 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3">새 빠른 내역 추가</h2>
                    <form action={createTemplate} className="space-y-3">
                        {/* 이름 */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">내역 이름</label>
                            <input
                                name="name"
                                type="text"
                                required
                                autoFocus
                                placeholder="예: 전기세 납부, 마트 장보기, 헌금..."
                                className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
                            />
                        </div>
                        {/* 구분 */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">구분</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="type" value="expense" defaultChecked={addType === 'expense'} className="text-indigo-600" />
                                    <span className="text-sm font-medium text-red-600">지출</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="type" value="income" defaultChecked={addType === 'income'} className="text-indigo-600" />
                                    <span className="text-sm font-medium text-blue-600">수입</span>
                                </label>
                            </div>
                        </div>
                        {/* 카테고리 */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">항목 <span className="text-gray-400 font-normal">선택</span></label>
                            <select
                                name="category_id"
                                className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
                            >
                                <option value="">항목 선택 안함</option>
                                <optgroup label="지출 항목">
                                    {expenseCategories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="수입 항목">
                                    {incomeCategories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                        {/* 통화 */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">통화</label>
                            <div className="flex gap-2">
                                {CURRENCIES.map(cur => (
                                    <label key={cur} className="flex items-center gap-1.5 cursor-pointer">
                                        <input type="radio" name="currency" value={cur} defaultChecked={cur === 'KRW'} className="text-indigo-600" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cur}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        {/* 고정 금액 */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                고정 금액 <span className="text-gray-400 font-normal">선택 — 전기세·인터넷 등 매달 같은 금액일 때</span>
                            </label>
                            <input
                                name="default_amount"
                                type="number"
                                inputMode="numeric"
                                min="0"
                                step="any"
                                placeholder="비워두면 매번 직접 입력"
                                className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
                            />
                        </div>
                        {/* 버튼 */}
                        <div className="flex gap-2 pt-1">
                            <button
                                type="submit"
                                className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
                            >
                                <Check className="w-3.5 h-3.5" />
                                추가
                            </button>
                            <Link
                                href="/templates"
                                className="flex items-center gap-1 rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                                <X className="w-3.5 h-3.5" />
                                취소
                            </Link>
                        </div>
                    </form>
                </div>
            )}

            {/* 지출 빠른 내역 */}
            <TemplateSection
                title="지출 빠른 내역"
                type="expense"
                templates={expenseTemplates}
            />

            {/* 수입 빠른 내역 */}
            <div className="mt-6">
                <TemplateSection
                    title="수입 빠른 내역"
                    type="income"
                    templates={incomeTemplates}
                />
            </div>
        </div>
    )
}

function TemplateSection({
    title,
    type,
    templates,
}: {
    title: string
    type: 'expense' | 'income'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    templates: Array<Record<string, any>>
}) {
    const isExpense = type === 'expense'
    const headerColor = isExpense ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
    const badgeColor = isExpense
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'

    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h2 className={`text-sm font-semibold ${headerColor}`}>{title}</h2>
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {templates.length}개
                    </span>
                    <Link
                        href={`/templates?add=1&type=${type}`}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                    >
                        <Plus className="w-3 h-3" />
                        추가
                    </Link>
                </div>
            </div>

            {templates.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                    아직 빠른 내역이 없습니다.{' '}
                    <Link href={`/templates?add=1&type=${type}`} className="text-indigo-500 hover:underline">
                        추가해보세요
                    </Link>
                </div>
            ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {templates.map(t => {
                        const deleteAction = deleteTemplate.bind(null, t.id)
                        return (
                            <li key={t.id} className="px-4 py-3 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{t.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {(t.categories as any)?.name ?? '항목 미지정'} · {t.currency}
                                        {t.default_amount ? ` · ${Number(t.default_amount).toLocaleString('ko-KR')}` : ''}
                                    </p>
                                </div>
                                <form action={deleteAction}>
                                    <button
                                        type="submit"
                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="삭제"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </form>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
