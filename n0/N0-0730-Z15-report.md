# N0-0730-Z15 · 리포트

**round**: `N0-0730-Z15`
**timestamp**: 2026-08-10
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `0bd67e2b`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu Z14 심문 회신 반영 · 3 항목 concrete + 실측 로그.

## 착수 · 결정 정리

### Z15-1 · 본 휠 N 개 배치 (Q1=나 · 완화 절충)

**Kyu 판정 반영**:
> "정본은 본 휠과 동일한 **경험**이지 동일한 코드 경로가 아님. (다)식 절충
> 허용 — wheel 비주얼·조작을 로컬 상태로 재구성해도 사용자 체감이 본 휠과
> 동일하면 정합. 400~600 LOC 전량 리팩터를 강제하지 않음."

**구현**:
- `MultiSpinStage.tsx` 재작성 · 미니 원반 (`MiniRouletteIcon` fallback) 폐지.
- N 개 `RouletteWheel` 인스턴스 (기존 컴포넌트 재사용 · size 240px 데스크톱
  · 180px 모바일).
- **각 wheel 로컬 press/swipe**: `MultiSpinCell` 안 `pressRef` + `onPointerDown/
  Move/Up/Cancel` · 꾹 (elapsed 기반 파워 0.3~1.5) · 스와이프 (velocity 기반
  파워).
- 각 wheel 로컬 `spinNonce · spinPower · landingIndex · result · spinning`.
- `landingIndex` = client random (points kind 만 후보 · JACKPOT/SPIN/AGAIN
  제외 · 무한 loop 방지).
- **레이아웃**:
  - 데스크톱 (≥768px) · flex row · gap 20 · 가로 나열.
  - 모바일 count=2 · flex column · gap 12.
  - 모바일 count=3 · CSS grid · 위 2 (2 열) · 아래 1 (colspan 2 중앙 flex).
- 전 wheel 완료 (`allDone`) → 통합 결과 카드 · 휠별 나열 · 합산 · [담기]
  버튼 → `onAllComplete(results 배열)` → Modal `handleAcceptToWallet` 재-dispatch.

**폐지된 것**:
- MiniSpinStage 안 `MiniRouletteIcon` + text 버튼 방식 (Z13 MVP).
- text 안내 "SPIN 500ms 애니 + client random" (실 wheel 회전 3~8s).

### Z15-2 · slice label 타입 확장 (Q2=나 · discriminated union)

**타입 변경** (`RouletteWheel.tsx`):
```typescript
export type SliceIconLabel = { kind: "spinIcon"; count: number };
export type SliceLabel = string | SliceIconLabel;
export function sliceLabelToText(label: SliceLabel): string { ... }
export interface RouletteSegment {
  label: SliceLabel;  // 기존 string → union
  ...
}
```

**CanonicalSlice 안 렌더 분기**:
- `typeof seg.label === "string"` → 기존 char 방사 스택 (변경 없음).
- `label.kind === "spinIcon"` → `MiniDiscSvg` N 개 렌더 (slice 중앙축 세로
  스택 · `midR` = LABEL_R_OUTER/INNER 중간 · discR narrow=8 · 일반=12 · gap 3).
