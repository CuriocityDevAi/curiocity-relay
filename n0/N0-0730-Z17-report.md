# N0-0730-Z17 · 리포트

**round**: `N0-0730-Z17`
**timestamp**: 2026-08-10
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `85ad87a4`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu B-9-m 실기 판정 5 항 정본 반영 · 4 concrete + 1 MVP + [DOC] 편입 + 심문
회부 3.

## 착수 · 결정 정리

### Z17-1 · 스피너 연속 중복 배제 (서버)

**Kyu 실측 뿌리**:
- 슈퍼 빙고 3 연속 스핀 시 · 같은 아이 3연속 이산.
- `splitStreams curIdx=14` (seqLen=3) 이상값 · 뿌리 조사 편입 (Q2 회부).

**서버 조사** (`server/routes/bingoSpinSeed.cjs`):
- `deriveSequence` (Z3-3 신설) · 각 seqIdx=0..N-1 에서 독립적으로 `spinnerIdx =
  seedU32 % participantIds.length` · 중복 허용.
- N=3 · 참여자 3 명 시 · 3연속 같은 pid 확률 = 1/9 (11%) · 실제로 발생.

**Fix**:
```js
function deriveSequence(bingoPatternId, sortedParticipantIds, segmentCount, spinCount) {
  const out = [];
  let prevPid = null;
  for (let i = 0; i < spinCount; i++) {
    const seedBytes = deriveSeed(...);
    const candidates = prevPid !== null && sortedParticipantIds.length > 1
      ? sortedParticipantIds.filter((p) => p !== prevPid)
      : sortedParticipantIds;
    const spinnerIdx = seedBytes.readUInt32BE(0) % candidates.length;
    const spinnerPid = candidates[spinnerIdx];
    out.push({ spinnerPid, landingIndex: seedBytes.readUInt32BE(4) % segmentCount });
    prevPid = spinnerPid;
  }
  return out;
}
```

**결과**: 참여자 2+ 시 · 절대 같은 pid 연속 안 됨. 참여자 1 시 fallback.

### Z17-2 · slice O 개수 정합

**Kyu 실측**: SPIN×3 slice 에 O 2 개만 표시.

**뿌리 진단**:
- Z16-3 SparklingOGlyph · fontSize/gap 이 slice 유효 반경 (LABEL_R_INNER=44 ~
  LABEL_R_OUTER=80 · extent 36) 벗어남.
- narrow slice (5° 폭) · oFontSize = LABEL_FONT_INNER * 1.1 = 13.2 · gap =
  13.2 * 0.85 = 11.22.
- count=3 · totalLen = 22.44 · startY = -(62 + 11.22) = -73.22.
- Os y = -73.22, -62, -50.78 · 첫 O 는 rim (80) 에 걸치고 · 마지막 O 는 hub
  (44) 에 걸침 · 시각 clipped.

**Fix**:
- fontSize dynamic 계산 · `fitFont = extent / (count + 0.5)`.
- `maxFont = narrow ? LABEL_FONT_INNER + 1 : LABEL_FONT_OUTER`.
- `oFontSize = min(maxFont, fitFont)`.
- count=3 narrow: `min(13, 36/3.5) = min(13, 10.28) = 10.28`.
- gap = 9.25 · Os y = -71/-62/-53 · 안전 fit (rim 80 · hub 44 안).

### Z17-3 · SPIN 즉시 진입 (정본)

**Kyu 정본**:
> "뒷면 플립·룰렛 결과 카드·[담기] 전부 폐지. 당첨 확정 즉시 좌·우에서 휠이
> 슬라이드-인하여 기존 중앙 휠 포함 N개가 화면 중앙 배치."

**Fix**:
- `handleSpinEnd` 안 `front.kind === "spin"` 분기 신설 (line 622~633):
  ```typescript
  if (front.kind === "spin") {
    setRevealData(null);
    setMultiSpinCount(front.times);
    setMultiSpinActive(true);
    setDepositState("idle");
    setStage("depositing");
    return;
  }
  ```
- MultiSpinCell 슬라이드-인 애니 (`motion.div` wrapper):
  - `initial x = idx === 0 ? 0 : idx % 2 === 1 ? -window.innerWidth * 0.6 :
    +window.innerWidth * 0.6`.
  - `animate x = 0` · `duration 0.55s` · `ease [0.16, 1, 0.3, 1]` (Kyu 표준).
  - `delay = idx * 0.08s` (stagger).
