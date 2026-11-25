PASS

## M3-1125-O — QRIS SecureStore 삭제 행동 테스트 · navigateToSuccess 명시 삭제 · paymentCollectionId 가드

### 커밋

`c14d3b5` — `feat/M3-1125-M-qris-cd-flow-fix` (PR #262)

---

## Blocking: Q2 — non-draft guard 실제 동작 테스트

### 접근

소스 텍스트 순서 확인(기존) → 실제 함수 반환값·호출 여부 행동 테스트로 교체.

React Native 의존성 없이 직접 vitest import 가능한 순수 함수 파일 `lib/tender-cleanup.ts` 신설.

### 변경 경로 설명

#### (a) is_complete=true tender → deleteItemAsync 호출

- `lib/tender-cleanup.ts`: `isTenderFinalComplete(tender)` 순수 함수
  - `is_complete=false` or `preorder_stage='dp_paid'` → false (보류)
  - 그 외(is_complete=true, 미지정) → true (삭제 필요)
- `api/hooks/pos-payments.ts`: `useCreateTender.onSuccess`에서 `isTenderFinalComplete` 위임
- 테스트: `isTenderFinalComplete` 반환값 5케이스 + `mockDelete` 호출 여부 3케이스 직접 검증

#### (b) QRIS webhook paid → navigateToSuccess 명시 삭제

- `app/checkout/tender-qris/[draftOrderId].tsx`: `navigateToSuccess` 첫 줄에
  `await SecureStore.deleteItemAsync(DRAFT_ORDER_ID_STORAGE_KEY)` + `removeDraftOrderFromList(id)` 추가
- 이유: `useCreateTender.onSuccess`에서 `is_complete=false`로 보류됐던 삭제를
  QRIS paid 확정 시점(navigateToSuccess)에 명시 실행 → useCurrentDraftOrder가 나중에
  mount될 때까지 기다리지 않고 즉시 cleanup
- 테스트: navigateToSuccess 내 deleteItemAsync 호출 위치 소스 순서 검증

#### (c) 다음 주문이 옛 draft를 붙잡지 않음

- deleteItemAsync 후 getItemAsync → null 경로를 in-memory Map으로 시뮬레이션
- 테스트: setItemAsync → deleteItemAsync → getItemAsync: null 확인

#### useCurrentDraftOrder non-draft guard

- `lib/tender-cleanup.ts`: `isNonDraftOrderResponse(draftOrder)` 순수 함수
- `api/hooks/draft-orders.tsx`: re-export
- 테스트: is_draft_order=false / status=completed / status=pending → true,
  status=draft → false, null → false 검증

---

## Non-blocking: paymentCollectionId guard

- `onNewQr`에서 `!paymentCollectionId` 시 에러 메시지 표시 후 중단
- `regenerate.mutateAsync`에서 `?? ''` 폴백 제거 → 타입 명확화

---

## CI

### 로컬 테스트 결과

| suite | 결과 |
|-------|------|
| `__tests__/m3-1125-m-qris-cd-flow.test.ts` | 37 passed |
| 전체 vitest (82 files) | 1067 passed, 6 expected fail, 3 todo |
| `expo lint` | 0 errors (67 warnings — pre-existing) |

### lint 수정 포함

- `app/checkout/tender-cash/[draftOrderId].tsx` prettier 에러 4건 (`--fix` 적용)
- 테스트 파일 미사용 `vi`/`beforeEach` import 정리

### PR 상태

- PR #262 head: `feat/M3-1125-M-qris-cd-flow-fix`
- 반영 코멘트: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/262#issuecomment-7156399490
- 셀프 머지 없음
