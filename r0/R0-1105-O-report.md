---
name: R0-1105-O · 허브-1107-O 리포 감사 relay
description: fork master(c03c254) 리포 단위 품질 감사 — 영어 전용 / 토큰 전용 / 비활성 상태 / 서버 계약 / 우선순위 수정 목록
author: R0
dated: 2026-11-07
---

# R0-1105-O · fork 리포 품질 감사 (팔레트 교체 전)

**스코프**: `agilo-medusa-pos-fork@c03c254` 리포 단위 (PR 단위 아님).
**정본**: `storeport@946d31c` (main).
**금지**: 코드 수정 · 커밋.

## 요약

| 축 | 활성 건수 | 사소/dead code | 판정 |
| --- | --- | --- | --- |
| ① 영어 전용 (UI) | **0** | hangul 주석 218줄 (내부 주석 · 정책 허용) | PASS |
| ② 토큰 전용 (raw color) | **0** | 5 (commented-out ColorPicker · `product-details.tsx:273-277`) | PASS (dead code 정리 권장) |
| ③ 비활성 상태 (ink-disabled) | **3 활성 + 3 비활성 picker** | — | 수정 필요 (M3) |
| ④ 서버 계약 (api/hooks ↔ storeport) | **0 활성 불일치** | 1 미사용 응답필드 (`close.z_report`) | PASS |
| **총 수정 요망** | **3 (M3) + 3 (M3 lower)** | — | — |

---

## ① 영어 전용 감사 (app/** · components/** · lib/**)

**UI 노출 한국어/인도네시아어/일본어 문자열: 0건.**

### 집계
- hangul 포함 파일: **42**
- hangul 포함 줄: **218**
- 모두 **주석** (`//`, `/* */`, `{/* */}`): 218/218 = 100%
- UI 텍스트 (JSX children · `text1` · `title` · `placeholder` · `Toast.show` 등) 안 hangul: **0건**
- Japanese hiragana/katakana: **0건** (grep `[\x{3040}-\x{309f}\x{30a0}-\x{30ff}]`)
- Indonesian 구문 (`Rp[0-9]` · `Pembayaran` · `Terima kasih` · `Pesanan` · `Belanja` · `Keranjang`): **0건**

### 판정

**PASS** — ADDENDUM §2 "영어 전용 UI 정책" 완전 준수. 주석은 팀 내부 문서로 정책 밖 (유지 가능).

---

## ② 토큰 전용 감사 (raw hex · rgba · Tailwind primitive)

**활성 코드 raw color: 0건.**

### 집계 (파일:줄)

| 유형 | 건수 | 위치 |
| --- | --- | --- |
| Raw hex `#RGB`/`#RRGGBB` in active code | **0** | — |
| Raw hex in **dead** code (commented-out block) | **5** | `app/product-details.tsx:273-277` (`{/* <ColorPicker colors=[...] /> */}` block spanning lines 268-287) — `'#000000'` · `'#FFFFFF'` · `'#1E3A8A'` · `'#6B7280'` · `'#DC2626'` |
| `rgba()`/`rgb()` | **0** | — |
| Tailwind primitive color classes (`gray-\d+` · `blue-\d+` · `red-\d+` · ... 20종) | **0** | — |
| `bg-white` / `bg-black` / `bg-transparent` | **1** | `components/ui/Button.tsx:36` → `bg-transparent` (정책 허용 · 색 아님) |
| Inline SVG/Icon `color=` · `fill=` · `stroke=` | **0 raw** | 모두 `TOKEN_*` (brand.ts) · 로고는 prop 변수 `amber`/`ink` (BRAND_*) |

### 판정

**PASS** — raw color 활성 코드 0건. `app/product-details.tsx:273-277` 의 5 hex 는 commented-out ColorPicker 블록 내부라 번들에 안 들어감. 팔레트 교체 전 cleanup 하면 좋지만 차단 사항 아님.

---

## ③ 비활성 상태 감사 (ink-disabled 토큰 일관성)

### 수정 필요 (M3-1105-E 컨벤션 위반 · `ink-subtle` 을 disabled 용으로 쓰는 곳)

| # | 파일:줄 | 증상 | 기대 |
| --- | --- | --- | --- |
| 1 | `components/ui/QuantityPicker.tsx:118` | `disabled ? 'text-ink-subtle' : ''` (input 텍스트) | `text-ink-disabled` |
| 2 | `components/ui/QuantityPicker.tsx:102` | `!canDecrement ? 'text-ink-subtle'` (Minus 아이콘) | `text-ink-disabled` |
| 3 | `components/ui/QuantityPicker.tsx:128` | `!canIncrement ? 'text-ink-subtle'` (Plus 아이콘) | `text-ink-disabled` |

