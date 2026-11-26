# M3-1126-B — tender-cash/split hint order_id 명시 · emit drop 방지

**판정**: 완료 (DONE)
**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/269
**브랜치**: feat/M3-1126-B → master
**커밋**: f4329d8

---

## 변경 요약

| 파일 | 변경 |
|---|---|
| `app/checkout/tender-cash/[draftOrderId].tsx` | `setPosScreenHint` 에 `order_id: draftOrderId` 추가 (useEffect deps 포함) |
| `app/checkout/split-tender/[draftOrderId].tsx` | 동일 — `payment_split_1/2` hint 에 `order_id` 추가 |
| `hooks/usePosScreen.ts` | `order_id null` drop: `__DEV__` 가드 제거 → production warn + Sentry breadcrumb |
| `e2e/flows/M3-1126-B-checkout-snapshot.spec.ts` (신규) | Cash 진입 · Process paid 양쪽 checkout-snapshot 네트워크 어설션 |

tender-qris(`order_id: orderId ?? draftOrderId`) · success(`order_id: orderId`) 는 이미 포함 → 미수정.

---

## 자기 검증: Playwright web 네트워크 어설션

새 dist(feat/M3-1126-B 빌드) 대상으로 실행. **2 passed**.

```
✓ Cash 진입 → checkout-snapshot POST 에 pos_screen=payment_cash · order_id 포함 (1.8s)
  - body.pos_screen === "payment_cash" ✅
  - url.includes("/order_mock_01/") ✅  (order_id in URL path)
  - body.register_session_id === "sess_e2e_01" ✅

✓ Process 성공 → checkout-snapshot POST 에 pos_screen=paid · order_id 포함 (2.0s)
  - body.pos_screen === "paid" ✅
  - url.includes("/order_mock_01/") ✅
  - body.register_session_id === "sess_e2e_01" ✅
```

**비고**: 테스트는 `hint.order_id = draftOrderId`(URL param) 경로를 직접 검증.
master dist(fix 없음) 에서는 같은 테스트가 `useCurrentDraftOrder` 타이밍 의존으로 fail — 수정의 효과 확인됨.

---

## PR 본문 확인 항목 (Kyu 실기)

- [ ] **POS Cash 결제수단 화면 진입 시 손님화면 [Enter phone number] 활성**

---

## 이연 순증감

- close: M0-1126-A §3-C — POS web emit drop (tender-cash/split hint order_id null fallback)
- open: 없음
- 범위 밖 터치: 없음 (storeport 미수정 · ⛔ 준수)
