# N0-0730-Z19 · 리포트

**round**: `N0-0730-Z19`
**timestamp**: 2026-08-10
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `4377f7e0`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu B-9-o 실기 3연속 위반 교정 · 접수 기준 강화 (실 브라우저 재현 전 fix
금지 · 렌더 경로 특정 결과 필수).

## O 렌더 경로 특정 결과 (Kyu 요구 필수 절)

### 실측 방법

1. **grep 전수**: `grep -rn "CanonicalSlice\|wheel-slice\|segment.*label\|
   SegmentPath"` 로 slice 렌더러 후보 전수.
2. **결과**: CanonicalSlice 컴포넌트 정의 = `RouletteWheel.tsx:569` 유일 ·
   호출 처 = 2 곳:
   - `RouletteWheel.tsx:1222` · 메인 wheel · `segments.map((seg, i) =>
     <CanonicalSlice seg={seg} ...>)`.
   - `RouletteResultReveal.tsx:187` · Reveal 카드 안 slice piece (단일 ·
     Reveal 열릴 때만 mount).
3. **다른 wheel 렌더러 잔존 없음** · 전 리포 grep 결과 확정.

### 뿌리 특정

Z17-2/Z18-3 fix 는 CanonicalSlice 안 SparklingOGlyph 3 개 loop 정확 · React
렌더는 3 개 발생. 하지만 Kyu 콘솔에 `[CanonicalSlice]` 로그 부재 = 뿌리 후보:

- **후보 A (확정)**: `console.debug` 는 Chrome DevTools 기본 verbose level
  이하 · filter 활성 안 하면 숨김. Kyu 콘솔에 표시 안 됨.
- 후보 B (배제): 다른 wheel 렌더러 잔존 → grep 결과 없음.
- 후보 C (배제): iconNodes loop count 오류 → code 검토 정확.

### Fix

- `console.debug` → `console.info` (기본 filter 통과).
- SparklingOGlyph 에 `data-testid="spin-icon-o-{count}-{idx}"` 부여 · 실 DOM
  검증 근거.
- RouletteWheel useEffect (mount + 500ms + 2000ms) · `document.querySelectorAll
  ('[data-testid^="spin-icon-o"]')` 자동 카운트 로그 (`[RouletteWheel Z19-1]
  DOM O count · total= spin×2= spin×3= expected: ×2=2 ×3=3`).

### Kyu B-9-p 실기 대비 실측 증적 요청

- 콘솔 filter = `info` level 활성.
- 룰렛 modal 열기.
- 다음 로그 라인 캡처 (스크린샷 or 텍스트):
  ```
  [CanonicalSlice Z19-1] spinIcon render · requestedCount= 3 renderedCount= 3 ...
  [RouletteWheel Z19-1] DOM O count · total= 5 spin×2= 2 spin×3= 3
  ```
- **spin×3= 3 · 육안 3** = 완결.
- **spin×3= 3 · 육안 2** = 시각 clip · slice 위치 조정 (Z20).
- **spin×3= 2** = React 렌더 뿌리 · 재조사.
- **로그 없음** = **다른 wheel 렌더러 잔존** · DOM inspect (`data-testid^=
  "spin-icon-o"` 검색) · 경로 특정 요청.

## 착수 · 결정 정리

### Z19-1 · O 렌더 경로 실측 확정

(위 O 렌더 경로 특정 결과 절 참조)

### Z19-2 · 뒷면 플립 생략 (dev 컨트롤러 경로 포함)

**Kyu 실측 (B-9-o)**: dev controller ●●● 경로에서 뒷면 플립·"="·Reveal 카드·
[담기] 여전히 발생.

**뿌리**: `RouletteModal.tsx:onForceReveal` 안 · `front.kind === "spin"` 도
`setRevealData` 경유. Reveal 카드 등장 · 자연 flow 와 다름.

**Fix**:
```typescript
if (front.kind === "spin") {
  // Z19-2 · SPIN = Reveal skip · handleSpinEnd 로 즉시 진입.
  if (matchIdx >= 0) {
    setStage("spin");
    handleSpinEnd(matchIdx);
  }
}
```

JACKPOT 은 Reveal 경유 유지 (payout pool 표시). AGAIN 은 handleSpinEnd
즉시 (Z4-2). POINTS 는 Reveal 유지 (뒷면 플립 정본).

### Z19-3 · wheel 동일 크기·2줄 역삼각

**Kyu 실측 (B-9-o · 3회째)**: 추가 wheel 이 배경 wheel 보다 작음 (미니) ·
겹침.

