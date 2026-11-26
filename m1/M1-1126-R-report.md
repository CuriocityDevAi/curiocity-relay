PASS relay#57 · domain 3 · 꼬리표 3개 · 명세서 갱신 10행

# M1-1126-R — 주제별 도메인 정본(`specs/domain/`) + INDEX 색인

- PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/57
- 브랜치: `docs/M1-1126-R-domain-specs` · 커밋 `1b70b734c`
- 워크트리: `~/projects/curiocity-relay-wts/M1-1126-R`
- 소요: 2026-11-26 22:15~22:48 WIB (33분 · 45분 상한 준수)

## 진단 (쿼리 요지 재진술)

Kyu 11-26 22:14 "너가 긴번호에 대해서 나에게 물어본다는것은, 설계서나 요구사항정의서가 없다는것을 의미하는 반증같은데, 실상은 어때?"

실상:
- 기록은 있었다 — `ledger/decision-order-number-20261124.md` + 11-25 M1-1125-L(하이픈) + storeport `order_number` 구현(`apps/commerce-core/src/modules/order_number/lib/format.ts:51-62` · 항상 하이픈 포맷) + Kyu PR #430 실기 완료.
- 그런데 (1) 결정이 날짜별 decision 파일 30여 개에 흩어져 **주제별 현재 정답** 이 없고, (2) 하이픈 변경이 결정 파일에 반영 안 됨(프롬프트·채팅에만), (3) 11-24 승인 파일 "미결: 긴 Order 번호" 줄이 해결 뒤에도 안 닫혀서 오늘 명세서 라운드(M1-1126-P)가 그 줄을 보고 "미결" 로 옮김 → 오케가 확인 없이 Kyu 에게 재질문 → 22:14 지적.

## 조치 (relay 만 · 코드 수정 없음)

### 신규 (`specs/domain/`)

| 파일 | 담은 규칙 | 핵심 근거(원문 · 날짜) |
|---|---|---|
| `README.md` | 3줄 규약: 결정 파일 = 기록 · specs/domain = 현재 정답 | — |
| `order-number.md` | § 1 긴 번호 `{NICK}-{YY}{M|A|B|C}{SERIAL}` 하이픈 · § 2 짧은 `#N` 매장별 1~99 순환 · § 3 영수증 하단 번호 = 긴 주문번호(별도 "R-…" 없음) · § 4 오케 결정 4건 | 11-24 11:15 "오늘 42번째 매출이구나~" (`ledger/decision-order-number-20261124.md:3`) · 11-25 M1-1125-L(하이픈 `queue/m1/M1-1125-L.md:12`) · 11-26 22:13 "지금 반영되어있는거 기준 … 1~99" (`ledger/decision-kyu-4q-20261126.md:6`) |
| `loyalty-points.md` | 적립 조건(paid ∧ confirmed · 1회) · 11-17 회수 · Re-enter A→B 이동 · 입구 A(PIN 없음) vs B(PIN 필수) · store credit 사용 | 11-18 (`ledger/decision-cd-ask-phone-20261118.md:4-5,13,16`) · 11-25 (`ledger/decision-cd-pos-sync-flow-20261125.md:12`) · 11-26 22:03 "응 동의" (`ledger/decision-kyu-4q-20261126.md:8`) · 11-15 (`ledger/decision-loyalty-20261114.md:35-39`) |
| `tax-pb1.md` | PB1 10% 고정 · 과세표준 = store credit 차감 전 · 값 없으면 숨김(V4-5) · 매장별 적용 | 11-15 (`ledger/decision-loyalty-20261114.md:36`) · 11-25 (`ledger/decision-cd-pos-sync-design-20261125.md:21`) · 11-26 22:03 "10%야." (`ledger/decision-kyu-4q-20261126.md:7`) |

모든 규칙 줄에 **Kyu 원문 날짜·출처 파일:줄** 과 **코드에서 확인한 구현 위치**(`storeport/apps/commerce-core/src/modules/order_number/lib/format.ts:51` · `fork/api/hooks/draft-orders.tsx:157` · `storeport/apps/customer-display/src/components/cd-sync/LeftPaymentPanel.tsx:311-413` · 등) 삽입.

### 신규 색인 (`specs/INDEX.md`)
주제 키워드 (주문번호 · 채번 · 칩 번호 · 포인트 · 적립 · 회수 · PB1 · 세금 · Link customer · Phone entry · 로그인 톱니 · Sell 탭 · 상품 사진 fit 등) → 정본 파일 경로. 발부 전 체크리스트 4단계.

### 화면 명세서 갱신 (`specs/screens/*` · 10행)

