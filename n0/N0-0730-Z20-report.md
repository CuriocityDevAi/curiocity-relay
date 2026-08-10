# N0-0730-Z20 · 리포트

**round**: `N0-0730-Z20`
**timestamp**: 2026-08-10
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `c4dfe7e3`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu B-9-p 실기 잔존 결함 (마지막) · 그룹 중앙 정렬 · concrete + [DOC].

## Kyu 실기 실측 요약 (B-9-p)

- **Z19-1 O = 사가 종결 확증**: 콘솔 `renderedCount= 3` + DOM `spin×3= 3`
  정합. 재론 금지.
- **Z19-2 즉시 진입** ✓ (뒷면 플립·Reveal·[담기] skip).
- **잔존**: N=2 · 배경 wheel 좌측 고정 + 추가 wheel 우측 화면 밖 잘림.
  vw=1206 · fit=true 인데도 잘림 (앵커 문제).

## 뿌리 진단

배경 wheel = Modal WheelStage · viewport 중앙 pin. N=2 시 추가 wheel finalX
= `centerX + wS + gap` → 그룹 중심 = `centerX + (wS + gap) / 2` ≠ 뷰포트 중심.
결과: 추가 우측 = `centerX + wS + gap + wS/2` · vw=1206 · wS=480 · gap=20 →
우측 = 1343 > 1206 = 잘림.

## 착수 · 결정 정리

### Z20-1 · 그룹 중앙 정렬 정본

**Kyu 정본**: 그룹 bounding box 중심 = 뷰포트 중심. 배경 wheel 도 자기 slot
좌표로 transform 트랜지션 이동 (unmount/remount 금지 · 연속성).

**Fix**:

- **`useMainWheelSize.ts` 신설** · Modal 과 MultiWheelExtras 공통 훅 (wheelSize
  sync).
- **Modal 안 계산** · `bgTranslateX/Y = useMemo(...)` · 뷰포트 폭·N·fit 조건별:
  - N=2 fit: `bgTranslateX = -(wS + gap) / 2`.
  - N=2 !fit: `bgTranslateY = +(wS + gap) / 2` (역삼각 · 배경 아래).
  - N=3 fit: `bgTranslateX = 0` (중앙).
  - N=3 !fit: `bgTranslateY = +(wS + gap) / 2` (역삼각).
- **Modal WheelStage wrapper motion.div**:
  `animate={{ opacity 1, x: bgTranslateX, y: bgTranslateY }}` ·
  `transition { duration 0.6, ease [0.16, 1, 0.3, 1] }`.
- **MultiWheelExtras ExtraCell** 재계산 (뷰포트 중심 기준 slot 대칭):
  - N=2 fit: finalX = `centerX + (wS + gap) / 2` (우 slot).
  - N=2 !fit: finalX = `centerX` · finalY = `centerY - (wS + gap) / 2` (위).
  - N=3 fit: slot1 = `centerX - (wS + gap)` · slot2 = `centerX + (wS + gap)`.
  - N=3 !fit: slot1/2 = `centerX ± (wS + gap) / 2` · finalY = `centerY -
    (wS + gap) / 2`.

### Z20-2 · 검증 로그

- `[RouletteModal Z20-2] bg wheel translate · slot 0 · wheelSize= vw= vh=
  translateX= translateY= bgCenterX= bgCenterY= marginL= marginR= marginT=
  marginB= clipped=`.
- `[MultiWheelExtras Z20-2] cell final coords · slot N · wheelSize= finalX=
  finalY= left= right= top= bottom= marginL= marginR= marginT= marginB=
  clipped=`.
- 여백 대칭 (`marginL ≈ marginR`) + `clipped= false` 판정.

### 유지 정본 (Z20-3)

- O 정합 (Z19-1 종결) · 즉시 진입 (Z19-2) · 동일 크기 (Z19-3) · 멀티판
  ♥2000/♥3000 (Z17-5) · 사운드 (Z18-4) · 합산 카드 1회 (Z18-1) · 스피너
  비중복 (Z17-1).

## [DOC] 정본 문서 반영

- `docs/epics/roulette-final-redesign.md` · § N0-0730-Z20 정본 편입.
- `EPIC-STATE.md` · last_verified=2026-08-10 · Z20 landed.

## QC

- typecheck 0 · lint baseline (216 · 35/181) · test 1102 pass / 5 skip / 0 fail.

## 커밋

```
c4dfe7e3 feat(roulette): Z20 그룹 중앙 정렬 · 배경 wheel translate (N0-0730-Z20)
```

## 착지 상태

PR #288 body 갱신 · Kyu B-9-q 실기 대기.

## 다음 라운드 (Z21) 예약

Kyu B-9-q 실기 결과 (Z20-2 여백 대칭 로그 캡처) 후:

- **Z21-1** = 여백 대칭 미달 시 계산 fix.
- **Z21-2** = clipped=true 시 뷰포트별 축소/재구성.
- **Z21-3** = JACKPOT/AGAIN multiSpin slot 처리 정본화.

## 이연 순증감

- **이연 신설**: 없음.
- **이연 해소**: **Z19-1 O 렌더 뿌리 사가 종결** (Kyu 실측 확증).
