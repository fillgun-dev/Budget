'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { addTransaction } from './actions'
import { Loader2, RefreshCw, Camera, X, ChevronDown } from 'lucide-react'

interface Category {
    id: string
    name: string
    type: 'expense' | 'income'
}

interface PaymentMethod {
    id: string
    name: string
}

interface FrequentItem {
    content: string
    category_id: string
    category_name: string
    type: 'expense' | 'income'
    currency: string
    count: number
}

interface Template {
    id: string
    name: string
    category_id: string | null
    category_name: string
    type: 'expense' | 'income'
    currency: string
    default_amount: number | null
}

const CURRENCIES = ['KRW', 'TRY', 'USD', 'EUR']

const CURRENCY_SYMBOLS: Record<string, string> = {
    KRW: '₩',
    TRY: '₺',
    USD: '$',
    EUR: '€',
}

// Canvas 기반 이미지 압축 (최대 1200px, JPEG 80%)
async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
            const MAX = 1200
            let { width, height } = img
            if (width > MAX || height > MAX) {
                if (width > height) {
                    height = Math.round((height * MAX) / width)
                    width = MAX
                } else {
                    width = Math.round((width * MAX) / height)
                    height = MAX
                }
            }
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0, width, height)
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
                    } else {
                        resolve(file)
                    }
                },
                'image/jpeg',
                0.8
            )
        }
        img.onerror = () => resolve(file)
        img.src = URL.createObjectURL(file)
    })
}

