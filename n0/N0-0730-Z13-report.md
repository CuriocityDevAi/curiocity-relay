# N0-0730-Z13 리포트 · 미니 룰렛 아이콘 + MultiSpinStage 실 UI + 합산 카드 + 청소

**Date**: 2026-08-09
**Round**: N0-0730-Z13 (Kyu 재정본 · Z12 폐기 · 다중 룰렛 실 UI)
**Branch**: `feat/roulette-z1-vertical-bingo`
**Head**: `48a5f4d1` (Z13).
**PR**: [#288](https://github.com/CuriocityDevAi/grownest/pull/288) · auto-merge OFF · Kyu approve 대기.

---

## Z13-0 · 미니 룰렛 SVG 아이콘 (🎡 폐기)

### 병리 (Kyu 관찰)

"🎡 대관람차 이모지 → 룰렛으로 안 읽힘."

### 신 컴포넌트 (`src/components/Roulette/MiniRouletteIcon.tsx`)

**MiniRouletteIcon**:
- SVG 원 (r=48) · 8 부채꼴 (`SLICE_COLORS` = pink · yellow · mint · purple · orange · blue · red · gold) · 중앙 hub (r=12 · 금색) · 검은 dot 중심.
- Props: `size` (default 20) · `count` (default 1 · 병렬 원반) · `gap` (default 2).
- Count > 1 · flex inline · 병렬 렌더.

**대체 적용**:
- Wheel slice label (text 컨텍스트): `"●●"` / `"●●●"` (dot 반복 · 원형 유사 · SVG 안 되는 컨텍스트 fallback).
- Toast: `"●".repeat(N)` (`RouletteModal handleAcceptToWallet · handleSpinEnd`).
- Controller preset label (`RouletteDevController`): `"●●"` / `"●●● (연속스핀)"` (text).
- 결과 카드 (`MultiSpinStage`): `<MiniRouletteIcon size=16 count=N />` (SVG).
- MultiSpinStage 헤더: `<MiniRouletteIcon size=22 count=N />` (SVG).

---

## Z13-1 · MultiSpinStage 실 UI

### 신 컴포넌트 (`src/components/Roulette/MultiSpinStage.tsx`)

**Props**:
```ts
spinCount: number;
segments: RouletteSegment[];
spinnerName: string;
onAllComplete: (results: RouletteResult[]) => void;
```

**Layout**:
- Fixed overlay (`inset: 0`, `zIndex: 55`, rgba backdrop).
- 헤더: `<MiniRouletteIcon count=N /> · {spinnerName}님이 다 돌립니다!` (금색 · 24px · Luckiest Guy).
- 서브: "각 룰렛 [스핀] 을 눌러주세요 · 순서 자유" (13px 회색).
- Wheel cells: `flex-wrap` · `gap:16` · `justifyContent:center` · `maxWidth:92vw` · 브라우저 반응형 = 데스크톱 자연 가로 · 모바일 wrap (2 = 세로 near · 3 = 역삼각형-유사).

**WheelCell**:
- `<MiniRouletteIcon size=100 />` · motion rotate 720° (spinning 시).
- 아래 [스핀] 버튼 (금색 알약 · `spinning` 시 dim + disabled).
- 완료 시 결과 표시 (`+X` / `-X`).

**Spin 로직** (`spinWheel(idx)`):
```ts
setSlots (spinning: true);
window.setTimeout(() => {
  // 500ms 후 client random.
  let picked;
  let guard = 0;
  do {
    const landingIdx = Math.floor(Math.random() * segments.length);
    picked = segmentToFront(segments[landingIdx]);
    guard += 1;
  } while (picked.kind !== "points" && guard < 20);
  const front = picked.kind === "points" ? picked : { kind: "points", n: 0 };
  const backOp = pickBackOp(front);
  const result = computeRouletteResult(front, backOp);
  setSlots ({ spinning: false, result });
}, 500);
```

- 재-SPIN · JACKPOT · AGAIN 은 skip (guard 20 회 · points 만) · 무한 재귀 방지.
- Fallback (guard 초과) = 0 points.

### Modal 편입

**신 state**:
```ts
const [multiSpinActive, setMultiSpinActive] = useState<boolean>(false);
const [multiSpinCount, setMultiSpinCount] = useState<number>(0);
```

**SPIN 랜딩 handler** (재작성):
```ts
if (result.front.kind === "spin") {
  setRevealData(null);
  setMultiSpinCount(result.front.times);
  setMultiSpinActive(true);
  return;
}
```

- 이전 Z11-3 auto-run 로직 폐기 · MultiSpinStage 로 이관.

**Render**:
```jsx
{multiSpinActive && multiSpinCount >= 2 && (
  <MultiSpinStage
    spinCount={multiSpinCount}
    segments={segments}
    spinnerName={activeSpinnerName || "당첨자"}
    onAllComplete={(results) => {
      const summedDelta = results.reduce(
        (acc, r) => acc + (r.total.kind === "points" ? r.total.n : 0),
        0,
      );
      setMultiSpinActive(false);
      setMultiSpinCount(0);
      const wrappedResult: RouletteResult = {
        front: { kind: "points", n: summedDelta },
        backOp: null,
        computed: null,
        total: { kind: "points", n: summedDelta },
      };
      void handleAcceptToWallet(wrappedResult);
    }}
  />
)}
```

- Accept → wrapped result → `handleAcceptToWallet` 재호출 · 하단 flow (splitN · copyAll · 0=Z11-1 회색).

---

## Z13-2 · 결과 카드 (합산)

**MultiSpinStage 내장** (별도 파일 아님 · `allDone` 시 조건부 render).

### 구조

- `<motion.div>` · fade in + scale + y (0.5s · easeOutExpo).
- Width `min(92vw, 380px)` · shadow-2xl.
- 헤더: `<MiniRouletteIcon size=16 count=N /> {N}회 스핀 결과`.
- 각 슬롯 나열:
  ```
  #1 · {formatFront(front)} × {formatBackOp(backOp)}     {formatTotal(total)}
  #2 · ...                                                ±X
  ...
  ```
  - Border-bottom dashed (마지막 제외).
  - Color: 음수 = `#DC2626` · 양수 = `#059669`.
- 합산: border-top 2px · fontWeight 800 · fontSize 16.
- Accept 버튼 `✓ 담기` · gradient 배경 (음 = 회색 · 양 = 금색) · onClick → `onAllComplete(results)`.

---

## Z13-3 · Dead code 청소 + 컨트롤러 통합

### Removed

**`zeroFallActive` state + "0" 낙하 render** (Z9-3):
- state 선언 제거.
- `<AnimatePresence>` 낙하 애니 render 완전 제거.
- Z11-1 회색 스트림 (splitStreams sign="zero") 로 이미 대체됨.

**`computeRouletteResult` import** (RouletteModal):
- Z11-3 auto-run 로직 사용처였으나 · Z13-1 로 이관 · unused.

### 컨트롤러 프리셋 · 경로 통일

- 컨트롤러 FRONT_PRESETS · COMBO_PRESETS 의 `"🎡🎡"` / `"🎡🎡🎡"` · `"🎡🎡🎡 (연속스핀)"` 등 → `"●●"` / `"●●●"` / `"●●● (연속스핀)"`.
- Reveal 경유 → Accept → SPIN handler → MultiSpinStage (Z13-1) · Z9-5 통일 경로.

---

## Kyu 실기 재개 대본 (B-9-k · dev 서버 재기동)

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
| z13-0-a | 휠 슬라이스 SPIN×N 라벨 = "●●" / "●●●" (🎡 소멸) | Z13-0 |
| z13-0-b | 결과 카드 · MultiSpinStage 헤더에 MiniRouletteIcon SVG 표시 | Z13-0 |
| z13-1 | 컨트롤러 "●●" or "●●●" 프리셋 → Reveal → Accept → MultiSpinStage 등장 | Z13-1 |
| z13-1 | N 미니 룰렛 나란히 · 각 [스핀] 버튼 · 사용자 tap → 500ms 회전 → 결과 표시 | Z13-1 |
| z13-2 | 모든 스핀 완료 → 결과 카드 자동 · 나열 + 합산 + [담기] | Z13-2 |
| z13-2 | [담기] → 합산 dispatch (세로 splitN · 슈퍼 copyAll · 0 = 회색) | Z13-2 |
| z13-3 | "0" 낙하 애니 완전 소멸 (회색 하트 스트림만) | Z13-3 |
| z11-1 | 정산 0 = 회색 하트 + '툭' | Z11-1 |
| z11-2 | 잭팟 스트림 전 구간 가시 | Z11-2 |
| z10-1 | JACKPOT Reveal 실 정산 | Z10-1 |
| z10-2 | payout 응답 기반 스트림 | Z10-2 |
| z9-1 | 말풍선 정중앙 | Z9-1 |
| z9-2 | 슈퍼 아바타 유지 | Z9-2 |
| z9-4 | 음수 하강 사운드 | Z9-4 |
| z9-5 | 컨트롤러 Reveal 경유 | Z9-5 |
| z8-1 | 3 UI 중앙 | Z8-1 |
| z8-2 | 슈퍼 매 스핀 릴 회전 | Z8-2 |
| z7-1 | 슈퍼 3 스핀 완주 | Z7-1 |
| z7-3 | 슈퍼 스트림 균등 | Z7-3 |
| z7-4 | 배지 격상 | Z7-4 |
| z7-5 | dev 컨트롤러 상시 | Z7-5 |
| z4-1 | 슈퍼 금 라벨 | Z4-1 |
| z4-2 | AGAIN 재스핀 | Z4-2 |
| z4-3 | 음수 정산 지갑→잭팟 | Z4-3 |
| z2-4 | 세로 나눗셈 배지 | Z2-4 |
| z5-2 | 슈퍼 copyAll 배지 | Z5-2 |
| x1 | 3s 관찰 | X-1 |

---

## QC 4종 (Z13 커밋 후)

- **typecheck**: 0 errors.
- **jest**: 85/85 pass.
- **pre-push 훅 전체**: 1102 passed / 5 skipped / 0 failed.
- **lint**: 35 errors baseline · 179 warnings baseline (신규 0).
- **build**: ✓ 8.01s.

---

## 이연 순증감

### 신규 이연

- **MultiSpinStage full UX**: 현재는 MVP · 미니 룰렛 단순 회전 애니. 후속 (별건):
  - WheelStage 재사용 (스핀 강도 · 스포트라이트 · 소리 이펙트).
  - 모바일 3=역삼각형 배치 (flex-wrap 자연 처리 · 명시적 grid 배치 검토).
- **결과 카드 스트림 도착 시각화**: 카드 담기 후 · 실제 하트 스트림은 splitN flow 로 · MultiSpinStage 카드는 사라짐. 카드→스트림 시각 브릿지 후속.

### 해소 이연

- **Z13-0 (아이콘 정본)**: MiniRouletteIcon 신설 · 🎡 폐기.
- **Z13-1 (다중 룰렛 실 UI)**: MultiSpinStage 신설 · 사용자 인터랙션.
- **Z13-2 (결과 카드 합산)**: 통합.
- **Z13-3 (dead code)**: zeroFallActive 제거.

### 여전히 별건 라운드

- **⛔ γ.4~γ.5 미착수 유지**.

---

## 회부

- **Kyu approve (PR #288)**: 실기 승인 → T0 착지 재확인 (13 커밋 squash).
- **Kyu 실기 B-9-k**: 위 통합 체크리스트 27 요건.

---

## Commit graph

```
48a5f4d1 feat(roulette): Z13 미니 룰렛 아이콘 + MultiSpinStage 실 UI + dead code 청소 (N0-0730-Z13)
ddf7e624 feat(roulette): Z11 정산 0 회색 하트 + 잭팟 거리 duration + SPIN×N 합산 (N0-0730-Z11)
f9048723 feat(roulette): Z10 JACKPOT Reveal 실 정산 + payout 응답 스트림 + 도착 가시 확장 (N0-0730-Z10)
c63c5927 feat(roulette): Z9 말풍선 재수리 + 아바타 유지 + 정산 0 낙하 + 음수 사운드 + Reveal 통일 (N0-0730-Z9)
5ad01169 feat(roulette): Z8 중앙 정렬 + 슈퍼 릴 재회전 + SPIN 아이콘 + 카드→스트림 순차 (N0-0730-Z8)
b2bafcb5 feat(roulette): Z7 슈퍼 전이 뿌리 + 말풍선 정본 + 배지 격상 + 컨트롤러 상시 (N0-0730-Z7)
8ef646ee feat(roulette): Z6 dev 컨트롤러 + 말풍선 fix + 정산 0 스트림 생략 (N0-0730-Z6)
664feae6 feat(roulette): Z5 슈퍼 loop 진단 + copyAll 배지 + 스피너 안내 (N0-0730-Z5)
97cfe68f feat(roulette): Z4 슈퍼 오인 뿌리 + AGAIN + 음수 대칭 + JACKPOT 분배 (N0-0730-Z4)
6030911d feat(roulette): Z3 payout 뿌리 + multi-target + 슈퍼 N번 스핀 (N0-0730-Z3)
e680672a feat(roulette): Z2 세로빙고 정정 + 잭팟 payout (N0-0730-Z2)
0235bdf7 feat(roulette): Z-1 세로빙고 1/N 분배 + pool 분리 + 서버 seed (N0-0730-Z)
```

**main tip**: `1dd2afcd` (X-1 · 2026-08-06). Z-1 ~ Z13 head = `48a5f4d1`.
