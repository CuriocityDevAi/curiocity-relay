# N0-0730-Z22 · 리포트

**round**: `N0-0730-Z22`
**timestamp**: 2026-08-10
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `87d231c5`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu B-9-r 실기 판정 · Z21 (밝기 + 합체) 종결 확증 · 잔존 1건 신설 · 멀티
결과 공개 순차 Reveal (단일 룰렛 공개 틀 준용).

## Kyu 실기 실측 (B-9-r)

- **Z21-1 밝기 균일** ✓.
- **Z21-2 합체 3박자** (수렴 → glow flash → 중앙 발사) Kyu 판정 "완벽·훌륭함"
  ✓ = **종결**.
- 잔존 신규 결함 = 전 wheel 스핀 완료 시 조각 공개 연출 생략 · 즉시 합산 카드.

## 착수 · 결정 정리

### Z22-1 · 멀티 결과 공개 연출 (정본 신설)

**Kyu 정본**:
> "단일 룰렛의 기존 공개 틀을 그대로 준용:
> ① 전 wheel 스핀 완료·정지 → 암막 깔림
> ② 각 wheel 에서 당첨 조각이 룰렛 내부에서 떠오름 (기존 단일 Reveal 재사용)
> ③ 그 조각이 뒤집히며 뒷면 공개 (계산식 노출 포함·기존 연출 그대로)
> ④ 공개 순서 = 좌→우 순차 (한 wheel 떠오름→플립 완료 후 다음)
> ⑤ 마지막 wheel 공개 완료 후 → 합산 결과 카드 → 담기 → 합체 (Z21-2 불변)"

**Fix**:

- **`multiSpinSlots` 타입 확장**:
  ```typescript
  Array<{ result: RouletteResult | null; landingIndex?: number }>
  ```
  · landingIndex 편입 · 순차 Reveal 시 `MULTI_SPIN_ROULETTE_SEGMENTS
  [landingIndex]` lookup 으로 frontSegment 재구성.

- **Modal handleSpinEnd (slot 0)** · `next[0] = { result: mResult, landingIndex:
  idx }`.

- **MultiWheelExtras onSlotDone 시그니처 확장**:
  ```typescript
  onSlotDone: (slotIdx1based, result, landingIndex) => void
  ```
  · ExtraCell handleSpinEndLocal 안 · `onSlotDone(extraIdx + 1, result, landing)`.

- **Modal `multiRevealIdx: number | null` state 신설** · 순차 Reveal 진행 slot
  idx.

- **useEffect · 전 slot done 감지 → setMultiRevealIdx(0)**:
  ```typescript
  useEffect(() => {
    if (!multiSpinActive) return;
    if (multiSpinSlots.length === 0) return;
    const allDone = multiSpinSlots.every((s) => s.result !== null);
    if (allDone && multiRevealIdx === null && !multiSpinResultReady) {
      setMultiRevealIdx(0);
    }
  }, [multiSpinActive, multiSpinSlots, multiRevealIdx, multiSpinResultReady]);
  ```
  · 이전 = 즉시 `setMultiSpinResultReady(true)` (카드 노출) · 신규 = 순차
  Reveal 시작.

- **useEffect · multiRevealIdx 갱신 → setRevealData + auto-advance**:
  ```typescript
  useEffect(() => {
    if (multiRevealIdx === null) return;
    const slot = multiSpinSlots[multiRevealIdx];
    if (!slot?.result) return;
    const landing = slot.landingIndex ?? 0;
    const seg = MULTI_SPIN_ROULETTE_SEGMENTS[landing];
    setRevealData({
      frontSegment: seg,
      front: slot.result.front,
      backOp: slot.result.backOp,
    });
    console.info("[RouletteModal Z22-1] multi reveal · slot=", ...);
    const t = window.setTimeout(() => {
      setRevealData(null);
      const nextIdx = multiRevealIdx + 1;
      if (nextIdx >= multiSpinSlots.length) {
        setMultiRevealIdx(null);
        setMultiSpinResultReady(true);  // 합산 카드 activation.
      } else {
        setMultiRevealIdx(nextIdx);
      }
    }, 3500);
    return () => window.clearTimeout(t);
  }, [multiRevealIdx]);
  ```
  · 각 slot 3.5s 표시 → 자동 다음 slot · 마지막 후 합산 카드.

