# N0-0730-Z24 · 리포트

**round**: `N0-0730-Z24`
**timestamp**: 2026-08-10
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `f2be3b19`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu Z23 ×3 실기 판정 · 회귀 (Z21-1) fix + phase별 레이어 위계 정본 신설.

## 실기 실측 (Z23)

- Z23 ×3 프리셋 ✓.
- **회귀 발견**: Z21-1 (배경 wheel wrapper `zIndex: 55` 무조건) → 싱글 모드
  Reveal (z 50) 이 wheel 뒤로 밀림 · **떠오른 조각·룰렛 결과 카드가 wheel 에
  가려짐** (스크린샷 증거).

## 뿌리 진단

- Z21-1 fix 는 멀티 스핀 중 밝기 통일 목적 · 하지만 **무조건 55 적용** → 싱글
  모드에도 wheel wrapper 가 Reveal (z 50) 위에 · Reveal 카드 자체가 wheel 뒤에.
- 카드 z-index 계층 (RouletteResultReveal.tsx):
  - Reveal container = z 50.
  - Reveal 카드 안 조각/backdrop = z 60.
- MultiWheelExtras z 54.
- Dim overlay z 5.
- MultiSpinBanner z 60 · MultiSpinResultCard z 62 · MultiSpinMergeFlash z 58.

**결론**: Z21-1 의 55 는 **멀티 스핀 phase 한정** 에만 유효 · 싱글 모드에는
적용 불가. Fix = phase 조건부 z.

## 착수 · 결정 정리

### Z24-1 · phase별 레이어 위계 (고정 z 폐지·상태 기반)

**정본**:

- **평시/스핀 중 (singular)**: dim on · wheel wrapper zIndex auto · Reveal
  50 이 wheel 위 (기존 위계 복원).
- **멀티 스핀 중 (스핀 대기·중)**:
  ```typescript
  isMultiSpinningPhase = multiSpinActive
    && multiRevealIdx === null
    && !multiSpinResultReady
    && mergeStage === null;
  ```
  · dim off (`isDimVisible = false`) · wheel wrapper zIndex 55 · Multi
  WheelExtras containerZIndex 54 · 전 wheel 동일 밝기 (Z21-1 의도 여기 한정).
- **결과 공개~카드~합체** (multiReveal or resultReady or merge):
  - dim 재-깔림 (`isDimVisible = true` · Kyu Z22 정본 "전부 멈춘 다음 암막이
    깔리고").
  - wheel wrapper zIndex auto · MultiWheelExtras containerZIndex undefined.
  - Reveal 50 / 카드 62 가 위 (스포트라이트 문법).
- **합체~스트림**: 기존 Z21-2 (glow flash z 58) 불변.
- **멀티 진입 순간**: 암막 걷힘 트랜지션 유지.

**구현**:

- Modal `isMultiSpinningPhase` 파생 · `isDimVisible` 조건 확장:
  ```typescript
  const isMultiSpinningPhase =
    multiSpinActive &&
    multiRevealIdx === null &&
    !multiSpinResultReady &&
    mergeStage === null;
  const isDimVisible =
    (stage === "transform" ||
      stage === "spin" ||
      stage === "depositing") &&
    !isMultiSpinningPhase;
  ```
- 배경 wheel wrapper style:
  ```typescript
  zIndex: isMultiSpinningPhase ? 55 : undefined;
  ```
- MultiWheelExtras `containerZIndex` prop 신설 · Modal 호출자:
  ```typescript
  containerZIndex={isMultiSpinningPhase ? 54 : undefined}
  ```

### Z24-2 · 검증 로그

```
[RouletteModal Z24-2] phase layer stack ·
  stage= spin/depositing/...
  multiSpinActive= true/false
  multiRevealIdx= 0/1/null
  multiSpinResultReady= true/false
  mergeStage= converging/flashing/merged/null
  isMultiSpinningPhase= true/false
  isDimVisible= true/false
  bgWheelZ= 55 or auto
  extrasZ= 54 or auto
  revealZ= 50
  dimZ= 5
```

Kyu B-9-t 실기 시 · 3 케이스 (싱글 · ×2 · ×3) × 3 phase (스핀 · 공개 · 카드)
= 9 스택 실측.

### Z24-3 (유지)

- ×3 버튼 (Z23) · 순차 공개 (Z22) · 합체 (Z21-2) · 그룹 정렬 (Z20) · 전 정본.

## [DOC] 정본 문서 반영

- `docs/epics/roulette-final-redesign.md` · § N0-0730-Z24 정본 편입 (실기
  실측 · Z24-1 phase별 위계 상세 · Z24-2 검증 로그 · Z24-3 유지). Z21-1 서술
  개정 (무조건 55 → phase 한정 55).
- `EPIC-STATE.md` · 룰렛 EPIC 라인 갱신:
  - `last_touched=2026-08-10 · last_verified=2026-08-10`.
  - `γ Z-1~Z24 PR #288 (auto-merge OFF · Kyu N0-0730-Z24 phase별 레이어 위계
    · Z21-1 회귀 fix)`.

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline 유지 (217 · 35 errors · 182 warnings · 신규 없음).
- **test**: `jest` · 83 suites · 1102 pass · 5 skip · 0 fail · 12.4s.

## 커밋

```
f2be3b19 feat(roulette): Z24 phase별 레이어 위계 + Z21-1 회귀 fix (N0-0730-Z24)
```

## 착지 상태

- PR #288 body 갱신 · `**round**: \`N0-0730-Z24\`` 첫 줄 · B-9-t 실기 체크
  리스트 (3 케이스 매트릭스 · phase 별 z 실측 로그 캡처) · QC · EPIC-STATE
  갱신.
- Kyu B-9-t 실기 대기 · approve 후 auto-merge.

## 다음 라운드 (Z25) 예약

Kyu B-9-t 실기 결과에 따라:

- **Z25-1** = phase 별 z 실측 mismatch 시 fix.
- **Z25-2** = 각 wheel 위치에서 조각 떠오름 (Z22-1 후속 · Reveal 좌→우 위치
  이동).
- **Z25-3** = JACKPOT/AGAIN multiSpin slot 처리 정본화.
- 실기 이상 없으면 PR #288 최종 도장 · Z 시퀀스 종결 · γ 후속.

## 이연 순증감

- **이연 신설**: 없음 (Z24-1/2 concrete + [DOC] 착지).
- **이연 해소**: **Z21-1 회귀 fix** (배경 wheel 무조건 z 55 → phase 조건부 ·
  Z21-1 서술 개정).
