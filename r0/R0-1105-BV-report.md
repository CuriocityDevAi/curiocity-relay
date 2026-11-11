# R0-1105-BV 리포트

**판정: CHANGES** — C-BV-1 AJ assertion 오기입(manager-pin-input→manager-pin-digits) · C-BV-2 PR 3파일 prettier 위반.

---

## 삭제·이관 1:1 대조표 (AL/AM/AN → AR)

### AL 삭제 항목 → AR 대응

| 삭제 항목 | AR 번호 | AR regex/조건 | 판정 |
|---|---|---|---|
| DigitsInput.tsx 존재 | (1) | `fs.existsSync(digitsPath)` | ✅ |
| keyboardType="numeric" ×2 | (2b) | `/keyboardType:\s*'numeric'/.test(digitsSrc)` | ✅ |
| maxLength={4} | (8a) | `/maxLength\s*=\s*4/` | ✅ |
| slice(0,4) | (8b) | `/\.slice\(0,\s*maxLength\)/` | ✅ |
| digits.length===4 → onComplete | (8c) | `/digits\.length\s*===\s*maxLength/ && /onComplete/` | ✅ |
| replace 비숫자 필터 | (9a) | `/replace\(\/\[.*\\d.*\]\/g/` | ✅ |
| TextInput 사용 | (2e) | `/caretHidden/ && /opacity:\s*0/` | ✅ |
| VoidRefundSheet DigitsInput import | (3b) | `/from\s+'@\/components\/ui\/DigitsInput'/` | ✅ |
| VoidRefundSheet \<DigitsInput 렌더 | (3d) | `/<DigitsInput[\s\S]*displayBoxes/` | ✅ |
| VoidRefundSheet NumericKeypad 없음 | (4d/4e) | `!/textContentType="oneTimeCode"/` · `!/<TextInput[\s\S]{0,400}?manager-pin-digit-/` | ✅ |
| VoidRefundSheet onComplete→onSubmitPin | (8d) | `/onComplete[\s\S]{0,150}onSubmitPin/` | ✅ |
| ManagerPinSheet DigitsInput import | (3a) | `/from\s+'@\/components\/ui\/DigitsInput'/` | ✅ |
| ManagerPinSheet \<DigitsInput 렌더 | (3c) | `/<DigitsInput[\s\S]*displayBoxes/` | ✅ |
| ManagerPinSheet NumericKeypad 없음 | (4c) | `!/<TextInput\b/` | ✅ |
| ManagerPinSheet remaining_attempts | (11c) | `/remaining_attempts/` | ✅ |
| ManagerPinSheet locked_until | (11d) | `/locked_until/` | ✅ |
| CardTenderPanel DigitsInput/keyboardType | (6a) | DigitsInput import + card-last4-input testID (C-AS-2 재서명) | ✅ |

AL 재작성 (AR 미검사): `manager-pin-digits` testID — AL assertions 에서 직접 검사 ✅

### AM 삭제 항목 → AR 대응

| 삭제 항목 | AR 번호 | 판정 |
|---|---|---|
| DigitsInput 4자리 자동 제출 | (8c) | ✅ |
| DigitsInput keyboardType="numeric" | (2b) | ✅ |
| DigitsInput 비숫자 제거 | (9a) | ✅ |
| VoidRefundSheet DigitsInput import/render | (3b/3d) | ✅ |
| VoidRefundSheet textContentType 없음 | (4d) | ✅ |
| ManagerPinSheet DigitsInput import/render | (3a/3c) | ✅ |

### AN 삭제 항목 → AR 대응

| 삭제 항목 | AR 번호 | 판정 |
|---|---|---|
| DigitsInput maxLength={4} | (8a) | ✅ |
| DigitsInput slice(0,4) | (8b) | ✅ |
| DigitsInput 4자리 완성→onComplete | (8c) | ✅ |
| DigitsInput keyboardType="numeric" | (2b) | ✅ |
| DigitsInput TextInput 사용 | (2e) | ✅ |
| CardTenderPanel DigitsInput import/render | (6a) | ✅ |
| CardTenderPanel secureTextEntry 없음 | (6b) | ✅ |
| VoidRefundSheet DigitsInput import/render | (3b/3d) | ✅ |
| VoidRefundSheet onComplete→onSubmitPin | (8d) | ✅ |
| VoidRefundSheet remaining_attempts | (11a) | ✅ |
| VoidRefundSheet locked_until | (11b) | ✅ |
| ManagerPinSheet DigitsInput import/render | (3a/3c) | ✅ |
| ManagerPinSheet onComplete→onSubmit | (8e) | ✅ |
| ManagerPinSheet remaining_attempts | (11c) | ✅ |
| ManagerPinSheet locked_until | (11d) | ✅ |

AN 재작성 (AR 미검사): `manager-pin-digits` testID (AL/AN에서 직접 검사) · `setPin('')` 초기화 (AN검사) ✅

