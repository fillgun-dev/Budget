'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { deleteTransaction } from './actions'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeleteButton({
    id,
    redirectTo,
}: {
    id: string
    redirectTo?: string
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    function handleDelete() {
        if (!confirm('이 내역을 삭제하시겠습니까?')) return
        startTransition(async () => {
            await deleteTransaction(id)
            if (redirectTo) {
                router.push(redirectTo)
            } else {
                router.refresh()
            }
        })
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            title="삭제"
        >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            삭제
        </button>
    )
}