export default function TransactionForm({
    categories,
    paymentMethods,
    frequentItems = [],
    templates = [],
}: {
    categories: Category[]
    paymentMethods: PaymentMethod[]
    frequentItems?: FrequentItem[]
    templates?: Template[]
}) {
    const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
    const formRef = useRef<HTMLFormElement>(null)
    const [isPending, startTransition] = useTransition()

    // 폼 상태
    const [type, setType] = useState<'expense' | 'income'>('expense')
    const [date, setDate] = useState(today)
    const [currency, setCurrency] = useState('TRY')
    const [originalAmount, setOriginalAmount] = useState('')
    const [content, setContent] = useState('')
    const [selectedCategoryId, setSelectedCategoryId] = useState('')

    // 환율 상태 (currency → KRW)
    const [exchangeRate, setExchangeRate] = useState(1)
    const [exchangeRateDate, setExchangeRateDate] = useState('')
    const [isLoadingRate, setIsLoadingRate] = useState(false)

    // 리라 환산 (currency → TRY)
    const [tryRate, setTryRate] = useState(1)
    const [tryAmount, setTryAmount] = useState('')

    // 원화 수동 보정
    const [krwAmount, setKrwAmount] = useState('')
    const [isKrwManual, setIsKrwManual] = useState(false)

    // 영수증
    const [receiptFile, setReceiptFile] = useState<File | null>(null)
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null)

    // 에러
    const [error, setError] = useState<string | null>(null)

    // 통화/날짜 변경 시 환율 자동 조회
    useEffect(() => {
        // KRW 선택 시: 환율 1:1, 추가 조회 불필요
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
                // TRY 선택: TRY→KRW만 조회 (TRY→TRY = 1)
                // 기타 외화: 통화→KRW, 통화→TRY 모두 조회
                const fetchKrw = fetch(`/api/exchange-rate?from=${currency}&to=KRW&date=${date}`).then(r => r.json())
                const fetchTry = currency === 'TRY'
                    ? Promise.resolve({ rate: 1, date: '' })
                    : fetch(`/api/exchange-rate?from=${currency}&to=TRY&date=${date}`).then(r => r.json())

                const [krwData, tryData] = await Promise.all([fetchKrw, fetchTry])

                if (!cancelled) {
                    if (krwData.rate) {
                        setExchangeRate(krwData.rate)
                        setExchangeRateDate(krwData.date ?? '')
                    }
                    setTryRate(currency === 'TRY' ? 1 : (tryData.rate ?? 1))
                }
            } catch {
                // keep existing rates
            } finally {
                if (!cancelled) setIsLoadingRate(false)
            }
        }
        fetchRates()
        return () => { cancelled = true }
    }, [currency, date])

    // 금액/환율 변경 시 원화 자동 계산
    useEffect(() => {
        if (isKrwManual) return
        const amt = parseFloat(originalAmount)
        if (!isNaN(amt) && amt > 0) {
            setKrwAmount(Math.round(amt * exchangeRate).toString())
        } else {
            setKrwAmount('')
        }
    }, [originalAmount, exchangeRate, isKrwManual])

    // 금액/TRY환율 변경 시 리라 환산 자동 계산
    useEffect(() => {
        const amt = parseFloat(originalAmount)
        if (!isNaN(amt) && amt > 0) {
            setTryAmount(Math.round(amt * tryRate).toString())
        } else {
            setTryAmount('')
        }
    }, [originalAmount, tryRate])

    const filteredCategories = categories.filter((c) => c.type === type)
    const filteredTemplates = templates.filter((t) => t.type === type)
    const filteredFrequent = frequentItems.filter((item) => item.type === type)

    function applyQuickFill(name: string, category_id: string | null, currency: string, default_amount?: number | null) {
        setContent(name)
        if (category_id) setSelectedCategoryId(category_id)
        setCurrency(currency)
        if (default_amount) setOriginalAmount(String(default_amount))
    }

    async function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const compressed = await compressImage(file)
        setReceiptFile(compressed)
        setReceiptPreview(URL.createObjectURL(compressed))
    }

    function removeReceipt() {
        setReceiptFile(null)
        setReceiptPreview(null)
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
        if (receiptFile) {
            formData.set('receipt', receiptFile, receiptFile.name)
        }

        startTransition(async () => {
            const result = await addTransaction(formData)
            if (result?.error) {
                setError(result.error)
            }
        })
    }

    const inputClass = 'block w-full rounded-lg border-0 py-3 px-4 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 text-base'
    const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            {/* 지출 / 수입 토글 */}
            <div className="flex rounded-lg overflow-hidden ring-1 ring-gray-300 dark:ring-gray-600">
                <button
                    type="button"
                    onClick={() => { setType('expense'); setKrwAmount(''); setIsKrwManual(false); setSelectedCategoryId('') }}
                    className={`flex-1 py-3 text-base font-semibold transition-colors ${type === 'expense' ? 'bg-red-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
                >
                    지출
                </button>
                <button
                    type="button"
                    onClick={() => { setType('income'); setKrwAmount(''); setIsKrwManual(false); setSelectedCategoryId('') }}
                    className={`flex-1 py-3 text-base font-semibold transition-colors ${type === 'income' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
                >
                    수입
                </button>
            </div>

            {/* 빠른 내역 — 사용자 정의 템플릿 */}
            {filteredTemplates.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">빠른 내역</p>
                        <a href="/templates" className="text-xs text-indigo-500 hover:underline">관리</a>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                        {filteredTemplates.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => applyQuickFill(t.name, t.category_id, t.currency, t.default_amount)}
                                className="flex-shrink-0 flex flex-col items-start px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 hover:ring-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 active:scale-95 transition-all text-left"
                            >
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{t.name}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                    {t.category_name || '항목 미지정'} · {t.currency}
                                    {t.default_amount ? ` · ${Number(t.default_amount).toLocaleString('ko-KR')}` : ''}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 자주 쓰는 내역 — 과거 내역 자동 감지 (템플릿 없을 때만) */}
            {filteredTemplates.length === 0 && filteredFrequent.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">자주 쓰는 내역</p>
                        <a href="/templates" className="text-xs text-indigo-500 hover:underline">직접 등록</a>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                        {filteredFrequent.map((item, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => applyQuickFill(item.content, item.category_id, item.currency)}
                                className="flex-shrink-0 flex flex-col items-start px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 hover:ring-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 active:scale-95 transition-all text-left"
                            >
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{item.content}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                    {item.category_name} · {item.currency}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 통화 선택 */}
            <div>
                <label className={labelClass}>결제 통화</label>
                <div className="flex gap-2 flex-wrap">
                    {CURRENCIES.map((cur) => (
                        <button
                            key={cur}
                            type="button"
                            onClick={() => { setCurrency(cur); setIsKrwManual(false) }}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${currency === cur ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50'}`}
                        >
                            {cur}
                        </button>
                    ))}
                </div>
            </div>

            {/* 금액 */}
            <div>
                <label className={labelClass}>
                    금액 {currency !== 'KRW' && <span className="text-gray-400">({currency})</span>}
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                        {CURRENCY_SYMBOLS[currency] ?? currency}
                    </span>
                    <input
                        name="original_amount"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={originalAmount}
                        onChange={(e) => setOriginalAmount(e.target.value)}
                        placeholder="0"
                        required
                        className={inputClass + ' pl-10'}
                    />
                </div>
            </div>

            {/* 환율 & 환산액 (외화 선택 시) */}
            {currency !== 'KRW' && (
                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 p-4 space-y-3">
                    {/* 환율 표시 */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            적용 환율 {exchangeRateDate && <span className="text-xs text-gray-400">({exchangeRateDate} 기준)</span>}
                        </span>
                        {isLoadingRate ? (
                            <span className="flex items-center gap-1 text-sm text-indigo-500">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                조회 중
                            </span>
                        ) : (
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

                    {/* TRY 환산액 (TRY가 아닌 외화일 때만) */}
                    {currency !== 'TRY' && tryAmount && (
                        <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded-lg">
                            <span className="text-sm text-gray-600 dark:text-gray-400">리라 환산액 (TRY)</span>
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                ₺{parseInt(tryAmount).toLocaleString('ko-KR')}
                            </span>
                        </div>
                    )}

                    {/* 원화 환산 */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                원화 환산액 (KRW)
                            </label>
                            {isKrwManual ? (
                                <button
                                    type="button"
                                    onClick={() => { setIsKrwManual(false) }}
                                    className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    자동 계산으로 돌아가기
                                </button>
                            ) : (
                                <span className="text-xs text-gray-400">탭하여 수동 보정 가능</span>
                            )}
                        </div>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₩</span>
                            <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                step="1"
                                value={krwAmount}
                                onChange={(e) => {
                                    setKrwAmount(e.target.value)
                                    setIsKrwManual(true)
                                }}
                                placeholder="자동 계산"
                                className={`block w-full rounded-lg border-0 py-3 pl-10 pr-4 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 ring-1 ring-inset ${isKrwManual ? 'ring-amber-400' : 'ring-gray-200 dark:ring-gray-500'} text-base focus:ring-2 focus:ring-indigo-500`}
                            />
                            {isKrwManual && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-500 font-medium">수동</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 항목(카테고리) */}
            <div>
                <label className={labelClass}>항목</label>
                {filteredCategories.length === 0 ? (
                    <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-3">
                        {type === 'expense' ? '지출' : '수입'} 항목이 없습니다.{' '}
                        <a href="/categories" className="underline font-medium">항목 관리</a>에서 먼저 추가해주세요.
                    </p>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-2">
                            {filteredCategories.map((c) => (
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
                    </>
                )}
            </div>

            {/* 내용(적요) */}
            <div>
                <label className={labelClass}>내용</label>
                <input
                    name="content"
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="예: 마트 장보기, 전기세 납부..."
                    required
                    className={inputClass}
                />
            </div>

            {/* 날짜 */}
            <div>
                <label className={labelClass}>날짜</label>
                <input
                    name="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className={inputClass}
                />
            </div>

            {/* 결제수단 (선택) */}
            <div>
                <label className={labelClass}>결제수단 <span className="text-gray-400 font-normal text-xs">선택</span></label>
                <div className="relative">
                    <select name="payment_method_id" className={inputClass + ' appearance-none pr-10'}>
                        <option value="">결제수단 선택 안함</option>
                        {paymentMethods.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* 영수증 (선택) */}
            <div>
                <label className={labelClass}>영수증 <span className="text-gray-400 font-normal text-xs">선택 · 자동 압축</span></label>
                {receiptPreview ? (
                    <div className="relative inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={receiptPreview} alt="영수증 미리보기" className="h-32 w-auto rounded-lg object-cover ring-1 ring-gray-200" />
                        <button
                            type="button"
                            onClick={removeReceipt}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <label className="flex items-center justify-center gap-2 w-full py-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-500 transition-colors">
                        <Camera className="w-5 h-5" />
                        <span className="text-sm">촬영하거나 파일 선택</span>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleReceiptChange}
                            className="sr-only"
                        />
                    </label>
                )}
            </div>

            {/* 메모 (선택) */}
            <div>
                <label className={labelClass}>메모 <span className="text-gray-400 font-normal text-xs">선택</span></label>
                <textarea
                    name="memo"
                    rows={2}
                    placeholder="추가 메모..."
                    className={inputClass + ' resize-none'}
                />
            </div>

            {/* 에러 */}
            {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
                    {error}
                </p>
            )}

            {/* 제출 버튼 */}
            <button
                type="submit"
                disabled={isPending || filteredCategories.length === 0}
                className="w-full rounded-lg bg-indigo-600 py-4 text-base font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
                {isPending ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        저장 중...
                    </>
                ) : '저장하기'}
            </button>
        </form>
    )
}
