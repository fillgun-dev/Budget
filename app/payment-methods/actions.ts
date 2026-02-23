'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { PaymentMethodSchema, PaymentMethodNameSchema } from '@/utils/validation'

export async function addPaymentMethod(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const parsed = PaymentMethodSchema.safeParse({
        name: (formData.get('name') as string ?? '').trim(),
    })
    if (!parsed.success) return

    await supabase.from('payment_methods').insert({ name: parsed.data.name, is_active: true })
    revalidatePath('/payment-methods')
    redirect('/payment-methods')
}

export async function updatePaymentMethodName(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const parsed = PaymentMethodNameSchema.safeParse({
        id: formData.get('id') as string,
        name: (formData.get('name') as string ?? '').trim(),
    })
    if (!parsed.success) {
        redirect('/payment-methods')
        return
    }

    const { id, name } = parsed.data
    await supabase.from('payment_methods').update({ name }).eq('id', id)
    revalidatePath('/payment-methods')
    redirect('/payment-methods')
}

export async function togglePaymentMethodActive(id: string, currentActive: boolean) {
    const supabase = await createClient()
    await supabase.from('payment_methods').update({ is_active: !currentActive }).eq('id', id)
    revalidatePath('/payment-methods')
}
