fork #192 rebase · 충돌 2파일 해결 · 양쪽 코드 유지 O · 테스트 O · mergeable O

## 요약

- 브랜치 `fix/M3-1118-H-offline-dup` 를 `origin/master` (HEAD 573efbd M0-1118-L) 위로 rebase.
- 리베이스 결과: **자동 병합 성공 (수동 충돌 해결 불필요)**. 두 커밋(`ad07f4c` M3-1118-H / `057e34e` M3-1118-I)이 master 위로 깔끔히 얹힘.
- master 쪽 `setPosScreenHint` useEffect 와 #192 쪽 오프라인·idempotency 가드가 **두 파일 모두에서 공존**함을 확인.
- `npx tsc --noEmit`: rebase 로 인해 신규로 생긴 TS 에러 없음 (기존 pre-existing 에러만 존재 — FlashList estimatedItemSize, global.css, vitest.config duplicate define 등 master 공통).
- `npm test -- --run`: **726 passed / 6 expected fail / 3 todo** (59 files, 1.97s).
- `gh pr view 192 --json mergeable`: `MERGEABLE` / mergeStateStatus `UNSTABLE` (checks 진행중, conflict 없음).
- `git push --force-with-lease` 완료: `36bc22b..057e34e`.

## tender-cash — 양쪽 코드 공존 확인

`app/checkout/tender-cash/[draftOrderId].tsx`:

```tsx
  // M0-1118-L · method · total 로 pos_screen hint 설정. 언마운트 = 체크아웃 복귀.  (← #193 master 쪽)
  React.useEffect(() => {
    const screen: PosScreen =
      method === 'cash' ? 'payment_cash' : method === 'qris' ? 'payment_qris' : 'payment_card';
    setPosScreenHint({
      pos_screen: screen,
      extras: { amount: total },
      freezeCart: true,
    });
    return () => {
      setPosScreenHint({ pos_screen: 'checkout_review' });
    };
  }, [method, total]);

  // M3-1105-P · tender 성공 뒤 success 화면으로 분기 — cash/card 공유 로직.
  ...

  const onProcess = async (receivedAmount: number) => {
    // M3-1118-H · REQ 3: 오프라인 사전 체크 — 즉시 안내, 15초 스피너 없음.  (← #192 쪽)
    if (!isOnline) {
      showToast.error('인터넷 연결 없음', { text2: '연결 후 다시 시도하세요.' });
      return;
    }
    // M3-1118-H · REQ 2: 이전 시도 마커 존재 → 서버가 이미 처리했을 수 있음 → 복구 UI.  (← #192 쪽)
    if (await isTenderSubmitted(draftOrderId)) {
      setOrderMayExist(true);
      return;
    }
    try {
      await markTenderSubmitted(draftOrderId);
      ...
```

- master 쪽 `setPosScreenHint` useEffect (라인 102-114) 유지 O
- #192 쪽 `isOnline` / `isTenderSubmitted` / `markTenderSubmitted` 가드 (라인 142-151, 180-188, 224-228 등 다수) 유지 O

## split-tender — 양쪽 코드 공존 확인

`app/checkout/split-tender/[draftOrderId].tsx`:

```tsx
  // M0-1118-L · split step → pos_screen 전이 (payment_split_1 · payment_split_2).  (← #193 master 쪽)
  React.useEffect(() => {
    const screen =
      step === 'first' || step === 'first-confirmed' ? 'payment_split_1' : 'payment_split_2';
    setPosScreenHint({ pos_screen: screen, freezeCart: true });
    return () => {
      setPosScreenHint({ pos_screen: 'checkout_review' });
    };
  }, [step]);
```

그리고 하단 각 tender 콜백에서 #192 쪽 오프라인 가드:

```tsx
  const { isOnline } = useNetworkStatus();  // (line 108)
  ...
  // 245, 267, 292, 352, 382, 408 — 모든 tender 분기 선두에:
  if (!isOnline) { showToast.error('인터넷 연결 없음', { text2: '연결 후 다시 시도하세요.' }); return; }
```

- master 쪽 `setPosScreenHint` useEffect (라인 133-140) 유지 O
- #192 쪽 `useNetworkStatus` + 6군데 오프라인 가드 (라인 245/267/292/352/382/408) 유지 O

## 비고

- rebase 직전에 작업 트리의 untracked 스크린샷/스크립트들을 임시 stash → rebase 후 pop 으로 복원.
- 충돌이 발생하지 않은 이유: #192 의 수정 지점이 코드 하단 콜백들, #193 의 수정 지점이 컴포넌트 상단 useEffect 라 git 의 3-way merge 로직이 분리 가능하다고 판단한 것으로 보임. 다만 양쪽 모두 손실 없이 머지되었음을 수동으로 재확인함.