| 파일 | 요소 | 변경 |
|---|---|---|
| `pos-payment-flow.md` | 머리말 | 머지 완료 꼬리표 교체 — fork #276 (6eb28bd) · storeport #457·#458 (b22c2ed) 명시 + 도메인 링크 |
| `pos-payment-flow.md` | `POS-HDR-PHONE` | 일치 여부 **진행 중** → **일치(fork #276 머지 · 6eb28bd)** |
| `pos-payment-flow.md` | `SUCC-LINK-CUSTOMER` | 불일치(Kyu 결정 대기) → **일치**(Kyu 11-26 22:13 "A. 숨김 유지" 승인) · 옛 "충돌 1" 해결 |
| `pos-payment-flow.md` | `POS-SUCC-PHONEENTRY` | 미구현 → **일치**(#276 · 6eb28bd) |
| `pos-payment-flow.md` | `CART-ORDER-CHIP` · `CHECKOUT-ORDER-CHIP` | `#N` 행에 "1~99 순환(진행 중 M0-1126-Q)" 추가 |
| `pos-payment-flow.md` | 진행 중 PR#276 (7곳) | 일괄 "일치(fork #276 머지 · 6eb28bd)" 로 치환 |
| `pos-payment-flow.md` | **미결 1 긴 Order 번호** | 삭제(= 해결 꼬리) → `specs/domain/order-number.md` 링크 |
| `pos-payment-flow.md` | 보존 테스트 `SUCC-LINK-CUSTOMER` · `POS-SUCC-PHONEENTRY` | 자동 검사 1줄 구체화(663e260 반영) |
| `customer-display.md` | 머리말 · `CD-CHIP-ORDERNUM` | 도메인 링크 + 1~99 순환 꼬리 |
| `customer-display.md` | `CD-RECEIPT-FORMAT` | 진행 중 → **일치**(storeport #457·#458 머지 b22c2ed) · 보존 테스트 테스트 파일 명시 |
| `customer-display.md` | 미결 1·2 | 해결 꼬리(V3-2 머지 · PB1 10%) + 정본 링크 |
| `pos-order-detail.md` | 머리말 · `ORDER-PHONE-ENTRY` | 미구현 → **일치**(#276 · 6eb28bd) + storeport M0-1126-M(663e260) 보존 테스트 |

### 옛 결정 파일 꼬리표 (3건 · 내용 수정 금지)
- `ledger/decision-pos-ui-approval-20261124.md:14` 끝: `→ 해결: decision-order-number-20261124 · specs/domain/order-number.md`
- `ledger/decision-order-number-20261124.md` 맨 아래: `→ 갱신 11-25 하이픈(M1-1125-L) · 11-26 짧은 번호 1~99 — 정본 specs/domain/order-number.md`
- `ledger/decision-cd-pos-sync-design-20261125.md:21` 끝: `→ 해결: 11-26 22:03 Kyu "10%야." (decision-kyu-4q-20261126.md:7) · 정본 specs/domain/tax-pb1.md`

### 코드에서 확인한 구현 위치 (근거)

- 긴 번호 포맷 — `storeport/apps/commerce-core/src/modules/order_number/lib/format.ts:51-62` `formatOrderNumber` 항상 하이픈 반환(M1-1125-L) · `DEFAULT_START_SERIAL = 1000` (line 11) · `NICKNAME_REGEX = /^[A-Z][A-Z0-9]{1,3}$/` (line 12).
- 짧은 번호 현재 소스 — `fork/api/hooks/draft-orders.tsx:157` `const posOrderNum = ++_sessionOrderCounter` + line 161 draft metadata stamp → M0-1126-Q 교체 대상.
- 짧은 번호 서버 세팅 — `storeport/apps/commerce-core/src/api/admin/pos/customer-display/snapshots/[id]/route.ts:35`.
- 영수증 하단 번호 resolve — `storeport/apps/customer-display/src/types/order-snapshot.ts:206-208` (`receipt.order_custom_display_id → snapshot.order_custom_display_id → display_id`) · 렌더 `LeftPaymentPanel.tsx:405-408`.
- 별도 "R-…" 영수증 번호 필드 **없음** — `display_id` 폴백이 "R-xxxx" 로 보일 수 있을 뿐.
- PB1 폴백 11 테스트 — `storeport/apps/customer-display/src/screens/__tests__/receipt-view.test.ts:227` (M0-1126-P 제거 대상).

## 제약 준수

- 코드 변경 **없음**(명세·꼬리표 전용).
- 러너 폴더(`~/projects/curiocity-relay`) 수정 **없음** — 워크트리에서만.
- 리포트는 이 파일 한 번만 — `.hub-runner/reports/m1/M1-1126-R/report.md`. 리포 안에 쓰지 않음.
- 셀프 머지 금지 · 리포트 commit/push 금지.
- 모든 Kyu 원문 인용 보존 · 화면 명세서 요소 ID 체계 보존.
- `/loop` 미사용 · 45분 상한 준수 (33분).

## 다음 라운드 후보

1. 짧은 번호 1~99 구현 (M0-1126-Q 이미 큐에 있음).
2. Re-enter A→B 이동 + PB1 폴백 11 제거 (M0-1126-P 이미 진행 중).
3. 발부 규약 편입: 오케의 모든 "건드릴 파일" 블록 밑에 `보존 요소:` 줄 **필수** (= `decision-spec-guard-20261126.md` 규약 §3 · 다음 발부부터 적용).
4. R0(리뷰) 가 명세 대비로 판정 — `specs/screens/*` + `specs/domain/*` 대비 어긋나는 PR 은 빨간불.
