import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/login/actions'
import { LogOut, LayoutDashboard, FileText, Wallet, BarChart2, CreditCard, UserCog, Zap } from 'lucide-react'
import Link from 'next/link'
import { headers } from 'next/headers'
import SettingsDropdown from './SettingsDropdown'

export default async function Header() {
    // 공유 링크 페이지에서는 헤더 숨김
    const headersList = await headers()
    const pathname = headersList.get('x-pathname') ?? ''
    if (pathname.startsWith('/share/')) return null

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    return (
        <header className="bg-indigo-600 shadow-md">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="flex items-center gap-2 font-bold text-white text-xl">
                            <span className="bg-white text-indigo-600 rounded p-1">💰</span>
                            가계부
                        </Link>
                        {/* 데스크톱 nav: 4개 항목 (설정은 드롭다운) */}
                        <nav className="hidden md:flex items-center gap-1">
                            <Link href="/" className="flex items-center text-indigo-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                대시보드
                            </Link>
                            <Link href="/report" className="flex items-center text-indigo-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                                <FileText className="w-4 h-4 mr-2" />
                                보고서
                            </Link>
                            <SettingsDropdown />
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <form action={logout}>
                            <button type="submit" className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-2 rounded-md text-sm transition-colors">
                                <LogOut className="w-4 h-4" />
                                <span>로그아웃</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* 모바일 탭바: 주요 3개 + 설정 3개 (스크롤) */}
            <div className="md:hidden flex overflow-x-auto gap-1 px-3 py-1.5 bg-indigo-700 scrollbar-hide">
                <Link href="/" className="flex items-center text-indigo-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap">
                    <LayoutDashboard className="w-4 h-4 mr-1.5" />
                    대시보드
                </Link>
                <Link href="/report" className="flex items-center text-indigo-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap">
                    <FileText className="w-4 h-4 mr-1.5" />
                    보고서
                </Link>
                {/* 구분선 */}
                <span className="w-px bg-indigo-500 self-stretch my-1.5 mx-1" />
                <Link href="/categories" className="flex items-center text-indigo-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap">
                    <Wallet className="w-4 h-4 mr-1.5" />
                    항목 관리
                </Link>
                <Link href="/budget" className="flex items-center text-indigo-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap">
                    <BarChart2 className="w-4 h-4 mr-1.5" />
                    예산 관리
                </Link>
                <Link href="/payment-methods" className="flex items-center text-indigo-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap">
                    <CreditCard className="w-4 h-4 mr-1.5" />
                    결제수단
                </Link>
                <Link href="/templates" className="flex items-center text-indigo-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap">
                    <Zap className="w-4 h-4 mr-1.5" />
                    빠른 내역
                </Link>
                <Link href="/settings" className="flex items-center text-indigo-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap">
                    <UserCog className="w-4 h-4 mr-1.5" />
                    개인 설정
                </Link>
            </div>
        </header>
    )
}
