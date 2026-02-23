import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addCategory, updateCategoryName, toggleCategoryActive } from './actions'
import { Plus, Pencil, ToggleLeft, ToggleRight, X, Check } from 'lucide-react'

interface Category {
    id: string
    name: string
    type: 'expense' | 'income'
    is_active: boolean
}

interface Props {
    searchParams: Promise<{ edit?: string; add?: string }>
}

export default async function CategoriesPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .order('type')
        .order('name')

    const params = await searchParams
    const editingId = params.edit
    const isAdding = params.add === '1'

    const expenseCategories: Category[] = (categories ?? []).filter((c: Category) => c.type === 'expense')
    const incomeCategories: Category[] = (categories ?? []).filter((c: Category) => c.type === 'income')

    return (
        <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">항목 관리</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">지출·수입 카테고리를 추가하고 관리합니다.</p>
                </div>
                {!isAdding && (
                    <Link
                        href="/categories?add=1"
                        className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                    >
                        <Plus className="w-4 h-4" />
                        새 항목
                    </Link>
                )}
            </div>

            {/* 새 항목 추가 폼 */}
            {isAdding && (
                <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800 p-4">
                    <h2 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3">새 항목 추가</h2>
                    <form action={addCategory} className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">항목명</label>
                            <input
                                name="name"
                                type="text"
                                required
                                autoFocus
                                placeholder="예: 식비, 교통비, 월급..."
                                className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">구분</label>
                            <div className="flex gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="type" value="expense" defaultChecked className="text-indigo-600" />
                                    <span className="text-sm font-medium text-red-600">지출</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer ml-4">
                                    <input type="radio" name="type" value="income" className="text-indigo-600" />
                                    <span className="text-sm font-medium text-blue-600">수입</span>
                                </label>
                            </div>
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
                                href="/categories"
                                className="flex items-center gap-1 rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                                <X className="w-3.5 h-3.5" />
                                취소
                            </Link>
                        </div>
                    </form>
                </div>
            )}

            {/* 지출 항목 */}
            <CategorySection
                title="지출 항목"
                badgeColor="red"
                categories={expenseCategories}
                editingId={editingId}
            />

            {/* 수입 항목 */}
            <div className="mt-6">
                <CategorySection
                    title="수입 항목"
                    badgeColor="blue"
                    categories={incomeCategories}
                    editingId={editingId}
                />
            </div>
        </div>
    )
}

function CategorySection({
    title,
    badgeColor,
    categories,
    editingId,
}: {
    title: string
    badgeColor: 'red' | 'blue'
    categories: Category[]
    editingId?: string
}) {
    const colorMap = {
        red: {
            badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            header: 'text-red-600 dark:text-red-400',
        },
        blue: {
            badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            header: 'text-blue-600 dark:text-blue-400',
        },
    }
    const colors = colorMap[badgeColor]

    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h2 className={`text-sm font-semibold ${colors.header}`}>{title}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                    {categories.length}개
                </span>
            </div>

            {categories.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                    아직 항목이 없습니다. 위 &quot;새 항목&quot; 버튼으로 추가해보세요.
                </div>
            ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {categories.map((category) => {
                        const isEditing = editingId === category.id
                        const toggleAction = toggleCategoryActive.bind(null, category.id, category.is_active)

                        return (
                            <li key={category.id} className="px-4 py-3">
                                {isEditing ? (
                                    /* 이름 수정 폼 */
                                    <form action={updateCategoryName} className="flex items-center gap-2">
                                        <input type="hidden" name="id" value={category.id} />
                                        <input
                                            name="name"
                                            type="text"
                                            defaultValue={category.name}
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
                                            href="/categories"
                                            className="flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        >
                                            <X className="w-3 h-3" />
                                            취소
                                        </Link>
                                    </form>
                                ) : (
                                    /* 일반 표시 */
                                    <div className="flex items-center gap-3">
                                        <span className={`flex-1 text-sm font-medium ${category.is_active ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 line-through'}`}>
                                            {category.name}
                                        </span>
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${category.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'}`}>
                                            {category.is_active ? '활성' : '비활성'}
                                        </span>
                                        <Link
                                            href={`/categories?edit=${category.id}`}
                                            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                            title="이름 수정"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Link>
                                        <form action={toggleAction}>
                                            <button
                                                type="submit"
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                                title={category.is_active ? '비활성화' : '활성화'}
                                            >
                                                {category.is_active
                                                    ? <ToggleRight className="w-4 h-4 text-green-500" />
                                                    : <ToggleLeft className="w-4 h-4 text-gray-400" />
                                                }
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
