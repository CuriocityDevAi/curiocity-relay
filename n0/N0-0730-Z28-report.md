# N0-0730-Z28 · 리포트

**round**: `N0-0730-Z28`
**timestamp**: 2026-08-11
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `1085fd70`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu 아이폰 2차 실기 · Z27 자동 스케일 배치 ✓ · 잔여 5건 concrete + [DOC] +
증적 강화.

## 착수 · 결정 정리

### Z28-1 · 정산 0 회귀 fix (증적 강화)

**Kyu 정본** (기존 · Z11-1): 회색 하트 (#94A3B8) + '툭' 사운드 (playZeroDrop).

**Kyu 실측 (Z28)**: 분홍 하트 발화. 회귀.

**코드 조사** (실 뿌리 추적):
- `RouletteResultReveal.HeartParticles` 안 color 로직 · sign="zero" 시 정확히
  #94A3B8 (line 273~277).
- `RouletteModal.handleAcceptToWallet` zero flow (delta === 0) · zeroStreams
  sign="zero" · setSplitStreams · playZeroDrop 발화. 정합.
- Reveal HeartParticles skip 조건 `!(result.total.kind === "points" && n === 0)`
  · zero total 시 particles skip.

**결론**: 코드 상 회색 정합 · Kyu 관찰 분홍 뿌리는 실 발화 로그 캡처 필수.

**Fix (증적 강화)**:
- `RouletteModal.tsx` 안:
  ```
  [RouletteModal Z28-1] zero flow · setSplitStreams FIRED · sign= zero
    expectedColor= #94A3B8 (회색) sound= playZeroDrop muted= NO (fire) streams= [...]
  ```
- `RouletteResultReveal.tsx HeartParticles` 안:
  ```
  [HeartParticles Z28-1] mount · sign= glyph= actualColorCode= expectedIfZero=
  ```
- Kyu B-9-x 실기 시 콘솔 캡처 → 실 sign · color 코드 확증. 로그 결과 mismatch
  발견 시 · Z29 뿌리 재조사.

### Z28-2 · 멀티 라쳇 사운드 (정본 신설)

**Kyu 정본**:
> "각 wheel 스핀 중 = 자전거 라쳇 딸깍 loop · wheel 별 독립 인스턴스 · 동시
> 회전 시 자연 중첩 · 정지 시 자기만 감쇠. 싱글 wheel 은 터미널 판단으로
> 통일 or 재사용."

**Fix**:

- `src/utils/soundFx.ts` 안 신설:
  ```typescript
  const ratchetTimers = new Map<string, ReturnType<typeof setInterval>>();
  function playRatchetTick(volume) { /* square 600~800Hz random 25ms */ }
  export function startRatchetLoop(id, opts?) { /* setInterval 100ms · Map 저장 */ }
  export function stopRatchetLoop(id) { /* clearInterval · Map 삭제 */ }
  export function stopAllRatchetLoops() { /* cleanup */ }
  ```

- `MultiWheelExtras.ExtraCell`:
  - `triggerSpin` 시 `startRatchetLoop(\`multi-extra-${extraIdx}\`)`.
  - `handleSpinEndLocal` 시 `stopRatchetLoop(\`multi-extra-${extraIdx}\`)`.
  - Unmount cleanup effect · 모든 extras 라쳇 정지.

- Modal 배경 wheel (slot 0):
  - `endPress` 시 `startRatchetLoop("multi-bg")`.
  - `handleSpinEnd` 시 `stopRatchetLoop("multi-bg")`.
  - **터미널 판단**: 싱글 wheel 도 endPress 시 라쳇 시작 · 기존 playTick
    (slice boundary tick) 병행. 라쳇 = 시간 loop · tick = boundary event ·
    컨셉 다름 · 통일보다 병행 (기존 UX 회귀 최소 · Kyu 실기 후 재판정).

### Z28-3 · 순차 공개 암막 연속성 (정본 신설)

**Kyu 실측**: ×3 순차 공개 시 조각 전환마다 dim 걷힘 · 화면 깜빡임.

**뿌리**: `RouletteResultReveal` container (z 70 · backdrop rgba(2,6,23,0.78))
가 매 slot 마다 unmount → 새 카드 mount 시 backdrop fade in/out. AnimatePresence
transition 사이 dim 없음 순간 발생.

**Fix**:
```typescript
{(multiRevealIdx !== null || multiSpinResultReady) && (
  <motion.div
    key="multi-reveal-sticky-dim"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
    style={{
      position: "fixed", inset: 0,
      zIndex: 68,  // Reveal 70 뒤 · wheel 55 앞.
      background: "rgba(2,6,23,0.78)",
      pointerEvents: "none",
    }}
  />
)}
```

Sticky dim 이 순차 Reveal 전 기간 유지 · Reveal container 자체 fade 시에도
시각 연속.

### Z28-4 · 합체 점진 스케일업

**Kyu 실측**: 담기 후 미니 wheel 중앙 수렴 → 합쳐진 wheel 이 갑자기 base 크기
점프 (이질감).

**뿌리**: mergeStage='merged' 진입 시 · `multiSpinActive=false` → WheelStage
sizeOverride undefined → RouletteWheel 자체 useResponsiveSize (base 480 등)
· 순간 크기 변화.

**Fix** (배경 wheel wrapper motion.div):
```typescript
initial={{ ..., scale: 1 }}
animate={{
  ...,
  scale: mergeStage === "merged" ? [multiAutoScale.finalScale, 1] : 1,
}}
transition={{
  duration: mergeStage === "merged" ? 0.5 : 0.6,
  ease: [0.16, 1, 0.3, 1],
}}
```

merged 시 · scale keyframes `[autoScale.finalScale, 1]` (예: [0.5, 1]) · 축소
크기에서 base 로 부드럽게 확대 · glow flash 자연 연결.

### Z28-5 · 아이 프로필 최상위 (정본 신설)

**Kyu 실측**: ×2 모바일 세로 배치 · 스피너 프로필이 wheel 에 가려짐.

**Fix**:
- `RouletteModal.tsx` ParticipantCarousel motion.div wrapper style `zIndex: 80`.
- 위계: dim (5) · wheel (55) · flash (58) · Banner/JackpotBox/SavingsBox (60)
  · 결과 카드 (62) · sticky dim (68) · Reveal (70) · **ParticipantCarousel
  (80 · 최상위)**.

### Z28-6 (유지)

- Z27 자동 스케일 · 슬라이더 · 전 정본. 변경 없음.

## [DOC] 정본 문서 반영

- `docs/epics/roulette-final-redesign.md` · § N0-0730-Z28 정본 편입 (Z28-1
  증적 · Z28-2 라쳇 · Z28-3 sticky dim · Z28-4 스케일업 · Z28-5 프로필 z ·
  Z28-6 유지).
- `EPIC-STATE.md` · 룰렛 EPIC 라인 갱신:
  - `last_touched=2026-08-11 · last_verified=2026-08-11`.
  - `γ Z-1~Z28 PR #288 (auto-merge OFF · Kyu N0-0730-Z28 사운드 + 연출 연속성
    + 프로필 z)`.

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline 유지 (218 · 신규 없음).
- **test**: `jest` · 83 suites · 1102 pass · 5 skip · 0 fail · 12.1s.

## Z28-1 증적 (필수 · Kyu 요구)

**색 값 (코드)**:
- `RouletteResultReveal.tsx:273-277` · `sign === "zero" ? "#94A3B8" : sign ===
  "negative" ? "#FCA5A5" : "#F49AC2"` · zero = 회색.
- `RouletteModal.tsx:1057` · zeroStreams sign="zero" 세팅.

**사운드 발화 로그**:
- `RouletteModal.tsx` 안 setSplitStreams zero flow 직후 `playZeroDrop({
  muted: !soundEnabled })`. `[RouletteModal Z28-1] zero flow · sound=
  playZeroDrop muted= ...` 로그 편입.
- `HeartParticles.tsx` mount 시 `[HeartParticles Z28-1] mount · sign= ...
  actualColorCode= ...` 로그 편입.

Kyu B-9-x 실기 시 콘솔 캡처 → 실 발화 sign · color 확증. 코드 상 회색 정합 ·
관찰 분홍 실체 확정 후 재-fix.

## 커밋

```
1085fd70 feat(roulette): Z28 라쳇 사운드 + 암막 연속 + 스케일업 + 프로필 z + zero 증적 (N0-0730-Z28)
```

## 착지 상태

- PR #288 body 갱신 · B-9-x 실기 체크리스트 (Z28-1 콘솔 캡처 필수 · Z28-2 라쳇
  중첩 · Z28-3 dim 연속 · Z28-4 스케일업 · Z28-5 프로필 z) · QC · EPIC-STATE
  갱신.
- Kyu B-9-x 아이폰 실기 대기.

## 다음 라운드 (Z29) 예약

Kyu B-9-x 실기 결과에 따라:

- **Z29-1** = Z28-1 로그 mismatch 시 · 실 sign/color 뿌리 재조사·fix.
- **Z29-2** = Z28-2 라쳇 UX 미세조정 (볼륨·interval·톤).
- **Z29-3** = Z28-3 sticky dim 시각 잔존 시 opacity 조정.
- **Z29-4** = Z28-4 스케일업 timing 조정.
- **Z29-5** = 프로필 z 잔존 시 stacking context 재조사.

## 이연 순증감

- **이연 신설**: 없음 (Z28 5항 concrete + [DOC] 착지).
- **이연 해소**: 없음 (Z28-1 뿌리는 실기 로그 캡처 후 판정).
