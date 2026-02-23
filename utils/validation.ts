import { z } from 'zod'

// ── 공통 ──────────────────────────────────────────────────
const uuid = z.string().uuid('유효하지 않은 ID입니다.')
const optionalUuid = z.string().uuid('유효하지 않은 ID입니다.').optional().nullable()

// ── 거래 내역 ──────────────────────────────────────────────
export const TransactionSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다.'),
    type: z.enum(['expense', 'income'], { message: '지출 또는 수입을 선택해주세요.' }),
    category_id: uuid,
    currency: z.string().min(1).max(10),
    original_amount: z.number({ error: '금액을 입력해주세요.' }).positive('금액은 0보다 커야 합니다.').finite(),
    exchange_rate: z.number().positive().finite().default(1),
    krw_amount: z.number({ error: '원화 금액을 입력해주세요.' }).positive('원화 금액은 0보다 커야 합니다.').finite(),
    try_amount: z.number().positive().finite().optional().nullable(),
    content: z.string().min(1, '내용을 입력해주세요.').max(200, '내용은 200자 이내로 입력해주세요.').trim(),
    payment_method_id: optionalUuid,
    memo: z.string().max(500, '메모는 500자 이내로 입력해주세요.').trim().optional().nullable(),
})

// ── 카테고리 ───────────────────────────────────────────────
export const CategorySchema = z.object({
    name: z.string().min(1, '항목명을 입력해주세요.').max(50, '항목명은 50자 이내로 입력해주세요.').trim(),
    type: z.enum(['expense', 'income'], { message: '지출 또는 수입을 선택해주세요.' }),
})

export const CategoryNameSchema = z.object({
    id: uuid,
    name: z.string().min(1, '항목명을 입력해주세요.').max(50, '항목명은 50자 이내로 입력해주세요.').trim(),
})

// ── 결제수단 ───────────────────────────────────────────────
export const PaymentMethodSchema = z.object({
    name: z.string().min(1, '결제수단명을 입력해주세요.').max(50, '결제수단명은 50자 이내로 입력해주세요.').trim(),
})

export const PaymentMethodNameSchema = z.object({
    id: uuid,
    name: z.string().min(1, '결제수단명을 입력해주세요.').max(50, '결제수단명은 50자 이내로 입력해주세요.').trim(),
})

// ── 예산 ──────────────────────────────────────────────────
export const BudgetSchema = z.object({
    category_id: uuid,
    amount: z.number().min(0, '금액은 0 이상이어야 합니다.').finite(),
    year: z.string().regex(/^\d{4}$/, '연도 형식이 올바르지 않습니다.'),
    month: z.string().regex(/^([1-9]|1[0-2])$/, '월 형식이 올바르지 않습니다.'),
})

// ── 공유 링크 ──────────────────────────────────────────────
export const SharedLinkSchema = z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '시작 날짜 형식이 올바르지 않습니다.'),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '종료 날짜 형식이 올바르지 않습니다.'),
    expiry: z.enum(['30', '90', 'never']).default('never'),
    show_income: z.boolean().default(true),
    show_summary: z.boolean().default(true),
    show_stacked_chart: z.boolean().default(true),
    display_currency: z.enum(['KRW', 'TRY']).default('KRW'),
}).refine(d => d.start_date <= d.end_date, { message: '시작일은 종료일보다 이전이어야 합니다.' })
