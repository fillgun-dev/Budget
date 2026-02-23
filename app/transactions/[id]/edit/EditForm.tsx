'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { updateTransaction } from './actions'
import { Loader2, RefreshCw, Camera, X, ChevronDown } from 'lucide-react'

interface Category { id: string; name: string; type: 'expense' | 'income' }
interface PaymentMethod { id: string; name: string }

const CURRENCIES = ['KRW', 'TRY', 'USD', 'EUR']
const SYMBOL: Record<string, string> = { KRW: '₩', TRY: '₺', USD: '$', EUR: '€' }

async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
            const MAX = 1200
            let { width, height } = img
            if (width > MAX || height > MAX) {
                if (width > height) { height = Math.round(height * MAX / width); width = MAX }
                else { width = Math.round(width * MAX / height); height = MAX }
            }
            const canvas = document.createElement('canvas')
            canvas.width = width; canvas.height = height
            canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
            canvas.toBlob(
                (blob) => resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }) : file),
                'image/jpeg', 0.8
            )
        }
        img.onerror = () => resolve(file)
        img.src = URL.createObjectURL(file)
    })
}

export default function EditForm({
    transaction,
    categories,
    paymentMethods,
}: {
    transaction: {
        id: string; date: string; type: string; category_id: string
        currency: string; original_amount: number; exchange_rate: number; krw_amount: number
        try_amount: number | null
        content: string; payment_method_id: string | null; memo: string | null; receipt_url: string | null
    }
    categories: Category[]
    paymentMethods: PaymentMethod[]
}) {
    const formRef = useRef<HTMLFormElement>(null)
    const [isPending, startTransition] = useTransition()

    const [type, setType] = useState<'expense' | 'income'>(transaction.type as 'expense' | 'income')
    const [currency, setCurrency] = useState(transaction.currency)
    const [originalAmount, setOriginalAmount] = useState(String(transaction.original_amount))
    const [exchangeRate, setExchangeRate] = useState(transaction.exchange_rate)
    const [exchangeRateDate, setExchangeRateDate] = useState('')
    const [isLoadingRate, setIsLoadingRate] = useState(false)
    const [krwAmount, setKrwAmount] = useState(String(transaction.krw_amount))
    const [isKrwManual, setIsKrwManual] = useState(false)

    // 리라 환산 (기존 값으로 초기화)
    const [tryRate, setTryRate] = useState(1)
    const [tryAmount, setTryAmount] = useState(
        transaction.try_amount != null
            ? String(transaction.try_amount)
            : transaction.currency === 'TRY' ? String(transaction.original_amount) : ''
    )

    const [receiptFile, setReceiptFile] = useState<File | null>(null)
    const [receiptPreview, setReceiptPreview] = useState<string | null>(transaction.receipt_url)
    const [error, setError] = useState<string | null>(null)
    const [selectedCategoryId, setSelectedCategoryId] = useState(transaction.category_id)

    const filteredCategories = categories.filter(c => c.type === type)

    useEffect(() => {
        if (currency === 'KRW') {
            setExchangeRate(1)
            setTryRate(1)
            setExchangeRateDate('')
            return
        }
        let cancelled = false
        async function fetchRates() {
            setIsLoadingRate(true)
            try {
                const fetchKrw = fetch(`/api/exchange-rate?from=${currency}&to=KRW`).then(r => r.json())
                const fetchTry = currency === 'TRY'
                    ? Promise.resolve({ rate: 1, date: '' })
                    : fetch(`/api/exchange-rate?from=${currency}&to=TRY`).then(r => r.json())

                const [krwData, tryData] = await Promise.all([fetchKrw, fetchTry])

                if (!cancelled) {
                    if (krwData.rate) {
                        setExchangeRate(krwData.rate)
                        setExchangeRateDate(krwData.date ?? '')
                    }
                    setTryRate(currency === 'TRY' ? 1 : (tryData.rate ?? 1))
                }
            } finally { if (!cancelled) setIsLoadingRate(false) }
        }
        fetchRates()
        return () => { cancelled = true }
    }, [currency])

    useEffect(() => {
        if (isKrwManual) return
        const amt = parseFloat(originalAmount)
        if (!isNaN(amt) && amt > 0) setKrwAmount(Math.round(amt * exchangeRate).toString())
        else setKrwAmount('')
    }, [originalAmount, exchangeRate, isKrwManual])

    useEffect(() => {
        const amt = parseFloat(originalAmount)
        if (!isNaN(amt) && amt > 0) setTryAmount(Math.round(amt * tryRate).toString())
        else setTryAmount('')
    }, [originalAmount, tryRate])

    async function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const compressed = await compressImage(file)
        setReceiptFile(compressed)
        setReceiptPreview(URL.createObjectURL(compressed))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        if (!selectedCategoryId) {
            setError('항목을 선택해주세요.')
            return
        }
        const amt = parseFloat(originalAmount || '0')
        const formData = new FormData(formRef.current!)
        formData.set('type', type)
        formData.set('currency', currency)
        formData.set('exchange_rate', exchangeRate.toString())
        formData.set('krw_amount', krwAmount || Math.round(amt * exchangeRate).toString())
        formData.set('try_amount', tryAmount || Math.round(amt * tryRate).toString())
        if (receiptFile) formData.set('receipt', receiptFile, receiptFile.name)

        startTransition(async () => {
            const result = await updateTransaction(transaction.id, formData)
            if (result?.error) setError(result.error)
        })
    }

    const inputClass = 'block w-full rounded-lg border-0 py-3 px-4 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 text-base'
    const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            {/* 지출/수입 토글 */}
            <div className="flex rounded-lg overflow-hidden ring-1 ring-gray-300 dark:ring-gray-600">
                {(['expense', 'income'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => { if (t !== type) setSelectedCategoryId(''); setType(t) }}
                        className={`flex-1 py-3 text-base font-semibold transition-colors ${type === t ? (t === 'expense' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white') : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                        {t === 'expense' ? '지출' : '수입'}
                    </button>
                ))}
            </div>

            {/* 통화 */}
            <div>
                <label className={labelClass}>결제 통화</label>
                <div className="flex gap-2 flex-wrap">
                    {CURRENCIES.map(cur => (
                        <button key={cur} type="button" onClick={() => { setCurrency(cur); setIsKrwManual(false) }}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${currency === cur ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-600'}`}>
                            {cur}
                        </button>
                    ))}
                </div>
            </div>

            {/* 금액 */}
            <div>
                <label className={labelClass}>금액 {currency !== 'KRW' && <span className="text-gray-400">({currency})</span>}</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{SYMBOL[currency] ?? currency}</span>
                    <input name="original_amount" type="number" inputMode="decimal" min="0" step="any"
                        value={originalAmount} onChange={e => setOriginalAmount(e.target.value)}
                        placeholder="0" required className={inputClass + ' pl-10'} />
                </div>
            </div>

            {/* 환율 & 환산액 */}
            {currency !== 'KRW' && (
                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            적용 환율 {exchangeRateDate && <span className="text-xs text-gray-400">({exchangeRateDate})</span>}
                        </span>
                        {isLoadingRate
                            ? <span className="flex items-center gap-1 text-sm text-indigo-500"><Loader2 className="w-3.5 h-3.5 animate-spin" />조회 중</span>
                            : (
                                <div className="text-right">
                                    <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                                        1 {currency} = {exchangeRate.toLocaleString('ko-KR')} KRW
                                    </div>
                                    {currency !== 'TRY' && (
                                        <div className="text-xs text-indigo-500 dark:text-indigo-400">
                                            1 {currency} = {tryRate.toLocaleString('ko-KR', { maximumFractionDigits: 4 })} TRY
                                        </div>
                                    )}
                                </div>
                            )}
                    </div>

                    {/* TRY 환산액 */}
                    {currency !== 'TRY' && tryAmount && (
                        <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded-lg">
                            <span className="text-sm text-gray-600 dark:text-gray-400">리라 환산액 (TRY)</span>
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                ₺{parseInt(tryAmount).toLocaleString('ko-KR')}
                            </span>
                        </div>
                    )}

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">원화 환산액 (KRW)</label>
                            {isKrwManual && (
                                <button type="button" onClick={() => setIsKrwManual(false)} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                                    <RefreshCw className="w-3 h-3" />자동 계산으로 돌아가기
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₩</span>
                            <input type="number" inputMode="numeric" value={krwAmount}
                                onChange={e => { setKrwAmount(e.target.value); setIsKrwManual(true) }}
                                className={`block w-full rounded-lg border-0 py-3 pl-10 pr-4 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 ring-1 ring-inset ${isKrwManual ? 'ring-amber-400' : 'ring-gray-200 dark:ring-gray-500'} text-base focus:ring-2 focus:ring-indigo-500`} />
                            {isKrwManual && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-500 font-medium">수동</span>}
                        </div>
                    </div>
                </div>
            )}

            {/* 항목 */}
            <div>
                <label className={labelClass}>항목</label>
                <div className="flex flex-wrap gap-2">
                    {filteredCategories.map(c => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCategoryId(c.id)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedCategoryId === c.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
                <input type="hidden" name="category_id" value={selectedCategoryId} />
            </div>

            {/* 내용 */}
            <div>
                <label className={labelClass}>내용</label>
                <input name="content" type="text" defaultValue={transaction.content} required className={inputClass} />
            </div>

            {/* 날짜 */}
            <div>
                <label className={labelClass}>날짜</label>
                <input name="date" type="date" defaultValue={transaction.date} required className={inputClass} />
            </div>

            {/* 결제수단 */}
            <div>
                <label className={labelClass}>결제수단 <span className="text-gray-400 font-normal text-xs">선택</span></label>
                <div className="relative">
                    <select name="payment_method_id" defaultValue={transaction.payment_method_id ?? ''} className={inputClass + ' appearance-none pr-10'}>
                        <option value="">선택 안함</option>
                        {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* 영수증 */}
            <div>
                <label className={labelClass}>영수증 <span className="text-gray-400 font-normal text-xs">선택</span></label>
                {receiptPreview ? (
                    <div className="relative inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={receiptPreview} alt="영수증" className="h-32 w-auto rounded-lg object-cover ring-1 ring-gray-200" />
                        <button type="button" onClick={() => { setReceiptFile(null); setReceiptPreview(null) }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <label className="flex items-center justify-center gap-2 w-full py-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 cursor-pointer hover:border-indigo-400 hover:text-indigo-500 transition-colors">
                        <Camera className="w-5 h-5" />
                        <span className="text-sm">촬영하거나 파일 선택</span>
                        <input type="file" accept="image/*" capture="environment" onChange={handleReceiptChange} className="sr-only" />
                    </label>
                )}
            </div>

            {/* 메모 */}
            <div>
                <label className={labelClass}>메모 <span className="text-gray-400 font-normal text-xs">선택</span></label>
                <textarea name="memo" rows={2} defaultValue={transaction.memo ?? ''} className={inputClass + ' resize-none'} />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">{error}</p>}

            <button type="submit" disabled={isPending}
                className="w-full rounded-lg bg-indigo-600 py-4 text-base font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2">
                {isPending ? <><Loader2 className="w-5 h-5 animate-spin" />저장 중...</> : '수정 저장'}
            </button>
        </form>
    )
}
