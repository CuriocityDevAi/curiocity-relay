# N0-0730-Z25 · 리포트

**round**: `N0-0730-Z25`
**timestamp**: 2026-08-11
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `50ba77f5`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu B-9-t 실기 판정 · Z24 공개~카드 phase 스택 ✓ · 결함·정본 3건 신설.

## 착수 · 결정 정리

### Z25-1 · 암막 상시 유지 (Kyu 판정 · Z24 phase 조건부 폐지)

**Kyu 정본**:
> "룰렛 모달 표시 중에는 배경 페이지 암막(dim)을 전 과정 상시 유지 — 싱글·
> 멀티·스핀 중·공개 중·합체 전부. 멀티 진입 시 암막을 걷는 트랜지션 삭제.
> 휠(들)은 항상 암막 위 레이어에서 동일 밝기 (Z21 밝기 정본은 이 방식으로
> 달성 — 암막을 치우는 게 아니라 휠을 암막 위로)."

**Fix**:

- `isDimVisible` = stage 기반만 (Z24 `!isMultiSpinningPhase` 조건 제거):
  ```typescript
  const isDimVisible =
    stage === "transform" || stage === "spin" || stage === "depositing";
  ```
- 배경 wheel wrapper `style.zIndex = 55` (Z24 조건부 제거 · 상시).
- MultiWheelExtras `containerZIndex = 54` (Z24 조건부 제거 · 상시).
- `isMultiSpinningPhase` 파생은 log/검증 목적 유지 · dim/z 결정에서 배제.

**위계 (Z25-1 이후)**:
- Dim (z 5) · 상시 visible.
- Wheel wrapper (z 55) · 상시 · dim 위.
- MultiWheelExtras container (z 54) · 상시 · dim 위.
- Reveal container (z 50) · Reveal 활성 시 · dim 위 · wheel 뒤.
- Reveal 카드 (z 60) · wheel 위.
- MultiSpinResultCard (z 62) · wheel 위.
- MultiSpinMergeFlash (z 58) · wheel 위 · 카드 뒤.

Z24 정본 "조각/카드 > 휠" 은 여전히 정합 (60/62 > 55). Z21-1 회귀 위험은
Reveal 카드 z 60 이 wheel 55 위 · 정상.

### Z25-2 · 스피너 릴 재발화 금지

**Kyu 실측**: 슈퍼빙고 스피너 이미 선정 · SPIN×N 진입 시 릴이 다시 돌며
재선정.

**뿌리**:
- SPIN 분기 (`handleSpinEnd` line 764) 안 `setAgainOverride({ ..., counter:
  (againOverride?.counter ?? 0) + 1 })`.
- WheelStage wrapper key = `wheel-wrap-${superSpinIdx}-${againOverride?.counter
  ?? 0}` · counter 변경 → wrapper remount.
- ParticipantCarousel spinTrigger = `superSpinIdx * 100 + (againOverride?
  .counter ?? 0)` · counter 변경 → 릴 재-회전 (re-select 애니).

**Fix**:
```typescript
setAgainOverride((prev) => ({
  landingIndex: pickRandomPointsIndex(MULTI_SPIN_ROULETTE_SEGMENTS),
  counter: prev?.counter ?? 0,  // Z25-2 · counter 유지 · wrapper key 안정.
}));
```

**결과**: 기선정 스피너 그대로 유지 · 릴 애니 재실행 없음 · WheelStage
wrapper 도 remount 없이 landingIndex 만 갱신 (연속성).

### Z25-3 · SPIN×3 → 3 개 wheel 정합

**Kyu 실측**: `●●●● SPIN×3` (Z23 신설 프리셋 · times 3) 강제 시 추가 wheel
1 개만 등장 (총 2 개).

**뿌리**:
- MultiWheelExtras `useState<CellState[]>(initialStates)` · React `useState`
  initial value 는 **첫 render 만** 사용.
- 후속 extrasCount 변경 시 · initialStates useMemo 는 재계산되지만 · states
  는 이미 세팅된 값 유지 · length 불일치.
- 시나리오: SPIN×2 (extrasCount=1) 이후 · 다른 라운드에서 SPIN×3 (extrasCount=
  2) 진입 시 · states.length 여전히 1 · 추가 wheel 1 개만 렌더.

**Fix (2중 안전망)**:

1. useEffect 로 extrasCount 변경 감지 · setStates 재-초기화:
   ```typescript
   useEffect(() => {
     setStates((prev) => {
       if (prev.length === extrasCount) return prev;
       return Array.from({ length: extrasCount }, () => ({ ... }));
     });
     console.info(
       "[MultiWheelExtras Z25-3] extrasCount sync ·",
       "requested=", extrasCount,
       "expectedRendered=", extrasCount,
     );
   }, [extrasCount]);
   ```

2. Modal 에서 `key={\`extras-${multiSpinCount}\`}` prop · multiSpinCount
   변경 시 remount 보장 (완전 새 인스턴스 · 모든 state clean init).

**검증**: 콘솔 로그 · Kyu 실기 시 requested vs expectedRendered 확인.

### Z25-4 (유지)

- Z24 phase 위계 (Reveal/카드 > 휠) · 그룹 중앙 정렬 (Z20) · 동일 크기
  (Z19-3) · 순차 공개 (Z22) · 합체 (Z21-2) · 전 정본. 변경 없음.

## [DOC] 정본 문서 반영

- `docs/epics/roulette-final-redesign.md` · § N0-0730-Z25 정본 편입 (실기
  실측 · Z25-1 암막 상시 · Z25-2 스피너 재발화 금지 · Z25-3 SPIN×3 개수 ·
  Z25-4 유지). Z21-1 / Z24 서술 재-개정 (phase 조건부 → 상시).
- `EPIC-STATE.md` · 룰렛 EPIC 라인 갱신:
  - `last_touched=2026-08-11 · last_verified=2026-08-11`.
  - `γ Z-1~Z25 PR #288 (auto-merge OFF · Kyu N0-0730-Z25 암막 상시 + 스피너
    재발화 금지 + SPIN×3 개수)`.

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline 유지 (217 · 35 errors · 182 warnings · 신규 없음).
- **test**: `jest` · 83 suites · 1102 pass · 5 skip · 0 fail · 12.1s.

## 커밋

```
50ba77f5 feat(roulette): Z25 암막 상시 + 스피너 재발화 금지 + SPIN×3 개수 (N0-0730-Z25)
```

## 착지 상태

- PR #288 body 갱신 · `**round**: \`N0-0730-Z25\`` 첫 줄 · B-9-u 실기 체크
  리스트 (Z25-1 dim 상시 · Z25-2 스피너 · Z25-3 SPIN×3 3개) · QC · EPIC-STATE
  갱신.
- Kyu B-9-u 실기 대기 · approve 후 auto-merge.

## 다음 라운드 (Z26) 예약

Kyu B-9-u 실기 결과에 따라:

- **Z26-1** = dim 상시 실측 mismatch 시 fix.
- **Z26-2** = 스피너 재발화 실측 잔존 시 뿌리 재조사.
- **Z26-3** = SPIN×3 3 wheel 실측 여전 시 · MultiWheelExtras 로직 재작성.
- 실기 이상 없으면 · PR #288 최종 도장 · Z 시퀀스 종결 · γ 후속 (JACKPOT/
  AGAIN multiSpin slot · ④/⑤ 스코프) 착수.

## 이연 순증감

- **이연 신설**: 없음 (Z25-1/2/3 concrete + [DOC] 착지).
- **이연 해소**: 없음 (Z24 phase 조건부 dim 이 Z25-1 로 재-개정됨 · Kyu 판정
  반영).
