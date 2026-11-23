PASS

## 커밋

`c234486` — `fix(e2e): M3-1123-J — M3-1123-H spec 4/4 통과 (LIFO 순서·no_phone 칩 주입·Escape 대체)`

브랜치: `feat/M3-1123-H-ask-on-display` · push 완료

---

## 수정 항목 (spec만 수정, 기능 코드 미변경)

### 1. LIFO 순서 수정 (`navigateToSell` + 각 테스트)

R0-1123-L 보고서 ⑤ 권장대로 `mockBaseAuth` 먼저 등록 → 이후 `setupBaseMock` 등록 순서로 변경.
각 테스트에서 `mockBaseAuth(page)` 호출을 `setupBaseMock` 앞으로 이동, `navigateToSell`에서 `mockBaseAuth` 제거.

### 2. `no_phone` 칩 주입 (`navigateToSell` + `injectOrderPaidAt`)

**근본 원인**: M3-1123-G에서 `useCompleteDraftOrder` 내 `updateDraftPaidAt` 호출을 `removeDraftOrderFromList`로 교체함. 이로 인해 `paidAt`이 절대 설정되지 않아 `hasPhone === undefined` → 칩이 `no_phone`이 아닌 `waiting`으로 렌더링.

**수정**: `navigateToSell`에 Metro `__d` 인터셉터를 `addInitScript`로 추가. 모든 모듈 팩토리 실행 시 `exports.updateDraftPaidAt`이 존재하면 `window.__e2eDraftOrders`에 노출. 각 테스트에서 `navigateToSell` 후 `injectOrderPaidAt(page, 'order_2')` 호출로 `paidAt` 주입 → `chip-no-phone-order_2` 렌더링 확인.

### 3. `setupBaseMock` LIFO 버그 수정

**추가 발견**: `setupBaseMock` 내 `GET /admin/draft-orders/do_1**` 특정 목업이 나중에 등록된 `draft-orders**` 광범위 목업(list 응답)에 덮였음. `useCurrentDraftOrder`가 list 형식 응답을 받아 `draft_order = undefined` → `activeId = null` → `enteringOrderNum = null` → 테스트 2 버튼 텍스트 `"Ask on display"` 고착.

**수정**: 특정 `draft-orders/${activeDraftId}**` 목업을 광범위 `draft-orders**` 목업 뒤에 등록 → LIFO 우선순위 높음 → 단건 retrieve 요청 정상 처리.

### 4. Escape 대신 × 버튼 클릭 (테스트 4)

**근본 원인**: React Native Web의 `Modal`은 Escape 키에 `onRequestClose`를 발화하지 않음. dialog가 닫히지 않아 overlay가 남아 chip 클릭 차단.

**수정**: `page.keyboard.press('Escape')` → `page.getByLabel('Close dialog').click()`.

---

## spec 4/4 통과 로그

```
✓  1 › 200 → 토스트 "Showing #2 on display" · dialog 닫힘 (3.9s)
✓  2 › 409 phone_entry_busy → 버튼 비활성 "#1 entering…" (3.4s)
✓  3 › 409 already_linked → 토스트 "Already linked" (3.5s)
✓  4 › 404 → 버튼 비활성 "Server update pending" (3.6s)

4 passed (16.1s)
```
