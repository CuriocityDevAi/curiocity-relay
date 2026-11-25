PASS

## typecheck 로그

```
> customer-display@0.1.0 typecheck /Users/kyu.lee/projects/storeport-m1/apps/customer-display
> tsc --noEmit

(에러 없음 — exit 0)
```

## 단위 테스트

```
Test Files  15 passed (15)
Tests       299 passed (299)
Duration    409ms
```

## 수정 내용

`apps/customer-display/src/mocks/adapter.ts` 564·566번 줄:
- `line_total` → `total` (ReceiptItem 인터페이스의 실제 필드명)
- `ReceiptItem.total`은 `packages/receipt-view-model/src/order-snapshot.ts`에 정의되어 있으며 `receipt-view.ts`에서 `it.total`로 참조됨.
- `line_total`은 타입에 없는 필드였음 → 타입 추가 대신 mock 수정.

## SHA

- #444 feat/M1-1125-T new HEAD: `7d3d8ba`
- #446 feat/M1-1125-U new HEAD: `75643e2` (rebase 후 force-push)