- `MiniDiscSvg` = slice 좌표계 안 embed 8-slice + hub SVG (DISC_SLICE_COLORS
  8 색 · #FFD93D hub · #3D1A56 center dot).

**소비처 정규화**:
- `defaultRouletteConfig.ts` · SPIN×2/×3 segments label = `{ kind: 'spinIcon',
  count }` · text "●●"/"●●●" fallback 폐지.
- `defaultRouletteConfig.segmentToFront` · candy 만 string label 기대 · string
  guard 편입.
- `RouletteModal.tsx` · metadata `segment_label` · `sliceLabelToText(seg.label)`
  로 정규화 (2 지점).

### Z15-3 · zero sign 실측 로그 (Q3 · Kyu 재현 = "정산 0 프리셋")

**Kyu 판정 반영**:
> "재현 경로 정정: **Kyu 재현 = '정산 0 프리셋 (100×-1+100)' 명시** — (c) 의
> SPIN 합산 가설 기각. 유력 = 앞 +100·뒤 -100 조합에서 sign 판정이 **합산
> (total=0) 이 아니라 음수 성분을 보고 negative flow 진입** (붉은 #FCA5A5
> = negative 색과 정합). Z15 에서 sign 결정 로직이 total 기준인지 실측·fix."

**코드 조사 (뿌리 추적)**:
- 프리셋 실체 = front=`{ kind: 'points', n: 100 }` · backOp=`{ kind: 'add',
  n: -100 }` (RouletteDevController.tsx:82).
- `computeRouletteResult` = `computed = 100 + (-100) = 0` · `total = { kind:
  'points', n: 0 }`.
- `deltaFromTotal(total) = 0` · `Modal handleAcceptToWallet` · `if (delta ===
  0)` **zero flow 진입** · `zeroStreams sign="zero"` · `playZeroDrop`.
- Reveal `totalSign({ kind: 'points', n: 0 }) = "zero"` · `particleSign = "zero"`
  · particles skip 조건 `!(result.total.kind === "points" && result.total.n
  === 0)` 만족 → **particles skip**.

**결론**: 코드 상 sign 결정은 이미 total 기준 · negative flow 진입 없음.
Kyu 관찰 "붉은 하트" 재현 실체 확정 필요 · **로그 편입 실측**.

**편입 로그**:
- `RouletteModal.handleAcceptToWallet` 진입 · `front.kind` / `total` /
  `computed delta` / `willTwinkle` / `flow` (JACKPOT · SPIN · ZERO · NEGATIVE ·
  POSITIVE) / `distribution` 로그.
- `RouletteResultReveal.settling` 진입 · `totalKind` / `particleSign` /
  `result.total` 로그.

**Kyu 실기 요청**:
- B-9-l 실기 시 · 정산 0 프리셋 · 개발자 콘솔 열고 위 두 로그 라인 캡처.
- `flow=ZERO && particleSign=zero` → **코드 정합** · 붉은 하트 잔존 원인은
  Reveal 카드 자체 뒷면 아이콘 backSign 색 · Z16 fix (backSign 을 particle
  sign 으로 강제).
- `flow!=ZERO` or `particleSign!=zero` → **뿌리 확정** · 그 지점 fix.

### Z14-4 재확인 (fadeout 시각 · B-9-l 판정 유보)

- 현행: N=3 시 스핀 완료 → 페이드아웃 = ~6.8s.
- Kyu 판정 유보 · B-9-l 실측 후 조정.

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline +1 warning (`sliceLabelToText` fast-refresh export ·
  runtime 영향 없음) · 신규 error 0.
- **test**: `jest` · 83 suites · 1102 pass · 5 skip · 0 fail · 12.1s.

## 커밋

```
0bd67e2b feat(roulette): Z15 본 휠 N개 + slice SVG + zero sign 실측 로그 (N0-0730-Z15)
```

## 착지 상태

- PR #288 body 갱신 완료 · `**round**: \`N0-0730-Z15\`` 첫 줄 · 실기 체크
  리스트 (Z14-3/4 재확인 + Z15-1/2/3 신설) · QC · EPIC-STATE 무변 근거 포함.
- Kyu B-9-l 실기 대기 · approve 후 auto-merge.

## 다음 라운드 (Z16) 예약

Kyu B-9-l 실기 결과에 따라:

- **Z16-1** = 붉은 하트 뿌리 확정 후 fix (backSign 강제 or 다른 지점).
- **Z16-2** = Z14-4 fadeout 시각 판정 결과 (연장 or 유지).
- **Z16-3** = Z15-1 UX 개선 (실기 관찰 결과).
- **Z16-4** = 서버 seed 편입 (MultiSpin landing · client random → HMAC seed).
