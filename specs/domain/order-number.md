# 주문번호 — 현재 정답

범위: 하나의 주문이 갖는 **세 가지 번호** 체계. 이 파일이 주제별 **정본**. 결정 파일(`ledger/decision-*`)은 날짜별 기록.

## 한눈 요약

| 번호 | 쓰는 곳 | 형식 | 현재 상태 |
|---|---|---|---|
| **긴 주문번호** (= `order_custom_display_id`) | 영수증 하단 · POS 주문 상세 하단 | `{NICK}-{YY}{M|A|B|C}{SERIAL}` 예 `PIM-26B1001` | **구현 완료 · 실기 완료** |
| **짧은 칩 번호** `#N` (= `pos_order_num`) | 모든 POS 화면 · 손님 화면 구석 · 영수증 **맨 위** | 매장별 1~99 순환(Square 식) | **1~99 순환은 신규(진행 중 M0-1126-Q)** · 현재 코드는 세션 누적 카운터 |
| **Medusa display_id** (폴백) | 긴 번호가 없는 경우 영수증 하단 폴백 | Medusa 기본값(예 `R-...` · 숫자) | 그대로 — 발급 시 `custom_display_id` 가 덮어씀 |

> **원형 제공자**: 11-24 11:03 Kyu 승인 "모든 POS 화면 · 손님 화면 구석 · 영수증 맨 위 = **칩 번호 #N 하나** · 긴 Order 번호는 **영수증 아래·주문 상세에만 작게**" (`ledger/decision-pos-ui-approval-20261124.md:10`).

---

## 1 · 긴 주문번호 (`order_custom_display_id`)

### 1.1 Kyu 원문 (근거)

- 2026-11-24 11:15 "A 안의 문제는 사람들이 우리 매장에 몇개의 매출이 있었는지를 너무 쉽게 알수 있다는거야. 아 오늘 42번째 매출이구나~ 라고 알리고 싶진 않아서, 월별로 했으면해. **PIM26+1자리 달을 의미하는 (1, 2, 3 , 4, 5, 6, 7, 8, 9, O, N, D) 알파뉴메릭 + 4자리 숫자**. 즉, PIM2620012 : PIM 매장의 26년도 2월의 12번째 매출. 이러려면, 매장이 여러개인경우, 매장의 nick name 을 어드민에서 관리하는 화면이 있어야겠다." (`ledger/decision-order-number-20261124.md:3`)
- 2026-11-24 11:31 "① **10~12월 표기: A·B·C** / 매달 시작번호 : 1000 (이것도 admin 에서 설정할수 있도록 하자) / 구현하자." (`ledger/decision-order-number-20261124.md:4`)
- 2026-11-25 (M1-1125-L 발부 · `queue/m1/M1-1125-L.md:12`) "**PIM 이던 PIM3이던 매장닉네임- 을 사용하자. 예를들어 PIM 으로 닉네임 설정하면 PIM-26B1001**" → 11-24 형식에 **하이픈 추가**.
- 2026-11-26 22:13 "번호에 대해서는 이미 너와 여러번 이야기를 나누었고 … 긴 번호는 지금 반영되어있는거 기준으로 … 너가 기존 기록을 찾아봤으면해." (`ledger/decision-kyu-4q-20261126.md:6`) → **변경 없음** (= 11-24 형식 + 11-25 하이픈 그대로).

### 1.2 규칙 (정본)

- **형식**: `{NICK}-{YY}{M|A|B|C}{SERIAL}` · 하이픈 필수 (M1-1125-L).
  - `NICK` 매장 닉네임 — 영문 대문자+숫자 2~4자 · **첫 글자는 영문** (정규식 `^[A-Z][A-Z0-9]{1,3}$`). 중복 금지. 그 매장 첫 번호 발급 뒤 **잠금**(변경 불가).
  - `YY` 연도 뒤 2자리 · WIB(UTC+7 고정) 기준.
  - 월 문자 `1~9, A(10월), B(11월), C(12월)`.
  - `SERIAL` 매달 시작값(기본 **1000** · Admin 설정)부터 1씩 증가 · 4자리 0 채움 · 9999 초과 시 5자리 이상 허용(오류 아님).
