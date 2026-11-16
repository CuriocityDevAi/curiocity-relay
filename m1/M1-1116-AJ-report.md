# PASS — M1-1116-AJ: origin/master rebase + pendingVariantAdds 복원 + null-cache onMutate 수정 완료

## 작업 내역

### REQ 1: origin/master rebase
- `git reset --hard origin/master` 후 fresh 적용 (docs 커밋 충돌로 cherry-pick 방식 채택)
- `git merge-base origin/master HEAD = 27fb8e158572d00477595df2fa3da57931274cfd` (= origin/master HEAD)

### REQ 2: pendingVariantAdds 복원 + 내 수정 살리기
- `pendingVariantAdds` Map (M2-1116-V) 유지: `api/hooks/draft-orders.tsx:303`
- `snapshotQueue` Ref (M3-1116-E) 유지: `api/hooks/draft-orders.tsx:307`
- `_draftOrderCreationPromise` 추가: `api/hooks/draft-orders.tsx:85`
- `lib/optimistic-cart.ts` 신설
- cart.tsx empty 조건 (`isUpdatingDraftOrder === 0`) — master #158 에서 이미 반영됨
- temp 줄 조작 비활성 (`isTempItem`) — master #158 에서 이미 반영됨

### REQ 3: findVariantInfo vs _display 통합
- **결정: findVariantInfo 1차 + _display optional fallback**
- `onMutate` 에서 `findVariantInfo` 로 조회 후, `_display` 가 있으면 우선 사용
- 호출 측(product-details.tsx, cart undo) 은 `_display` 를 명시적으로 전달 (캐시 미스 대비)

### REQ 4: 두 번째 이후 상품 깜빡임 / 지연 수정
- 원인: 첫 상품 `onSettled` → `invalidateQueries` → 재조회 중 두 번째 상품 `onMutate` 타이밍 겹침
- 수정: `onSettled` 에서 `setQueryData(confirmEdit 응답)` 먼저 적용 → `invalidateQueries` 순서로 변경
  - 파일: `api/hooks/draft-orders.tsx:466-479`
- 추가: `onMutate` 의 `cancelQueries` 가 첫 상품 invalidate 로 인한 background refetch 취소

### REQ 5: 테스트 결과
```
Test Files  3 passed (3)
Tests  28 passed (28)
  - m1-1116-y.test.ts: 8케이스 (new-a 빈 카트 3연타·new-b 1줄→2줄 포함)
  - add-to-cart-optimistic.test.ts: M2-1116-U·V 케이스
  - add-to-cart-snapshot.test.ts: M3-1116-E 케이스
```

### REQ 6: PR #161 force-push 완료
- https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/161
- HEAD: 885d628

## 미검증
- 실기기 UI 검증 불가 (에뮬레이터/실제 앱 환경 없음) → Kyu 확인 항목: 빈 카트 첫 탭·두 번째 상품 탭 모두 1초 안에 줄 표시 · empty 문구 안 보임 · 같은 상품 5연타 → 줄 1·수량 5
