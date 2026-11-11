# M3-1105-AM 리포트

## 기존 키패드 탐색 결과

**없음** — 앱 내 기존 커스텀 숫자 키패드 없음.
- `CashTenderPanel` 등 모든 숫자 입력은 시스템 `keyboardType="numeric"` TextInput 사용.
- grep 결과: `keypad|numpad|pinpad|digitpad` 패턴 → 매칭 파일 없음 (NumericKeypad 단 하나).
- **AL의 `components/pin/NumericKeypad.tsx`를 유일 공용 키패드로 유지 (삭제 없음).**

---

## 수행 내역

### (a) 기존 키패드 재활용
기존 키패드 없으므로 AL의 NumericKeypad를 유일 공용 키패드로 유지.
- `VoidRefundSheet` · `ManagerPinSheet` 모두 `NumericKeypad` 사용 (AL에서 완성).

### (b) #87(split-tender UI) 처리

| 항목 | 처리 |
|------|------|
| (1) prettier --write | `app/checkout/split-tender/[draftOrderId].tsx` 완료 |
| (2) pickOriginalTender 불필요 분기 제거 | `lib/refund-rules.ts` — 복합 조건 삭제, `size===1` 단일 경로 + 나머지 `return 'mixed'` |
| (3) AL 위로 rebase | `feat/m3-1105-al-pin-keypad` 기반 cherry-pick, `VoidRefundSheet` 자동 병합 (NumericKeypad + mixed) |
| (4) PIN 입력 NumericKeypad 통일 | `VoidRefundSheet` pin 단계 NumericKeypad 사용 (AL 작업 그대로 유지 + AK의 mixed 로직 합성) |

### (c) 테스트
- AJ assertions: **37/37 PASS**
- AL assertions: **35/35 PASS**
- AM assertions (신규): **37/37 PASS**
- split-tender unit (`__tests__/split-tender.test.ts`): **21/21 PASS**
- vitest run-all: **40 tests PASS**
- Playwright iPad (1180×820) 스샷 4장 (전부 실 검증):
  - `01-split-step1.png` — split-tender Step 1 화면
  - `02-split-step2.png` — split-tender Step 2 화면
  - `03-pin-digit-order.png` — PIN 자리 순서 1→2→3 입력
  - `04-mixed-void-sheet.png` — mixed(Cash + Card) 주문 Void 시트

---

## 브랜치 · PR

- **기반 브랜치**: `feat/m3-1105-al-pin-keypad` (#88, AL)
- **AM 브랜치**: `feat/m3-1105-am-keypad-reuse`
- **AM PR**: #89 — `feat/m3-1105-am-keypad-reuse` → `feat/m3-1105-al-pin-keypad`
- **#87 PR**: `feat/m3-1105-ak-split-tender-ui` — AM에 cherry-pick으로 rebase 완료

---

## 이연 순증감

없음 — 모든 REQ 항목 완료.
