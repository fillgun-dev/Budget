'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { TransactionSchema } from '@/utils/validation'

export async function addTransaction(
    formData: FormData
): Promise<{ error: string } | void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // --- 입력값 파싱 ---
    const raw = {
        date: formData.get('date') as string,
        type: formData.get('type') as string,
        category_id: formData.get('category_id') as string,
        currency: formData.get('currency') as string,
        original_amount: parseFloat(formData.get('original_amount') as string),
        exchange_rate: parseFloat(formData.get('exchange_rate') as string) || 1,
        krw_amount: parseFloat(formData.get('krw_amount') as string),
        try_amount: parseFloat(formData.get('try_amount') as string) || null,
        content: (formData.get('content') as string ?? '').trim(),
        payment_method_id: (formData.get('payment_method_id') as string) || null,
        memo: (formData.get('memo') as string ?? '').trim() || null,
    }

    // --- Zod 검증 ---
    const parsed = TransactionSchema.safeParse(raw)
    if (!parsed.success) {
        const first = parsed.error.issues[0]
        return { error: first.message }
    }
    const fields = parsed.data

    // --- 영수증 업로드 (선택) ---
    let receipt_url: string | null = null
    const receiptFile = formData.get('receipt') as File | null

    if (receiptFile && receiptFile.size > 0) {
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
        const MAX_SIZE = 10 * 1024 * 1024 // 10MB
        if (!ALLOWED_TYPES.includes(receiptFile.type)) {
            return { error: '이미지 파일(JPG, PNG, WEBP, HEIC)만 업로드 가능합니다.' }
        }
        if (receiptFile.size > MAX_SIZE) {
            return { error: '파일 크기는 10MB 이하여야 합니다.' }
        }

        const bytes = await receiptFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const ext = receiptFile.name.split('.').pop() ?? 'jpg'
        const fileName = `${user.id}/${Date.now()}.${ext}`

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(fileName, buffer, {
                contentType: receiptFile.type || 'image/jpeg',
                upsert: false,
            })

        if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage
                .from('receipts')
                .getPublicUrl(uploadData.path)
            receipt_url = publicUrl
        }
    }

    // --- public.users 동기화 ---
    await supabase.from('users').upsert(
        { id: user.id, email: user.email!, role: 'admin' },
        { onConflict: 'id', ignoreDuplicates: true }
    )

    // --- DB 저장 ---
    const { data: inserted, error } = await supabase
        .from('transactions')
        .insert({
            user_id: user.id,
            date: fields.date,
            type: fields.type,
            category_id: fields.category_id,
            payment_method_id: fields.payment_method_id ?? null,
            currency: fields.currency,
            original_amount: fields.original_amount,
            exchange_rate: fields.exchange_rate,
            krw_amount: fields.krw_amount,
            try_amount: fields.try_amount ?? null,
            content: fields.content,
            receipt_url,
            memo: fields.memo ?? null,
        })
        .select()

    if (error) {
        console.error('[addTransaction] insert error:', error)
        return { error: `저장 실패: ${error.message}` }
    }

    if (!inserted || inserted.length === 0) {
        console.error('[addTransaction] RLS blocked: 0 rows inserted')
        return { error: 'RLS 정책에 의해 저장이 차단되었습니다. Supabase 대시보드에서 RLS 정책을 확인해주세요.' }
    }

    revalidatePath('/')
    redirect('/')
}
