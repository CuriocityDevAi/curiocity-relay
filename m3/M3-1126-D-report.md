OK · PR https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/270 · POS-2 회귀 원인: PR #266 (M3-1125-R) 가 CustomerFlowChip 신설하면서 typing 분기의 `status.partial` live-digits 를 "Customer typing" 고정 문구로 교체 — contract 의 `flow.phone` 전체 숫자 필드를 읽지 않음.

# M3-1126-D · 결제 완료 UX 묶음 수정 리포트

- 판정: **OK** (6 요구사항 모두 구현 · 테스트 · 어설션 녹색 · PR 공개)
- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/270
- 브랜치: `feat/M3-1126-D` (origin master `fe69369` 기준)
- 커밋: `05c4bac feat(loyalty+receipt): M3-1126-D — POS-1~6 손님 흐름 칩·Hand over·영수증 NaN 수정`

## POS-1~6 1줄 확인
- **POS-1**: `components/customer-display/CustomerPhoneStatus.tsx` — CustomerFlowChip `typing` 에서 `flow.phone` 길이 0 이면 "Waiting for customer" 로 노출 (이전 "Customer typing").
- **POS-2**: 동일 파일 · `partial.length > 0 ? ${partial}… : …` — live digits 복구. **회귀 원인 = PR #266 (M3-1125-R)** · legacy `status.partial` 를 제거하고 "Customer typing" 고정 텍스트로 대체했던 커밋.
- **POS-3**: 동일 파일 · `confirmed` 칩에서 `flow.points_earned != null` 이면 `· +Rp <earned>` (이번 적립액), `null` 이면 기존 `IDR <balance>`.
- **POS-4**: `components/payment/SuccessReceiptAnim.tsx` — Hand over / Done 의 `shouldDisableNextOrder(...)` 제거, "Waiting for customer to enter loyalty number" 문구 삭제. 로열티 상태와 무관하게 항상 활성.
- **POS-5**: `SuccessReceiptAnim.LinkCustomerCard` — `customer_flow.state ∈ {entering, first_visit, confirming, confirmed}` 이면 `null` (버튼 비노출). 진행 중·완료 모두 포함.
- **POS-6**: `types/receipt.ts` · `resolveLineTotal()` 신설. 서버 snapshot 은 `total:` 키 (`storeport receipt/service.ts:274 total: it.line_total`) 로 저장 → 클라가 `line_total:` 만 읽어 undefined → `formatIDR(NaN) = "IDR NaN"`. `line_total → total → qty×unit_price−discount` 순 복구. `formatIDR` 도 NaN/undefined 입력 `IDR 0` 가드.

## 자가 검증
- `npx vitest run` — **1150 pass / 6 expected fail / 3 todo**, 89 test files 전부 녹색. 신규 `__tests__/m3-1126-d-pos-fixes.test.ts` 25건 포함.
- `npx expo lint` — **0 error** (71 pre-existing warnings 유지 · 변경 파일 신규 에러 없음).
- `npx playwright test e2e/flows/M3-1126-D-pos-fixes.spec.ts` — **10/10 pass** (약 14초 · 첫 실행에서 stale `serve` 서버 캐시 발견 → kill 후 재실행 녹색).
  - 칩 4상태 스크린샷 (파일 저장됨): `e2e/screenshots/M3-1126-D-chip-{A-waiting,B-typing-digits,C-confirming,D-confirmed-earned}.png`
  - Hand over 활성 어설션: `customer_flow = none / entering / confirmed` 모두에서 `expect(handOver).toBeEnabled()` + `hand-over-tooltip` 없음.
  - Link customer 숨김: `confirmed` · `entering` 두 상태에서 `getByTestId('link-customer-open').toHaveCount(0)`.
  - 옵션 품목 숫자 어설션: `total:` 키 shape 기반 fixture + `Lemon` variant_title · `section.toContainText('IDR 18,000')` + `section.not.toContainText('NaN')`.

## 변경 파일 (12 files · +470 / −28)
- `api/hooks/pos-payments.ts` — formatIDR NaN/undefined 가드
- `components/customer-display/CustomerPhoneStatus.tsx` — CustomerFlowChip 4상태 재구성 (POS-1·2·3)
- `components/payment/SuccessReceiptAnim.tsx` — Hand over 활성 + Link customer 숨김 (POS-4·5)
- `components/receipt/ReceiptCard.tsx` — resolveLineTotal 적용 (POS-6)
- `lib/printer/receipt-escpos.ts` — 영수증 ESC/POS 도 resolveLineTotal 적용
- `types/receipt.ts` — ReceiptItem line_total/total 양쪽 수용 + resolveLineTotal 헬퍼
- `__tests__/m3-1126-d-pos-fixes.test.ts` (신규 · 25 tests)
- `e2e/flows/M3-1126-D-pos-fixes.spec.ts` (신규 · 10 tests)
- `e2e/screenshots/M3-1126-D-chip-{A..D}.png` (신규 · 자가 검증 이미지)

## 이연 순증감
- **없음**. storeport(M0-1126-D 담당) 는 미수정. `resolveLineTotal` 은 서버가 `total:` → `line_total:` 로 바뀌어도 회귀 0 (양쪽 수용). 계약서 기준 `customer_flow.phone` 필드만 사용 · 서버 필드 이름 하드코딩 추측 없음.
- 관찰: PR #266 (M3-1125-R) 는 legacy `phone_entry_state/phone_partial` 경로를 유지한 채 `customer_flow.phone` live digits 를 CustomerFlowChip 에만 떨어뜨렸던 게 POS-2 회귀의 직접 원인. 본 PR 로 복구.
