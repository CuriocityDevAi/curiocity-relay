# M0-1126-D — CD ↔ POS 2차 실기 피드백 (CD-1~5 + POS-2 실시간 숫자)

**판정: 완료 (실기 승인 전)** · PR: https://github.com/CuriocityDevAi/storeport/pull/452

## 실시간 숫자 필드 계약 (1줄 · M3 가 읽을 top-level DTO 필드)

`phone_entry_state: 'waiting'|'typing'|'done'|'skipped'|null` + `phone_partial: string|null` — M2-1124-B 기존 컬럼 재활용 (평문 `08XXXXX…`), start_entry → `waiting` · 숫자 입력 → PATCH `phone_partial` → `typing`.

## 확인 항목 (PR 본문 각 1줄)

- **CD-1** · `cdSnapshot` 메모에서 `paid + (settled || !phone_entry_open) + paid_age > 30s` 또는 `building + items=0 + state=none` 이면 null → MainScreen (welcome).
- **CD-2** · 결제 완료 = **PaymentCompletePanel 우 2/3** (check + "Payment complete" + 방식 뱃지) · 영수증 **좌 1/3** (receipt-mini).
- **CD-3** · 공용 `@storeport/receipt-view-model` 그대로 사용 · POS 섹션 전체 (store header·address·Order#·items·subtotal·tax·TOTAL·tenders·bottom order#·Thank you) 를 left receipt-mini 가 렌더 · receipt-full 과 keypad 화면의 왼쪽 영수증이 같은 컴포넌트.
- **CD-4** · `receipt-full` 과 `receipt-then-keypad` 를 PhoneFlowScreen 하나로 통일 (LeftPanel 가 remount 되지 않음) · ReceiptScreen 자체 `durationMs` 타이머 중복 제거 · 3s 뒤 rightSlide `setValue(1)→animate(0)` 명시 → keypad sheet 오른쪽→왼쪽 슬라이드 (offset 1000px).
- **CD-5** · POS Next customer 후 빈 building snapshot 그대로 MainScreen (기존 "No items yet" 회귀 제거).
- **POS-2** · `KeypadPanel.onDigitsChange` 추가 · `handleDigitsChange` 150ms debounce 로 `PATCH /customer-display/snapshots/:id { phone_partial: "08..." }` · 서버가 `phone_entry_state='typing'` 으로 승격 (M2-1124-B 로직 그대로). KeypadPanel mount 시에도 `""` 1회 — 서버는 `waiting` 유지해 POS-1/POS-2 구분 (`phone_entry_state='waiting'` vs `'typing' + phone_partial`).

## 자기 검증 (Playwright 1366×1024)

- `cd-pos-sync-v2.spec.ts` 신규 5 테스트 모두 **PASS** (3초 ±0.5s 타이밍 `clock.fastForward(2500)` → payment-complete 유지 → `fastForward(1000)` → keypad 발화 확인)
- 스샷 5장 생성 (`apps/customer-display/screenshots/cd-pos-sync-v2/`):
  - `cd-1-welcome-no-active.png`
  - `cd-1-stale-paid-skipped-welcome.png`
  - `cd-2-3-payment-complete-right-receipt-left.png`
  - `cd-4-keypad-sheet-after-3s.png`
  - `cd-5-next-customer-welcome.png`
- 기존 e2e 132 모두 **PASS** · unit 313 **PASS** · CD + commerce-core typecheck **PASS** · naming-check **PASS**
- POS 영수증과 나란히 비교 스샷: 미실행 (M3-1126-D 가 POS 쪽 담당 · POS 로컬 실기 필요 · CD 쪽은 공용 view-model 사용으로 "같은 섹션" 보장)

## 이연 순증감

- +0 : 이 작업으로 이연 된 항목 없음.
- POS-1 ~ POS-6 · POS fork 담당 (M3-1126-D). 서버 필드 (`phone_entry_state`, `phone_partial`) 는 이미 DTO 노출 중 — M3 가 UI 처리만 복원.
- plans/cd-sync-contract-20261125.md v1.3 (`phone_partial` 재명시 + waiting/typing 구분) 는 curiocity-relay 분리 작업 (M0-1126-D 범위 밖 · PR 본문에 contract 1줄 명시).

## 변경 파일

- `apps/customer-display/app/index.tsx` · `cd-sync.tsx` (stale 가드 + 빈 building welcome + PhoneFlowScreen 통일)
- `apps/customer-display/src/screens/PhoneFlowScreen.tsx` (payment-complete variant · slide 수정 · onDigitsChange)
- `apps/customer-display/src/components/cd-sync/PaymentCompletePanel.tsx` (신설)
- `apps/customer-display/src/components/cd-sync/KeypadPanel.tsx` (onDigitsChange prop)
- `apps/customer-display/src/components/cd-sync/LeftPaymentPanel.tsx` (receipt-mini 전 섹션 확장 · paper 320→640)
- `apps/customer-display/src/lib/cd-screen-selector.ts` (payment-complete RightPanel 타입)
- `apps/customer-display/e2e/cd-pos-sync-v2.spec.ts` (신규)
- `apps/customer-display/e2e/live-cd-route.spec.ts` (receipt-full → PhoneFlowScreen 어설션 갱신)
- `docs/feature-map.yaml` (신규 e2e 등록)
