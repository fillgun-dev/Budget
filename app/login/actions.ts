'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    console.log("---- LOGIN ACTION TRIGGERED ----")
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect('/login?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    console.log("---- SIGNUP ACTION TRIGGERED ----")
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    console.log("Attempting to sign up email:", data.email)

    try {
        const { data: authData, error } = await supabase.auth.signUp(data)

        console.log("Signup response authData:", authData)
        console.log("Signup response error:", error)

        if (error) {
            console.log("Redirecting to error page")
            redirect('/signup?error=' + encodeURIComponent(error.message))
        }

        // If user signs up but email confirmation is active in Supabase, there is no session yet
        if (!authData.session) {
            console.log("Redirecting to email confirmation message")
            redirect('/signup?message=' + encodeURIComponent('가입 완료! 이메일을 확인하여 계정을 인증해주세요.'))
        }

        // public.users 동기화
        if (authData.user) {
            await supabase.from('users').upsert(
                { id: authData.user.id, email: authData.user.email!, role: 'admin' },
                { onConflict: 'id', ignoreDuplicates: true }
            )
        }

        console.log("Signup success, redirecting to home")
        revalidatePath('/', 'layout')
        redirect('/')
    } catch (err) {
        console.error("UNHANDLED EXCEPTION IN SIGNUP:", err)
        throw err;
    }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
