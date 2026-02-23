-- ============================================================
-- BUDGET_Live 데모 데이터 시드
-- 2024-01 ~ 2026-02 (26개월, 약 480건)
--
-- 실행 전 준비:
-- 1. Supabase Auth > Users 에서 데모 계정 생성
--    이메일: demo@budget-live.app / 비밀번호: Demo1234!
-- 2. 생성된 사용자의 UUID를 아래 demo_user_id 변수에 입력
-- ============================================================

DO $$
DECLARE
  demo_user_id UUID := 'REPLACE_WITH_YOUR_DEMO_USER_UUID';

  -- 카테고리 ID
  cat_food       UUID;   -- 식비
  cat_dining     UUID;   -- 외식
  cat_transport  UUID;   -- 교통비
  cat_util       UUID;   -- 공과금
  cat_phone      UUID;   -- 통신비
  cat_medical    UUID;   -- 의료/건강
  cat_shopping   UUID;   -- 쇼핑/의류
  cat_edu        UUID;   -- 교육
  cat_leisure    UUID;   -- 여가/문화
  cat_other_exp  UUID;   -- 기타지출
  cat_salary     UUID;   -- 급여
  cat_side       UUID;   -- 부수입

  -- 결제수단 ID
  pm_card     UUID;   -- 신용카드
  pm_cash     UUID;   -- 현금
  pm_transfer UUID;   -- 계좌이체
  pm_kakao    UUID;   -- 카카오페이

BEGIN

-- ============================================================
-- 1. public.users 동기화
-- ============================================================
INSERT INTO public.users (id, email, role, display_name)
VALUES (demo_user_id, 'demo@budget-live.app', 'admin', '데모 가계부')
ON CONFLICT (id) DO UPDATE SET display_name = '데모 가계부';

-- ============================================================
-- 2. 카테고리
-- ============================================================
INSERT INTO categories (type, name) VALUES ('expense', '식비')        RETURNING id INTO cat_food;
INSERT INTO categories (type, name) VALUES ('expense', '외식')        RETURNING id INTO cat_dining;
INSERT INTO categories (type, name) VALUES ('expense', '교통비')      RETURNING id INTO cat_transport;
INSERT INTO categories (type, name) VALUES ('expense', '공과금')      RETURNING id INTO cat_util;
INSERT INTO categories (type, name) VALUES ('expense', '통신비')      RETURNING id INTO cat_phone;
INSERT INTO categories (type, name) VALUES ('expense', '의료/건강')   RETURNING id INTO cat_medical;
INSERT INTO categories (type, name) VALUES ('expense', '쇼핑/의류')   RETURNING id INTO cat_shopping;
INSERT INTO categories (type, name) VALUES ('expense', '교육')        RETURNING id INTO cat_edu;
INSERT INTO categories (type, name) VALUES ('expense', '여가/문화')   RETURNING id INTO cat_leisure;
INSERT INTO categories (type, name) VALUES ('expense', '기타')        RETURNING id INTO cat_other_exp;
INSERT INTO categories (type, name) VALUES ('income',  '급여')        RETURNING id INTO cat_salary;
INSERT INTO categories (type, name) VALUES ('income',  '부수입')      RETURNING id INTO cat_side;

-- ============================================================
-- 3. 결제수단
-- ============================================================
INSERT INTO payment_methods (name) VALUES ('신용카드') RETURNING id INTO pm_card;
INSERT INTO payment_methods (name) VALUES ('현금')     RETURNING id INTO pm_cash;
INSERT INTO payment_methods (name) VALUES ('계좌이체') RETURNING id INTO pm_transfer;
INSERT INTO payment_methods (name) VALUES ('카카오페이') RETURNING id INTO pm_kakao;

-- ============================================================
-- 4. 거래 데이터 (2024-01 ~ 2026-02)
-- ============================================================

-- ── 2024년 1월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2024-01-02','income',cat_salary,pm_transfer,'KRW',3750000,1,3750000,'1월 급여'),
(demo_user_id,'2024-01-05','expense',cat_food,pm_card,'KRW',87000,1,87000,'이마트 장보기'),
(demo_user_id,'2024-01-08','expense',cat_phone,pm_transfer,'KRW',98000,1,98000,'인터넷+핸드폰 요금'),
(demo_user_id,'2024-01-10','expense',cat_dining,pm_card,'KRW',45000,1,45000,'가족 외식'),
(demo_user_id,'2024-01-12','expense',cat_transport,pm_kakao,'KRW',52000,1,52000,'주유비'),
(demo_user_id,'2024-01-14','expense',cat_food,pm_card,'KRW',63000,1,63000,'홈플러스 장보기'),
(demo_user_id,'2024-01-15','expense',cat_util,pm_transfer,'KRW',48000,1,48000,'전기세'),
(demo_user_id,'2024-01-15','expense',cat_util,pm_transfer,'KRW',32000,1,32000,'수도세'),
(demo_user_id,'2024-01-16','expense',cat_edu,pm_transfer,'KRW',230000,1,230000,'학원비'),
(demo_user_id,'2024-01-18','expense',cat_dining,pm_kakao,'KRW',28000,1,28000,'점심 식사'),
(demo_user_id,'2024-01-20','expense',cat_food,pm_card,'KRW',54000,1,54000,'코스트코 장보기'),
(demo_user_id,'2024-01-22','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2024-01-25','expense',cat_shopping,pm_card,'KRW',89000,1,89000,'겨울 의류 구입'),
(demo_user_id,'2024-01-28','expense',cat_dining,pm_cash,'KRW',35000,1,35000,'저녁 외식'),
(demo_user_id,'2024-01-30','expense',cat_util,pm_transfer,'KRW',65000,1,65000,'도시가스');

-- ── 2024년 2월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2024-02-01','income',cat_salary,pm_transfer,'KRW',3750000,1,3750000,'2월 급여'),
(demo_user_id,'2024-02-03','expense',cat_food,pm_card,'KRW',92000,1,92000,'설 명절 장보기'),
(demo_user_id,'2024-02-05','expense',cat_shopping,pm_card,'KRW',145000,1,145000,'설 선물 구입'),
(demo_user_id,'2024-02-07','expense',cat_phone,pm_transfer,'KRW',98000,1,98000,'인터넷+핸드폰 요금'),
(demo_user_id,'2024-02-10','expense',cat_dining,pm_card,'KRW',68000,1,68000,'가족 외식 (설날)'),
(demo_user_id,'2024-02-12','expense',cat_transport,pm_kakao,'KRW',58000,1,58000,'주유비'),
(demo_user_id,'2024-02-14','expense',cat_food,pm_card,'KRW',71000,1,71000,'마트 장보기'),
(demo_user_id,'2024-02-15','expense',cat_util,pm_transfer,'KRW',82000,1,82000,'전기세 (난방)'),
(demo_user_id,'2024-02-15','expense',cat_util,pm_transfer,'KRW',75000,1,75000,'도시가스 (난방)'),
(demo_user_id,'2024-02-16','expense',cat_edu,pm_transfer,'KRW',230000,1,230000,'학원비'),
(demo_user_id,'2024-02-20','expense',cat_medical,pm_cash,'KRW',35000,1,35000,'내과 진료'),
(demo_user_id,'2024-02-22','expense',cat_leisure,pm_card,'KRW',42000,1,42000,'영화 관람'),
(demo_user_id,'2024-02-25','expense',cat_food,pm_kakao,'KRW',48000,1,48000,'온라인 식품 주문'),
(demo_user_id,'2024-02-27','expense',cat_transport,pm_card,'KRW',30000,1,30000,'교통카드 충전');

