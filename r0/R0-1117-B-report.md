#322 APPROVE · #323 APPROVE

## 테스트 실행 결과

### PR #322 (feat/m0-1117-a-phone-r1-r2)

| 범위 | 결과 |
|---|---|
| commerce-core 단위 (26 suites) | **366 pass** ✓ |
| customer-display vitest (8 suites) | **133 pass** ✓ |
| typecheck (commerce-core) | **clean** ✓ |
| phone-id.ts 바이트 동일 (cc vs cd) | **IDENTICAL** ✓ |
| 통합 테스트 (pos/customers-pos-api) | 미실행(로컬 pg 미연결) — PR 본문 첨부 로그 10 pass 로 대체 |

### PR #323 (feat/m0-1117-b-orders-list-phone-normalize)

| 범위 | 결과 |
|---|---|
| commerce-core 단위 (25 suites) | **351 pass** ✓ |
| typecheck (commerce-core) | **clean** ✓ |
| 통합 테스트 (pos/orders-list) | 미실행(로컬 pg 미연결) — PR 본문 첨부 로그 9 pass 로 대체 |

---

## PR #322 리뷰 판정: APPROVE

### (a) 정규화 함수 — `phone-id.ts:25`

- `0813…` / `62813…` / `+62 813…` / 하이픈·공백 포함 → 동일 E.164 수렴 ✓
  - raw.replace(/[\s\-().+]/g, "") 로 선행 제거 → `+62` 여부로 분기 → local 도출 → `+62` + local.slice(1)
- 인도네시아 외 번호: `ok: false, error: "phone must start with 0, 62, or +62"` → POST 400 반환 (Q3 거부 정책 ✓)
- 비-모바일(예: `071…` 지역번호): `"Indonesian mobile numbers must start with 08"` → 400 ✓

### (b) POST /admin/pos/customers — `customers/route.ts:73`

- 기존 번호 → `findCustomersByPhone` → 200 `created: false` ✓
- 빈 칸만 채움: `!canonical.email && email` / `!canonical.first_name` / `!canonical.last_name` 조건 ✓
- `phone` / `metadata.phone_e164` 는 `updates` 에 절대 포함 안 됨 ✓
- email 충돌 → 409 `{ code: "email_taken" }` ✓
- 동시 생성 23505 → 재조회 후 200 `created: false` (M0-1105-CO 패턴) ✓

**비블로커**: `customers/route.ts:111` — email 충돌 체크 `try/catch` 에서 예외 발생 시, 주석("email 채우기 생략")과 달리 `updates.email` 는 그대로 설정됨. DB unique constraint 가 최종 가드 역할을 하므로 운영상 무해. 주석 오도 수준.

### (c) GET /admin/pos/customers/search — `customers/search/route.ts:167`

- 옛 모양 저장분 검출: SQL `regexp_replace(phone, '[^0-9]', '', 'g') LIKE '%' || trunk || '%'` (trunk = e164.slice(3)) → JS 재정규화로 오탐 제거 ✓
- 성능: `LIMIT 500` + `metadata->>'phone_e164' = ?` 단독 equality 절 선행 — POS 규모(수만 명)에서 허용

### (d) 옛 레코드 쓰기 없음

- `findCustomersByPhone` 읽기 전용 ✓; POST route 도 `phone`/`phone_e164` 는 `updates` 미포함 ✓

### (f) 돈·적립 경로 영향 없음

- 신규 파일만 추가, `phone-id.ts` 는 export 추가만 — 기존 호출자 (`link-customer-order` 등) 시그니처 불변 ✓

---

## PR #323 리뷰 판정: APPROVE

### (e) orders-list 번호 검색 + 마스킹

- E.164 동치 비교 경로 (`qE164` 획득 시): `normalizePhone(stored).e164 === qE164` → 081…/6281…/+6281… 저장분 모두 검출 ✓ (`orders-list/route.ts:216`)
- 정규화 실패 경로 (기존 숫자 부분 매칭): 유지 ✓; `stripped !== ""` guard 추가로 순수 알파벳 q 가 전 주문 반환하던 무음 버그도 함께 수정 (개선)
- 마스킹: `maskPhone` 삭제 → `maskE164` 통일 (`0813-****-2480`) ✓; 정규화 불가 → `"—"` ✓
- 응답 shape 13 필드 불변 — 테스트 `Object.keys(r).sort()` 어설션 커버 ✓
- display_id 검색 회귀 없음 ✓

### (f) 돈·적립 경로 영향 없음

- `loyalty_earn` / `loyalty_used` 매핑 (`toNum(md.loyalty_earn?.amount)`) 무수정 ✓

---

## 종합 판정

| PR | 판정 | 블로커 | 비블로커 |
|---|---|---|---|
| #322 | **APPROVE** | 없음 | email catch 주석 오도 (route.ts:111) |
| #323 | **APPROVE** | 없음 | 없음 |

POS 앱 #167·#168 머지 선결 조건 충족. 통합 테스트 미검증(pg 미연결)은 PR 본문 첨부 로그로 대체함.
