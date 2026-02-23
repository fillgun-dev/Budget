#!/usr/bin/env python3
"""
마이그레이션 스크립트: 하늘나라 해달별 재정.csv → Supabase
────────────────────────────────────────────────────────────
환율 전략:
  - 2022~2025: 월별 범위 쿼리 (1번 호출 = 해당 월 전체 영업일 환율)
  - 2026:      일별 정확 쿼리

실행 방법:
  python3 scripts/migrate.py          ← 미리보기 (dry-run, DB 저장 안 함)
  python3 scripts/migrate.py --insert ← 실제 Supabase 삽입
"""

import csv
import json
import os
import sys
import time
import urllib.request
import urllib.parse
from datetime import date, timedelta

# ────────────────────────────────────────────────
# 환경 변수 로드 (.env.local)
# ────────────────────────────────────────────────
def load_env(filepath='.env.local'):
    env = {}
    try:
        with open(filepath, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, _, val = line.partition('=')
                env[key.strip()] = val.strip().strip('"').strip("'")
    except FileNotFoundError:
        print(f"⚠️  {filepath} 파일 없음 — 시스템 환경 변수 사용")
    return env

env = load_env()
SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
SERVICE_KEY  = env.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')

if not SUPABASE_URL or not SERVICE_KEY:
    print("❌ .env.local 에서 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 를 읽지 못했습니다.")
    sys.exit(1)

AUTH_HEADERS = {
    'apikey':        SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
}

# ────────────────────────────────────────────────
# HTTP 유틸
# ────────────────────────────────────────────────
BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'

def http_get(url, headers=None):
    h = {'User-Agent': BROWSER_UA}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=20) as res:
        return json.loads(res.read().decode('utf-8'))

def http_post(url, data, headers):
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers=headers, method='POST')
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.status

