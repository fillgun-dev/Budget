'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { SharedLinkSchema } from '@/utils/validation'

export async function createSharedLink(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const parsed = SharedLinkSchema.safeParse({
        start_date: formData.get('start_date') as string,
        end_date: formData.get('end_date') as string,
        expiry: formData.get('expiry') as string,
        show_income: formData.get('show_income') === 'on',
        show_summary: formData.get('show_summary') === 'on',
        show_stacked_chart: formData.get('show_stacked_chart') === 'on',
        display_currency: formData.get('display_currency') as string,
    })
    if (!parsed.success) return

    const { start_date, end_date, expiry, show_income, show_summary, show_stacked_chart, display_currency } = parsed.data

    // 추측 불가한 랜덤 토큰 생성
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')

    let expires_at: string | null = null
    if (expiry === '30') {
        const d = new Date()
        d.setDate(d.getDate() + 30)
        expires_at = d.toISOString()
    } else if (expiry === '90') {
        const d = new Date()
        d.setDate(d.getDate() + 90)
        expires_at = d.toISOString()
    }

    await supabase.from('shared_links').insert({
        id: token,
        created_by: user.id,
        start_date,
        end_date,
        expires_at,
        show_income,
        show_summary,
        show_stacked_chart,
        display_currency,
    })

    revalidatePath('/report')
}

export async function deleteSharedLink(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    await supabase.from('shared_links').delete().eq('id', id).eq('created_by', user.id)
    revalidatePath('/report')
}
