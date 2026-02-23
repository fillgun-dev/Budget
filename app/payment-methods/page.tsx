import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addPaymentMethod, updatePaymentMethodName, togglePaymentMethodActive } from './actions'
import { Plus, Pencil, ToggleLeft, ToggleRight, X, Check, CreditCard } from 'lucide-react'

interface PaymentMethod {
    id: string
    name: string
    is_active: boolean
}

interface Props {
    searchParams: Promise<{ edit?: string; add?: string }>
}

export default async function PaymentMethodsPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: methods } = await supabase
        .from('payment_methods')
        .select('*')
        .order('name')

    const params = await searchParams
    const editingId = params.edit
    const isAdding = params.add === '1'

    const paymentMethods: PaymentMethod[] = methods ?? []
    const activeMethods = paymentMethods.filter(m => m.is_active)
    const inactiveMethods = paymentMethods.filter(m => !m.is_active)

    return (
        <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">결제수단 관리</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">현금, 카드 등 결제수단을 추가하고 관리합니다.</p>
                </div>
                {!isAdding && (
                    <Link
                        href="/payment-methods?add=1"
                        className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                    >
                        <Plus className="w-4 h-4" />
                        새 수단
                    </Link>
                )}
            </div>

            {/* 새 결제수단 추가 폼 */}
            {isAdding && (
                <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800 p-4">
                    <h2 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3">새 결제수단 추가</h2>
                    <form action={addPaymentMethod} className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">결제수단 이름</label>
                            <input
                                name="name"
                                type="text"
                                required
                                autoFocus
                                placeholder="예: 현금, 우리카드, 해외카드..."
                                className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
                            />
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button
                                type="submit"
                                className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
                            >
                                <Check className="w-3.5 h-3.5" />
                                추가
                            </button>
                            <Link
                                href="/payment-methods"
                                className="flex items-center gap-1 rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                                <X className="w-3.5 h-3.5" />
                                취소
                            </Link>
                        </div>
                    </form>
                </div>
            )}

            {/* 결제수단 목록 */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        결제수단 목록
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                        활성 {activeMethods.length}개
                    </span>
                </div>

                {paymentMethods.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">
                        아직 결제수단이 없습니다. 위 &quot;새 수단&quot; 버튼으로 추가해보세요.
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                        {[...activeMethods, ...inactiveMethods].map((method) => {
                            const isEditing = editingId === method.id
                            const toggleAction = togglePaymentMethodActive.bind(null, method.id, method.is_active)

                            return (
                                <li key={method.id} className="flex items-center gap-3 px-4 py-3">
                                    {isEditing ? (
                                        /* 수정 폼 */
                                        <form action={updatePaymentMethodName} className="flex items-center gap-2 flex-1">
                                            <input type="hidden" name="id" value={method.id} />
                                            <input
                                                name="name"
                                                type="text"
                                                defaultValue={method.name}
                                                required
                                                autoFocus
                                                className="flex-1 rounded-md border-0 py-1.5 px-2.5 text-sm text-gray-900 ring-1 ring-inset ring-indigo-400 focus:ring-2 focus:ring-indigo-600 dark:bg-gray-700 dark:text-gray-100"
                                            />
                                            <button
                                                type="submit"
                                                className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                                            >
                                                <Check className="w-3 h-3" />
                                                저장
                                            </button>
                                            <Link
                                                href="/payment-methods"
                                                className="flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                            >
                                                <X className="w-3 h-3" />
                                                취소
                                            </Link>
                                        </form>
                                    ) : (
                                        /* 일반 표시 */
                                        <>
                                            <CreditCard className={`w-4 h-4 flex-shrink-0 ${method.is_active ? 'text-indigo-500' : 'text-gray-300'}`} />
                                            <span className={`flex-1 text-sm font-medium ${method.is_active ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 line-through'}`}>
                                                {method.name}
                                            </span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${method.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'}`}>
                                                {method.is_active ? '활성' : '비활성'}
                                            </span>
                                            <Link
                                                href={`/payment-methods?edit=${method.id}`}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                                title="수정"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Link>
                                            <form action={toggleAction}>
                                                <button
                                                    type="submit"
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                                    title={method.is_active ? '비활성화' : '활성화'}
                                                >
                                                    {method.is_active
                                                        ? <ToggleRight className="w-4 h-4 text-green-500" />
                                                        : <ToggleLeft className="w-4 h-4 text-gray-400" />
                                                    }
                                                </button>
                                            </form>
                                        </>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </div>
    )
}
