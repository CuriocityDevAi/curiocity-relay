DONE — master rebase · Card+QRIS 분류 · BUTTON_PY 공유 · 테스트 25개(+7) all pass · force-push #164

## 작업 내용

### REQ 1 · origin/master rebase + OptionChip 3-way 충돌 해소
- `feat/m2-1116-aq`를 `origin/master`(f04c8b5, #165·#163 포함) 위로 rebase 완료
- 충돌: `OptionChip.tsx`
  - **유지**: `labelClassName` prop (#164)
  - **유지**: `isTab && sublabel ? 'py-4' : 'py-6'` 높이 로직 (#165)
  - **유지**: `{isTab && sublabel ?` 인라인 sublabel (#165)
  - **유지**: `{!isTab && sublabel ?` 하단 sublabel (#165)

### REQ 2 · Card+QRIS 분류 (`card_qris`)
- `OriginalTender` / `RefundMethod`에 `'card_qris'` 추가
- `pickOriginalTender()`: `card+qris` 2종 → `'card_qris'` 반환
- `CARD_QRIS_OPTION`: label "Card terminal + QRIS refund" · `requiresTerminalApprovalCode: true` · `requiresPin: false`
- `buildCardQrisRefundBody`: `tenders:[{method:'card_terminal', terminal_approval_code},{method:'qris'}]` · `manager_pin` 없음
- `RefundRequestBody` tenders 분기: `manager_pin` optional (card+qris는 PIN 불요)
- `VoidRefundSheet`: `card_qris` 분기 추가 · `describeOriginalTender` "Card + QRIS"
- Void 차단(`isQrisVoidBlocked`): cash_qris/qris만 차단, card_qris는 단말기 취소 가능하므로 미차단

### REQ 3 · 버튼 높이 공유 상수
- `Button.tsx`: `export const BUTTON_PY = 'py-4'` 추가 · Button className: `p-4` → `${BUTTON_PY} px-4` (외관 동일)
- `OptionChip.tsx`: `BUTTON_PY` import · `sublabel ? BUTTON_PY : 'py-6'` / row `clx('rounded-xl px-4', BUTTON_PY)`
- `VoidRefundSheet.tsx`: `BUTTON_PY` import · `SHEET_CHIP_CLS = \`rounded-xl ${BUTTON_PY} px-3\``

### REQ 4 · 테스트
- 기존 18 케이스 → 25케이스 (card+qris 판별 1 + getRefundPlan 3 + buildCardQrisRefundBody 3 = +7)
- 전체 37 파일 · 432 passed | 6 expected fail ✅

### REQ 5 · force-push · PR 본문 갱신
- force-push: `origin/feat/m2-1116-aq` ✅
- PR #164 제목·본문 갱신 (Kyu 확인 항목 포함) ✅
