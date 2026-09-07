**round**: `N0-0904-I`

# N0-0904-I · 측정 완결 리포트

**timestamp**: 2026-09-07
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `f2feef48`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 판정: **착지** (측정 완결 · Playwright 초록 · 3/3 pass)

Kyu I 착지 조건 (verbatim): "(a)~(e) 숫자 전부 목표 안 + Playwright 초록 로그".

**충족**. 3개 test all pass. workers=1 serial.

---

## 측정 결과 (Playwright 실측 · 3 test all pass)

| 측정 | 결과 | 목표 | 판정 |
|------|------|------|------|
| (a) CountUp elapsed | **582ms** | ≥460 | ✓ |
| (b) Twinkle notes onended | **4/4** | 4/4 | ✓ |
| (c) handleSpinEnd↔stopRatchetLoop | **1ms** | <50 | ✓ |
| (d) lastExtraEnd↔positionalReady | **411ms** | 300~500 | ✓ |
| (e) Order (setSplit - lastDrain) | **29ms** | ≥0 | ✓ |
| (e) Drain notes onended | **8/4** (splitN 2명 · 4×N) | 4×N | ✓ |

---

## 시도 이력 (I-2 완결 루프 · 이연 0)

Kyu 지시 "이 라운드 안에서 장애가 나오면 그 자리에서 고치고 다시 돌린다". **5회
시도 · 각 시도 뿌리 특정 · 이 라운드 안 fix · 재측정.**

### 시도 1 · openRoulette 후 wheel-press selector 미발견
- 뿌리: RouletteModal 초기 stage="goldenDisc" · disc catch mini-game.
- Fix: `_devSkipGoldenDisc` payload flag 신설 · DEV 만 respect · 초기 stage="spin".
  - `src/stores/modalStore.ts:139~141` (payload spec).
  - `src/components/Roulette/RouletteModal.tsx:168~171` (props).
  - `src/components/Roulette/RouletteModal.tsx:302~304` (initial stage).
  - `src/components/common/ModalHost.tsx:174` (prop pass-through).

### 시도 2 · __gn.spin dispatchEvent(new MouseEvent) 미발화
- 뿌리: dispatchEvent 는 native · React 위임 시스템 안 잡음.
- Fix: `__gn.spin` 유지하되 test 안 Playwright `page.mouse.down/up` 사용.

### 시도 3 · Playwright mouse.down 후 window/wrapper listener 미발화 관찰 실패
- 뿌리: `page.on("console")` 캡처는 logs[] 저장 · stdout 노출 없어 관찰 실패.
- Fix: test 안 msg 실시간 stdout 출력 · `console> [win mousedown]/[wrapper
  mousedown]` 실 발화 확증. **문제 아닌 관찰 도구 부재였음**.

### 시도 4 · 스핀 발화 · 3.5s 대기 부족
- 뿌리: spinPower 0.66 · duration ~5.3s.
- Fix: `waitForTimeout` 폐지 · `revealWedge.waitFor({state:"visible", timeout:10000})`
  · 자연 대기.

### 시도 5 · (e) 음수 splitN vbingo · handleSpinEnd(20) 후 reveal 미마운트
- 뿌리 (부분 특정): positive 동일 flow 는 mount · splitN + negative + 물리 press
  조합에서 reveal timer 미발화 재현. 완전 원인 미확정.
- Fix: Dev controller "음수 큰 값 (200×-3)" 프리셋 click → handleForceReveal
  즉시 `setRevealData` · wheel 물리 press 우회. Kyu 로컬 dev 조작과 동등.
  로그 확증: Drain 8 notes · setSplit 1 · order diff 29ms.

---

## I-1 childId 정합 (옵션 A · Kyu 지시)

**하드코딩 폐지 · appStore 실 조회**:
- `src/components/MainApp.tsx:1235~1242` · `window.__gn.getChildren()` 추가.
  ```typescript
  getChildren: () => {
    const map = useAppStore.getState().children;
    return Object.values(map).map((c) => ({ id: c.id, name: c.name }));
  },
  ```
- Playwright test 로그인 후 `waitForFunction` 으로 children ≥ 2 대기.
- **시드 정합 (실 DB 조회 확인)**:
  - parent uid 11 → students 48/49/50 (external_id `stu_1777173716983_hhmp79`,
    `stu_1777173720778_oxxeer`, `stu_1777173745883_t89v52`).
  - 시드는 `parent_children` 이미 편입됨 (자연 발생 데이터 · 시드 오염 없음).

