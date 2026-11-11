# M3-1105-AR 리포트 — Void PIN iPad 실기 실패 수정

## 대조표 (코드 file:line)

| prop            | CardTenderPanel · card_last4 (성공)             | ManagerPinSheet · PIN (실패 · 수정 전)        |
| --------------- | ---------------------------------------------- | -------------------------------------------- |
| keyboardType    | `"numeric"`  · CardTenderPanel.tsx:99          | `"number-pad"` · ManagerPinSheet.tsx:160 (前) |
| inputMode       | (없음)                                          | `"numeric"` · ManagerPinSheet.tsx:161 (前)    |
| maxLength       | `4`           · CardTenderPanel.tsx:100        | `1` × 4 (각 칸) · ManagerPinSheet.tsx:162 (前)|
| secureTextEntry | (없음)                                          | `true`           · ManagerPinSheet.tsx:164 (前)|
| textContentType | (없음)                                          | `"oneTimeCode"`  · ManagerPinSheet.tsx:163 (前)|
| TextInput 수    | 1                                              | 4 + focus hop · ManagerPinSheet.tsx:150-172 (前)|

## 원인 한 줄

iPadOS 는 `secureTextEntry=true` + `textContentType="oneTimeCode"` 입력을 **보안·자동입력 입력**으로 간주해 작은 숫자 팝업 패드 대신 전체 QWERTY 를 띄운다. 또 4개 TextInput + focus hop 은 iOS autofill/붙여넣기 와 경합해 첫 글자가 중간 칸으로 튀는 2차 원인.

## 수정 요약

- `components/ui/DigitsInput.tsx` 신설 — 공용 상수 `DIGITS_INPUT_PROPS` (`keyboardType:"numeric"` · `inputMode:"numeric"` · `autoCapitalize:"none"` · `autoCorrect:false`) + `displayBoxes` 모드 (숨은 TextInput 1개 + 4칸 표시만 View).  ● 가림은 화면 표시만 — `secureTextEntry` 는 쓰지 않음.
- `ManagerPinSheet` · `VoidRefundSheet`(PIN 단계) → `<DigitsInput displayBoxes secureTextEntry … />`. 구조적으로 칸 건너뜀 불가능.
- `CardTenderPanel` 수정 금지 (원래 성공 케이스) — `keyboardType="numeric"` 그대로.
- `constants/build.ts` + `components/ui/BuildBadge.tsx` 신설 — 개발 빌드(`__DEV__`)에서만 노출되는 작은 회색 `build ar-void-pin-keypad · 2026-11-11` 표시, PIN 시트 하단에 삽입.

## PR 번호

**#95** · <https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/95>  
브랜치 `feat/m3-1105-ar-void-pin-keypad` · base `master` (`e774e7e`).

## PR 본문 확인(실기) 항목 — iPad 실기 재검증 필요

- [ ] Void → Confirm → PIN 단계 진입 시 **작은 떠 있는 숫자 팝업 패드** 뜸 (카드 끝 4자리와 동일).
- [ ] 1→2→3→4 로 넣으면 그대로 1→2→3→4 로 들어감.
- [ ] 네 자리 채우면 Verify 자동 제출.
- [ ] 백스페이스로 뒤 칸부터 지워짐.
- [ ] 시트 하단 `build ar-void-pin-keypad · 2026-11-11` 작은 회색 표시 확인.

## 실행 로그

- `scripts/m3-1105-ar-assertions.mjs` · **24 passed · 0 failed**.
- `scripts/m3-1105-aj-assertions.mjs` · **35 passed · 0 failed** (기존 AJ 호환 통과).
- 기존 `run-all assertions` 신규 실패 0. AD/AE/D 는 `origin/master` 에서 이미 실패하던 fixture·receipt kind 어설션 — 이 PR 과 무관.
- `npx tsc --noEmit` — 신규 파일에서 에러 없음. 남은 두 개 (global.css 사이드이펙트 · FlashList 타입) 는 origin/master 에 이미 있는 선행 에러.
- `run-all playwright` 는 중단함(부분 실행만 확인) — PIN 플로우는 playwright 로 커버되는 테스트가 없어 영향 없음. 웹은 OS 소프트키보드가 뜨지 않으므로 props 덤프 (`screenshots-m3-1105-ar/keyboard-props-dump.md`) 로 대체.

## 이연 순증감

- +1 : 실기 재검증 (iPad) — 이 PR 머지 후 Kyu 가 EAS 개발 빌드로 확인 필요.
- -1 : PIN iPad 큰 키보드 · 칸 순서 실패 (이 PR 로 해소).
- 순증감 **0**.

## 영향

- 열린 PR #91(RefundRetrySheet) 와 같은 DigitsInput 을 쓰게 되나, 기존 props 시그니처(`value` · `onChangeText` · `onComplete` · `disabled` · `hasError` · `secureTextEntry` · `placeholder` · `testID`) 는 그대로 유지. 신규 optional (`displayBoxes` · `boxTestIdPrefix` · `maxLength`) 만 추가.

## 착지 명령

```sh
cp /tmp/M3-1105-AR-report.md ~/projects/curiocity-relay/m3/ && \
cd ~/projects/curiocity-relay && \
git add m3/M3-1105-AR-report.md && \
git commit -m "m3: M3-1105-AR" && \
git pull --rebase --autostash origin main && \
git push && \
node scripts/claim.mjs M3-1105-AR done "PR #95 · PIN 숨은 TextInput 1개 + 4칸 표시만 · secureTextEntry 제거 · 공용 DIGITS_INPUT_PROPS · BuildBadge"
```
