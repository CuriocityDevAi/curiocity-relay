#400 APPROVE · probe 4/4 · vitest 221/221 · #402 CHANGES · overlap 12/12 · mutation O · 순서 #400→#402 O

---

## PR #400 (HEAD a1d53ae)

**판정: APPROVE**

### tsc / vitest
- `pnpm --filter customer-display typecheck` → 0 errors
- `npx vitest run` → 221/221 passed (12 test files)

### nextScreen probe 4건 (코드 추적 + 기존 vitest 커버)

① **번호 없이 결제 → receipt → keypad-after → Skip → done → main** (pre_entry=false)
- paid snap from "cart" → line 357 `stay("receipt")` ✓
- RECEIPT_DONE on "receipt" + pre_entry=false + kav=false → line 204 `stay("keypad-after")` ✓
- KEYPAD_SKIP on "keypad-after" → line 215 `stay("done")` ✓
- DONE_TIMER on "done" → line 193 `stay("main")` ✓
- 커버 test: `M3-1119-U · keypad-after 전이 (REQ a)`

② **keypad-after → OK → consent → Agree → receipt → done (keypad-after 재등장 X)**
- KEYPAD_OK on "keypad-after" → line 219 `stay("consent", ..., kav=true)` ✓
- KEYPAD_OK on "consent" + paid → line 258 `stay("receipt")` (kav 유지) ✓
- RECEIPT_DONE on "receipt" + kav=true → line 200-201 `stay("done", ..., kav=false)` ✓ (keypad-after 재등장 없음)
- 커버 test: `M3-1119-W · keypad-after→consent→receipt→done`

③ **consent 중 다음 손님 idle → 새 손님 번호 없이 결제 → keypad-after 표시 O**
- M3-1119-X: consent(kav=true) + idle → kav 초기화(line 169) → "main" ✓
- 새 paid(pre_entry=false) from "main" → "receipt" ✓
- RECEIPT_DONE + kav=false + pre_entry=false → "keypad-after" ✓
- 커버 test: `M3-1119-X · idle/id 변경 시 kav 초기화`

④ **같은 paid snapshot 재진입 금지**
- DONE_TIMER on "done" → line 193 doneSnapshotId=snap.id 기록 ✓
- 같은 paid + "main" + doneSnapshotId 일치 → line 345-346 `stay(currentScreen)` = "main" ✓
- 커버 test: `M3-1119-U · DONE_TIMER 후 같은 paid 재진입 금지`

### commerce-core IT `cd-*`
- `bash scripts/it.sh cd-` 실행 (로컬 Postgres) → **2/2 통과**
  - `cd-snapshot-skip.spec.ts`: 7/7 ✓
  - `cd-pos-screen-sync.spec.ts`: pass ✓

---

## PR #402 (HEAD b54e05e)

**판정: CHANGES**

### Playwright cd-flow-overlap
- `pnpm build:web` 후 chromium → `npx playwright test cd-flow-overlap` → **12/12 통과**

### 직전 지적 4건 반영 확인

1. **겹침 판정 글자 rect** ✓ 반영
   - `el.getBoundingClientRect()` → `Range.getBoundingClientRect()` (글자/glyph 단위 rect)
   - 커밋 0ca1a22 diff 확인

2. **globe 없으면 fail** ❌ **미반영**
   - 현재 코드: `if (!root || !globe) return null` → rects=null → `if (rects && rects.globeVisible)` assertion 건너뜀 → 테스트 통과
   - globe-button 이 DOM에 없으면 조용히 pass. 직전 CHANGES에서 명시적으로 "globe 없으면 fail 로" 요청됐으나 처리 안 됨.
   - **고칠 것**: `if (!root || !globe) return null` 대신 `if (!root) return null; if (!globe) return { globeMissing: true }` + `expect(rects?.globeMissing, 'globe-button not found').toBeFalsy()`

3. **display_id typeof number 무조건 단언** ✓ 반영
   - 이전: `if (s!.display_id !== null && ...) { ... }` (조건부)
   - 현재: `expect(s!.display_id).not.toBeNull()` + `expect(typeof s!.display_id).toBe("number")` (무조건)
   - **mutation O**: display_id null 되돌리면 `expect(s!.display_id).not.toBeNull()` 빨강 ✓

4. **시나리오 ⑦ qris→paid, ⑧ keypad-after→consent** ✓ 반영
   - ⑦ qris 중 paid snapshot 도착 → receipt 전환 (커밋 0ca1a22)
   - ⑧ keypad-after KEYPAD_OK → consent · keypadAfterVisited=true (커밋 0ca1a22)

### 머지 순서 #400 → #402

- `git diff fix/M3-1119-O-cd-sync...test/M3-1119-V-cd-flow-e2e --name-only` → 2개 파일만
  - `apps/commerce-core/integration-tests/pos/cd-full-flow.spec.ts`
  - `apps/customer-display/e2e/cd-flow-overlap.spec.ts`
- #400 머지 후 #402 diff = 테스트 파일만 ✓

### CI (#402 HEAD b54e05e)

| Check | 결과 | 소요 |
|-------|:----:|-----:|
| heavy-mac | ✅ | 14m 33s |
| ci / markers-and-forbidden | ✅ | 27s |
| ci / changes-filter | ✅ | 21s |

---

## 고칠 것 (#402)

1. `cd-flow-overlap.spec.ts` globe 미발견 시 fail: `if (!root || !globe) return null` 로직에서 globe 없으면 assertion 으로 fail 처리 필요.