**결론: 약화 없음. 전 항목 1:1 대응 확인.**

---

## C-AS-2 DIGITS_INPUT_PROPS 검사 체인

AR 어설션:
- **(2a)** `export const DIGITS_INPUT_PROPS` 존재 → `✓ (실행 확인)`
- **(2b)** `keyboardType: 'numeric'` 포함 → `✓`
- **(6a)** CardTenderPanel이 DigitsInput import + `testID="card-last4-input"`으로 렌더 → `✓`

체인: `CardTenderPanel → <DigitsInput testID="card-last4-input"> → DIGITS_INPUT_PROPS → keyboardType:'numeric'`  
(2b)가 상수 자체를 검증, (6a)가 카드패널의 사용을 검증 → 같은 강도 ✅

---

## BuildBadge 검사

| 항목 | 결과 |
|---|---|
| 위치: `<View className="gap-4 pb-6">` 첫 번째 자식, `className="self-end"` (제목 바로 아래 우측) | ✅ |
| ManagerPinSheet + VoidRefundSheet PIN 단계 모두 사용 | ✅ |
| `if (!__DEV__) return null` 가드 | ✅ |
| 운영 번들 노출 0 (null 반환) | ✅ |
| `docs/M3-1105-AT-buildbadge-top.png` 브랜치 커밋 | ✅ |
| `className?: string` prop 추가 (clx 적용) | ✅ |

---

## 로컬 실행 로그

| 스크립트 | 결과 |
|---|---|
| m3-1105-al-assertions.mjs | ✅ PASS · 15 passed · 0 failed |
| m3-1105-am-assertions.mjs | ✅ PASS · 30 passed · 0 failed |
| m3-1105-an-assertions.mjs | ✅ PASS · 36 passed · 0 failed |
| m3-1105-ar-assertions.mjs | ✅ PASS · 35 passed · 0 failed |
| m3-1105-ao-assertions.mjs | ✅ PASS · 38 passed · 0 failed |
| m3-1105-aj-assertions.mjs | ❌ FAIL · 35 passed · **1 failed** |

```
  ✗ VoidRefundSheet · manager-pin-input testID (DigitsInput)
```

master에서 AJ는 37/0 PASS. PR 브랜치에서 1건 신규 실패.  
원인: scripts/m3-1105-aj-assertions.mjs가 이 PR에서 수정되면서 추가된 체크가  
`/testID=\{?"manager-pin-input"\}?/` 를 기대하지만 AN/AR 재작성 후 실제 testID는 `"manager-pin-digits"`.  
주석에 "AN: DigitsInput testID=manager-pin-input 으로 변경"이라 오기됨.

**run-all 결과: 총 41개 · 37 PASS · 4 FAIL**
- m3-1105-ad: FAIL (기존) · m3-1105-ae: FAIL (기존) · m3-1105-d: FAIL (기존)
- **m3-1105-aj: FAIL (신규)** ← CHANGES 사유

---

## prettier 검사 (PR 변경 파일)

```
[warn] scripts/m3-1105-aj-assertions.mjs   ← 이 PR 수정파일
[warn] components/orders/ManagerPinSheet.tsx ← 이 PR 수정파일
[warn] components/orders/VoidRefundSheet.tsx ← 이 PR 수정파일
```

3개 모두 이 PR scope 파일. CHANGES 사유.

---

## 이연 순증감

이전 BT 대비 변경 없음 (기존 이연 그대로 · 신규 이연 0).

---

## CHANGES 항목

### ❌ C-BV-1 — AJ 어설션 testID 오기입 (신규 실패 1건)

`scripts/m3-1105-aj-assertions.mjs`의 추가된 체크:

```js
// AN: DigitsInput testID=manager-pin-input 으로 변경 (NumericKeypad boxes 제거됨).
check('VoidRefundSheet · manager-pin-input testID (DigitsInput)', /testID=\{?"manager-pin-input"\}?/.test(vrSrc));
```

`manager-pin-input` → `manager-pin-digits` 로 수정 필요.  
(근거: VoidRefundSheet.tsx `testID="manager-pin-digits"` 사용 · AL/AN assertions도 동일하게 `manager-pin-digits` 검사)

### ❌ C-BV-2 — PR 3파일 prettier 위반

`scripts/m3-1105-aj-assertions.mjs`, `components/orders/ManagerPinSheet.tsx`, `components/orders/VoidRefundSheet.tsx`.  
전부 이 PR 수정파일. `npx prettier --write` 적용 필요.

---

## 착지 명령

```
cp /tmp/R0-1105-BV-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-BV-report.md && git commit -m "r0: R0-1105-BV" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-BV done "CHANGES · C-BV-1 AJ manager-pin-input→manager-pin-digits · C-BV-2 3파일 prettier"
```
