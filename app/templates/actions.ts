'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function createTemplate(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const name = (formData.get('name') as string)?.trim()
    const type = formData.get('type') as string
    const category_id = (formData.get('category_id') as string) || null
    const currency = (formData.get('currency') as string) || 'KRW'
    const rawAmount = formData.get('default_amount') as string
    const default_amount = rawAmount && parseFloat(rawAmount) > 0 ? parseFloat(rawAmount) : null

    if (!name || !type) return

    await supabase.from('transaction_templates').insert({
        user_id: user.id,
        name,
        type,
        category_id,
        currency,
        default_amount,
    })

    revalidatePath('/templates')
    revalidatePath('/transactions/new')
}

export async function deleteTemplate(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    await supabase.from('transaction_templates').delete().eq('id', id).eq('user_id', user.id)
    revalidatePath('/templates')
    revalidatePath('/transactions/new')
}
