import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import EditForm from './EditForm'

export default async function EditTransactionPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { id } = await params

    const [{ data: t }, { data: categories }, { data: paymentMethods }] = await Promise.all([
        supabase
            .from('transactions')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single(),
        supabase.from('categories').select('id, name, type').eq('is_active', true).order('name'),
        supabase.from('payment_methods').select('id, name').eq('is_active', true).order('name'),
    ])

    if (!t) notFound()

    return (
        <div className="max-w-lg mx-auto px-4 py-6 pb-16">
            <div className="flex items-center gap-3 mb-6">
                <Link href={`/transactions/${id}`} className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">내역 수정</h1>
            </div>

            <EditForm
                transaction={t}
                categories={categories ?? []}
                paymentMethods={paymentMethods ?? []}
            />
        </div>
    )
}
