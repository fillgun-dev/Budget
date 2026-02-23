'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { BudgetSchema } from '@/utils/validation'

export async function upsertBudget(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const parsed = BudgetSchema.safeParse({
        category_id: formData.get('category_id') as string,
        amount: parseFloat(formData.get('amount') as string) || 0,
        year: formData.get('year') as string,
        month: formData.get('month') as string,
    })
    if (!parsed.success) redirect('/budget')

    const { category_id, amount, year, month } = parsed.data!

    const monthStr = `${year}-${String(month).padStart(2, '0')}`

    if (!amount || amount <= 0) {
        // 기본값 + 해당 월 레코드 모두 삭제
        await Promise.all([
            supabase.from('category_budgets').delete()
                .eq('user_id', user.id).eq('category_id', category_id).is('month', null),
            supabase.from('category_budgets').delete()
                .eq('user_id', user.id).eq('category_id', category_id).eq('month', monthStr),
        ])
    } else {
        // 기본값(이후 달 자동 적용) + 해당 월 레코드(이력 추적) 함께 저장
        await Promise.all([
            supabase.from('category_budgets').upsert(
                { user_id: user.id, category_id, amount, currency: 'TRY', month: null },
                { onConflict: 'user_id,category_id,month' }
            ),
            supabase.from('category_budgets').upsert(
                { user_id: user.id, category_id, amount, currency: 'TRY', month: monthStr },
                { onConflict: 'user_id,category_id,month' }
            ),
        ])
    }

    revalidatePath('/budget')
    revalidatePath('/')
    redirect(`/budget?year=${year}&month=${month}`)
}