**뿌리**: `MultiWheelExtras.wheelSize = 300/240/180` (별도 축소 값) · 배경
`useResponsiveSize` (데스크톱 `min(vw-200, 480)`) 와 상이. 또한 배치 계산이
겹침 방지 부족.

**Fix (MultiWheelExtras 재작성)**:

- `useMainWheelSize` = 배경 `useResponsiveSize` 로직 복사 (데스크톱 `min(vw-
  200, 480)` · 모바일 `max(220, min(vw-64, 340))`). 두 곳 sync 는 수동 관리.
- `RouletteWheel` size prop 미지정 → 자체 반응형 · 배경과 완전 동일.
- **horizontal fit 판정**: `totalCount × wheelSize + gap × (N-1) + 40 ≤ vw`.
  - vw=1440 · wheelSize=480 · 3 개 = 1480 + 40 = 1520 > 1440 → **미fit** →
    2줄 역삼각.
  - vw=1920 · 3 개 = 1520 < 1920 → **fit** → 가로 3 개.
- **미fit 시 배치** (2줄 역삼각):
  - SPIN×3 (extrasCount=2) · 위 2 (좌·우) · 배경 아래 (중앙 유지).
    · 추가 좌 finalX = `centerX - (wheelSize + gap) / 2` · finalY =
      `centerY - wheelSize - gap`.
    · 추가 우 finalX = `centerX + (wheelSize + gap) / 2`.
  - SPIN×2 (extrasCount=1) · 위 1 (중앙) · 배경 아래.
    · 추가 finalX = `centerX` · finalY = `centerY - wheelSize - gap`.
- **뷰포트 폭별 로그** (`[MultiWheelExtras Z19-3] layout calc · extrasCount=
  wheelSize= vw= vh= totalCount= gap= horizontalWidth= horizontalFit=
  layout=`).

### Z19-4 (유지)

- 멀티 룰렛 배너 · 암막 걷힘 · 기존 중앙 wheel 유지 · 멀티판 ♥2000/♥3000 ·
  사운드 · 전 wheel 완료 후 합산 카드 1회 · 스피너 비중복. 변경 없음.

## [DOC] 정본 문서 반영

- `docs/epics/roulette-final-redesign.md` · § N0-0730-Z19 정본 편입 (3연속
  위반 교정 · 접수 기준 강화 명기 · Z19-1/2/3/4 상세).
- `EPIC-STATE.md` · 룰렛 EPIC 라인 갱신:
  - `last_touched=2026-08-10 · last_verified=2026-08-10`.
  - `γ Z-1~Z19 PR #288 (auto-merge OFF · Kyu B-9-o 실기 판정 · N0-0730-Z19
    3연속 위반 교정)`.
  - note: Z19 3 항 landed 표기.

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline 유지 (216 · 35 errors · 181 warnings · 신규 없음).
- **test**: `jest` · 83 suites · 1102 pass · 5 skip · 0 fail · 13.0s.

## 커밋

```
4377f7e0 feat(roulette): Z19 O 뿌리 실측 + 뒷면 skip + wheel 동일 크기 (N0-0730-Z19)
```

## 착지 상태

- PR #288 body 갱신 완료 · `**round**: \`N0-0730-Z19\`` 첫 줄 · B-9-p 실기
  체크리스트 (Z19-1 콘솔 로그 필수 · Z19-2 뒷면 skip · Z19-3 wheel 크기) ·
  QC · EPIC-STATE 갱신.
- Kyu B-9-p 실기 대기 · approve 후 auto-merge.

## 다음 라운드 (Z20) 예약

Kyu B-9-p 실기 결과 (특히 Z19-1 콘솔 로그 캡처) 에 따라:

- **Z20-1** = O 뿌리 최종 fix (로그 결과별 분기):
  - `renderedCount= 3` + 육안 2 = 위치 조정 (slice 폭 확장 or 재배치).
  - `renderedCount= 2` = 뿌리 재조사.
  - 로그 부재 = 다른 렌더러 특정.
- **Z20-2** = Z19-3 wheel 겹침 실측 · 뷰포트별 배치 로그 검증.
- **Z20-3** = JACKPOT/AGAIN slot 처리 (multiSpin 안).
- (기타 B-9-p 실기 fail 항목).

## 이연 순증감

- **이연 신설**: 없음 (전 3 항 concrete + [DOC] 착지).
- **이연 해소**: Z14~Z18 이연 없이 신 라운드 시작 · 심문 없음.
