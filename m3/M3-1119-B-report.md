fork #192 · 영어화 14건 O · 범위 밖 한국어 5건 · draft 해제 O · checks pending(assertions/flow-tests/lint)

## 영어화 변경 표 (14건)

| 파일 | 위치 | 한국어 | 영어 |
|------|------|--------|------|
| split-tender/[draftOrderId].tsx | onProcessFirst | `'인터넷 연결 없음'` / `'연결 후 다시 시도하세요.'` | `'No internet connection'` / `'Reconnect and try again.'` |
| split-tender/[draftOrderId].tsx | onConfirmFirstCard | 동일 | 동일 |
| split-tender/[draftOrderId].tsx | onProcessFirstQris | 동일 | 동일 |
| split-tender/[draftOrderId].tsx | onProcessSecond | 동일 | 동일 |
| split-tender/[draftOrderId].tsx | onConfirmSecondCard | 동일 | 동일 |
| split-tender/[draftOrderId].tsx | onProcessSecondQris | 동일 | 동일 |
| tender-cash/[draftOrderId].tsx | onProcess toast | `'인터넷 연결 없음'` / `'연결 후 다시 시도하세요.'` | `'No internet connection'` / `'Reconnect and try again.'` |
| tender-cash/[draftOrderId].tsx | onConfirmCard toast | 동일 | 동일 |
| tender-cash/[draftOrderId].tsx | onGenerateQris qrisError | `'인터넷 연결 없음 — 연결 후 다시 시도하세요.'` | `'No internet connection — reconnect and try again.'` |
| tender-cash/[draftOrderId].tsx | recovery UI title | `결제 확인 필요` | `Payment Confirmation Required` |
| tender-cash/[draftOrderId].tsx | recovery UI banner L1 | `주문 {orderRef}은(는) 이미 만들어졌을 수 있습니다.` | `Order {orderRef} may have already been created.` |
| tender-cash/[draftOrderId].tsx | recovery UI banner L2 | `네트워크 오류 직전에 결제가 처리됐을 수 있으니 Orders 에서 주문을 확인하세요.` | `Payment may have been processed just before the network error — check the order in Orders.` |
| tender-cash/[draftOrderId].tsx | recovery UI btn1 | `Orders에서 확인` | `Check in Orders` |
| tender-cash/[draftOrderId].tsx | recovery UI btn2 | `재시도 (주문 없음 확인 후)` | `Retry (after confirming no order exists)` |

## 범위 밖 한국어 UI 문구 (5건, 수정 금지)

| 파일 | 행 | 내용 |
|------|----|------|
| `app/(tabs)/cart.tsx` | 457 | `` `${items}줄` `` (debug accessibility state string) |
| `components/payment/CustomerLinkSheet.tsx` | 142 | `showToast.info('아직 지원 안 됨')` |
| `components/payment/CustomerLinkSheet.tsx` | 166 | `showToast.info('아직 지원 안 됨')` |
| `components/payment/CustomerLinkSheet.tsx` | 277 | `<Text>새 손님으로 등록돼요</Text>` |
| `components/orders/VoidRefundSheet.tsx` | 364 | `setPreviewStaleMsg('금액이 바뀌었어요, 다시 확인해 주세요')` |

## Typecheck

기존 master 에 동일 에러 존재 (pre-existing). #192 신규 에러 0.

pre-existing errors: split-pending-orders.test.ts, cart.tsx FlashList, _layout.tsx global.css, use-network-status.ts implicit any, vitest.config.ts duplicate key, e2e/flows/09 type errors.

## PR Checks (gh pr checks 192)

```
assertions    pending    https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/44439833912/job/135277622071
flow-tests    pending    https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/44439833912/job/135277622496
lint          pending    https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/44439833861/job/135277621589
```

## 커밋

`521f20a fix(i18n): M3-1119-B — Korean offline/recovery UI strings → English`
