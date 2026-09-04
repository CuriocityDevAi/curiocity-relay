# N0-0904-E · 리포트

**round**: `N0-0904-E`
**timestamp**: 2026-09-04
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `c4f90652`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu 2026-09-04 · D-3 비행음·D-4 종이 탁·라쳇 밀도 착지 확증 · 결함 4 + 정본
정정 1.

## 착수 · 결정 정리

### E-1 · D-2 미작동 진단 (로그 편입)

**Kyu 실측**: D-2 배선 (CountUp durationMs=560ms · Twinkle 4음정 460ms) 이 실기
에서 여전히 4음 안 남 + 카운트업 먼저 끝남. 뿌리 후보 (a) 다른 지갑 컴포넌트
? · (b) sound node GC/stop?

**조사**: CountUpNumber 전 리포 grep = 1 곳 (CarouselParticipant · durationMs
560ms 명시 정합). Twinkle 4음정 for loop · 각 osc 별개 인스턴스 · Web Audio
병합 없음.

**Fix (진단 로그 편입)**:
- `src/utils/showSound.ts:playDepositTwinkle` 안 · 시작 wallTime + 각 음 `osc
  .onended` 시각 로그 (`[playDepositTwinkle E-1] note N/4 ended · elapsed=`).
- `src/components/common/CountUpNumber.tsx` 안 · useEffect value 변경 시
  start/end wallTime + durationMs prop 로그.

Kyu 실기 콘솔 캡처 후 실제 duration/onended 실측 · 뿌리 확정 후 후속 fix.

### E-2 · 음수 정본 순서 fix

**Kyu 정본**:
- 양수: 스트림 발사 → 도착 → 상승음 + 카운트업.
- 음수: 카운트다운 + 하강음 → (완주) → 스트림 발사 → 잭팟 도착.

**Fix** (`RouletteModal.tsx:1196~1240` · splitN/copyAll flow):
```typescript
if (isNegativeSettlement) {
  // (a) dedup pre-add · 스트림 도착 시 skip.
  streams.forEach((s) => perRecipientSoundPlayedRef.current.add(s.affectedPid));
  // (b) balance push 즉시 · 카운트다운 시각 = 사운드 시각.
  streams.forEach((s) => {
    if (s.balance !== -1) {
      if (s.affectedPid === "__savings__") useSavingsPoolStore...setBalance;
      else useHeartBalanceStore...setBalance(s.affectedPid, s.balance);
    }
  });
  // (c) Drain 발화 각 수혜자 stagger 400ms.
  streams.forEach((_s, i) => window.setTimeout(playDepositDrain, i * 400));
  // (d) setSplitStreams 지연 350 + 460 + 100 = 910ms.
  window.setTimeout(() => setSplitStreams(streams), 910);
} else {
  window.setTimeout(() => setSplitStreams(streams), 350);
}
```

정본 순서 = 카운트다운 + Drain → 완주 → 스트림 발사.

### E-3 · 라쳇 stop timing 로그

**Kyu 실측**: 룰렛 정지 후 ~1초 라쳇 지속.

**뿌리 후보**: `onSpinEnd` 콜백은 motion animation onComplete (finishSpin) 시점
· stopRatchetLoop 은 그 안 첫 줄 (즉시). setInterval clearInterval 은 다음
tick 부터 무시. 이론상 지연 < 100ms. Kyu 관찰 1초 = 다른 요인?

**진단 로그 편입**:
- `[RouletteModal E-3] handleSpinEnd (wheel visually stopped) · wall=` (Modal · slot 0).
- `[MultiWheelExtras E-3] handleSpinEndLocal · extraIdx= wall=`.
- `[stopRatchetLoop E-3] id= wall=`.

Kyu 실기 시 두 wallTime 차이 실측 · <50ms 목표. 미달 시 · onSpinEnd 콜백 자체
가 늦게 발화 (motion animation onComplete 지연 · rAF · setState batching).

### E-4 · 웨지 등장 400ms 여운

**Kyu 정본**: 마지막 wheel 완전 정지 → 짧은 여운 (300~500ms) → 웨지 등장.

**Fix**:
- `RouletteModal.tsx` `positionalReadyDelay` state 신설 · default false.
- useEffect · 전 slot done && !multiSpinResultReady && !positionalReadyDelay
  감지 시 · setTimeout 400ms · setPositionalReadyDelay(true) · 로그 편입.
- positionalActive 조건에 `&& positionalReadyDelay` 편입.
- 3 지점 SPIN 진입 리셋 · `setPositionalReadyDelay(false)`.

**결과**: 마지막 wheel 정지 후 400ms 여유 · 사용자 wheel 착지 위치 관찰 시간.

### E-5 · A-4a 정본 정정 (스케일업 폐기 · glow 축소)

**Kyu 판정**: "합체 후 스케일업" 은 오해. 정본 = **룰렛 크기 그대로 · 빛만
커진다 · 현재 빛 과함 · 절반**.

**Fix**:
- `RouletteModal.tsx:2002` · wheel wrapper animate `scale: 1` 상시 (기존
  `mergeStage === "merged" ? [cachedRef, 1] : 1` 조건부 폐기). `cachedMerge
  FromScaleRef` useRef 는 legacy 유지 (다른 참조 없음 · dead).