-- ── 2024년 3월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2024-03-01','income',cat_salary,pm_transfer,'KRW',3800000,1,3800000,'3월 급여'),
(demo_user_id,'2024-03-04','expense',cat_food,pm_card,'KRW',78000,1,78000,'이마트 장보기'),
(demo_user_id,'2024-03-05','expense',cat_phone,pm_transfer,'KRW',98000,1,98000,'인터넷+핸드폰 요금'),
(demo_user_id,'2024-03-07','expense',cat_edu,pm_transfer,'KRW',230000,1,230000,'학원비'),
(demo_user_id,'2024-03-09','expense',cat_transport,pm_kakao,'KRW',55000,1,55000,'주유비'),
(demo_user_id,'2024-03-12','expense',cat_dining,pm_card,'KRW',52000,1,52000,'외식'),
(demo_user_id,'2024-03-14','expense',cat_shopping,pm_card,'KRW',112000,1,112000,'봄 옷 구입'),
(demo_user_id,'2024-03-15','expense',cat_util,pm_transfer,'KRW',55000,1,55000,'전기세'),
(demo_user_id,'2024-03-15','expense',cat_util,pm_transfer,'KRW',32000,1,32000,'수도세'),
(demo_user_id,'2024-03-18','expense',cat_food,pm_card,'KRW',65000,1,65000,'홈플러스 장보기'),
(demo_user_id,'2024-03-20','income',cat_side,pm_transfer,'KRW',200000,1,200000,'프리랜서 수입'),
(demo_user_id,'2024-03-22','expense',cat_leisure,pm_card,'KRW',55000,1,55000,'콘서트 티켓'),
(demo_user_id,'2024-03-25','expense',cat_dining,pm_kakao,'KRW',33000,1,33000,'점심 약속'),
(demo_user_id,'2024-03-28','expense',cat_transport,pm_card,'KRW',38000,1,38000,'주유비'),
(demo_user_id,'2024-03-30','expense',cat_util,pm_transfer,'KRW',42000,1,42000,'도시가스');

-- ── 2024년 4월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2024-04-01','income',cat_salary,pm_transfer,'KRW',3800000,1,3800000,'4월 급여'),
(demo_user_id,'2024-04-03','expense',cat_food,pm_card,'KRW',82000,1,82000,'마트 장보기'),
(demo_user_id,'2024-04-05','expense',cat_phone,pm_transfer,'KRW',98000,1,98000,'인터넷+핸드폰 요금'),
(demo_user_id,'2024-04-07','expense',cat_edu,pm_transfer,'KRW',230000,1,230000,'학원비'),
(demo_user_id,'2024-04-10','expense',cat_dining,pm_card,'KRW',62000,1,62000,'가족 외식'),
(demo_user_id,'2024-04-12','expense',cat_transport,pm_kakao,'KRW',50000,1,50000,'주유비'),
(demo_user_id,'2024-04-15','expense',cat_util,pm_transfer,'KRW',38000,1,38000,'전기세 (봄철)'),
(demo_user_id,'2024-04-15','expense',cat_util,pm_transfer,'KRW',32000,1,32000,'수도세'),
(demo_user_id,'2024-04-17','expense',cat_food,pm_card,'KRW',59000,1,59000,'코스트코 장보기'),
(demo_user_id,'2024-04-19','expense',cat_leisure,pm_card,'KRW',78000,1,78000,'주말 나들이'),
(demo_user_id,'2024-04-22','expense',cat_medical,pm_cash,'KRW',28000,1,28000,'치과 진료'),
(demo_user_id,'2024-04-25','expense',cat_dining,pm_kakao,'KRW',41000,1,41000,'저녁 외식'),
(demo_user_id,'2024-04-28','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2024-04-30','expense',cat_util,pm_transfer,'KRW',28000,1,28000,'도시가스 (봄철)');

-- ── 2024년 5월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2024-05-02','income',cat_salary,pm_transfer,'KRW',3800000,1,3800000,'5월 급여'),
(demo_user_id,'2024-05-03','expense',cat_food,pm_card,'KRW',95000,1,95000,'어린이날 장보기'),
(demo_user_id,'2024-05-05','expense',cat_leisure,pm_card,'KRW',95000,1,95000,'어린이날 놀이공원'),
(demo_user_id,'2024-05-06','expense',cat_phone,pm_transfer,'KRW',98000,1,98000,'인터넷+핸드폰 요금'),
(demo_user_id,'2024-05-07','expense',cat_edu,pm_transfer,'KRW',230000,1,230000,'학원비'),
(demo_user_id,'2024-05-09','expense',cat_shopping,pm_card,'KRW',185000,1,185000,'어버이날 선물'),
(demo_user_id,'2024-05-12','expense',cat_transport,pm_kakao,'KRW',52000,1,52000,'주유비'),
(demo_user_id,'2024-05-14','expense',cat_dining,pm_card,'KRW',75000,1,75000,'어버이날 외식'),
(demo_user_id,'2024-05-15','expense',cat_util,pm_transfer,'KRW',35000,1,35000,'전기세'),
(demo_user_id,'2024-05-18','expense',cat_food,pm_card,'KRW',67000,1,67000,'마트 장보기'),
(demo_user_id,'2024-05-22','expense',cat_medical,pm_cash,'KRW',42000,1,42000,'내과 진료'),
(demo_user_id,'2024-05-25','expense',cat_food,pm_kakao,'KRW',53000,1,53000,'온라인 식품 주문'),
(demo_user_id,'2024-05-28','expense',cat_transport,pm_card,'KRW',30000,1,30000,'교통카드 충전'),
(demo_user_id,'2024-05-30','expense',cat_util,pm_transfer,'KRW',22000,1,22000,'도시가스');

