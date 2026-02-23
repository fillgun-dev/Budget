'use client'

import { useActionState } from 'react'
import { updateDisplayName } from './actions'
import { CheckCircle2, User } from 'lucide-react'

const initialState: { error?: string; success?: boolean } = {}

export default function SettingsForm({
    email,
    displayName,
}: {
    email: string
    displayName: string | null
}) {
    const [state, formAction, isPending] = useActionState(updateDisplayName, initialState)

    return (
        <form action={formAction} className="space-y-5">
            {/* 이메일 (읽기 전용) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    이메일
                </label>
                <input
                    type="text"
                    value={email}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed"
                />
            </div>

            {/* 표시 이름 */}
            <div>
                <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    보고서 표시 이름
                </label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        id="display_name"
                        name="display_name"
                        type="text"
                        defaultValue={displayName ?? ''}
                        maxLength={50}
                        placeholder="예: 홍길동, 우리 가족"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                    공유 링크 보고서 상단에 &quot;[이름]의 가계부&quot;로 표시됩니다. 비워두면 표시되지 않습니다.
                </p>
            </div>

            {/* 피드백 메시지 */}
            {state?.error && (
                <p className="text-sm text-red-500">{state.error}</p>
            )}
            {state?.success && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    저장되었습니다.
                </div>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
                {isPending ? '저장 중...' : '저장'}
            </button>
        </form>
    )
}
