'use client'

import { useTransition } from 'react'
import { deleteSharedLink } from './actions'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeleteSharedLinkButton({ id }: { id: string }) {
    const [isPending, startTransition] = useTransition()

    function handleDelete() {
        if (!confirm('공유 링크를 삭제하시겠습니까?\n링크를 받은 사람이 더 이상 접근할 수 없게 됩니다.')) return
        startTransition(async () => {
            await deleteSharedLink(id)
        })
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isPending}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            title="삭제"
        >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
    )
}