- idx 0 = 중앙 (배경 wheel 자리 · fade-in 만) · idx 1 = 왼쪽 → 중앙 · idx 2
  = 오른쪽 → 중앙.

### Z17-4 · overlay 완전 폐기 MVP (Kyu Q1 (가) 확정 · dim 방식 기각)

**Fix (MVP)**:
- Modal 배경 wheel wrapper · `multiSpinActive` 시 opacity 0 (완전 hide).
  Z16 dim (0.2) 방식 폐기 (Kyu 명시).
- MultiSpinStage 안 N 개 wheel 이 슬라이드-인 (좌·우) 으로 등장.
- 사용자 시각 = 배경 wheel 사라지고 N 개 wheel 이 화면에 배치 · Kyu "총 N 개"
  정합.

**완전 실현 (심문 Q1 회부)**:
- Kyu 정본 "배경 wheel 이 slot 0 로 그대로 승격 · 재-스핀 가능" 은 wheelStage
  refactor 필요 (300~500 LOC · 심문 회부).
- MVP 는 시각적으로 "N 개 wheel 화면 배치" 충족 · B-9-n 실기 후 판정.

### Z17-5 · 멀티 wheel segments 신설

**Fix**:
- `MULTI_SPIN_ROULETTE_SEGMENTS` (defaultRouletteConfig.ts) · 기존 판에서
  SPIN×2/×3 slice 만 교체:
  ```typescript
  export const MULTI_SPIN_ROULETTE_SEGMENTS = DEFAULT_ROULETTE_SEGMENTS.map((seg) => {
    if (seg.fill.kind === "spin") {
      const n = seg.fill.times === 2 ? 2000 : 3000;
      const color = seg.fill.times === 2 ? "sky" : "purple";
      return { label: `♥${n}`, fill: { kind: "candy", color }, weight: seg.weight };
    }
    return seg;
  });
  ```
- Modal · MultiSpinStage 에 이 판 전달 (`segments={MULTI_SPIN_ROULETTE_SEGMENTS}`).
- 재귀 증식 방지 · 사용자가 화면 한계 3+ 룰렛 무한 확장 못함.
- JACKPOT (풀 지급 · 예약) · AGAIN (해당 wheel 만 1 회 재스핀 · 예약) 유지.

## [DOC] 정본 문서 반영

- `docs/epics/roulette-final-redesign.md` · § N0-0730-Z14 ~ Z17 정본 편입
  (기존 Z1~Z13 뒤에 5 라운드 추가 · 각 세부 항 명시).
- `EPIC-STATE.md` · 룰렛 EPIC 라인 갱신:
  - `last_touched=2026-08-10 · last_verified=2026-08-10`.
  - `partial · γ Z-1~Z17 PR #288 (auto-merge OFF · Kyu B-9-m 실기 판정 · N0-
    0730-Z17 반영)`.
  - note 편입: Z14~Z17 iteration 요약 · Z17 5 항 landed 표기.

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline 유지 (215 · 35 errors · 180 warnings · 신규 없음).
- **test**: `jest` · 83 suites · 1102 pass · 5 skip · 0 fail · 12.6s.

## 커밋

```
85ad87a4 feat(roulette): Z17 SPIN 즉시 진입 + overlay 폐기 + 스피너 배제 + O 정합 + 멀티판 (N0-0730-Z17)
```

## 착지 상태

- PR #288 body 갱신 완료 · `**round**: \`N0-0730-Z17\`` 첫 줄 · B-9-n 실기
  체크리스트 (Z17-1 스피너 · Z17-2 O · Z17-3 즉시 진입 · Z17-4 overlay · Z17-5
  멀티판) · QC · EPIC-STATE 갱신 근거.
- Kyu B-9-n 실기 대기 · approve 후 auto-merge.

## 다음 라운드 (Z18) 예약

Kyu B-9-n 실기 결과 + 심문 답변 후:

- **Z18-1** = Q1 판정 결과 반영 (배경 wheel = slot 0 완전 실현 착수 or MVP
  완결).
- **Z18-2** = Q2 curIdx 이상값 fix (log 캡처 후).
- **Z18-3** = Q3 SPIN 프리셋 흐름 통일 (dev controller · 자연 흐름).
- **Z18-4** = Z15-3 붉은 하트 로그 캡처 · 뿌리 확정 (여전히 미확인).
- (기타 B-9-n 실기 fail 항목).

## 심문 게시 완료

- `curiocity-relay/n0/N0-0730-Z17-inquiry.md`.