-- ── 2024년 6월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2024-06-03','income',cat_salary,pm_transfer,'KRW',3800000,1,3800000,'6월 급여'),
(demo_user_id,'2024-06-04','expense',cat_food,pm_card,'KRW',88000,1,88000,'마트 장보기'),
(demo_user_id,'2024-06-05','expense',cat_phone,pm_transfer,'KRW',98000,1,98000,'인터넷+핸드폰 요금'),
(demo_user_id,'2024-06-07','expense',cat_edu,pm_transfer,'KRW',230000,1,230000,'학원비'),
(demo_user_id,'2024-06-10','expense',cat_transport,pm_kakao,'KRW',58000,1,58000,'주유비'),
(demo_user_id,'2024-06-12','expense',cat_dining,pm_card,'KRW',55000,1,55000,'외식'),
(demo_user_id,'2024-06-14','expense',cat_shopping,pm_card,'KRW',95000,1,95000,'여름 옷 구입'),
(demo_user_id,'2024-06-15','expense',cat_util,pm_transfer,'KRW',52000,1,52000,'전기세 (냉방 시작)'),
(demo_user_id,'2024-06-15','expense',cat_util,pm_transfer,'KRW',32000,1,32000,'수도세'),
(demo_user_id,'2024-06-18','expense',cat_food,pm_card,'KRW',72000,1,72000,'코스트코 장보기'),
(demo_user_id,'2024-06-20','income',cat_side,pm_transfer,'KRW',150000,1,150000,'부수입'),
(demo_user_id,'2024-06-22','expense',cat_leisure,pm_card,'KRW',65000,1,65000,'영화/문화생활'),
(demo_user_id,'2024-06-25','expense',cat_dining,pm_kakao,'KRW',38000,1,38000,'점심 약속'),
(demo_user_id,'2024-06-28','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2024-06-30','expense',cat_util,pm_transfer,'KRW',18000,1,18000,'도시가스');

-- ── 2024년 7월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2024-07-01','income',cat_salary,pm_transfer,'KRW',3850000,1,3850000,'7월 급여'),
(demo_user_id,'2024-07-03','expense',cat_food,pm_card,'KRW',93000,1,93000,'마트 장보기'),
(demo_user_id,'2024-07-05','expense',cat_phone,pm_transfer,'KRW',98000,1,98000,'인터넷+핸드폰 요금'),
(demo_user_id,'2024-07-07','expense',cat_edu,pm_transfer,'KRW',230000,1,230000,'학원비'),
(demo_user_id,'2024-07-09','expense',cat_leisure,pm_card,'KRW',185000,1,185000,'여름 휴가 경비'),
(demo_user_id,'2024-07-12','expense',cat_transport,pm_kakao,'KRW',75000,1,75000,'여행 주유비'),
(demo_user_id,'2024-07-14','expense',cat_dining,pm_card,'KRW',88000,1,88000,'휴가 외식'),
(demo_user_id,'2024-07-15','expense',cat_util,pm_transfer,'KRW',95000,1,95000,'전기세 (에어컨)'),
(demo_user_id,'2024-07-18','expense',cat_food,pm_card,'KRW',78000,1,78000,'홈플러스 장보기'),
(demo_user_id,'2024-07-20','expense',cat_shopping,pm_card,'KRW',68000,1,68000,'수영복 구입'),
(demo_user_id,'2024-07-22','expense',cat_medical,pm_cash,'KRW',25000,1,25000,'약국'),
(demo_user_id,'2024-07-25','expense',cat_dining,pm_kakao,'KRW',42000,1,42000,'외식'),
(demo_user_id,'2024-07-28','expense',cat_transport,pm_card,'KRW',38000,1,38000,'교통카드 충전'),
(demo_user_id,'2024-07-30','expense',cat_util,pm_transfer,'KRW',15000,1,15000,'도시가스');

-- ── 2024년 8월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2024-08-01','income',cat_salary,pm_transfer,'KRW',3850000,1,3850000,'8월 급여'),
(demo_user_id,'2024-08-02','expense',cat_food,pm_card,'KRW',86000,1,86000,'마트 장보기'),
(demo_user_id,'2024-08-05','expense',cat_phone,pm_transfer,'KRW',98000,1,98000,'인터넷+핸드폰 요금'),
(demo_user_id,'2024-08-07','expense',cat_edu,pm_transfer,'KRW',230000,1,230000,'학원비'),
(demo_user_id,'2024-08-09','expense',cat_transport,pm_kakao,'KRW',62000,1,62000,'주유비'),
(demo_user_id,'2024-08-12','expense',cat_dining,pm_card,'KRW',72000,1,72000,'외식'),
(demo_user_id,'2024-08-14','expense',cat_shopping,pm_card,'KRW',230000,1,230000,'가을 옷 미리 구입'),
-- 해외 구매 (USD)
(demo_user_id,'2024-08-15','expense',cat_util,pm_transfer,'KRW',112000,1,112000,'전기세 (에어컨 최고)'),
(demo_user_id,'2024-08-16','expense',cat_shopping,pm_card,'USD',39.99,1380,55186,'아마존 구매'),
(demo_user_id,'2024-08-18','expense',cat_food,pm_card,'KRW',69000,1,69000,'코스트코 장보기'),
(demo_user_id,'2024-08-20','income',cat_side,pm_transfer,'KRW',300000,1,300000,'프리랜서 수입'),
(demo_user_id,'2024-08-22','expense',cat_leisure,pm_card,'KRW',55000,1,55000,'문화생활'),
(demo_user_id,'2024-08-25','expense',cat_medical,pm_cash,'KRW',45000,1,45000,'피부과 진료'),
(demo_user_id,'2024-08-28','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2024-08-30','expense',cat_util,pm_transfer,'KRW',14000,1,14000,'도시가스');

-- ── 2024년 9월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2024-09-02','income',cat_salary,pm_transfer,'KRW',3850000,1,3850000,'9월 급여'),
(demo_user_id,'2024-09-03','expense',cat_food,pm_card,'KRW',105000,1,105000,'추석 명절 장보기'),
(demo_user_id,'2024-09-05','expense',cat_shopping,pm_card,'KRW',168000,1,168000,'추석 선물 구입'),
(demo_user_id,'2024-09-06','expense',cat_phone,pm_transfer,'KRW',98000,1,98000,'인터넷+핸드폰 요금'),
(demo_user_id,'2024-09-09','expense',cat_dining,pm_card,'KRW',95000,1,95000,'추석 외식'),
(demo_user_id,'2024-09-10','expense',cat_edu,pm_transfer,'KRW',230000,1,230000,'학원비'),
(demo_user_id,'2024-09-12','expense',cat_transport,pm_kakao,'KRW',82000,1,82000,'명절 이동 주유비'),
(demo_user_id,'2024-09-15','expense',cat_util,pm_transfer,'KRW',68000,1,68000,'전기세'),
(demo_user_id,'2024-09-15','expense',cat_util,pm_transfer,'KRW',32000,1,32000,'수도세'),
(demo_user_id,'2024-09-18','expense',cat_food,pm_card,'KRW',77000,1,77000,'마트 장보기'),
(demo_user_id,'2024-09-22','expense',cat_leisure,pm_card,'KRW',48000,1,48000,'가을 나들이'),
(demo_user_id,'2024-09-25','expense',cat_dining,pm_kakao,'KRW',38000,1,38000,'외식'),
(demo_user_id,'2024-09-28','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2024-09-30','expense',cat_util,pm_transfer,'KRW',22000,1,22000,'도시가스');

