import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Pencil, Receipt } from 'lucide-react'
import DeleteButton from '../DeleteButton'

const SYMBOL: Record<string, string> = { KRW: '₩', TRY: '₺', USD: '$', EUR: '€' }

export default async function TransactionDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { id } = await params

    const { data: t } = await supabase
        .from('transactions')
        .select('*, categories(name), payment_methods(name)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    if (!t) notFound()

    const fmt = (n: number) => n.toLocaleString('ko-KR')
    const sym = SYMBOL[t.currency] ?? t.currency

    const rows = [
        { label: '날짜', value: t.date },
        { label: '구분', value: t.type === 'expense' ? '지출' : '수입' },
        { label: '항목', value: (t.categories as any)?.name ?? '-' },
        { label: '결제 통화', value: t.currency },
        { label: '현지 금액', value: `${sym}${fmt(t.original_amount)}` },
        { label: '적용 환율', value: t.currency === 'KRW' ? '-' : `1 ${t.currency} = ₩${t.exchange_rate.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}` },
        ...(t.currency !== 'TRY' && t.try_amount != null ? [{ label: '리라 환산', value: `₺${fmt(t.try_amount)}` }] : []),
        { label: '원화 환산', value: `₩${fmt(t.krw_amount)}` },
        { label: '결제수단', value: (t.payment_methods as any)?.name ?? '-' },
        { label: '내용', value: t.content },
        { label: '메모', value: t.memo ?? '-' },
    ]

    return (
        <div className="max-w-lg mx-auto px-4 py-6">
            {/* 네비게이션 */}
            <div className="flex items-center justify-between mb-6">
                <Link href="/transactions" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    <ChevronLeft className="w-4 h-4" />
                    내역 목록
                </Link>
                <div className="flex items-center gap-2">
                    <Link
                        href={`/transactions/${t.id}/edit`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        수정
                    </Link>
                    <DeleteButton id={t.id} redirectTo="/transactions" />
                </div>
            </div>

            {/* 금액 요약 */}
            <div className={`rounded-xl p-5 mb-6 ${t.type === 'expense' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t.type === 'expense' ? '지출' : '수입'}
                </div>
                <div className={`text-3xl font-bold ${t.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {t.type === 'expense' ? '-' : '+'}{sym}{fmt(t.original_amount)}
                </div>
                {t.currency !== 'KRW' && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">₩{fmt(t.krw_amount)}</div>
                )}
            </div>

            {/* 상세 정보 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
                <dl className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rows.map(({ label, value }) => (
                        <div key={label} className="flex items-start px-4 py-3 gap-4">
                            <dt className="text-sm text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">{label}</dt>
                            <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 break-all">{value}</dd>
                        </div>
                    ))}
                </dl>
            </div>

            {/* 영수증 이미지 */}
            {t.receipt_url && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <Receipt className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">영수증</span>
                    </div>
                    <div className="p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={t.receipt_url}
                            alt="영수증"
                            className="w-full rounded-lg object-contain max-h-[60vh]"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
