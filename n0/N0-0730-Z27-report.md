# N0-0730-Z27 · 리포트

**round**: `N0-0730-Z27`
**timestamp**: 2026-08-11
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `b00e8e14`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu 아이폰 실기 · Z26 ×3 3개 ✓ · 모바일 결함 3건 concrete + [DOC].

## 착수 · 결정 정리

### Z27-1 · 뷰포트 반응형 자동 스케일 (핵심)

**Kyu 정본**:
> "가용 영역(뷰포트 폭·높이, 안전영역/헤더 제외) 측정 → 그룹 총폭·총높이
> (2줄 역삼각 포함) 대비 fit 스케일 자동 산출 → 휠 base 사이즈에 곱함.
> 어느 뷰포트·어느 N(2/3)·어느 배치에서도 잘림 0·최대 크기."

**신설 파일**: `src/components/Roulette/useMultiSpinAutoScale.ts`.

**계산**:
- baseSize = useMainWheelSize (원 판 사이즈).
- N (총 wheel · 배경 포함) · gap = 20.
- safeW = vw × 0.92 · safeH = vh × 0.72 (헤더/카드 여유).
- horizontal groupW = N × baseSize + (N-1) × gap · groupH = baseSize.
- invertedTriangle groupW = max(topColCount × baseSize + gap, baseSize) ·
  groupH = 2 × baseSize + gap.
- horizontalFitScale = min(safeW/horizontalGroupW, safeH/horizontalGroupH, 1).
- invertedFitScale = min(safeW/invertedGroupW, safeH/invertedGroupH, 1).
- **Layout 선택**: horizontal fitScale ≥ 0.7 시 horizontal 유지 · 아니면
  invertedTriangle 시도 · 더 큰 scale 인 쪽 선택.
- finalScale = max(0.3, chosenFitScale) × scaleOverride (Z27-3).
- finalSize = baseSize × finalScale.

**추종**: window `resize` + `orientationchange` 리스너 · 회전·리사이즈 자동
재계산.

**소비처**:
- MultiWheelExtras: `useMultiSpinAutoScale(totalCount)` · wheelSize =
  autoScale.finalSize · RouletteWheel `size={wheelSize}`.
- Modal: `useMultiSpinAutoScale(multiSpinCount)` · multiSpin active 시
  WheelStage `sizeOverride={autoScale.finalSize}` · singular 시 undefined
  (RouletteWheel 자체 useResponsiveSize).

**검증 로그**:
```
[useMultiSpinAutoScale Z27-1] scale calc · N= baseSize= vw= vh=
  safeW= safeH= horizontalFitScale= invertedFitScale= layout= fitScale=
  scaleOverride= finalScale= finalSize= clipped=
```

### Z27-2 · 모바일 z-index 회귀 fix

**Kyu 실측**: 모바일에서 떠오른 조각·결과 카드가 wheel 에 가려짐 (데스크톱
Z24/Z25 위계가 모바일 렌더 경로/실 뷰포트에 미반영).

**뿌리**:
- `RouletteResultReveal` container `zIndex: 50`.
- Z25-1 wheel wrapper 상시 `zIndex: 55` (dim 5 위).
- Reveal container 안 조각 (z 60) / 카드는 container stacking context 내부 ·
  상위 스택에서는 container 50 참여 · wheel 55 위 · 결과 조각/카드 wheel 뒤.
- 모바일 stacking context 는 iOS Safari 특히 transform · backdrop-filter 로
  민감 · 데스크톱보다 뚜렷.

**Fix** (`RouletteResultReveal.tsx` line 465):
```typescript
zIndex: 70,  // Z27-2 · z 50 → 70 · wheel 55 위 · 조각/카드 위계 정합.
```

**위계 (Z27-2 이후)**:
- Dim (5) · wheel (55) · Banner (60) · MergeFlash (58) · Reveal container
  (70) · Reveal 카드 (Reveal 안 60) · ResultCard (62).

Reveal container 70 · 그 안 카드 60 은 container 스택 안 위계 · 상위 스택은
container 70 참여 · wheel 55 뒤 · 정합.

### Z27-3 · 사이즈 슬라이더

**신설 파일**: `src/stores/rouletteDevStore.ts` (zustand).

```typescript
interface RouletteDevState {
  multiWheelScaleOverride: number; // 0.3~1.0 · default 1.0
  setMultiWheelScaleOverride: (v: number) => void;
}
```

**Dev controller UI** (`RouletteDevController.tsx` 안 프리셋 조합 다음):
```typescript
<Section title={`멀티 휠 스케일 (×${multiWheelScaleOverride.toFixed(2)})`}>
  <input
    type="range"
    min={0.3}
    max={1.0}
    step={0.05}
    value={multiWheelScaleOverride}
    onChange={(e) => setMultiWheelScaleOverride(parseFloat(e.target.value))}
  />
</Section>
```

**연결**: Z27-1 `useMultiSpinAutoScale` 안 `finalScale = clampedFit ×
scaleOverride` · 슬라이더 실시간 반영. Kyu 눈으로 60/50% 대조 가능.

### Z27-4 (유지)

- Z25-1 암막 상시·Z25-2 스피너 재발화 금지·Z26 개수·phase 위계·전 정본.

## [DOC] 정본 문서 반영

- `docs/epics/roulette-final-redesign.md` · § N0-0730-Z27 정본 편입 (Z27-1
  자동 스케일 계산 상세 · Z27-2 z 뿌리·fix · Z27-3 슬라이더 · Z27-4 유지).
- `EPIC-STATE.md` · 룰렛 EPIC 라인 갱신:
  - `last_touched=2026-08-11 · last_verified=2026-08-11`.
  - `γ Z-1~Z27 PR #288 (auto-merge OFF · Kyu N0-0730-Z27 반응형 자동 스케일
    + 모바일 z 회귀 + 사이즈 슬라이더)`.

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline +1 warning (rouletteDevStore fast-refresh · runtime 무관).
- **test**: `jest` · 83 suites · 1102 pass · 5 skip · 0 fail · 12.2s.

## 커밋

```
b00e8e14 feat(roulette): Z27 반응형 자동 스케일 + 모바일 z 회귀 + 사이즈 슬라이더 (N0-0730-Z27)
```

## 착지 상태

- PR #288 body 갱신 · B-9-w 모바일 실기 체크리스트 (Z27-1 자동 스케일 · Z27-2
  z 회귀 · Z27-3 슬라이더) · QC · EPIC-STATE 갱신.
- Kyu B-9-w 모바일 실기 대기.

## 다음 라운드 (Z28) 예약

Kyu B-9-w 실기 결과에 따라:

- **Z28-1** = 자동 스케일 결과 실측 mismatch 시 safeW/H 비율 조정.
- **Z28-2** = z-index 회귀 잔존 시 추가 stacking context 조사.
- **Z28-3** = 슬라이더 UX 개선 필요 시.
- **Z28-4** = JACKPOT/AGAIN multiSpin slot 처리 정본화.
- 실기 이상 없으면 · PR #288 최종 도장 · Z 시퀀스 종결 · γ 후속.

## 이연 순증감

- **이연 신설**: 없음.
- **이연 해소**: **모바일 렌더 잘림 뿌리** (자동 스케일 통합) · **모바일 z
  회귀** (Reveal z 70 상향).
