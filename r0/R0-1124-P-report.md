CHANGES

## PR #250 · M2-1124-N custom_display_id 표시 · 리뷰 결과

### 판정: CHANGES

---

## ✅ 통과 항목

| 항목 | 결과 |
|------|------|
| 영수증 맨 아래 작게 (`testID="receipt-custom-id"`, `text-xs`) | ✅ |
| 주문 상세 헤더 아래 작게 (`testID="order-detail-custom-id"`) | ✅ |
| `custom_display_id` 없으면 `order_display_id` fallback | ✅ |
| 맨 위 칩 `#N` (`receipt-queue-num`) 그대로 유지 | ✅ |
| ESC/POS 렌더러 — footer 아래 · cut 전 동일 로직 | ✅ |
| `useOrder` fields `+custom_display_id` 추가 | ✅ |
| `Receipt.custom_display_id?` · `PosOrderRow.custom_display_id?` 타입 추가 | ✅ |
| 하네스 등록: `m2-1124-n-order-number-display-playwright.mjs` → `run-all.mjs` 정규식 `/^[a-z0-9-]+-playwright\.mjs$/` 자동 포함 | ✅ |
| 파일 겹침 없음 (#247 · #249 변경 파일과 완전히 분리) | ✅ |

---

## ❌ 수정 필요

### 1. CI playwright 실패 (CI 초록 아님)

```
m2-1124-n-order-number-display-playwright.mjs  FAIL (exit 1)  8/9
m3-1124-c-receipt-scroll-playwright.mjs        FAIL (exit 1)
```

**`m2-1124-n-order-number-display-playwright.mjs` (이 PR 신규 하네스)**

stdout tail 에 보이는 모든 기능 체크는 통과:
- `(3a) ord_custom_id_1 row 노출` ✓
- `(5a) order-detail-custom-id 노출` ✓ · `(5b) 텍스트 = "PIM26B1000"` ✓
- `(6a) receipt-custom-id 노출` ✓ · `(6b) 하단 텍스트 = "Order PIM26B1000"` ✓
- `(7a) pageerror 0` ✓ · `(7b) console.error 0` ✓

tail 에 미출력(앞 부분 잘림)된 체크 중 1개 실패 → `(1) /products 도달` 또는 `(2) /orders 도달` URL pre-check 추정. 기능 자체는 동작하나 초기 URL 어설션이 CI exit 1 유발. 체크 loose 하게 수정 필요 (또는 `waitForURL` / 충분한 대기 추가).

**`m3-1124-c-receipt-scroll-playwright.mjs`**

이 PR diff 에 없는 파일(마스터 최신 커밋 추정). 이 PR 의 `ReceiptCard` 하단 블록 추가로 영수증 높이 변화 → 스크롤 체크 깨질 가능성 조사 필요. 원인이 이 PR 이면 함께 수정.

---

## 비고

- 프린터·카드 렌더러 fallback 로직 완전 일치: `receipt.custom_display_id ?? (snap.order_display_id != null ? String(snap.order_display_id) : null)`
- `custom_display_id` 미설정 구 주문 → 하단에 `Order 42` fallback 표시 (PR 본문 Kyu 실기 항목과 일치, 의도적 동작으로 판단)
- `receipt-escpos.ts` 변수명 `_cid` — 사용 중 변수에 underscore prefix 불필요 (경미, lint 통과)

---

CI playwright 2개 실패 수정 후 재 push 요청.