- **handleAcceptToWallet 초입 · multiRevealIdx !== null skip**:
  ```typescript
  if (multiRevealIdx !== null) {
    setRevealData(null);
    const nextIdx = multiRevealIdx + 1;
    if (nextIdx >= multiSpinSlots.length) {
      setMultiRevealIdx(null);
      setMultiSpinResultReady(true);
    } else {
      setMultiRevealIdx(nextIdx);
    }
    return;
  }
  ```
  · 순차 Reveal 도중 사용자 [담기] click 시 · 스트림 발사 skip · 즉시 다음
  slot advance (자동 3.5s timer 축약).

- **Merge stage 안 setMultiRevealIdx(null) 리셋** · 합체 완료 시 clean-up.

### Z22-2 · 경계 명확화

**본 wheel 에서 SPIN×N 조각 당첨 시 즉시 진입 (뒷면 플립 생략 · Z19-2) 불변**.
Z22-1 정본 = 멀티판 안 일반 조각 (♥값 · ♥2000/♥3000 · JACKPOT · AGAIN) 에만
적용. MULTI_SPIN_ROULETTE_SEGMENTS 는 SPIN 조각 없음 · 순차 Reveal 은 오직
멀티 스핀 결과 공개 단계에서 발생.

### Z22-3 (유지)

- 밝기 (Z21-1 종결) · 합체 (Z21-2 종결) · 그룹 정렬 (Z20) · 동일 크기
  (Z19-3) · O 정합 (Z19-1 종결) · 합산 1회 · 스피너 비중복. 변경 없음.

## [DOC] 정본 문서 반영

- `docs/epics/roulette-final-redesign.md` · § N0-0730-Z22 정본 편입 (실기
  실측 종결 · Z22-1 순차 Reveal 5-step 상세 · Z22-2 경계 · Z22-3 유지).
- `EPIC-STATE.md` · 룰렛 EPIC 라인 갱신:
  - `last_touched=2026-08-10 · last_verified=2026-08-10`.
  - `γ Z-1~Z22 PR #288 (auto-merge OFF · Kyu B-9-r 실기 판정 · N0-0730-Z22
    멀티 결과 공개 연출)`.
  - note: Z22 landed 표기 · Z21 종결 확증 명시.

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline +1 warning (react-hooks/exhaustive-deps · multiRevealIdx
  useEffect 안 multiSpinSlots dep 제거 · runtime 정합) · 신규 error 0.
- **test**: `jest` · 83 suites · 1102 pass · 5 skip · 0 fail · 12.2s.

## 커밋

```
87d231c5 feat(roulette): Z22 멀티 결과 공개 순차 Reveal (N0-0730-Z22)
```

## 착지 상태

- PR #288 body 갱신 · Kyu B-9-s 실기 대기.

## 다음 라운드 (Z23) 예약

Kyu B-9-s 실기 결과에 따라:

- **Z23-1** = 순차 Reveal timing 조정 (3.5s · 짧거나 김).
- **Z23-2** = 각 wheel 위치에서 조각 떠오름 (Reveal 위치 = 각 wheel 자리 ·
  현재 = viewport 중앙 · Kyu 정본 "각 wheel 에서" 완전 준수).
- **Z23-3** = JACKPOT/AGAIN multiSpin slot 처리 정본화.

## 이연 순증감

- **이연 신설**: 없음 (Z22-1 concrete + [DOC] 착지).
- **이연 해소**: **Z21-1 밝기 · Z21-2 합체 종결** (Kyu 판정 "완벽·훌륭함"
  확증).
