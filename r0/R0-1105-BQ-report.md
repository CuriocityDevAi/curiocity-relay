# R0-1105-BQ 리뷰 리포트

**판정: A APPROVE · B CHANGES · C APPROVE**

---

## A. storeport #216 — APPROVE

**R0-1105-BO CHANGES 3항목 전부 해결.**

### 검증 표

| 항목 | 상태 | 근거 |
|------|------|------|
| C1 · store isolation 테스트 | ✅ | `두 매장은 잠금 카운터가 따로 — STORE_A 5회 오답 잠김 · STORE_B 정답 성공` 추가 → lockout describe 4건 완성 |
| C2 · CI unit 단계 | ✅ | `unit-commerce-core` 잡 추가, CI PASS (59s) |
| R1 · `resolveStoreId` 헬퍼 | ✅ | `_shared/manager-pin.ts` 추출, void · refund · return · refund-retry 4곳 교체 완료 |
| Admin GET 동일 기준 | ✅ | 헬퍼 `metadata.stock_location_id → 첫 stock_location.id` — Admin GET 소스 동일 |
| pos-integration CI | ✅ | 87/87 PASS |
| 이전 CHANGES 스레드 | ✅ | C1 · C2 · R1 스레드 3건 모두 resolve |

### #217 판정

PR #217 CI `pos-integration` FAIL: `Loaders for module Notification failed: Method Map.prototype.set called on incompatible receiver #<Map>`.

- 오류 위치: Medusa 내부 모듈 로더 (`medusa-module.ts`) — `p6-e2e.spec.ts` 코드 버그 아님
- 원인: Node.js 호환성 또는 의존성 버전 충돌 (환경 이슈)
- **rebase 필요 여부**: #216 머지 후 rebase + CI 재트리거 권장. 테스트 로직 8개 시나리오 자체에는 문제 없음.

---

## B. fork #91 — CHANGES

**BN CHANGES 2항목 중 C2만 해결. C1 미해결 + 신규 lint error.**

### 검증 표

| 항목 | 상태 | 근거 |
|------|------|------|
| C1 · `screenshots-m3-1105-ao/` 3장 | ❌ | 브랜치 git tree에 없음. `01-order-detail-banner.png` · `02-retry-sheet.png` · `03-after-retry-success.png` 미커밋 |
| C2 · `pos-refund-retry-423.json` + locked_until 어설션 | ✅ | fixture 커밋됨 (`status:423, reason:locked, locked_until ISO string`). assertions (8): `status=423` · `reason=locked` · `locked_until 파싱 가능` 5건 확인. C2 스레드 resolve |
| 신규 · `DigitsInput.tsx:45` prettier error | ❌ | CI lint FAIL — `clx()` 인수 개행 포맷 오류. 신규 파일 귀책. 라인 코멘트 등록 |
| 나머지 BN 통과 항목 회귀 | ✅ | 훅 계약 · fixture 33/33 · 500 partial_failure · isPending disabled · 401/423 처리 · UI 영문화 · raw hex 0 · node: import — 회귀 없음 |

### CI 상태

| 잡 | 결과 | 비고 |
|----|------|------|
| lint | ❌ FAIL | DigitsInput.tsx prettier (신규) + OptionChip/ColorPicker/BottomSheet/QuantityPicker (master 베이스 기존 문제) |
| assertions + playwright | TIMEOUT (15m) | 코드 실패 아님 — CI 실행 시간 초과 (환경 이슈) |

---

## C. fork #92 — APPROVE

**신규 리뷰 — 모든 항목 통과.**

### 검증 표

| 항목 | 상태 | 근거 |
|------|------|------|
| 원인 설명 타당성 | ✅ | Kyu "스크롤해도 4번째 줄 없었음" = `estimatedItemSize` 미설정 → contentSize 과소 추정 → 초기 렌더 범위 짧음. 일치. |
| `estimatedItemSize` 값 근거 | ✅ | Cart 150: `py-6(48px) + 썸네일 h-[5.25rem]=84px → 최소 132px`. Checkout 100: 옵션 없는 단순 행. B3 측정 주석으로 확인. |
| 스크롤 막대 복원 | ✅ | `showsVerticalScrollIndicator={false}` 제거 |
| Cart · Checkout · Total · 배지 데이터 소스 | ✅ | Cart/Total/배지: `useCurrentDraftOrder()` → queryKey `['draft-order']` 공유. Checkout: `useDraftOrderOrOrder(draftOrderId)` 별도 queryKey — 현행 유지 OK |
| 6개 품목 스크롤 스샷 · 어설션 커밋 | ✅ | `04-cart-6-items-before-scroll.png` · `05-cart-6-items-scrolled.png` 커밋됨. assertions 6/6. |
| run-all 신규 실패 | ✅ | PR 본문 "vitest 19/19 · run-all 신규 실패 0" |
| #91 파일 충돌 | ✅ | `checkout/[draftOrderId].tsx` 양쪽 수정. #91: line 306+ (Split 버튼), #92: line 265 (`estimatedItemSize`). 겹치는 위치 아님 — auto-merge 가능 |
| CI lint | 참고 | FAIL이나 OptionChip · ColorPicker · BottomSheet · QuantityPicker — master 베이스 기존 문제. 이 PR 귀책 없음 |

---

## 머지 순서 권고

1. **storeport #216** — 머지 가능
2. **storeport #217** — #216 머지 후 rebase + CI 재트리거 (환경 이슈 해소 여부 확인)
3. **fork #92** — 머지 가능 (#91과 충돌 없음)
4. **fork #91** — CHANGES 해결 후 머지 (C1 screenshots 커밋 + DigitsInput prettier 수정)

---

## 이연 순증감

- **storeport #216**: 소진 없음 · 신규 없음
- **fork #91**: PR 본문 선언대로 신규 이연 없음
- **fork #92**: PR 본문 선언대로 신규 이연 없음

---

착지: `cp /tmp/R0-1105-BQ-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-BQ-report.md && git commit -m "r0: R0-1105-BQ" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-BQ done "A APPROVE · B CHANGES(C1 screenshots 미커밋·DigitsInput lint) · C APPROVE"`