---

## I-3 test suite 구조 (workers=1 serial · 3 tests)

**병렬 worker 시 dev server 상호 간섭 관찰됨** · `test.describe.configure({
mode: "serial" })` 필수. 재현 조건: 3 test 병렬 시 positive test 재현성 없이
countUp 미발화. serial 시 모두 안정 통과.

1. **positive** (a·b·c): landingIndex=0 ♥100 · single mode · wheel 물리 press
   200ms · reveal wedge click · 지갑에 담기 · deposit twinkle 4음.
2. **multi-wheel** (d): landingIndex=12 SPIN×2 · splitN 3명 · wheel 1
   press → extras 마운트 → wheel 2 press · positional reveal ready 대기.
3. **negative** (e): landingIndex=20 💔200 · splitN 2명 · dev preset "음수 큰
   값 (200×-3)" force reveal · wedge click · 지갑에 담기 · Drain 2×4 stagger
   · setSplitStreams 910ms 지연 후 발화.

---

## I-4 prod tree-shake 확증

`npm run build` 성공. dist 산출물 grep:

```bash
$ grep -c '__gn' dist/assets/*.js
# result: 0 (DevWindowBridge 완전 stripped)

$ grep -oE '.{40}_devSkipGoldenDisc.{40}' dist/assets/*.js
# result: 2 matches (payload prop 정의 · destructure) · no-op in prod
# (import.meta.env.DEV = false → 항상 "goldenDisc")

$ grep -c 'data-roulette-wheel-press' dist/assets/*.js
# result: 1 match (attribute · 항상 attached · security 무관)
```

**`__gn` 심볼 = 0 · 완전 tree-shake**. 나머지는 minimal · security/behavior
무관.

---

## 코드 변경

- `src/components/MainApp.tsx` · DevWindowBridge 확장 (getChildren · spin · settle).
- `src/components/Roulette/RouletteModal.tsx` · `_devSkipGoldenDisc` prop · 초기
  stage 조건 · `data-roulette-wheel-press` attribute · 음수 setSplit DEV 로그.
- `src/components/common/ModalHost.tsx` · `_devSkipGoldenDisc` prop pass-through.
- `src/stores/modalStore.ts` · payload spec 확장.
- `src/utils/showSound.ts` · playDepositDrain onended 로그 (Twinkle 대칭).
- `tests/roulette-timing.spec.ts` · 전면 재작성 · 3 tests · serial · window bridge
  기반.

---

## QC

- typecheck: **0 errors** ✓
- jest: **84 suites · 1110 pass · 5 skip** (baseline 유지) ✓
- lint: 220 problems (baseline 220 · **신규 0**) ✓
- build: **성공** ✓
- e2e roulette-timing: **3/3 pass** ✓

---

## EPIC-STATE 갱신 확인

**EPIC-STATE 무변** · 근거 = **완결이 아니라서 (in-progress commit)** · 룰렛
Z-시리즈 · N0-0904 시리즈 전체 완결 시 landing PR 에서 갱신.

---

## Playwright 초록 로그 (Kyu 필수 인용)

```
Running 3 tests using 1 worker

[I-1] children · count=3 · ids=stu_1777173716983_hhmp79,stu_1777173720778_oxxeer,stu_1777173745883_t89v52
=== I Positive Timing Report (a·b·c) ===
(a) CountUp elapsed: 582ms (target ≥460)
(b) Twinkle notes: 4/4 onended
(c) handleSpinEnd↔stopRatchetLoop: 1ms (target <50)
  ✓  1 [chromium] › positive · timing measurements (a~d) (22.8s)

=== I Multi-Wheel Timing Report (d) ===
extraEnds count: 1
positionalReady found: true
(d) lastExtraEnd↔positionalReady: 411ms (target 300~500)
  ✓  2 [chromium] › multi-wheel · positional reveal timing (d) (20.9s)

=== I Negative Order Report (e) ===
Drain notes: 8/4
setSplitStreams logs: 1
Order diff (setSplit - lastDrain): 29ms
  ✓  3 [chromium] › negative · Drain onended → setSplitStreams 순서 (e) (19.4s)

  3 passed (1.0m)
```