-- ── 2024년 10월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2024-10-01','income',cat_salary,pm_transfer,'KRW',3850000,1,3850000,'10월 급여'),
(demo_user_id,'2024-10-03','expense',cat_food,pm_card,'KRW',84000,1,84000,'마트 장보기'),
(demo_user_id,'2024-10-05','expense',cat_phone,pm_transfer,'KRW',98000,1,98000,'인터넷+핸드폰 요금'),
(demo_user_id,'2024-10-07','expense',cat_edu,pm_transfer,'KRW',230000,1,230000,'학원비'),
(demo_user_id,'2024-10-09','expense',cat_transport,pm_kakao,'KRW',58000,1,58000,'주유비'),
(demo_user_id,'2024-10-11','expense',cat_shopping,pm_card,'KRW',195000,1,195000,'겨울 준비 의류'),
(demo_user_id,'2024-10-14','expense',cat_dining,pm_card,'KRW',62000,1,62000,'외식'),
(demo_user_id,'2024-10-15','expense',cat_util,pm_transfer,'KRW',45000,1,45000,'전기세'),
(demo_user_id,'2024-10-18','expense',cat_food,pm_card,'KRW',73000,1,73000,'코스트코 장보기'),
(demo_user_id,'2024-10-20','expense',cat_leisure,pm_card,'KRW',72000,1,72000,'단풍 나들이'),
(demo_user_id,'2024-10-22','expense',cat_medical,pm_cash,'KRW',38000,1,38000,'감기 진료'),
(demo_user_id,'2024-10-25','expense',cat_dining,pm_kakao,'KRW',45000,1,45000,'외식'),
(demo_user_id,'2024-10-28','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2024-10-30','expense',cat_util,pm_transfer,'KRW',38000,1,38000,'도시가스 (난방 시작)');

-- ── 2024년 11월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2024-11-01','income',cat_salary,pm_transfer,'KRW',3850000,1,3850000,'11월 급여'),
(demo_user_id,'2024-11-03','expense',cat_food,pm_card,'KRW',89000,1,89000,'마트 장보기'),
(demo_user_id,'2024-11-05','expense',cat_phone,pm_transfer,'KRW',98000,1,98000,'인터넷+핸드폰 요금'),
(demo_user_id,'2024-11-07','expense',cat_edu,pm_transfer,'KRW',230000,1,230000,'학원비'),
(demo_user_id,'2024-11-08','expense',cat_shopping,pm_card,'KRW',89000,1,89000,'블랙프라이데이 쇼핑'),
-- TRY 거래 (해외 서비스 구독)
(demo_user_id,'2024-11-10','expense',cat_leisure,pm_card,'TRY',349,38,13262,'스포티파이 연간 구독'),
(demo_user_id,'2024-11-12','expense',cat_transport,pm_kakao,'KRW',62000,1,62000,'주유비'),
(demo_user_id,'2024-11-14','expense',cat_dining,pm_card,'KRW',58000,1,58000,'외식'),
(demo_user_id,'2024-11-15','expense',cat_util,pm_transfer,'KRW',72000,1,72000,'전기세 (난방)'),
(demo_user_id,'2024-11-15','expense',cat_util,pm_transfer,'KRW',32000,1,32000,'수도세'),
(demo_user_id,'2024-11-18','expense',cat_food,pm_card,'KRW',76000,1,76000,'홈플러스 장보기'),
(demo_user_id,'2024-11-20','income',cat_side,pm_transfer,'KRW',250000,1,250000,'프리랜서 수입'),
(demo_user_id,'2024-11-22','expense',cat_leisure,pm_card,'KRW',45000,1,45000,'문화생활'),
(demo_user_id,'2024-11-25','expense',cat_medical,pm_cash,'KRW',32000,1,32000,'내과 진료'),
(demo_user_id,'2024-11-28','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2024-11-30','expense',cat_util,pm_transfer,'KRW',68000,1,68000,'도시가스 (난방)');

-- ── 2024년 12월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2024-12-02','income',cat_salary,pm_transfer,'KRW',4200000,1,4200000,'12월 급여 (연말 보너스 포함)'),
(demo_user_id,'2024-12-04','expense',cat_food,pm_card,'KRW',95000,1,95000,'마트 장보기'),
(demo_user_id,'2024-12-05','expense',cat_phone,pm_transfer,'KRW',98000,1,98000,'인터넷+핸드폰 요금'),
(demo_user_id,'2024-12-07','expense',cat_edu,pm_transfer,'KRW',230000,1,230000,'학원비'),
(demo_user_id,'2024-12-09','expense',cat_shopping,pm_card,'KRW',285000,1,285000,'크리스마스 선물'),
(demo_user_id,'2024-12-12','expense',cat_transport,pm_kakao,'KRW',65000,1,65000,'주유비'),
(demo_user_id,'2024-12-14','expense',cat_dining,pm_card,'KRW',92000,1,92000,'연말 외식'),
(demo_user_id,'2024-12-15','expense',cat_util,pm_transfer,'KRW',88000,1,88000,'전기세 (난방)'),
(demo_user_id,'2024-12-18','expense',cat_food,pm_card,'KRW',82000,1,82000,'연말 장보기'),
(demo_user_id,'2024-12-20','expense',cat_leisure,pm_card,'KRW',95000,1,95000,'연말 파티'),
(demo_user_id,'2024-12-22','expense',cat_medical,pm_cash,'KRW',45000,1,45000,'치과 정기 검진'),
(demo_user_id,'2024-12-24','expense',cat_dining,pm_card,'KRW',75000,1,75000,'크리스마스 외식'),
(demo_user_id,'2024-12-26','expense',cat_shopping,pm_card,'KRW',125000,1,125000,'연말 쇼핑'),
(demo_user_id,'2024-12-28','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2024-12-30','expense',cat_util,pm_transfer,'KRW',82000,1,82000,'도시가스 (난방)');