**이유**: M3-1105-E 가 `ink-subtle` (placeholder) ↔ `ink-disabled` (비활성 전용) 를 분리한 핵심 결정. QuantityPicker 3곳은 분리 이전 패턴 잔재. Button/SelectField/BaseSelectField/MultiSelectField 는 이미 `text-ink-disabled` 로 통일.

### 수정 권장 (`disabled:opacity-50` 만 쓰는 피커들 · `text-ink-disabled` 명시 없음)

| # | 파일:줄 | 증상 | 기대 |
| --- | --- | --- | --- |
| 4 | `components/ui/OptionPicker.tsx:38` | `disabled:opacity-50` 만 | 텍스트 레이블에 `text-ink-disabled` 명시 추가 |
| 5 | `components/ui/SizePicker.tsx:38` | `disabled:opacity-50` 만 | 동일 |
| 6 | `components/ui/ColorPicker.tsx:38` | `disabled:opacity-50` 만 | 동일 |

**이유**: 투명도만으로 "pressable 아님" 신호를 주는 패턴 ↔ Button/Select 패턴 (ink-disabled 색 교체) 와 불일치. 현재 POS 활성 UX 에서는 OptionPicker·SizePicker·ColorPicker 모두 사용되지 않음 (ColorPicker 는 commented-out 블록 내부 · 항목 ② 참조) · 팔레트 교체 뒤 향후 사용 시 재발 방지 차원 권장.

### 역방향 ("눌리는데 회색" · "disabled 인데 활성 색")

**0건** — `bg-line`/`bg-surface-muted` 배경 사용처는 모두 **non-pressable** (skeleton loader · image placeholder · divider · container). TouchableOpacity 중 disabled 없이 회색 배경 쓰는 곳 없음.

### 판정

**수정 필요 · M3 몫** (팔레트 교체 전 같이 처리 바람직 · QuantityPicker 3건은 활성 코드이므로 우선).

---

## ④ 서버 계약 감사 (api/hooks/** ↔ storeport@946d31c `src/api/admin/**`)

### 엔드포인트 커버리지 전수

