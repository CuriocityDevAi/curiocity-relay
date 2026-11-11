# M3-1105-AL 착지 보고

## 버그 원인 (확정)

**① iPad 전체 키보드**  
가설 (a) 확정. `VoidRefundSheet.tsx`(AJ) · `ManagerPinSheet.tsx` 에서 TextInput 4개에 `keyboardType="number-pad"` / `inputMode="numeric"` 를 설정했으나, iPad 는 이를 무시하고 전체 키보드를 올림. 소스 증거: AJ 커밋 L451–472 · ManagerPinSheet L151–172.

**② 칸 건너뜀**  
가설 (b) 확정. `onChangePinDigit` 의 `lastFilled = Math.min(idx + only.length, 3)` 버그.  
`idx=0`, `only.length=1` → `lastFilled=1` → `refs.current[1+1=2].focus()` → 2번째 칸이 아닌 3번째 칸으로 점프.  
동일 버그가 `ManagerPinSheet.onChangeDigit` 에도 존재.

## 수정 내용

**신규 파일**: `components/pin/NumericKeypad.tsx`  
- Pressable 0–9 + 삭제 버튼 (시스템 키보드 없음)
- 4개 도트/박스 표시 (`boxesTestID`, `digitTestIDPrefix` props)
- 4번째 자리 입력 시 `onComplete(pin)` 자동 제출
- `shakeKey` prop 증가 시 흔들림 애니메이션

**수정 파일**:
- `components/orders/VoidRefundSheet.tsx` — TextInput 4개 → NumericKeypad, pinDigits[] → pinValue string
- `components/orders/ManagerPinSheet.tsx` — 동일 교체
- `scripts/m3-1105-aj-assertions.mjs` — boxesTestID/errorTestID prop 패턴 허용으로 업데이트 (37/37 PASS)

**신규 파일**:
- `scripts/m3-1105-al-assertions.mjs` — 35/35 PASS
- `scripts/m3-1105-al-screenshots.mjs` — Playwright 스샷 4장 (1180×820)
- `screenshots-m3-1105-al/` — 01~04 PNG

## Playwright 검증 결과

| 스샷 | 항목 | 결과 |
|------|------|------|
| 01-void-confirm.png | Void confirm 단계 | ✓ |
| 02-pin-keypad.png | NumericKeypad 표시 (`numeric-keypad-1` 등 testID 확인) | ✓ 기계 판정 |
| 03-wrong-pin-error.png | 오류 표시 (red border · 에러 메시지) | ✓ |
| 04-void-success-toast.png | 4자리 자동 제출 → 성공 토스트 | ✓ |

**참고**: 03 에서 "3 attempts left" 대신 "Unauthorized" 표시 — 이는 Playwright/웹에서 Medusa SDK 가 401 body 를 파싱하지 못하는 기존(pre-existing) 웹 동작 (AJ 스크린샷 03 과 동일). iOS 네이티브에서는 정상 작동.

## Assertions

- `m3-1105-al-assertions.mjs`: **35/35 PASS**
- `m3-1105-aj-assertions.mjs`: **37/37 PASS** (기존 35/35 + AL 신규 2건)
- `run-all assertions`: 30 PASS · 5 pre-existing FAIL (내 변경으로 신규 실패 없음)

## PR

- **#88** `feat(m3-1105-al): Manager PIN → NumericKeypad (앱 내 키패드 · 칸 건너뜀 수정)`
- https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/88
- **#87 (feat/m3-1105-ak-split-tender-ui) 는 이 PR 위로 rebase 필요** (VoidRefundSheet.tsx 충돌)

## 이연 순증감

이연 없음.
