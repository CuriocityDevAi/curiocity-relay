# N0-0730-Z21 · 리포트

**round**: `N0-0730-Z21`
**timestamp**: 2026-08-10
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `1b03c9e2`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu B-9-q 실기 실측 · Z20 그룹 중앙 정렬 ✓ · 합산 결과 카드 1회 ✓ · 신규
결함·정본 2건 (밝기 통일 + 담기 합체 연출).

## 착수 · 결정 정리

### Z21-1 · 전 wheel 밝기 통일

**Kyu 실측**: 좌측 (slot 0 배경 wheel) 만 어둡고 추가 wheel 은 밝음.

**뿌리**:
- Modal dim overlay (`radial-gradient` · z-index 5) · wheel 그룹 사이에서 위계.
- 배경 wheel wrapper (Modal WheelStage motion.div) · z-index auto (기본 0) ·
  dim 뒤에 렌더 · dim rgba 0.62~0.86 이 wheel 을 덮어 어둡게 관찰.
- MultiWheelExtras 컨테이너 · z-index 54 · dim 위 · 추가 wheel 밝음.

**Fix** (`RouletteModal.tsx` · wheel wrapper style):
```typescript
style={{
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 55,  // Z21-1 · dim (5) 위 · MultiWheelExtras (54) 와 동일 위계.
}}
```

**정본**: 암막은 wheel 그룹 전체의 뒤 · 전 wheel 동일 레이어·동일 밝기.

### Z21-2 · 담기 합체 연출 (정본 신설 · N=2/3 공통)

**Kyu 정본**:
> "N개 wheel 이 화면 중앙으로 천천히 모이며 하나로 합쳐지는 트랜지션 (이동+
>  병합·급소멸 금지·'서서히 수렴'이 체감 핵심) → 합쳐지는 순간 환하게 빛나는
>  glow flash (밝은 펄스·'합쳐졌다'는 시각 확증) → 빛이 잦아들며 합쳐진 단일
>  wheel 이 중앙 정착 → 그 wheel 중앙에서 하트 스트림 발사."

**Fix**:

- **`MultiSpinMergeFlash.tsx` 신설**:
  - AnimatePresence · radial-gradient white (0.95) → gold (0.7) → orange
    (0.3) → transparent · duration 0.7s · times [0, 0.35, 1] · easeOut.
  - z-index 58 (배경 wheel 55 · MultiWheelExtras 54 · Reveal 60+ 사이).
  - mix-blend-mode: screen · pointer-events none.

- **Modal `mergeStage` state**: `'converging' | 'flashing' | 'merged' | null`.

- **MultiSpinResultCard onAccept · setTimeout chain**:
  - t=0: `setMergeStage("converging")` · `playDepositComplete()` 상승감 사운드.
  - t=700ms: `setMergeStage("flashing")`.
  - t=1000ms: `setMergeStage("merged")` · `setMultiSpinActive(false)` ·
    `setMultiSpinCount(0)` · `setMultiSpinSlots([])` · `setActiveSegments
    (segments)` 원판 복귀 · `void handleAcceptToWallet(wrappedResult)` 스트림
    발사.
  - t=1500ms: `setMergeStage(null)` 자연 소멸.

- **Modal bgTranslate useMemo**:
  ```typescript
  if (mergeStage !== null) return { bgTranslateX: 0, bgTranslateY: 0 };
  ```
  · 배경 wheel 을 뷰포트 중심 복귀 (converging 시 이동).

- **MultiSpinResultCard 렌더 조건**: `mergeStage === null` 시에만 · 합체
  시작과 함께 자연 소멸 (AnimatePresence exit).

- **MultiWheelExtras `mergingActive` prop**:
  ```typescript
  const mergeOffsetX = mergingActive ? centerX2 - finalX : 0;
  const mergeOffsetY = mergingActive ? centerY2 - finalY : 0;

  <motion.div
    animate={{
      x: mergeOffsetX,
      y: mergeOffsetY,
      opacity: mergingActive ? 0.7 : 1,
    }}
    transition={mergingActive
      ? { duration: 0.7, ease: [0.32, 0, 0.67, 0] }
      : { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: extraIdx * 0.1 }
    }
  ```
  · 각 추가 wheel 이 뷰포트 중심 (배경 wheel 위치) 으로 delta 수렴 · 0.7s.
  · flash 후 unmount (multiSpinActive=false 로 컨테이너 조건 해제).

### Z21-3 (유지)

- 그룹 중앙 정렬 (Z20) · 동일 크기 (Z19-3) · 멀티판 ♥2000/♥3000 (Z17-5) ·
  즉시 진입 (Z19-2) · O 정합 (Z19-1 종결) · 합산 1회 (Z18-1) · 스피너 비중복
  (Z17-1). 변경 없음.

## [DOC] 정본 문서 반영

- `docs/epics/roulette-final-redesign.md` · § N0-0730-Z21 정본 편입 (실기
  실측 · Z21-1 밝기 · Z21-2 합체 연출 3-stage 상세 · Z21-3 유지).
- `EPIC-STATE.md` · 룰렛 EPIC 라인 갱신:
  - `last_touched=2026-08-10 · last_verified=2026-08-10`.
  - `γ Z-1~Z21 PR #288 (auto-merge OFF · Kyu B-9-q 실기 판정 · N0-0730-Z21
    밝기 통일 + 합체 연출)`.
  - note: Z21 landed 표기.

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline 유지 (216 · 35 errors · 181 warnings · 신규 없음).
- **test**: `jest` · 83 suites · 1102 pass · 5 skip · 0 fail · 12.0s.

## 커밋

```
1b03c9e2 feat(roulette): Z21 밝기 통일 + 담기 합체 연출 (N0-0730-Z21)
```

## 착지 상태

- PR #288 body 갱신 완료 · `**round**: \`N0-0730-Z21\`` 첫 줄 · B-9-r 실기
  체크리스트 (Z21-1 밝기 · Z21-2 합체 3-stage) · QC · EPIC-STATE 갱신.
- Kyu B-9-r 실기 대기.

## 다음 라운드 (Z22) 예약

Kyu B-9-r 실기 결과에 따라:

- **Z22-1** = 합체 timing 조정 (converging 700ms · flashing 300ms 미세 조정).
- **Z22-2** = flash 사운드 별개 · 상승감 강화 필요 시.
- **Z22-3** = JACKPOT/AGAIN multiSpin slot 처리 정본화 (예약).

## 이연 순증감

- **이연 신설**: 없음 (Z21-1/2 concrete + [DOC] 착지).
- **이연 해소**: 없음.
