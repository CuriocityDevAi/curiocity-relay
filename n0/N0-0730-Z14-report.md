# N0-0730-Z14 · 리포트

**round**: `N0-0730-Z14`
**timestamp**: 2026-08-09
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `8aa13edd`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Z14 concrete fix (Z14-3 twinkle · Z14-4 잭팟 카운트업) 완료 · Z14-1 (WheelStage
N 개) · Z14-2 (wheel slice SVG) 는 refactor 규모 큼 · `n0/N0-0730-Z14-inquiry.md`
로 Kyu 판정 회부.

## 착수 · 결정 정리

### Z14-3 · twinkle 뿌리 fix (완료)

**뿌리 진단**: `handleAcceptToWallet` 진입 즉시 · `playDepositTwinkle` 12번
(40ms stagger · 총 ~500ms) 이 delta 판정 이전에 발동. JACKPOT · SPIN · zero
· negative 모든 정산 케이스에서 축하 톤이 상황과 무관하게 발화. Kyu 관찰
"띠리리링" = 이 twinkle 로 추정.

**Fix**: twinkle 발화를 delta 계산 후로 이동 · `willTwinkle = !isJackpot &&
!isSpin && delta > 0` 조건. positive 정산에만 발동.

```typescript
const delta = deltaFromTotal(result.total);
const isJackpot = result.front.kind === "jackpot";
const isSpin = result.front.kind === "spin";
const willTwinkle = !isJackpot && !isSpin && delta > 0;
if (willTwinkle) {
  // twinkle 12번 발화 + playDepositComplete finale.
}
```

**미해결 · 심문 회부**: Kyu 실측 "붉은 하트" 재현 실체 · 코드 상 zero flow 는
sign="zero" (회색 #94A3B8) 유지 · 붉은 하트 = negative sign color (#FCA5A5) ·
실 브라우저 재현이 zero 시나리오가 아닌 (SPIN×N 합산 우연 0 · 각 개별은 음수
포함 → negative flow) 케이스 가능성. Q3 회부.

### Z14-4 · JACKPOT 카운트업 가시성 (완료)

**뿌리 진단**: JACKPOT payout balance push · 1400ms fixed timer. 스트림은
stagger 350ms + 거리 기반 duration 1200~2600ms · 3인 spread N=3+savings=4 시
스트림 완료 = 3×350 + 2600 = 3650ms. balance push 1400ms 는 첫 스트림 도착
전에 카운트업 시작 · 시각 어긋남.

**Fix**: balance push = `max(0, N-1) × 350 + 2600` ms 후. scheduleFadeout =
balance push + 500 (count-up tween) + 3000 (관찰 · X-1 규약) ms.

```typescript
const streamCountJp =
  useSplit && res.data.hearts
    ? res.data.hearts.filter((h) => h.delta > 0).length +
      (res.data.savings && res.data.savings.delta > 0 ? 1 : 0)
    : 1;
const balancePushMs = Math.max(0, streamCountJp - 1) * 350 + 2600;
window.setTimeout(pushBalances, balancePushMs);
scheduleFadeout(performance.now() + balancePushMs + 500 + 3000);
```

**결과**: N=3 시 총 fadeout 지연 = 2×350 + 2600 + 500 + 3000 = 6800ms.
"받는 기쁨" 관찰 창 충분 여부는 Kyu 실측 · Q4 회부.

### Z14-1 · WheelStage N 개 배치 (회부)

**진단**: WheelStage 는 `RouletteModal.tsx` 내부 helper function · 별도 파일
아님. spinNonce · spinPower · landingIndex · handleSpinEnd 등 전역 상태
사용 · press/swipe 이벤트도 viewport 전역. N 개 배치는 별건 refactor (예상
400~600 LOC · 파일 분리 · press 이벤트 재작성 등).

**회부**: `n0/N0-0730-Z14-inquiry.md` Q1 · (가) 이번 라운드 착수 vs (나)
Z15 분리 vs (다) 축소 재사용 · Kyu 판정 대기. Claude 의견 = (나).

### Z14-2 · wheel slice SVG (회부)

**진단**: CanonicalSlice 는 SVG `<text>` 로 label 렌더 · string 만 지원 ·
React child 미지원. SVG 아이콘 편입 = label 타입 확장 (150~200 LOC).
Reveal · MultiSpinStage · Controller 는 이미 MiniRouletteIcon 사용 (Z13-0)
· wheel slice 만 잔여.

**회부**: Q2 · (가) marker string vs (나) label 타입 확장 vs (다) render
prop · Kyu 선택 대기. Claude 의견 = (나).

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline 유지 · RouletteModal 신규 error 0 · warning 1 (기존
  `_count` unused · Z14 무관).
- **test**: `jest` · 83 suites · 1102 pass · 5 skip · 0 fail · 12.2s.

## 커밋

```
8aa13edd feat(roulette): Z14 twinkle 뿌리 + 잭팟 카운트업 가시성 (N0-0730-Z14)
```

## 착지 상태

- PR #288 body 갱신 완료 · `**round**: \`N0-0730-Z14\`` 첫 줄 · 실기
  체크리스트 · QC · EPIC-STATE 무변 근거 포함.
- Kyu 실기 대기 · approve 후 auto-merge (auto-merge OFF · Kyu approve 클릭
  시 T0 활성화 예상 · § 11.4 절차).

## 다음 라운드 (Z15) 예약

Kyu 심문 답변 후 착수:

- **Z15-1** = Z14-1 (WheelStage N 개) 판정 결과 반영.
- **Z15-2** = Z14-2 (wheel slice SVG) 판정 결과 반영.
- **Z15-3** = Z14-3 실측 재현 · fix 완결 or 재-회부.
- (기타 Kyu 실기 후 신규 fail 항목).