def supabase_select(table, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if params:
        url += '?' + urllib.parse.urlencode(params)
    return http_get(url, AUTH_HEADERS)

def supabase_insert(table, rows):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    http_post(url, rows, AUTH_HEADERS)

# ────────────────────────────────────────────────
# Supabase: 유저 조회
# ────────────────────────────────────────────────
def get_user_id():
    url = f"{SUPABASE_URL}/auth/v1/admin/users?per_page=50"
    data = http_get(url, {
        'apikey':        SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
    })
    users = data.get('users', [])
    if not users:
        print("❌ Supabase에 등록된 유저가 없습니다.")
        sys.exit(1)

    # --user=이메일 플래그로 특정 유저 지정 가능
    target_email = None
    for arg in sys.argv:
        if arg.startswith('--user='):
            target_email = arg.split('=', 1)[1]

    if target_email:
        for u in users:
            if u['email'] == target_email:
                print(f"✅ 유저: {u['email']}")
                return u['id']
        print(f"❌ '{target_email}' 유저를 찾을 수 없습니다.")
        sys.exit(1)

    if len(users) == 1:
        print(f"✅ 유저: {users[0]['email']}")
        return users[0]['id']

    # 여러 유저 — test 계정 제외하고 첫 번째 선택
    print("등록된 유저 목록:")
    for i, u in enumerate(users):
        print(f"  [{i}] {u['email']}")
    real_users = [u for u in users if 'test' not in u['email'].lower()]
    chosen = real_users[0] if real_users else users[0]
    print(f"✅ 자동 선택: {chosen['email']}")
    print(f"   다른 유저를 사용하려면: python3 scripts/migrate.py --user=이메일주소")
    return chosen['id']

# ────────────────────────────────────────────────
# Supabase: 카테고리 로드
# ────────────────────────────────────────────────
def get_categories():
    data = supabase_select('categories', {'select': 'id,name,type'})
    cat_map = {}
    for c in data:
        cat_map[c['name']] = {'id': c['id'], 'type': c['type']}
    print(f"✅ 카테고리 {len(cat_map)}개 로드: {', '.join(cat_map.keys())}")
    return cat_map

# ────────────────────────────────────────────────
# 환율 수집: frankfurter.app
# ────────────────────────────────────────────────
def fetch_monthly_rates(year, month):
    """월별 범위 쿼리 → 해당 월 전체 영업일 TRY→KRW 환율 반환"""
    m = str(month).zfill(2)
    last_day = (date(year, month % 12 + 1, 1) - timedelta(days=1)).day if month < 12 else 31
    url = f"https://api.frankfurter.app/{year}-{m}-01..{year}-{m}-{last_day}?from=TRY&to=KRW"
    try:
        data = http_get(url)
        result = {}
        for d, r in data.get('rates', {}).items():
            result[d] = r.get('KRW', 0)
        return result
    except Exception as e:
        print(f"    ⚠️  실패: {e}")
        return {}

def fetch_daily_rate(date_str):
    """일별 쿼리 → 특정 날짜 TRY→KRW 환율 반환 (주말이면 직전 영업일)"""
    url = f"https://api.frankfurter.app/{date_str}?from=TRY&to=KRW"
    try:
        data = http_get(url)
        actual_date = data.get('date', date_str)
        rate = data.get('rates', {}).get('KRW', 0)
        return actual_date, rate
    except Exception as e:
        print(f"    ⚠️  {date_str} 실패: {e}")
        return date_str, 0

def get_rate_for_date(date_str, all_rates):
    """날짜에 맞는 환율 반환. 주말/공휴일이면 직전 영업일 환율 사용"""
    if date_str in all_rates:
        return all_rates[date_str]
    # 직전 영업일 검색
    sorted_dates = sorted(all_rates.keys())
    closest = sorted_dates[0]
    for d in sorted_dates:
        if d <= date_str:
            closest = d
        else:
            break
    return all_rates.get(closest, 0)

# ────────────────────────────────────────────────
# 메인
# ────────────────────────────────────────────────
def main():
    dry_run = '--insert' not in sys.argv
    print("=" * 55)
    print(f"  마이그레이션 {'[미리보기 — DB 저장 안 함]' if dry_run else '[실제 삽입]'}")
    print("=" * 55)
    print()

    # ── 1. 유저 ──
    print("👤 유저 조회...")
    user_id = get_user_id()
    print()

    # ── 2. 카테고리 ──
    print("📂 카테고리 로드...")
    cat_map = get_categories()
    print()

    # ── 3. CSV 로드 ──
    print("📄 CSV 로드...")
    csv_path = 'Docs/하늘나라 해달별 재정.csv'
    with open(csv_path, encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))
    print(f"✅ {len(rows)}건 로드\n")

    # ── 4. 환율 수집 ──
    print("💱 환율 수집 시작...")
    all_rates = {}

    # 2022~2025: 월별 범위 쿼리
    print("\n  [2022~2025] 월별 범위 쿼리")
    for year in range(2022, 2026):
        start_month = 5 if year == 2022 else 1
        for month in range(start_month, 13):
            label = f"{year}-{str(month).zfill(2)}"
            print(f"    {label} 조회...", end='', flush=True)
            rates = fetch_monthly_rates(year, month)
            all_rates.update(rates)
            print(f" {len(rates)}개 영업일")
            time.sleep(0.25)   # API 속도 제한 배려

    # 2026: 일별 쿼리
    dates_2026 = sorted(set(r['날짜'] for r in rows if r['날짜'].startswith('2026')))
    print(f"\n  [2026] 일별 쿼리 {len(dates_2026)}건")
    for date_str in dates_2026:
        actual, rate = fetch_daily_rate(date_str)
        all_rates[date_str] = rate
        if actual != date_str:
            all_rates[actual] = rate   # 영업일 날짜도 저장
        weekend_note = f" (→ {actual} 적용)" if actual != date_str else ""
        print(f"    {date_str}: {rate:.4f} KRW/TRY{weekend_note}")
        time.sleep(0.15)

    print(f"\n✅ 총 {len(all_rates)}개 날짜 환율 수집 완료\n")

    # ── 5. CSV → 트랜잭션 변환 ──
    print("🔄 데이터 변환...")
    transactions = []
    skipped = []

    # 카테고리 타입별 첫 번째 ID (빈 구분 fallback용)
    fallback_expense_id = next((v['id'] for v in cat_map.values() if v['type'] == 'expense'), None)
    fallback_income_id  = next((v['id'] for v in cat_map.values() if v['type'] == 'income'), None)

    for row in rows:
        date_str      = row['날짜'].strip()
        type_ko       = row['항목'].strip()
        category_name = row['구분'].strip()
        amount_str    = row['금액'].replace(',', '').strip()
        content       = row['내용'].strip()
        memo          = row['설명'].strip()

        # 필수 필드 검증
        if not date_str or not content:
            skipped.append({**row, '_reason': '날짜 또는 내용 없음'})
            continue
        if not amount_str or float(amount_str or '0') <= 0:
            skipped.append({**row, '_reason': '금액 없음 또는 0'})
            continue

        try:
            original_amount = float(amount_str)
        except ValueError:
            skipped.append({**row, '_reason': f'금액 파싱 오류: {amount_str}'})
            continue

        tx_type = 'income' if type_ko == '수입' else 'expense'

        # 카테고리 별칭 매핑 (CSV 구분명 → 앱 카테고리명)
        CATEGORY_ALIAS = {
            '통신비': '공과금',
        }

        # 카테고리 매핑
        category_id = None
        lookup_name = CATEGORY_ALIAS.get(category_name, category_name)
        if lookup_name and lookup_name in cat_map:
            category_id = cat_map[lookup_name]['id']
        else:
            # 빈 구분 → 타입에 맞는 fallback
            category_id = fallback_income_id if tx_type == 'income' else fallback_expense_id

        if not category_id:
            skipped.append({**row, '_reason': '카테고리 없음'})
            continue

        # 환율 적용
        exchange_rate = get_rate_for_date(date_str, all_rates)
        try_amount    = round(original_amount, 2)
        krw_amount    = round(original_amount * exchange_rate)

        transactions.append({
            'user_id':         user_id,
            'date':            date_str,
            'type':            tx_type,
            'category_id':     category_id,
            'currency':        'TRY',
            'original_amount': original_amount,
            'exchange_rate':   round(exchange_rate, 4),
            'try_amount':      try_amount,
            'krw_amount':      krw_amount,
            'content':         content,
            'memo':            memo or None,
        })

    print(f"✅ 변환 완료: {len(transactions)}건  |  스킵: {len(skipped)}건\n")

    # 스킵 항목 출력
    if skipped:
        print("⚠️  스킵된 항목 (최대 10건):")
        for r in skipped[:10]:
            print(f"    {r.get('날짜')} | {r.get('항목')} | {r.get('내용')} | 사유: {r.get('_reason')}")
        if len(skipped) > 10:
            print(f"    ... 외 {len(skipped) - 10}건")
        print()

    # 변환 샘플 미리보기
    print("📋 변환 샘플 (첫 10건):")
    print(f"  {'날짜':<12} {'구분':<6} {'TRY금액':>10} {'환율':>8} {'KRW환산':>12}  내용")
    print("  " + "-" * 65)
    for t in transactions[:10]:
        print(f"  {t['date']:<12} {t['type']:<6} {t['original_amount']:>10.2f} "
              f"{t['exchange_rate']:>8.4f} {t['krw_amount']:>12,}  {t['content'][:20]}")
    print()

    # ── dry-run 종료 ──
    if dry_run:
        print("─" * 55)
        print(f"ℹ️  미리보기 완료. 총 {len(transactions)}건 삽입 예정.")
        print("   실제 삽입하려면:")
        print("   python3 scripts/migrate.py --insert")
        print("─" * 55)
        return

    # ── 6. Supabase INSERT (배치 100건) ──
    print("💾 Supabase INSERT 시작...")
    BATCH_SIZE = 100
    inserted = 0

    for i in range(0, len(transactions), BATCH_SIZE):
        batch = transactions[i:i + BATCH_SIZE]
        try:
            supabase_insert('transactions', batch)
            inserted += len(batch)
            print(f"  ✅ {inserted:>5} / {len(transactions)}건 삽입")
        except Exception as e:
            print(f"\n  ❌ 배치 {i}~{i + BATCH_SIZE} 실패: {e}")
            print(f"     {inserted}건까지 삽입 완료 후 중단됨.")
            sys.exit(1)

    print()
    print("=" * 55)
    print(f"🎉 마이그레이션 완료! 총 {inserted}건 삽입됨")
    print("=" * 55)


if __name__ == '__main__':
    main()