-- ── 2025년 1월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2025-01-02','income',cat_salary,pm_transfer,'KRW',3850000,1,3850000,'1월 급여'),
(demo_user_id,'2025-01-04','expense',cat_food,pm_card,'KRW',88000,1,88000,'이마트 장보기'),
(demo_user_id,'2025-01-06','expense',cat_phone,pm_transfer,'KRW',100000,1,100000,'인터넷+핸드폰 요금'),
(demo_user_id,'2025-01-08','expense',cat_edu,pm_transfer,'KRW',250000,1,250000,'학원비 (인상)'),
(demo_user_id,'2025-01-10','expense',cat_shopping,pm_card,'KRW',135000,1,135000,'겨울 할인 쇼핑'),
(demo_user_id,'2025-01-12','expense',cat_transport,pm_kakao,'KRW',55000,1,55000,'주유비'),
(demo_user_id,'2025-01-14','expense',cat_dining,pm_card,'KRW',68000,1,68000,'외식'),
(demo_user_id,'2025-01-15','expense',cat_util,pm_transfer,'KRW',92000,1,92000,'전기세 (난방)'),
(demo_user_id,'2025-01-15','expense',cat_util,pm_transfer,'KRW',78000,1,78000,'도시가스 (난방)'),
(demo_user_id,'2025-01-18','expense',cat_food,pm_card,'KRW',72000,1,72000,'마트 장보기'),
(demo_user_id,'2025-01-20','expense',cat_leisure,pm_card,'KRW',42000,1,42000,'영화 관람'),
(demo_user_id,'2025-01-22','expense',cat_medical,pm_cash,'KRW',35000,1,35000,'내과 진료'),
(demo_user_id,'2025-01-25','expense',cat_food,pm_kakao,'KRW',55000,1,55000,'온라인 식품 주문'),
(demo_user_id,'2025-01-28','expense',cat_transport,pm_card,'KRW',38000,1,38000,'교통카드 충전'),
(demo_user_id,'2025-01-31','expense',cat_util,pm_transfer,'KRW',32000,1,32000,'수도세');

-- ── 2025년 2월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2025-02-03','income',cat_salary,pm_transfer,'KRW',3850000,1,3850000,'2월 급여'),
(demo_user_id,'2025-02-04','expense',cat_food,pm_card,'KRW',98000,1,98000,'설 명절 장보기'),
(demo_user_id,'2025-02-06','expense',cat_shopping,pm_card,'KRW',175000,1,175000,'설 선물'),
(demo_user_id,'2025-02-07','expense',cat_phone,pm_transfer,'KRW',100000,1,100000,'인터넷+핸드폰 요금'),
(demo_user_id,'2025-02-09','expense',cat_dining,pm_card,'KRW',82000,1,82000,'설날 외식'),
(demo_user_id,'2025-02-10','expense',cat_edu,pm_transfer,'KRW',250000,1,250000,'학원비'),
(demo_user_id,'2025-02-12','expense',cat_transport,pm_kakao,'KRW',68000,1,68000,'명절 이동 주유비'),
(demo_user_id,'2025-02-14','expense',cat_leisure,pm_card,'KRW',55000,1,55000,'발렌타인데이'),
(demo_user_id,'2025-02-15','expense',cat_util,pm_transfer,'KRW',85000,1,85000,'전기세 (난방)'),
(demo_user_id,'2025-02-15','expense',cat_util,pm_transfer,'KRW',72000,1,72000,'도시가스 (난방)'),
(demo_user_id,'2025-02-18','expense',cat_food,pm_card,'KRW',65000,1,65000,'홈플러스 장보기'),
(demo_user_id,'2025-02-20','income',cat_side,pm_transfer,'KRW',180000,1,180000,'부수입'),
(demo_user_id,'2025-02-22','expense',cat_medical,pm_cash,'KRW',42000,1,42000,'치과 진료'),
(demo_user_id,'2025-02-25','expense',cat_food,pm_kakao,'KRW',52000,1,52000,'온라인 식품 주문'),
(demo_user_id,'2025-02-27','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전');

-- ── 2025년 3월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2025-03-03','income',cat_salary,pm_transfer,'KRW',3900000,1,3900000,'3월 급여 (인상)'),
(demo_user_id,'2025-03-04','expense',cat_food,pm_card,'KRW',82000,1,82000,'이마트 장보기'),
(demo_user_id,'2025-03-06','expense',cat_phone,pm_transfer,'KRW',100000,1,100000,'인터넷+핸드폰 요금'),
(demo_user_id,'2025-03-08','expense',cat_edu,pm_transfer,'KRW',250000,1,250000,'학원비'),
(demo_user_id,'2025-03-10','expense',cat_shopping,pm_card,'KRW',128000,1,128000,'봄 옷 구입'),
(demo_user_id,'2025-03-12','expense',cat_transport,pm_kakao,'KRW',58000,1,58000,'주유비'),
(demo_user_id,'2025-03-14','expense',cat_dining,pm_card,'KRW',65000,1,65000,'외식'),
(demo_user_id,'2025-03-15','expense',cat_util,pm_transfer,'KRW',52000,1,52000,'전기세'),
(demo_user_id,'2025-03-15','expense',cat_util,pm_transfer,'KRW',32000,1,32000,'수도세'),
(demo_user_id,'2025-03-18','expense',cat_food,pm_card,'KRW',69000,1,69000,'홈플러스 장보기'),
(demo_user_id,'2025-03-20','income',cat_side,pm_transfer,'KRW',220000,1,220000,'프리랜서 수입'),
(demo_user_id,'2025-03-22','expense',cat_leisure,pm_card,'KRW',58000,1,58000,'봄 나들이'),
-- TRY 거래
(demo_user_id,'2025-03-24','expense',cat_other_exp,pm_card,'TRY',1500,37,55500,'해외 송금 수수료'),
(demo_user_id,'2025-03-25','expense',cat_dining,pm_kakao,'KRW',38000,1,38000,'점심 약속'),
(demo_user_id,'2025-03-28','expense',cat_transport,pm_card,'KRW',38000,1,38000,'교통카드 충전'),
(demo_user_id,'2025-03-30','expense',cat_util,pm_transfer,'KRW',35000,1,35000,'도시가스');

-- ── 2025년 4월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2025-04-01','income',cat_salary,pm_transfer,'KRW',3900000,1,3900000,'4월 급여'),
(demo_user_id,'2025-04-03','expense',cat_food,pm_card,'KRW',85000,1,85000,'마트 장보기'),
(demo_user_id,'2025-04-05','expense',cat_phone,pm_transfer,'KRW',100000,1,100000,'인터넷+핸드폰 요금'),
(demo_user_id,'2025-04-07','expense',cat_edu,pm_transfer,'KRW',250000,1,250000,'학원비'),
(demo_user_id,'2025-04-10','expense',cat_dining,pm_card,'KRW',72000,1,72000,'가족 외식'),
(demo_user_id,'2025-04-12','expense',cat_transport,pm_kakao,'KRW',55000,1,55000,'주유비'),
(demo_user_id,'2025-04-14','expense',cat_leisure,pm_card,'KRW',85000,1,85000,'봄 야외 나들이'),
(demo_user_id,'2025-04-15','expense',cat_util,pm_transfer,'KRW',38000,1,38000,'전기세 (봄철)'),
(demo_user_id,'2025-04-17','expense',cat_food,pm_card,'KRW',65000,1,65000,'코스트코 장보기'),
(demo_user_id,'2025-04-19','expense',cat_medical,pm_cash,'KRW',48000,1,48000,'치과 치료'),
(demo_user_id,'2025-04-22','expense',cat_shopping,pm_card,'KRW',98000,1,98000,'쇼핑'),
(demo_user_id,'2025-04-25','expense',cat_dining,pm_kakao,'KRW',42000,1,42000,'저녁 외식'),
(demo_user_id,'2025-04-28','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2025-04-30','expense',cat_util,pm_transfer,'KRW',25000,1,25000,'도시가스');

