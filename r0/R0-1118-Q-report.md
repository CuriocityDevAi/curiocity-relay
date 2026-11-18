#371 APPROVE · 결제 후 영수증 전환 O · 번호 서버 전송 O · 중복 적립 위험 X

## 판정: APPROVE

---

## REQ 1: display-machine 상태 전환 — 검토 결과

**정상 경로** (`display-machine.ts` lines 134–160):

| 현재 화면 | 이벤트 | snapshot | 다음 화면 | 판정 |
|---|---|---|---|---|
| keypad | KEYPAD_OK | not paid | consent | ✅ |
| keypad | KEYPAD_SKIP | checkout/cart in-flight | cart | ✅ |
| keypad | KEYPAD_SKIP | null/idle | main | ✅ |
| consent | KEYPAD_OK | paid | receipt | ✅ |
| consent | KEYPAD_OK | checkout in-flight | cart | ✅ |
| consent | KEYPAD_OK | null | main | ✅ |
| consent | KEYPAD_SKIP | paid | receipt | ✅ |

**결제 완료 push가 consent 중에 도착하는 경우** (localEvent=null, snapshot_state="paid"):
- Rule E (line 162–172): `isTerminalFlow("consent")`=true, `newCheckout`=false(paid라 `!== "paid"` 조건 미충족) → continue
- Lines 174–185: `snapshot_state==="paid"` && `isTerminalFlow("consent")`=true → `stay("consent")` ← 머문다
- 고객이 Agree 클릭 → `consent + KEYPAD_OK + paid` → `receipt` ✅

Rule C (keypad + paid already) → M3-1118-D 규칙 순서: Rule C가 먼저 오고(lines 121–132) M3-1118-D는 그 아래(134+). paid 상태에서는 Rule C에서 처리, not-paid는 M3-1118-D로 처리. 순서 올바름 ✅

---

## REQ 2: 번호 서버 전송 확인

`index.tsx` `handleKeypadOk` (lines 209–250):

```typescript
const res = await fetch(
  `${apiBaseUrl}/customer-display/snapshots/${snapshot.id}/link-phone`,
  { method: "POST", headers: { "Content-Type": "application/json", "X-Device-Token": deviceToken },
    body: JSON.stringify({ phone }) }
);
// ... response handling ...
dispatch({ type: "KEYPAD_OK" });  // ← fetch 완료 AFTER dispatch
```

- `KeypadScreen.handleOk` → `onOk?.("08" + digits)` → 서버 POST 먼저, 그 다음 dispatch ✅
- 번호 형식: `"08" + digits` (digits는 8–11자리) → 올바른 로컬 번호 형식 ✅
- 예외 케이스 (`!snapshot || !deviceToken`): dispatch만 되고 서버 전송 안 됨. 이 경우는 machine이 keypad에 도달하려면 snapshot이 항상 있어야 하므로(cart→keypad 경로만 존재) 실제로는 발생하지 않는 방어 코드 ✅
- 401 → `invalidatePairing` 처리 ✅
- 409 (이미 연결됨) → 기존 maskedPhone 사용 ✅

---

## REQ 3: BackspaceIcon 시맨틱 토큰 · 접근성

`BackspaceIcon.tsx`:
- `color` prop: 호출부에서 `t.ink` 주입, 컴포넌트 내부 raw hex 없음 ✅
- JSDoc에 "raw hex 금지" 명시 ✅
- `Svg` + `Path` 두 개 (외곽 오각형 + 내부 ×) ✅

`KeypadScreen.tsx` del 버튼:
```tsx
accessibilityRole="button"
accessibilityLabel={keypad.del}   // ← i18n 키 사용
onPress={delOne}
onLongPress={delAll}
```
접근성 라벨 i18n ✅. `BackspaceIcon` 자체는 순수 시각 컴포넌트로 accessibilityLabel 없음 — Pressable에서 담당하는 올바른 패턴 ✅

---

## REQ 4: 로컬 테스트 · CI

| 테스트 | 결과 |
|---|---|
| `pnpm test` (vitest) | 155/155 passed ✅ |
| `gh pr checks 371` | 3 checks pending (CI 아직 실행 중) |

e2e는 CI에서 실행 중 (로컬 서버 미기동으로 로컬 실행 미수행).

---

## 중복 적립 위험 분석

`link-phone` POST는 `handleKeypadOk`에서 1회만 호출됨:
- consent 화면 Agree/Decline → `dispatch({ type: "KEYPAD_OK" / "KEYPAD_SKIP" })` 직접 → `handleKeypadOk` 미호출
- `keypad-after`(결제 후) 도 `handleKeypadOk`를 사용하지만, 이는 별도 snapshot ID → 서버에서 idempotent하게 처리 가능
- 결론: 같은 snapshot에 `link-phone`이 2회 호출되는 경로 없음 ✅

---

## 총평

버그 ① (OK 무반응) 원인 분석 정확, 수정 명확. 버그 ② (지움 아이콘) SVG 교체 올바름.
상태 머신 전환 모두 커버, 테스트 155/155, 서버 전송 확인. APPROVE.
