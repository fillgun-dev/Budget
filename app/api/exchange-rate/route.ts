import { NextRequest, NextResponse } from 'next/server'

// Free currency API (no API key required)
// https://github.com/fawazahmed0/exchange-api
const BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')?.toLowerCase()
    const to = (searchParams.get('to') ?? 'krw').toLowerCase()
    const date = searchParams.get('date') ?? 'latest'

    if (!from) {
        return NextResponse.json({ error: 'from 파라미터가 필요합니다' }, { status: 400 })
    }

    if (from === to) {
        return NextResponse.json({ rate: 1, date })
    }

    try {
        // Try requested date first, fall back to latest
        const url = date === 'latest'
            ? `${BASE_URL}@latest/v1/currencies/${from}.json`
            : `${BASE_URL}@${date}/v1/currencies/${from}.json`

        const res = await fetch(url, { next: { revalidate: 3600 } }) // cache 1 hour
        if (!res.ok) throw new Error('rate fetch failed')

        const data = await res.json()
        const rate = data[from]?.[to]

        if (!rate) {
            return NextResponse.json({ error: `${from.toUpperCase()} → ${to.toUpperCase()} 환율을 찾을 수 없습니다` }, { status: 404 })
        }

        return NextResponse.json({ rate: Math.round(rate * 10000) / 10000, date: data.date })
    } catch {
        // Fallback: try latest if date-specific failed
        try {
            const fallbackRes = await fetch(`${BASE_URL}@latest/v1/currencies/${from}.json`)
            const fallbackData = await fallbackRes.json()
            const rate = fallbackData[from]?.[to]
            if (!rate) throw new Error('no rate')
            return NextResponse.json({ rate: Math.round(rate * 10000) / 10000, date: fallbackData.date })
        } catch {
            return NextResponse.json({ error: '환율 정보를 가져오지 못했습니다' }, { status: 500 })
        }
    }
}
