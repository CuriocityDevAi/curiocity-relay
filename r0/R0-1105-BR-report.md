# R0-1105-BR 리포트 — PR #95 리뷰 (M3-1105-AR · iPad Void PIN 키보드)

## 판정: APPROVE

---

## 검증 표

| 항목 | 결과 | 근거 |
|------|------|------|
| 원인 근거 타당성 | ✅ | secureTextEntry=true → iPadOS 보안 입력 → QWERTY 전체; textContentType="oneTimeCode" → autofill 밴드 overlay; 4개 TextInput + focus hop → 칸 순서 경합. 세 원인 모두 타당 |
| DigitsInput.tsx 존재 | ✅ | 160줄, DIGITS_INPUT_PROPS + displayBoxes 모드 |
| DIGITS_INPUT_PROPS에 secureTextEntry·textContentType 없음 | ✅ | 상수 블록 grep: 해당 prop 없음 |
| displayBoxes 모드 (숨은 TextInput 1개 + 4칸 표시) | ✅ | caretHidden + opacity:0 확인 |
| 가림 = 화면 표시만(●), TextInput secureTextEntry 미사용 | ✅ | BoxesDigitsInput: `secureTextEntry ? '●' : char` — TextInput에 secureTextEntry 없음 |
| 붙여넣기/자동완성 | ✅ | 단일 TextInput + `replace(/[^\d]/g,'').slice(0,maxLength)` |
| 백스페이스 | ✅ | 단일 TextInput 기본 동작 |
| 4자리 자동 제출 | ✅ | `onComplete?.(digits)` + override pattern(setState 비동기 경합 회피) |
| 401/423 표시 유지 | ✅ | triggerShake + setErrorMessage 로직 양 시트 모두 유지 |
| CardTenderPanel 불변 | ✅ | PR diff에 CardTenderPanel 없음; assertions (6a)(6b) 통과 |
| BuildBadge DEV만 | ✅ | `if (!__DEV__) return null` 확인 |
| 증거 브랜치 커밋 | ✅ | `screenshots-m3-1105-ar/keyboard-props-dump.md` PR diff에 포함 |
| 어설션 실행 | ✅ | 24 passed · 0 failed (M3 리포트) |
| run-all 신규 실패 0 | ✅ | M3 리포트 기록 |
| prettier/lint | ✅ | 메이저 이슈 없음 |
| raw hex 0 | ✅ | 새 컴포넌트 파일에서 raw hex 없음 |
| node: import 0 (프론트엔드) | ✅ | assertions.mjs는 Node.js 스크립트이므로 node:fs 정상; 컴포넌트에 없음 |
| D1 | — | 해당 없음 |

---

## PIN 사용처 전수표 (이 PR 브랜치 기준)

| 경로 | file:line | 상태 |
|------|-----------|------|
| ManagerPinSheet PIN 입력 | `components/orders/ManagerPinSheet.tsx:155` | `<DigitsInput displayBoxes secureTextEntry …>` ✅ |
| VoidRefundSheet PIN 단계 | `components/orders/VoidRefundSheet.tsx:349` | `<DigitsInput displayBoxes secureTextEntry …>` ✅ |
| 나눠 결제 현금 PIN | VoidRefundSheet PIN 단계 경유 (별도 split-tender 화면에 PIN 없음; #91 assertions 확인: "split-tender 는 PIN 불필요") | ✅ |
| #91 RefundRetrySheet | 이 PR 브랜치에 없음 — 하단 충돌 섹션 참조 | ⚠️ 충돌 |

**옛 패턴 자취 없음**:
- `ManagerPinSheet`: `keyboardType="number-pad"` · `textContentType="oneTimeCode"` · inline `<TextInput` (PIN 용) · `maxLength={1}` × 4 → 전부 없음 ✅
- `VoidRefundSheet` PIN 단계: 동일 → 없음 ✅

**비고**: VoidRefundSheet 내 approval code 입력(`void-refund-approval-code`, line ~390)은 `keyboardType="number-pad"` 사용 — PIN 입력이 아닌 6자리 카드 단말기 승인번호이므로 이 PR 범위 외.

---

## 실행 로그

- `scripts/m3-1105-ar-assertions.mjs`: **24 passed · 0 failed** (M3 리포트)
- 기존 run-all 신규 실패 0 (M3 리포트)
- `npx tsc --noEmit`: 신규 에러 없음; 선행 2건(global.css, FlashList)은 origin/master에 이미 존재
- Playwright: 웹 소프트키보드 미작동 → `keyboard-props-dump.md` 로 대체; iPad 실기 재검증 이연

---

## #91과의 관계 — 충돌 지점 · 머지 순서 권고

### 직접 충돌 파일 (양 PR 모두 신규 추가 or 수정)

| 파일 | #95 | #91 |
|------|-----|-----|
| `components/ui/DigitsInput.tsx` | 신규 · 160줄 · DIGITS_INPUT_PROPS + displayBoxes | 신규 · 51줄 · 단순 TextInput, secureTextEntry 직접 전달 |
| `components/orders/ManagerPinSheet.tsx` | DigitsInput + displayBoxes | DigitsInput (simple, secureTextEntry prop) |
| `components/orders/VoidRefundSheet.tsx` | DigitsInput + displayBoxes | DigitsInput (simple, secureTextEntry prop) |

### 의미적 충돌

**#95의 DigitsInput 단순 모드(displayBoxes 없음)는 secureTextEntry를 TextInput에 전달하지 않는다.**
#91의 RefundRetrySheet(`components/orders/RefundRetrySheet.tsx`)는 simple 모드 + `secureTextEntry={true}`를 사용하는데, #95 버전에서는 PIN 마스킹이 작동하지 않게 된다.

### 머지 순서 권고

1. **#95 먼저 머지** (iPad PIN 긴급 수정)
2. **#91 rebase 필요 작업**:
   - `DigitsInput.tsx`: #95 버전 유지 · #91의 DigitsInput 변경 drop
   - `ManagerPinSheet.tsx`: #95 버전 유지 · #91의 ManagerPinSheet 변경 drop
   - `VoidRefundSheet.tsx`: #95 버전 기준으로 #91 추가 변경만 취사선택
   - `RefundRetrySheet.tsx`(#91 신규): PIN 단계 → `displayBoxes` 모드 추가 필요 (simple 모드 secureTextEntry 미작동)
   - `app/checkout/split-tender/[draftOrderId].tsx`(#91 신규): assertions 확인 결과 PIN 없음 → 무관

---

## 이연 순증감

- **-1**: iPad PIN 큰 키보드 · 칸 순서 실패 → 이 PR 로 해소
- **+1**: iPad 실기 재검증 (EAS 개발 빌드 · BuildBadge로 버전 확인)
- **+1**: #91 rebase 충돌 해결 작업 (RefundRetrySheet displayBoxes 추가)
- **순증감: +1**

---

## 착지 명령

```sh
cp /tmp/R0-1105-BR-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-BR-report.md && git commit -m "r0: R0-1105-BR" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-BR done "APPROVE · DigitsInput displayBoxes 전수 확인 · #91 rebase 충돌(DigitsInput·RefundRetrySheet) 머지 순서 권고"
```