-- ── 2025년 5월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2025-05-02','income',cat_salary,pm_transfer,'KRW',3900000,1,3900000,'5월 급여'),
(demo_user_id,'2025-05-03','expense',cat_food,pm_card,'KRW',102000,1,102000,'어린이날 장보기'),
(demo_user_id,'2025-05-05','expense',cat_leisure,pm_card,'KRW',115000,1,115000,'어린이날 나들이'),
(demo_user_id,'2025-05-06','expense',cat_phone,pm_transfer,'KRW',100000,1,100000,'인터넷+핸드폰 요금'),
(demo_user_id,'2025-05-07','expense',cat_edu,pm_transfer,'KRW',250000,1,250000,'학원비'),
(demo_user_id,'2025-05-09','expense',cat_shopping,pm_card,'KRW',195000,1,195000,'어버이날 선물'),
(demo_user_id,'2025-05-12','expense',cat_transport,pm_kakao,'KRW',58000,1,58000,'주유비'),
(demo_user_id,'2025-05-14','expense',cat_dining,pm_card,'KRW',88000,1,88000,'어버이날 외식'),
(demo_user_id,'2025-05-15','expense',cat_util,pm_transfer,'KRW',36000,1,36000,'전기세'),
(demo_user_id,'2025-05-18','expense',cat_food,pm_card,'KRW',74000,1,74000,'마트 장보기'),
(demo_user_id,'2025-05-20','income',cat_side,pm_transfer,'KRW',300000,1,300000,'부수입'),
(demo_user_id,'2025-05-22','expense',cat_medical,pm_cash,'KRW',38000,1,38000,'내과 진료'),
(demo_user_id,'2025-05-25','expense',cat_food,pm_kakao,'KRW',58000,1,58000,'온라인 식품 주문'),
(demo_user_id,'2025-05-28','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2025-05-30','expense',cat_util,pm_transfer,'KRW',18000,1,18000,'도시가스');

-- ── 2025년 6월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2025-06-02','income',cat_salary,pm_transfer,'KRW',3900000,1,3900000,'6월 급여'),
(demo_user_id,'2025-06-04','expense',cat_food,pm_card,'KRW',91000,1,91000,'마트 장보기'),
(demo_user_id,'2025-06-06','expense',cat_phone,pm_transfer,'KRW',100000,1,100000,'인터넷+핸드폰 요금'),
(demo_user_id,'2025-06-08','expense',cat_edu,pm_transfer,'KRW',250000,1,250000,'학원비'),
(demo_user_id,'2025-06-10','expense',cat_transport,pm_kakao,'KRW',62000,1,62000,'주유비'),
(demo_user_id,'2025-06-12','expense',cat_shopping,pm_card,'KRW',105000,1,105000,'여름 옷 구입'),
(demo_user_id,'2025-06-14','expense',cat_dining,pm_card,'KRW',68000,1,68000,'외식'),
(demo_user_id,'2025-06-15','expense',cat_util,pm_transfer,'KRW',55000,1,55000,'전기세 (냉방 시작)'),
(demo_user_id,'2025-06-15','expense',cat_util,pm_transfer,'KRW',32000,1,32000,'수도세'),
(demo_user_id,'2025-06-18','expense',cat_food,pm_card,'KRW',78000,1,78000,'코스트코 장보기'),
(demo_user_id,'2025-06-20','expense',cat_leisure,pm_card,'KRW',72000,1,72000,'영화/문화생활'),
(demo_user_id,'2025-06-22','expense',cat_medical,pm_cash,'KRW',35000,1,35000,'피부과'),
(demo_user_id,'2025-06-25','expense',cat_dining,pm_kakao,'KRW',44000,1,44000,'저녁 약속'),
(demo_user_id,'2025-06-28','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2025-06-30','expense',cat_util,pm_transfer,'KRW',16000,1,16000,'도시가스');

-- ── 2025년 7월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2025-07-01','income',cat_salary,pm_transfer,'KRW',3900000,1,3900000,'7월 급여'),
(demo_user_id,'2025-07-03','expense',cat_food,pm_card,'KRW',95000,1,95000,'마트 장보기'),
(demo_user_id,'2025-07-05','expense',cat_phone,pm_transfer,'KRW',100000,1,100000,'인터넷+핸드폰 요금'),
(demo_user_id,'2025-07-07','expense',cat_edu,pm_transfer,'KRW',250000,1,250000,'학원비'),
(demo_user_id,'2025-07-09','expense',cat_leisure,pm_card,'KRW',225000,1,225000,'여름 휴가 경비'),
(demo_user_id,'2025-07-12','expense',cat_transport,pm_kakao,'KRW',85000,1,85000,'여행 주유비'),
(demo_user_id,'2025-07-14','expense',cat_dining,pm_card,'KRW',95000,1,95000,'휴가 외식'),
(demo_user_id,'2025-07-15','expense',cat_util,pm_transfer,'KRW',105000,1,105000,'전기세 (에어컨)'),
-- 해외 구매 (USD)
(demo_user_id,'2025-07-16','expense',cat_shopping,pm_card,'USD',49.99,1380,68986,'해외 쇼핑몰 구매'),
(demo_user_id,'2025-07-18','expense',cat_food,pm_card,'KRW',82000,1,82000,'홈플러스 장보기'),
(demo_user_id,'2025-07-20','income',cat_side,pm_transfer,'KRW',350000,1,350000,'프리랜서 수입'),
(demo_user_id,'2025-07-22','expense',cat_medical,pm_cash,'KRW',30000,1,30000,'약국'),
(demo_user_id,'2025-07-25','expense',cat_dining,pm_kakao,'KRW',48000,1,48000,'외식'),
(demo_user_id,'2025-07-28','expense',cat_transport,pm_card,'KRW',38000,1,38000,'교통카드 충전'),
(demo_user_id,'2025-07-30','expense',cat_util,pm_transfer,'KRW',14000,1,14000,'도시가스');

