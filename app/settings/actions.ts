'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const DisplayNameSchema = z.object({
    display_name: z.string().max(50, '이름은 50자 이내로 입력해주세요.').trim(),
})

export async function updateDisplayName(
    _prevState: { error?: string; success?: boolean },
    formData: FormData
): Promise<{ error?: string; success?: boolean }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const parsed = DisplayNameSchema.safeParse({
        display_name: formData.get('display_name') as string ?? '',
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const { error } = await supabase
        .from('users')
        .update({ display_name: parsed.data.display_name || null })
        .eq('id', user.id)

    if (error) return { error: '저장에 실패했습니다.' }

    revalidatePath('/settings')
    revalidatePath('/report')
    return { success: true }
}