- **시작번호 변경**: **다음 달부터** 적용(이번 달 번호 충돌 방지 · 오케 결정 11-24 `ledger/decision-order-number-20261124.md:10`).
- **월 경계**: WIB 자정.
- **취소 주문**: 번호 유지(재사용 금지).
- **닉네임 없는 매장**: 주문 실패시키지 않고 **기존 display_id** 로 표시 + Admin 경고.
- **기존 주문 백필 없음**.

### 1.3 구현 위치

- 포맷 함수 — `storeport/apps/commerce-core/src/modules/order_number/lib/format.ts:51-62` `formatOrderNumber(nickname, date, serial)` → `${nickname}-${yy}${monthChar(mm)}${padded}` (항상 하이픈).
- 상수 — 같은 파일 `DEFAULT_START_SERIAL = 1000` (line 11) · `NICKNAME_REGEX = /^[A-Z][A-Z0-9]{1,3}$/` (line 12) · `NICKNAME_RULE_TEXT = "2–4 letters or digits, starting with a letter"` (line 13-14).
- 호환 shim — 같은 파일 `needsOrderNumberHyphen(_)` 항상 `true` (M1-1125-L · `format.ts:17-19`).
- 카운터 모델 — `storeport/apps/commerce-core/src/modules/order_number/models/order-number-counter.ts` (월별 카운터) · `order-number-store.ts` (매장 닉네임) · `order-number-start-override.ts` (Admin 시작값 override).
- 발급 로직 — `storeport/apps/commerce-core/src/modules/order_number/lib/reserve.ts`.
- 마이그레이션 — `storeport/apps/commerce-core/src/modules/order_number/migrations/Migration20261124000000.ts` (M0-1124-A).
- Admin API — `storeport/apps/commerce-core/src/api/admin/order-numbers/route.ts` 외 `[stock_location_id]/nickname` · `[stock_location_id]/start-serial`.
- POS 쪽 표시 — opaque 문자열 (M0-1125-F 검증 · POS·CD 변경 없음). 영수증 하단 = `order_custom_display_id` → snapshot → `display_id` 폴백 순 (`storeport/apps/customer-display/src/types/order-snapshot.ts:206-208`).

### 1.4 실기 여부

