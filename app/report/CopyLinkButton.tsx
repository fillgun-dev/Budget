'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function CopyLinkButton({ url }: { url: string }) {
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
        >
            {copied ? (
                <>
                    <Check className="w-3.5 h-3.5" />
                    복사됨
                </>
            ) : (
                <>
                    <Copy className="w-3.5 h-3.5" />
                    링크 복사
                </>
            )}
        </button>
    )
}
