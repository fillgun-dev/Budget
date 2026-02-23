import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', user.id)
        .single()

    return (
        <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">개인 설정</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">프로필 정보를 관리합니다.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">프로필</h2>
                <SettingsForm
                    email={user.email ?? ''}
                    displayName={profile?.display_name ?? null}
                />
            </div>
        </main>
    )
}
