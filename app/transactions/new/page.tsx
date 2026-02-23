import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import TransactionForm from './TransactionForm'

export default async function NewTransactionPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [{ data: categories }, { data: paymentMethods }, { data: recentTx }, { data: userTemplates }] = await Promise.all([
        supabase.from('categories').select('id, name, type').eq('is_active', true).order('name'),
        supabase.from('payment_methods').select('id, name').eq('is_active', true).order('name'),
        supabase
            .from('transactions')
            .select('content, category_id, type, currency, categories(name)')
            .order('created_at', { ascending: false })
            .limit(200),
        supabase
            .from('transaction_templates')
            .select('id, name, type, category_id, currency, default_amount, categories(name)')
            .order('created_at'),
    ])

    // 자주 쓴 내역 집계: (type, content, category_id, currency) 기준
    type FreqKey = string
    const freqMap = new Map<FreqKey, {
        content: string
        category_id: string
        category_name: string
        type: 'expense' | 'income'
        currency: string
        count: number
    }>()

    for (const t of (recentTx ?? [])) {
        const key = `${t.type}::${t.content}::${t.category_id}::${t.currency}`
        if (!freqMap.has(key)) {
            freqMap.set(key, {
                content: t.content,
                category_id: t.category_id,
                category_name: (t.categories as unknown as { name: string } | null)?.name ?? '',
                type: t.type as 'expense' | 'income',
                currency: t.currency,
                count: 0,
            })
        }
        freqMap.get(key)!.count++
    }

    const frequentItems = [...freqMap.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

    const templates = (userTemplates ?? []).map(t => ({
        id: t.id,
        name: t.name,
        category_id: t.category_id,
        category_name: (t.categories as unknown as { name: string } | null)?.name ?? '',
        type: t.type as 'expense' | 'income',
        currency: t.currency,
        default_amount: t.default_amount ?? null,
    }))

    return (
        <div className="max-w-lg mx-auto px-4 py-6 pb-16">
            {/* 상단 네비게이션 */}
            <div className="flex items-center gap-3 mb-6">
                <Link href="/" className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">내역 추가</h1>
            </div>

            <TransactionForm
                categories={categories ?? []}
                paymentMethods={paymentMethods ?? []}
                frequentItems={frequentItems}
                templates={templates}
            />
        </div>
    )
}