- `MultiSpinMergeFlash.tsx` · 강도·범위·지속 절반:
  - Peak opacity: 1 → 0.5.
  - Duration: 0.7s → 0.4s.
  - Radial gradient stop 축소 (25% → 15% · 50% → 30% · 75% → 50%).
  - Alpha 절반 (0.95 → 0.55 · 0.7 → 0.4 · 0.3 → 0.18).

**A-4a docs 정정**: "합체 후 부드럽게 base 크기 확대" → "합체 시 크기 그대로 ·
합쳐진 빛만 커짐 · 강도 절반".

### E-6 (유지)

- C-1 · C-3 · D-3 · D-4 · A-1 · A-3 · B-1 · B-2 · B-3 · B-4 회귀 X.

## 자기 검증 (규약 · Playwright MCP)

**미실행** — 사용자 실기 환경 (Kyu 브라우저 · localhost:3000 로그인 세션)
필요. 로컬 dev:all 기동 검증은 이번 라운드 스코프 아님 (concurrently
frontend/backend + PostgreSQL grownest_dev · CI 아닌 사용자 세션 필수).

**콘솔 로그 편입 완료** · Kyu 실기 시 캡처 후 목표값 판정:

| 측정 | 로그 라인 | 목표 |
|------|----------|------|
| (a) 카운트업 시작~끝 ms | `[CountUpNumber E-1] start / end · elapsed=` | Y ≥ 460ms |
| (b) 4음 onended 4회 | `[playDepositTwinkle E-1] note N/4 ended · elapsed=` | 4개 다 찍힘 |
| (c) 휠 정지↔라쳇 stop | `[RouletteModal E-3] handleSpinEnd wall=A` + `[stopRatchetLoop E-3] wall=B` | \|B-A\| < 50ms |
| (d) 마지막 휠↔웨지 등장 | `[handleSpinEndLocal E-3] wall=C` + `[RouletteModal E-4] positional reveal ready · wall=D` | D-C ≈ 400ms |

Kyu 콘솔 캡처 (screenshot or text copy) 후 목표값 판정 · 미달 시 재-fix.

## [DOC] 정본 문서 반영

- `docs/epics/roulette-final-redesign.md` · § N0-0904-E 정본 편입 (**A-4a
  정정 명시** = "합체 = 크기 그대로 · 빛만 커진다").
- `EPIC-STATE.md` · last_touched=2026-09-04 · last_verified=2026-09-04.

## 증적 (파일경로+줄수+커밋해시)

- 커밋 · `c4f90652`.
- `src/utils/showSound.ts:161~208` · playDepositTwinkle 진단 로그 (E-1).
- `src/utils/soundFx.ts:262~278` · stopRatchetLoop 로그 (E-3).
- `src/components/common/CountUpNumber.tsx:22~62` · start/end 로그 (E-1).
- `src/components/Roulette/RouletteModal.tsx:361~365` · positionalReadyDelay
  state (E-4).
- `src/components/Roulette/RouletteModal.tsx:373~397` · useEffect · 400ms
  setTimeout (E-4).
- `src/components/Roulette/RouletteModal.tsx:807/2255/2679` · SPIN 진입 시
  리셋 (E-4).
- `src/components/Roulette/RouletteModal.tsx:552~562` · handleSpinEnd 로그
  (E-3).
- `src/components/Roulette/RouletteModal.tsx:1196~1240` · E-2 negative 순서
  fix.
- `src/components/Roulette/RouletteModal.tsx:2093~2098` · positionalActive
  조건 (E-4).
- `src/components/Roulette/RouletteModal.tsx:2000~2008` · wheel wrapper scale
  1 상시 (E-5).
- `src/components/Roulette/MultiWheelExtras.tsx:207~217` · handleSpinEndLocal
  로그 (E-3).
- `src/components/Roulette/MultiSpinMergeFlash.tsx:27~48` · 강도·지속·radial
  절반 (E-5).

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline (220 · 신규 warning +1 · 무해).
- **test**: `jest` · 84 suites · 1110 pass · 5 skip · 0 fail · 12.8s.

## 착지 상태

- PR #288 body 갱신 · `**round**: \`N0-0904-E\`` 첫 줄 · Kyu 실기 체크리스트
  (E-1 콘솔 · E-2 음수 순서 · E-3 라쳇 timing · E-4 웨지 지연 · E-5 glow
  축소) · QC · EPIC-STATE 갱신.
- Kyu 실기 대기.

## 이연 순증감

- **이연 신설**: 없음 (E-1·E-2·E-3·E-4·E-5 5 항 전부 concrete or 진단 로그
  + [DOC] 착지).
- **이연 해소**:
  - **E-2 음수 정본 순서** (D-1 fix 후 · 순서 별개 문제).
  - **E-4 웨지 등장 지연** (Kyu 정본 신설).
  - **E-5 A-4a 정정** (스케일업 오해 · 정정).
- **진단 로그 후속**: E-1 · E-3 은 진단 로그 편입만 · Kyu 실기 콘솔 캡처 후
  실측 로그로 뿌리 확정 · 후속 라운드 fix.
