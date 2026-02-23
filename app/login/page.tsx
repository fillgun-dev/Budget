import { login } from './actions'
import Link from 'next/link'

export default async function LoginPage(
    props: {
        searchParams: Promise<{ error?: string, message?: string }>
    }
) {
    const searchParams = await props.searchParams;
    return (
        <div className="flex min-h-[80vh] flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        가계부 앱
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                        계정이 없으신가요?{' '}
                        <Link
                            href="/signup"
                            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                        >
                            회원가입
                        </Link>
                    </p>
                </div>
                <form className="mt-8 space-y-6">
                    <div className="-space-y-px rounded-md shadow-sm">
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                이메일
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="relative block w-full rounded-t-md border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
                                placeholder="이메일"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                비밀번호
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="relative block w-full rounded-b-md border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
                                placeholder="비밀번호"
                            />
                        </div>
                    </div>

                    {searchParams?.error && (
                        <p className="mt-4 text-center text-sm text-red-500 bg-red-100/10 p-2 rounded">
                            {searchParams.error}
                        </p>
                    )}

                    {searchParams?.message && (
                        <p className="mt-4 text-center text-sm text-green-600 bg-green-100/10 p-2 rounded">
                            {searchParams.message}
                        </p>
                    )}

                    <button
                        type="submit"
                        formAction={login}
                        className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        로그인
                    </button>
                </form>

                {/* 데모 체험 */}
                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-4 text-center">
                    <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                        🎯 데모 계정으로 체험해보세요
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        2024년~2026년 샘플 데이터가 미리 입력되어 있습니다
                    </p>
                    <form action={login}>
                        <input type="hidden" name="email" value="demo@budget-live.app" />
                        <input type="hidden" name="password" value="Demo1234!" />
                        <button
                            type="submit"
                            className="w-full rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
                        >
                            데모로 바로 체험하기 →
                        </button>
                    </form>
                    <p className="mt-2 text-xs text-gray-400">
                        demo@budget-live.app · Demo1234!
                    </p>
                </div>
            </div>
        </div>
    )
}
