'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { CategorySchema, CategoryNameSchema } from '@/utils/validation'

export async function addCategory(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const parsed = CategorySchema.safeParse({
        name: (formData.get('name') as string ?? '').trim(),
        type: formData.get('type') as string,
    })
    if (!parsed.success) return

    const { name, type } = parsed.data
    await supabase.from('categories').insert({ name, type, is_active: true })
    revalidatePath('/categories')
    redirect('/categories')
}

export async function updateCategoryName(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const parsed = CategoryNameSchema.safeParse({
        id: formData.get('id') as string,
        name: (formData.get('name') as string ?? '').trim(),
    })
    if (!parsed.success) {
        redirect('/categories')
        return
    }

    const { id, name } = parsed.data
    await supabase.from('categories').update({ name }).eq('id', id)
    revalidatePath('/categories')
    redirect('/categories')
}

export async function toggleCategoryActive(id: string, currentActive: boolean) {
    const supabase = await createClient()
    await supabase.from('categories').update({ is_active: !currentActive }).eq('id', id)
    revalidatePath('/categories')
}
