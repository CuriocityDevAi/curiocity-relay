# N0-0730-Z8 리포트 · 중앙 정렬 + 슈퍼 릴 재회전 + SPIN 아이콘 + 카드→스트림 순차

**Date**: 2026-08-08
**Round**: N0-0730-Z8 (Kyu B-9-f 실기 판정 후속)
**Branch**: `feat/roulette-z1-vertical-bingo`
**Head**: `5ad01169` (Z8) on top of Z7 → Z6 → Z5 → Z4 → Z3 → Z2 → Z-1.
**PR**: [#288](https://github.com/CuriocityDevAi/grownest/pull/288) · auto-merge OFF · Kyu approve 대기.

---

## Z8-1 · 중앙 정렬 (라벨·PowerBanner·말풍선)

### Kyu 관찰

"슈퍼빙고 라벨 · '꾹 누르거나 스와이프!' 배지 · 말풍선 전부 우측 치우침 — 룰렛 중심축 기준 중앙 정렬로 실측·수리."

### 뿌리 추정

**Containing block 이슈**:
- `RouletteModal` 안 wheel-wrap · participant-carousel 은 Z3-4 · Z7-6 에서 `<motion.div style={{display: "contents"}}>` wrapper 로 감쌈 (AnimatePresence ref 흡수).
- Motion library 는 `motion.div` 에 `transform` 인라인 스타일을 자동 편입 (GPU 가속 · `will-change: transform` 등).
- `display: contents` + `transform` 조합은 브라우저별 CSS 사양 애매 (`display: contents` 요소가 `transform` 을 가지면 · 컨테이닝 블록 규칙 미정의).
- 결과: 하위 요소 (WheelStage 안 inner div · PowerBanner) 의 `position: absolute` 참조가 예상 대로 흐르지 않을 수 있음. 시각적으로 왼쪽/오른쪽 shift.

### Fix (`src/components/Roulette/RouletteModal.tsx`)

**Wrapper 재정비** (display:contents → proper positioned):
```tsx
<motion.div
  key={`wheel-wrap-${superSpinIdx}-${againOverride?.counter ?? 0}`}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
  style={{
    position: "absolute",   // Z8-1 · display:contents 대체
    inset: 0,
    pointerEvents: "none",
  }}
>
  <WheelStage ... />
</motion.div>
```

Participant-carousel wrapper 동일 (`position: absolute; inset: 0; pointerEvents: none`).

**배지 중앙 정렬 패턴 갱신** (`left: 50% + transform: translateX(-50%)` → viewport-flex 컨테이너):

Before (병리):
```tsx
<motion.div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", ...content }}>
  {bingoLabel.text}
</motion.div>
```

After (정본):
```tsx
<motion.div style={{ position: "fixed", left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
  <div style={{ ...content }}>
    {bingoLabel.text}
  </div>
</motion.div>
```

- Outer container = viewport-wide `left:0/right:0` · flex center · 자식은 own width 로 중앙.
- Ancestor transform 무관 (자식이 own transform 안 씀).
- 대상 3개: `bingoLabel` 배너 · `PowerBanner` (3 모드 · powerDisplayText/chargePower/awaitingManualSpin) · 스피너 말풍선 (Z6-4 DOM query 유지).

PowerBanner 는 wheel container 안 (`position: absolute`) 이라 viewport 아닌 wheel 중앙 · 같은 flex 패턴으로 안정화.

---

## Z8-2 · 슈퍼 매 스핀 릴 회전

### 병리

- `ParticipantCarousel.useEffect` deps = `[kids.length, skipRotation]`. spinnerPid 변화 무감지 · superSpinIdx 증가 시에도 raf 재시작 안 됨.
- Result: 슈퍼 2번째 · 3번째 스핀에서 릴 회전 없이 spinner (이미 정지 상태) 위 말풍선만 표시.

### Fix

`RouletteModal` 안 participant-carousel wrapper key 에 `superSpinIdx` + `againOverride.counter` 편입:

```tsx
<motion.div
  key={`participant-carousel-${superSpinIdx}-${againOverride?.counter ?? 0}`}
  ...
>
  <ParticipantCarousel ... />
</motion.div>
```

- 매 스핀 마다 motion.div (그리고 자식 ParticipantCarousel) unmount → remount.
- Remount 시 useEffect 재실행 → raf 재시작 → 릴 회전 새로 발화.
- 기선정자 배제는 서버 sequence (Z3-3 deriveSequence) 이 담당 · 이번 라운드는 릴 연출만.

---

## Z8-3 · SPIN×N 텍스트 → 룰렛 아이콘

### 정본

Kyu: "휠 슬라이스·컨트롤러 라벨의 텍스트 'SPIN×2/×3' → 룰렛 그림 2개/3개 아이콘으로 교체 (실 구현은 Z9)."

### Fix

**Wheel segments** (`src/components/Roulette/defaultRouletteConfig.ts`):
```ts
{ label: "🎡🎡", fill: { kind: "spin", times: 2 }, weight: 1 },
{ label: "🎡🎡🎡", fill: { kind: "spin", times: 3 }, weight: 1 },
```

**Controller FRONT_PRESETS** (`src/components/dev/RouletteDevController.tsx`):
```ts
{ label: "🎡🎡", front: { kind: "spin", times: 2 } },
{ label: "🎡🎡🎡", front: { kind: "spin", times: 3 } },
```

COMBO_PRESETS `"SPIN×3 (연속스핀)"` → `"🎡🎡🎡 (연속스핀)"`.

**Modal toast** (`handleSpinEnd`):
```ts
`${"🎡".repeat(front.times)}! (멀티스핀 · Z9 예약)`
```

### Z9 예약

- 실 다중 룰렛 동시 스핀 UX (데스크톱 가로·모바일 2=세로/3=역삼각형·개별 버튼·동시 회전) 는 별건 라운드.
- 이번 Z8-3 는 표기까지만.

---

## Z8-4 · Reveal fadeout 후 스트림 순차

### 병리 (Kyu 가설)

"계산 카드가 늦게 사라지며 배경 블러가 스트림을 가려 갯수가 적어 보임."

- `handleAcceptToWallet` splitN/copyAll success 후 · `setSplitStreams(streams)` 즉시. Reveal 카드 (revealData 유지) 는 여전히 mount · 배경 위 카드 · 카드 위 스트림 · 하지만 카드 blur/backdrop 이 시각적으로 스트림 가림.

### Fix (a 채택 · 오케 권고)

```ts
if (splitRes.success) {
  setDepositState("success");
  // Z8-4 · Reveal 카드 즉시 unmount → 배경 블러 소멸.
  setRevealData(null);
  ...
  splitStreamsDoneCountRef.current = 0;
  // Z8-4 · 카드 사라짐 후 350ms pause → 스트림 시작 순차.
  window.setTimeout(() => setSplitStreams(streams), 350);
  ...
}
```

- 사용자 인지: **담기 클릭 → 카드 즉시 사라짐 → 짧은 pause → 스트림 등장**.
- `handleRevealComplete` 는 Z7-1 skip logic 로 super 진행 중 fadeout 미영향 (안전).
- Reveal 은 mount 상태에서 accept 클릭 즉시 unmount · phase='settling' 진입 안 함 (기존 skip logic 유지).

---

## Kyu 실기 재개 대본 (B-9-g · dev 서버 재기동)

```
1. git checkout main && git pull
2. git checkout feat/roulette-z1-vertical-bingo && git pull
3. npm install (필요 시)
4. psql -d grownest_dev -f migrations/053_family_savings_pool.sql (Z-1 · skip if run)
5. npm run dev:all
```

### 통합 실기 체크리스트

| ID | 요건 | 근거 |
|---|---|---|
| z8-1 | 라벨·PowerBanner·말풍선 룰렛 중심축 정중앙 (우측 치우침 없음) | Z8-1 |
| z8-2 | 슈퍼 매 스핀마다 캐러셀 릴 회전 재발화 | Z8-2 |
| z8-3 | SPIN×N 슬라이스·컨트롤러·toast 문안 = 🎡 반복 아이콘 | Z8-3 |
| z8-4 | 담기 → 카드 즉시 사라짐 → 350ms → 스트림 등장 (하트 갯수 정확) | Z8-4 |
| z7-1 | 슈퍼 3 스핀 완주 (Z7-1 fadeout race skip 로그) | Z7-1 |
| z7-2 | 말풍선 깜빡 없이 · 스핀 시작 시 소멸 | Z7-2 |
| z7-3 | 슈퍼 스트림 균등 · stagger 700ms | Z7-3 |
| z7-4 | 배지 700ms 시차 · pop · 큰 폰트 | Z7-4 |
| z7-5 | 룰렛 밖에서도 dev 컨트롤러 표시 | Z7-5 |
| z7-6 | 콘솔 ref 경고 0 | Z7-6 |
| z6-1 | 컨트롤러 전 기능 | Z6-1 |
| z6-5 | 정산 0 스트림 skip | Z6-5 |
| z4-1 | 슈퍼 금 라벨 | Z4-1 |
| z4-2 | AGAIN 재스핀 | Z4-2 |
| z4-3 | 음수 정산 지갑→잭팟 | Z4-3 |
| z4-5 | JACKPOT 폭죽 + 분배 | Z4-5 |
| z2-4 | 세로 나눗셈 배지 | Z2-4 |
| z5-2 | 슈퍼 copyAll 배지 | Z5-2 |
| x1 | 담기 후 3s 관찰 창 | X-1 |

---

## QC 4종 (Z8 커밋 후)

- **typecheck**: 0 errors.
- **jest**: 85/85 pass.
- **pre-push 훅 전체**: 1102 passed / 5 skipped / 0 failed.
- **lint**: 35 errors baseline · 179 warnings baseline (신규 0).
- **build**: ✓ 8.43s.

---

## 이연 순증감

### 신규 이연

- **Z9: SPIN×2/3 다중 룰렛 동시 스핀** (Kyu 예약):
  - 데스크톱 가로 배치 · 모바일 (2=세로 배치 · 3=역삼각형 배치).
  - 개별 스핀 버튼 · 동시 회전 · 합산 정산.
  - 규모 큼 · 별건 라운드.
- **Z7-1 실 뿌리 확정**: defensive skip 편입 후에도 · Kyu devtools 콘솔 로그로 실 관찰 필요.
- **Z6-2 dev 도장 컨트롤러**: 별건 완성 예약.

### 해소 이연

- **Z8-1 (버그)**: 3 UI 중앙 정렬.
- **Z8-2 (연출)**: 슈퍼 매 스핀 릴 재회전.
- **Z8-3 (표기)**: SPIN 아이콘.
- **Z8-4 (연출)**: 카드 → 스트림 순차.

### 여전히 별건 라운드

- **⛔ γ.4~γ.5 미착수 유지**.

---

## 회부

- **Kyu approve (PR #288)**: 실기 승인 → T0 착지 재확인 (8 커밋 squash).
- **Kyu 실기 B-9-g**: 위 통합 체크리스트 19 요건.
- **Z9 예약 명시**: SPIN×2/3 다중 룰렛 실 구현 별건.

---

## Commit graph

```
5ad01169 feat(roulette): Z8 중앙 정렬 + 슈퍼 릴 재회전 + SPIN 아이콘 + 카드→스트림 순차 (N0-0730-Z8)
b2bafcb5 feat(roulette): Z7 슈퍼 전이 뿌리 + 말풍선 정본 + 배지 격상 + 컨트롤러 상시 (N0-0730-Z7)
8ef646ee feat(roulette): Z6 dev 컨트롤러 + 말풍선 fix + 정산 0 스트림 생략 (N0-0730-Z6)
664feae6 feat(roulette): Z5 슈퍼 loop 진단 + copyAll 배지 + 스피너 안내 (N0-0730-Z5)
97cfe68f feat(roulette): Z4 슈퍼 오인 뿌리 + AGAIN + 음수 대칭 + JACKPOT 분배 (N0-0730-Z4)
6030911d feat(roulette): Z3 payout 뿌리 + multi-target + 슈퍼 N번 스핀 (N0-0730-Z3)
e680672a feat(roulette): Z2 세로빙고 정정 + 잭팟 payout (N0-0730-Z2)
0235bdf7 feat(roulette): Z-1 세로빙고 1/N 분배 + pool 분리 + 서버 seed (N0-0730-Z)
```

**main tip**: `1dd2afcd` (X-1 · 2026-08-06). Z-1/Z2/Z3/Z4/Z5/Z6/Z7/Z8 head = `5ad01169`.