- **긴 번호 발급** — 실기 완료 (Kyu PR #430 실기 2026-11-25).
- **하이픈 적용** — 실기 완료 (M1-1125-L · `queue/m1/M1-1125-L.md:12-18`).

### 1.5 변경 이력

- 2026-11-24: 11:15 Kyu 요구 · 11:31 결정(월 A·B·C · 시작 1000 Admin) · `ledger/decision-order-number-20261124.md`.
- 2026-11-24: 오케 결정 — 시작번호 변경 다음 달 적용 · 월 경계 WIB · 취소 번호 유지 · 닉네임 없는 매장 폴백 · 백필 없음 (`ledger/decision-order-number-20261124.md:10`).
- 2026-11-25: M1-1125-L — **하이픈** 추가. `PIM26B1001` → `PIM-26B1001` (`queue/m1/M1-1125-L.md:12`). `format.ts` 구현.
- 2026-11-26: Kyu 22:13 재확인 — "긴 번호는 지금 반영되어있는거 기준" → **변경 없음** (`ledger/decision-kyu-4q-20261126.md:6`).

---

## 2 · 짧은 칩 번호 `#N` (`pos_order_num`)

### 2.1 Kyu 원문 (근거)

- 2026-11-24 10:52 피드백 7 "Customer 화면에서도 몇번 주문 고객을 위한 화면인지 **칩 번호**가 나와줬으면해. `#[번호]` 형태로 적당하게 … Order 번호를 칩번호로 쓰던지 해야할듯. 지금은 **2중관리** 되고있어." (`ledger/decision-pos-phone-status-20261124.md:12`) → 승인 11-24 11:03 "다 승인".
- 2026-11-26 22:13 "짧은번호는 **Square 처럼 1부터 99까지만** 쓰는게 좋을것같아 … 너가 기존 기록을 찾아봤으면해." (`ledger/decision-kyu-4q-20261126.md:6`).
- 취지 연결: 11-24 11:15 "오늘 42번째 매출이구나~ 라고 알리고 싶진 않아서" (`ledger/decision-order-number-20261124.md:3`) — 1~99 순환이 누적 건수를 드러내지 않으므로 같은 취지에 부합.

### 2.2 규칙 (정본)

> ✅ **Kyu 결정 11-27 12:32 "레지스터 열때. (권장안 채택)"** — 레지스터를 열 때마다 #1 부터 · 그 안에서 1~99 순환. 현재 구현(storeport#465) = 매장별 이어감 → **M0-1127-E 로 교체 중**.
>
> - Kyu 원문 (11-23 17:06): "이렇게 하자." — 칩 번호는 매일 영업 시작(레지스터 오픈) 때 #1부터. (`ledger/decision-cd-parallel-20261123.md:72`)
> - Kyu 원문 (11-26 22:13): "짧은번호는 Square 처럼 1부터 99까지만 쓰는게 좋을것같아 … 너가 기존 기록을 찾아봤으면해." (`ledger/decision-kyu-4q-20261126.md:6`)

- **범위**: 매장(stock location)별 **1 → 99 → 다시 1** 순환 (Square 식) · 긴 번호와 **별개**. 초기화 = **레지스터 열 때마다 #1**(Kyu 11-27) · 레지스터 세션 안에서 99 다음 1.
- **부여 시점**: 주문(또는 결제 시작) 시점에 1회 부여 · 주문에 저장 · 이후 재계산 금지.
- **동시성**: 같은 매장 두 대가 같은 번호를 받지 않도록 잠금/원자 증가.
- **표시 위치**: 모든 POS 화면 · 손님 화면 구석 · 영수증 **맨 위** (`ledger/decision-pos-ui-approval-20261124.md:10`).
- **기존 주문**: 백필 없음 (옛 번호 그대로 노출).

### 2.3 구현 위치 (현재 — 변경 예정)

- **현재(진행 중 M0-1126-Q 교체 대상)** — 세션 누적 카운터.
  - POS: `fork/api/hooks/draft-orders.tsx:157` `const posOrderNum = ++_sessionOrderCounter` (앱 세션 내 증가 · 재시작 시 서버 max 복원 `:384`).
  - POS: 같은 파일 `:161` draft order `metadata.pos_order_num` 에 stamp.
  - 서버: `storeport/apps/commerce-core/src/api/admin/pos/customer-display/snapshots/[id]/route.ts:35` PATCH 로 받은 `pos_order_num` 을 snapshot 에 세팅 (M1-1124-C 계약).
  - 스냅샷 모델: `storeport/apps/commerce-core/src/modules/register_session/order_snapshot/model.ts:61` (M2-1124-B).
  - 마이그레이션: `storeport/apps/commerce-core/src/modules/register_session/migrations/Migration20261124000001.ts`.
- **표시 컴포넌트**:
  - POS: `fork/components/order-chips/OrderChips.tsx:74` · `fork/components/order-chips/types.ts:62` `` `#${posOrderNum}` `` · `fork/components/customer-display/CustomerPhoneStatus.tsx:83` `numLabel = `#${posOrderNum}``.
  - CD 영수증 머리: `storeport/apps/customer-display/src/components/cd-sync/LeftPaymentPanel.tsx:325` `` `Order ${view.topOrderNumber}` `` · receipt view `topOrderNumber = "#7"` (테스트 `receipt-view.test.ts:104`).

### 2.4 실기 여부

- 현재 세션 누적 번호 — 실기 중 (Kyu 눈으로는 "`#190`" 같은 숫자가 보임 · 누적 매출 수를 드러내 11-26 재검토 계기).
- 매장별 1~99 순환 — **미구현 · M0-1126-Q 진행 중** (`queue/m0/M0-1126-Q.md`).

### 2.5 변경 이력

- 2026-11-24: 11:03 "칩 번호 `#N` 하나" 승인 · 2중관리 금지 (`ledger/decision-pos-ui-approval-20261124.md:10`).
- 2026-11-24 → 25: 세션 누적 카운터 구현(POS `pos_order_num`).
- 2026-11-26: Kyu 22:13 "Square 식 1~99 순환" 결정 → M0-1126-Q 발부.

---

## 3 · 영수증 하단 번호 ("R-..." 등)

### 3.1 코드에서 확인한 사실

- 영수증 하단에 **긴 주문번호**(§1) 를 노출 (`ledger/decision-pos-ui-approval-20261124.md:10`).
- Resolve 순: `receipt.order_custom_display_id` → `snapshot.order_custom_display_id` → **Medusa `display_id` 폴백** (출처 `storeport/apps/customer-display/src/types/order-snapshot.ts:206-208`).
- 현재 코드에 **별도 "R-..." 영수증 번호 필드는 없음**. 표시 컴포넌트 `storeport/apps/customer-display/src/components/cd-sync/LeftPaymentPanel.tsx:405-408` 는 `view.bottomOrderNumber` 를 그대로 찍음.
- 따라서 Kyu 눈에 보일 수 있는 "R-…" 는 **매장 닉네임 미설정** 또는 **발급 실패 폴백** 상태의 Medusa `display_id` (= 긴 주문번호가 덮어쓰기 **전**의 기본 값). 닉네임 발급 + `formatOrderNumber` 가 호출되면 `PIM-26B1001` 로 교체됨.
- 테스트 예시: `storeport/apps/customer-display/src/screens/__tests__/receipt-view.test.ts:103-104` · `:170` · `:306` (`bottomOrderNumber = "PIM26B1042"` — 하이픈 전 · 현행 코드로 생성하면 `PIM-26B1042`).

### 3.2 규칙

- 영수증 하단 번호 = 긴 주문번호(§1) **하나**. 별도 "R-…" 체계 **없음** · 필요하면 § 1 의 하이픈 형식을 그대로 사용.
- 닉네임 미설정 매장은 `display_id` 폴백 그대로 노출 + Admin 경고 (`ledger/decision-order-number-20261124.md:10`).

---

## 4 · 오케 결정 꼬리 (참고)

11-24 Kyu 승인 뒤 **오케 판단으로 정한 디테일 4건** — Kyu 재질문 없이 유지되는 세부 규칙 (`ledger/decision-order-number-20261124.md:10`):

1. 시작번호 변경은 **다음 달부터** 적용(이번 달 번호 충돌 방지).
2. 월 경계 **WIB**.
3. **취소 주문도 번호 유지** (재사용 금지).
4. 닉네임 없는 매장은 주문 실패시키지 않고 **기존 `display_id`** 로 표시 + Admin 경고.

기존 주문 **백필 없음** 도 같은 결정 라인.

---

## 5 · 이 규칙이 바뀌면 — 발부 전 체크

1. `grep -l "order-number\|pos_order_num\|order_custom_display_id"` 로 영향 파일 찾기.
2. 이 파일 § 1~3 중 어느 규칙이 바뀌는지 먼저 이 파일을 갱신.
3. `ledger/decision-*` 에 새 결정 파일(원문 + 날짜) 추가 · 기존 파일 "미결/해결" 꼬리표.
4. 발부 — 보존 요소 줄에 **`긴 주문번호 형식(PIM-26B1001)` · `짧은 칩 번호(#N) 매장별 1~99 순환`** 명시.
