# N0-0730-Z26 · 리포트

**round**: `N0-0730-Z26`
**timestamp**: 2026-08-11
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `9bbbf325`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu B-9-u 실기 · SPIN×3 여전히 총 2 wheel · Z25-3 상태 sync 정상 · **입력
extrasCount 자체가 1** · 뿌리 = N 전달 경로. concrete fix + 로그 강화.

## Kyu 실측 콘솔 요약

`●●●● SPIN×3` 강제 시:
- `[MultiWheelExtras Z25-3] extrasCount sync · requested= 1 expectedRendered= 1`.
- `[Z19-3] layout calc extrasCount= 1 totalCount= 2`.

Z25-3 상태 동기화는 정상 작동 (requested=expected). 뿌리 = extrasCount 입력값
자체가 1 (기대 2). N→extrasCount 산출 경로에 있음.

## N 전달 경로 전수 추적

1. **Dev controller preset**: `RouletteDevController.tsx` COMBO_PRESETS ·
   `{ label: "●●●● SPIN×3", front: { kind: "spin", times: 3 } }`.
2. **onForceReveal(front)** 콜백 · front.times=3 (정상 · Z23 신설 값).
3. **Modal onForceReveal** 안:
   ```typescript
   const matchIdx = segments.findIndex((s) => {
     return segmentToFront(s).kind === front.kind;  // ← SPIN kind 만 매칭.
   });
   ```
   - segments = DEFAULT_ROULETTE_SEGMENTS (원 판 · MULTI_SPIN 아님).
   - 첫 SPIN segment 매칭 (SPIN×2 · index 낮음) · matchIdx=SPIN×2.
4. **handleSpinEnd(matchIdx)** 안 SPIN 분기:
   - `const seg = segments[idx];` → SPIN×2 segment.
   - `const front = segmentToFront(seg);` → `{ kind: "spin", times: 2 }`.
   - `spinN = front.times = 2`.
5. **setMultiSpinCount(spinN = 2)** · multiSpinCount=2.
6. **MultiWheelExtras props extrasCount = multiSpinCount - 1 = 1**.
7. Kyu 관찰 정합.

**뿌리 확정**: Z26-1 matchIdx 매칭 시 SPIN kind 만 · times 무시.

## 착수 · 결정 정리

### Z26-1 · 뿌리 확정 (위 · 전수 추적 결과)

### Z26-2 · Fix

**matchIdx 매칭 강화** (`RouletteModal.tsx` onForceReveal):

```typescript
const matchIdx = segments.findIndex((s) => {
  try {
    const f = segmentToFront(s);
    if (f.kind !== front.kind) return false;
    // Z26-1 · SPIN 은 times 정확 일치 요구.
    if (f.kind === "spin" && front.kind === "spin") {
      return f.times === front.times;
    }
    return true;
  } catch {
    return false;
  }
});
```

**matchIdx=-1 fallback** (해당 SPIN×N slice 없는 판 대비):

```typescript
if (front.kind === "spin") {
  if (matchIdx >= 0) {
    setStage("spin");
    handleSpinEnd(matchIdx);
  } else {
    // Z26-1 fallback · Modal state 직접 세팅으로 진입.
    console.warn("...");
    setRevealData(null);
    setMultiSpinCount(front.times);
    setMultiSpinActive(true);
    setDepositState("idle");
    setStage("spin");
    setActiveSegments(MULTI_SPIN_ROULETTE_SEGMENTS);
    setSpinNonce(0);
    setAgainOverride((prev) => ({ ... }));
    setMultiSpinSlots(Array.from({ length: front.times }, () => ({ result: null })));
    setMultiSpinResultReady(false);
    setMultiSpinBannerActive(true);
    window.setTimeout(() => setMultiSpinBannerActive(false), 1800);
    toast.info("🎡 멀티 룰렛!", ...);
  }
}
```

Fallback 은 안전망 · matchIdx 매칭 강화만으로도 정상 SPIN×3 매칭 · handleSpin
End(matchIdx=SPIN×3) · seg=SPIN×3 · spinN=3 · multiSpinCount=3 · extras=2.

### Z26-3 · 검증 로그 강화

- `[RouletteModal Z26-1] onForceReveal · front= matchIdx= matchedSeg.fill=`.
- `[RouletteModal Z26-3] SPIN branch enter · idx= seg= front= spinN=
  expectedExtrasCount= expectedTotalWheels=`.
- `[MultiWheelExtras Z26-3] props received · extrasCount= expectedRendered=
  totalWheelsWithBg=`.
- Kyu B-9-v 실기 시 · ×2 → spinN=2 · extras=1 · 총 2 · ×3 → spinN=3 ·
  extras=2 · 총 3 확증.

### Z26-4 (유지)

- Z25-1 암막 상시·Z25-2 스피너 재발화 금지·phase 위계·그룹 정렬·전 정본.
- Kyu 실기 시 암막·스피너 항목도 재확인 요청 (Kyu B-9-u 스샷은 SPIN×3 개수만
  지적 · 나머지 2건 실측 부재).

## [DOC] 정본 문서 반영

- `docs/epics/roulette-final-redesign.md` · § N0-0730-Z26 정본 편입 (실측 ·
  Z26-1 뿌리 · Z26-2 fix · Z26-3 로그 · Z26-4 유지). N→extrasCount 계약 명문화.
- `EPIC-STATE.md` · 룰렛 EPIC 라인 갱신:
  - `last_touched=2026-08-11 · last_verified=2026-08-11`.
  - `γ Z-1~Z26 PR #288 (auto-merge OFF · Kyu N0-0730-Z26 N→extrasCount 산출
    경로 fix)`.

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline 유지 (217).
- **test**: `jest` · 83 suites · 1102 pass · 5 skip · 0 fail · 12.0s.

## 커밋

```
9bbbf325 feat(roulette): Z26 N→extrasCount 산출 경로 fix (N0-0730-Z26)
```

## 착지 상태

- PR #288 body 갱신 · B-9-v 실기 체크리스트 (Z26 콘솔 로그 캡처 필수 · Z25-1
  암막 · Z25-2 스피너 재확인) · QC · EPIC-STATE 갱신.
- Kyu B-9-v 실기 대기.

## 다음 라운드 (Z27) 예약

Kyu B-9-v 실기 결과에 따라:

- **Z27-1** = SPIN×3 콘솔 로그 캡처 후 · spinN=3 확증 시 실기 완결.
- **Z27-2** = Z25-1/Z25-2 실측 잔존 시 fix.
- 실기 이상 없으면 · PR #288 최종 도장 · Z 시퀀스 종결 · γ 후속.

## 이연 순증감

- **이연 신설**: 없음.
- **이연 해소**: **SPIN×3 뿌리 확정** (Z25-3 상태 sync 가 아닌 · Z26-1
  onForceReveal matchIdx 시 times 비교 누락).