-- ── 2025년 8월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2025-08-01','income',cat_salary,pm_transfer,'KRW',3900000,1,3900000,'8월 급여'),
(demo_user_id,'2025-08-03','expense',cat_food,pm_card,'KRW',88000,1,88000,'마트 장보기'),
(demo_user_id,'2025-08-05','expense',cat_phone,pm_transfer,'KRW',100000,1,100000,'인터넷+핸드폰 요금'),
(demo_user_id,'2025-08-07','expense',cat_edu,pm_transfer,'KRW',250000,1,250000,'학원비'),
(demo_user_id,'2025-08-09','expense',cat_transport,pm_kakao,'KRW',68000,1,68000,'주유비'),
(demo_user_id,'2025-08-11','expense',cat_dining,pm_card,'KRW',78000,1,78000,'외식'),
(demo_user_id,'2025-08-14','expense',cat_shopping,pm_card,'KRW',245000,1,245000,'가을 옷 미리 구입'),
(demo_user_id,'2025-08-15','expense',cat_util,pm_transfer,'KRW',118000,1,118000,'전기세 (에어컨 최고)'),
(demo_user_id,'2025-08-18','expense',cat_food,pm_card,'KRW',75000,1,75000,'코스트코 장보기'),
(demo_user_id,'2025-08-20','expense',cat_leisure,pm_card,'KRW',62000,1,62000,'문화생활'),
(demo_user_id,'2025-08-22','expense',cat_medical,pm_cash,'KRW',48000,1,48000,'피부과 진료'),
(demo_user_id,'2025-08-25','expense',cat_dining,pm_kakao,'KRW',45000,1,45000,'저녁 외식'),
(demo_user_id,'2025-08-28','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2025-08-30','expense',cat_util,pm_transfer,'KRW',13000,1,13000,'도시가스');

-- ── 2025년 9월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2025-09-01','income',cat_salary,pm_transfer,'KRW',3900000,1,3900000,'9월 급여'),
(demo_user_id,'2025-09-03','expense',cat_food,pm_card,'KRW',108000,1,108000,'추석 명절 장보기'),
(demo_user_id,'2025-09-05','expense',cat_shopping,pm_card,'KRW',172000,1,172000,'추석 선물'),
(demo_user_id,'2025-09-06','expense',cat_phone,pm_transfer,'KRW',100000,1,100000,'인터넷+핸드폰 요금'),
(demo_user_id,'2025-09-08','expense',cat_dining,pm_card,'KRW',98000,1,98000,'추석 외식'),
(demo_user_id,'2025-09-10','expense',cat_edu,pm_transfer,'KRW',250000,1,250000,'학원비'),
(demo_user_id,'2025-09-12','expense',cat_transport,pm_kakao,'KRW',88000,1,88000,'명절 이동 주유비'),
(demo_user_id,'2025-09-15','expense',cat_util,pm_transfer,'KRW',72000,1,72000,'전기세'),
(demo_user_id,'2025-09-15','expense',cat_util,pm_transfer,'KRW',32000,1,32000,'수도세'),
(demo_user_id,'2025-09-18','expense',cat_food,pm_card,'KRW',82000,1,82000,'마트 장보기'),
-- TRY 거래
(demo_user_id,'2025-09-20','expense',cat_leisure,pm_card,'TRY',499,36,17964,'넷플릭스 연간 구독'),
(demo_user_id,'2025-09-22','expense',cat_leisure,pm_card,'KRW',55000,1,55000,'가을 나들이'),
(demo_user_id,'2025-09-25','expense',cat_dining,pm_kakao,'KRW',42000,1,42000,'외식'),
(demo_user_id,'2025-09-28','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2025-09-30','expense',cat_util,pm_transfer,'KRW',24000,1,24000,'도시가스');

-- ── 2025년 10월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2025-10-01','income',cat_salary,pm_transfer,'KRW',3900000,1,3900000,'10월 급여'),
(demo_user_id,'2025-10-03','expense',cat_food,pm_card,'KRW',87000,1,87000,'마트 장보기'),
(demo_user_id,'2025-10-05','expense',cat_phone,pm_transfer,'KRW',100000,1,100000,'인터넷+핸드폰 요금'),
(demo_user_id,'2025-10-07','expense',cat_edu,pm_transfer,'KRW',250000,1,250000,'학원비'),
(demo_user_id,'2025-10-09','expense',cat_transport,pm_kakao,'KRW',62000,1,62000,'주유비'),
(demo_user_id,'2025-10-11','expense',cat_shopping,pm_card,'KRW',215000,1,215000,'겨울 준비 의류'),
(demo_user_id,'2025-10-14','expense',cat_dining,pm_card,'KRW',68000,1,68000,'외식'),
(demo_user_id,'2025-10-15','expense',cat_util,pm_transfer,'KRW',48000,1,48000,'전기세'),
(demo_user_id,'2025-10-18','expense',cat_food,pm_card,'KRW',76000,1,76000,'코스트코 장보기'),
(demo_user_id,'2025-10-20','income',cat_side,pm_transfer,'KRW',280000,1,280000,'부수입'),
(demo_user_id,'2025-10-22','expense',cat_leisure,pm_card,'KRW',78000,1,78000,'단풍 나들이'),
(demo_user_id,'2025-10-24','expense',cat_medical,pm_cash,'KRW',42000,1,42000,'내과 진료'),
(demo_user_id,'2025-10-27','expense',cat_dining,pm_kakao,'KRW',48000,1,48000,'저녁 약속'),
(demo_user_id,'2025-10-29','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2025-10-31','expense',cat_util,pm_transfer,'KRW',42000,1,42000,'도시가스 (난방 시작)');

-- ── 2025년 11월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2025-11-03','income',cat_salary,pm_transfer,'KRW',3900000,1,3900000,'11월 급여'),
(demo_user_id,'2025-11-04','expense',cat_food,pm_card,'KRW',92000,1,92000,'마트 장보기'),
(demo_user_id,'2025-11-06','expense',cat_phone,pm_transfer,'KRW',100000,1,100000,'인터넷+핸드폰 요금'),
(demo_user_id,'2025-11-08','expense',cat_edu,pm_transfer,'KRW',250000,1,250000,'학원비'),
(demo_user_id,'2025-11-10','expense',cat_shopping,pm_card,'KRW',185000,1,185000,'블랙프라이데이 쇼핑'),
(demo_user_id,'2025-11-12','expense',cat_transport,pm_kakao,'KRW',65000,1,65000,'주유비'),
(demo_user_id,'2025-11-14','expense',cat_dining,pm_card,'KRW',72000,1,72000,'외식'),
(demo_user_id,'2025-11-15','expense',cat_util,pm_transfer,'KRW',78000,1,78000,'전기세 (난방)'),
(demo_user_id,'2025-11-15','expense',cat_util,pm_transfer,'KRW',32000,1,32000,'수도세'),
(demo_user_id,'2025-11-18','expense',cat_food,pm_card,'KRW',79000,1,79000,'홈플러스 장보기'),
-- TRY 거래
(demo_user_id,'2025-11-20','expense',cat_leisure,pm_card,'TRY',349,36,12564,'스포티파이 연간 구독'),
(demo_user_id,'2025-11-22','expense',cat_leisure,pm_card,'KRW',48000,1,48000,'문화생활'),
(demo_user_id,'2025-11-24','expense',cat_medical,pm_cash,'KRW',35000,1,35000,'치과 정기 검진'),
(demo_user_id,'2025-11-27','expense',cat_dining,pm_kakao,'KRW',45000,1,45000,'저녁 외식'),
(demo_user_id,'2025-11-29','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2025-11-30','expense',cat_util,pm_transfer,'KRW',72000,1,72000,'도시가스 (난방)');