| 메서드 | 경로 | fork 호출 위치 | 서버 라우트 | 요청 body | 응답 shape | ✓ |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/admin/pos/receipts/:id` | `api/hooks/pos-orders.ts:29` · `pos-payments.ts:81` | `pos/receipts/[id]/route.ts` | — | `{receipt: Receipt}` ↔ fork `{receipt: Receipt}` | ✓ |
| POST | `/admin/pos/orders/:id/fulfill` | `pos-orders.ts:40` · `pos-payments.ts:92` | `pos/orders/[id]/fulfill/route.ts` | `{}` | `{ok, fulfillment_id, fulfilled_at}` ↔ fork 동일 | ✓ |
| POST | `/admin/pos/orders/:id/tenders` | `pos-payments.ts:61` | `pos/orders/[id]/tenders/route.ts` | `{provider_id, input, amount?, order_type?, register_session_id?, cashier_user_id?}` | 11 필드 `{ok, order_id, provider_id, amount, order_type, payment_collection_id, payment_session_id, payment_id, receipt_id, receipt_no, method}` | ✓ (R0-1105-M 재검 완료) |
| GET | `/admin/register-sessions?stock_location_id=X&status=open` | `register-session.ts:84` · `draft-orders.tsx:675` | `register-sessions/route.ts` GET | query params | `{register_sessions: RegisterSession[], count}` ↔ fork `{register_sessions: RegisterSession[]}` (count 미사용) | ✓ |
| POST | `/admin/register-sessions` | `register-session.ts:103` | `register-sessions/route.ts` POST | `{stock_location_id, opening_float, sales_channel_id?, opener_nickname?}` | `{register_session: RegisterSession}` | ✓ (fork body 는 `opener_nickname` 미전송 · 서버 optional) |
| POST | `/admin/register-sessions/:id/cash-movements` | `register-session.ts:131` | `cash-movements/route.ts` | `{type, amount, recipient?, reason?, order_id?, signed_delta?}` | `{cash_movement: CashMovement}` | ✓ |
| GET | `/admin/register-sessions/:id/x-report` | `register-session.ts:150` | `x-report/route.ts` | — | `{x_report: ReportSnapshot}` | ✓ |
| POST | `/admin/register-sessions/:id/close` | `register-session.ts:169` | `close/route.ts` | `{counted_cash, note?}` | **서버**: `{register_session, z_report}` ↔ **fork**: `{register_session}` (z_report 미사용) | ⚠ |
| POST | `/admin/register-sessions/:id/pos-complete` | `register-session.ts:194` · `register-session.ts:229` · `draft-orders.tsx:734` | `pos-complete/route.ts` | `{order_id, payment_method, invoice_number?, auto_fulfill?}` | 9 필드 `{ok, order_id, session_id, payment_method, payment_collection_id, fulfillment_created, fulfillment_policy, cash_movement_id, invoice_number}` | ✓ |
| POST | `/admin/register-sessions/:id/fulfill` | `register-session.ts:264` | `fulfill/route.ts` | `{order_id, note}` | 6 필드 `{ok, order_id, session_id, fulfillment_id, fulfilled_at, note}` | ✓ |
| GET | `/admin/register-sessions/:id/z-report/text?store_name=X` | `register-session.ts:294` | `z-report/text/route.ts` | query param | `text/plain` (`res.send(text)`) ↔ fork `.text()` | ✓ |

### 남은 불일치 (≠ #31/#36 범위)

**⚠ 1건 · 활성 아님 (미사용 필드)**:
- `api/hooks/register-session.ts:171` — `useCloseRegisterSession` 의 응답 타입이 `{register_session: RegisterSession}` 만 선언 · 서버는 `{register_session, z_report}` 반환. **fork 는 z_report 를 버리고 별도 `useZReportText` 로 재조회**. 결제·마감 흐름은 정상 (z_report 는 WA 복사 텍스트로 별도 fetch). 최적화 (roundtrip -1) 기회만 손실 · 버그 아님.

**0건 활성 contract mismatch** (경로·요청 body·응답 shape 전수 일치).

### 판정

**PASS** · M0-1105-K (storeport #193 머지 뒤 `order.metadata.receipt_id` 뿌리 복원) 이후 모든 활성 contract 정합. 1 최적화 기회 (close z_report inline 소비) 는 M1 급.

---

## ⑤ 우선순위 수정 목록 (허브 분류)

### M3 · 팔레트 교체 전 처리 (디자인 허브 · 색 토큰 라운드)

| 우선 | 항목 | 파일:줄 | 근거 |
| --- | --- | --- | --- |
| **P0** | QuantityPicker 3 지점 `text-ink-subtle` → `text-ink-disabled` | `components/ui/QuantityPicker.tsx:102` · `:118` · `:128` | M3-1105-E 컨벤션 위반 · 활성 코드 · 상세 화면 핵심 컨트롤 |
| P1 | OptionPicker · SizePicker · ColorPicker 비활성 텍스트에 `text-ink-disabled` 명시 | `components/ui/OptionPicker.tsx:38` · `SizePicker.tsx:38` · `ColorPicker.tsx:38` | 투명도만 사용 중 · 활성 UX 미사용 · 재발 방지 |
| P2 | commented-out ColorPicker 블록 삭제 | `app/product-details.tsx:268-287` | 5 raw hex 잔재 · dead code · 번들 영향 없음 |

### M1 · 서버 contract 최적화 (API 허브)

| 우선 | 항목 | 파일:줄 | 근거 |
| --- | --- | --- | --- |
| P3 | `useCloseRegisterSession` 응답 타입에 `z_report` 추가 + inline 소비 (roundtrip -1) | `api/hooks/register-session.ts:171` | 현재 WA 복사용 `useZReportText` 별도 fetch · close 응답 재사용 가능 |
| P3 | `useOpenRegisterSession` body 에 `opener_nickname` 지원 (M0-0918-C A4 닉네임) | `api/hooks/register-session.ts:97-108` | 서버 optional · fork `RegisterSession.opener_nickname?` read 는 이미 지원하나 write 경로 공백 |

### M0/M2 · 없음

이번 감사에서 M0 (storeport 서버) · M2 (CI/도구) 레벨 결함 미발견.

---

## 환경 보조

- fork master HEAD 로컬 재현: `git reset --hard origin/master` → `c03c254` (local worktree 동기화)
- storeport main 참조: `/Users/kyu.lee/projects/storeport@origin/main = 946d31c`
- grep 도구: BSD grep (macOS) · `-rnE` · `[\x{...}]` unicode via `-P`
- 감사 방법:
  - 영어 전용: hangul `[가-힣]` · hiragana/katakana · Indonesian 어휘 grep → 주석 필터 후 UI 텍스트만 카운트
  - 토큰 전용: hex/rgba/Tailwind primitive class · dead code (JSX `{/* */}`) 별도 분리
  - 비활성 상태: `disabled` prop + `text-ink-*` className 교차 grep
  - 서버 계약: `sdk.client.fetch()` 호출 전수 · storeport `src/api/admin/**/route.ts` 비교 · 응답 shape 라인별 대조

## 참조

- 직전 리뷰: `r0/R0-1105-N-report.md` (storeport #193 M0-1105-K APPROVE)
- fork master HEAD: `c03c254a...` (M3-1105 라운드 4 PR 전부 머지 완료)
- storeport main HEAD: `946d31c...` (#193 M0-1105-K 머지 완료)