-- ── 2025년 12월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2025-12-01','income',cat_salary,pm_transfer,'KRW',4350000,1,4350000,'12월 급여 (연말 보너스 포함)'),
(demo_user_id,'2025-12-03','expense',cat_food,pm_card,'KRW',98000,1,98000,'마트 장보기'),
(demo_user_id,'2025-12-05','expense',cat_phone,pm_transfer,'KRW',100000,1,100000,'인터넷+핸드폰 요금'),
(demo_user_id,'2025-12-07','expense',cat_edu,pm_transfer,'KRW',250000,1,250000,'학원비'),
(demo_user_id,'2025-12-09','expense',cat_shopping,pm_card,'KRW',295000,1,295000,'크리스마스 선물 쇼핑'),
(demo_user_id,'2025-12-12','expense',cat_transport,pm_kakao,'KRW',68000,1,68000,'주유비'),
(demo_user_id,'2025-12-14','expense',cat_dining,pm_card,'KRW',98000,1,98000,'연말 송년 외식'),
(demo_user_id,'2025-12-15','expense',cat_util,pm_transfer,'KRW',95000,1,95000,'전기세 (난방)'),
(demo_user_id,'2025-12-18','expense',cat_food,pm_card,'KRW',88000,1,88000,'연말 장보기'),
(demo_user_id,'2025-12-20','expense',cat_leisure,pm_card,'KRW',105000,1,105000,'연말 행사'),
(demo_user_id,'2025-12-22','expense',cat_medical,pm_cash,'KRW',48000,1,48000,'건강검진'),
(demo_user_id,'2025-12-24','expense',cat_dining,pm_card,'KRW',82000,1,82000,'크리스마스 이브 외식'),
(demo_user_id,'2025-12-26','expense',cat_shopping,pm_card,'KRW',138000,1,138000,'연말 쇼핑'),
(demo_user_id,'2025-12-29','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2025-12-31','expense',cat_util,pm_transfer,'KRW',88000,1,88000,'도시가스 (난방)');

-- ── 2026년 1월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2026-01-02','income',cat_salary,pm_transfer,'KRW',3900000,1,3900000,'1월 급여'),
(demo_user_id,'2026-01-04','expense',cat_food,pm_card,'KRW',92000,1,92000,'이마트 장보기'),
(demo_user_id,'2026-01-06','expense',cat_phone,pm_transfer,'KRW',100000,1,100000,'인터넷+핸드폰 요금'),
(demo_user_id,'2026-01-08','expense',cat_edu,pm_transfer,'KRW',250000,1,250000,'학원비'),
(demo_user_id,'2026-01-10','expense',cat_shopping,pm_card,'KRW',145000,1,145000,'겨울 할인 쇼핑'),
(demo_user_id,'2026-01-12','expense',cat_transport,pm_kakao,'KRW',58000,1,58000,'주유비'),
(demo_user_id,'2026-01-14','expense',cat_dining,pm_card,'KRW',72000,1,72000,'외식'),
(demo_user_id,'2026-01-15','expense',cat_util,pm_transfer,'KRW',95000,1,95000,'전기세 (난방)'),
(demo_user_id,'2026-01-15','expense',cat_util,pm_transfer,'KRW',82000,1,82000,'도시가스 (난방)'),
(demo_user_id,'2026-01-18','expense',cat_food,pm_card,'KRW',76000,1,76000,'마트 장보기'),
(demo_user_id,'2026-01-20','income',cat_side,pm_transfer,'KRW',200000,1,200000,'부수입'),
(demo_user_id,'2026-01-22','expense',cat_leisure,pm_card,'KRW',45000,1,45000,'영화 관람'),
(demo_user_id,'2026-01-24','expense',cat_medical,pm_cash,'KRW',38000,1,38000,'내과 진료'),
(demo_user_id,'2026-01-26','expense',cat_food,pm_kakao,'KRW',58000,1,58000,'온라인 식품 주문'),
(demo_user_id,'2026-01-29','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전'),
(demo_user_id,'2026-01-31','expense',cat_util,pm_transfer,'KRW',32000,1,32000,'수도세');

-- ── 2026년 2월 ──────────────────────────────────────────────
INSERT INTO transactions (user_id,date,type,category_id,payment_method_id,currency,original_amount,exchange_rate,krw_amount,content) VALUES
(demo_user_id,'2026-02-02','income',cat_salary,pm_transfer,'KRW',3900000,1,3900000,'2월 급여'),
(demo_user_id,'2026-02-04','expense',cat_food,pm_card,'KRW',105000,1,105000,'설 명절 장보기'),
(demo_user_id,'2026-02-05','expense',cat_shopping,pm_card,'KRW',185000,1,185000,'설 선물 구입'),
(demo_user_id,'2026-02-06','expense',cat_phone,pm_transfer,'KRW',100000,1,100000,'인터넷+핸드폰 요금'),
(demo_user_id,'2026-02-07','expense',cat_edu,pm_transfer,'KRW',250000,1,250000,'학원비'),
(demo_user_id,'2026-02-09','expense',cat_dining,pm_card,'KRW',88000,1,88000,'설날 외식'),
(demo_user_id,'2026-02-11','expense',cat_transport,pm_kakao,'KRW',72000,1,72000,'명절 이동 주유비'),
(demo_user_id,'2026-02-13','expense',cat_leisure,pm_card,'KRW',58000,1,58000,'발렌타인데이'),
(demo_user_id,'2026-02-15','expense',cat_util,pm_transfer,'KRW',88000,1,88000,'전기세 (난방)'),
(demo_user_id,'2026-02-15','expense',cat_util,pm_transfer,'KRW',75000,1,75000,'도시가스 (난방)'),
(demo_user_id,'2026-02-17','expense',cat_food,pm_card,'KRW',68000,1,68000,'홈플러스 장보기'),
(demo_user_id,'2026-02-19','expense',cat_medical,pm_cash,'KRW',45000,1,45000,'치과 진료'),
(demo_user_id,'2026-02-20','expense',cat_food,pm_kakao,'KRW',55000,1,55000,'온라인 식품 주문'),
(demo_user_id,'2026-02-22','expense',cat_transport,pm_card,'KRW',35000,1,35000,'교통카드 충전');

END $$;
