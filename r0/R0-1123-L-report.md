#236: CHANGES

## 체크리스트 결과

| # | 항목 | 결과 |
|---|------|------|
| ① | diff = master 위 M3-1123-H 변경만 (#233 재포함·되돌림 없음) | ✅ |
| ② | Ask on display → `POST .../ask-phone-on-display` 호출 · 200/409/404 처리가 서버 계약 일치 | ✅ |
| ③ | 다른 주문 입력 중 비활성 (phone_entry_open · phone_deferred 폴링) | ✅ |
| ④ | "Enter phone here instead" 유지 | ✅ |
| ⑤ | 동봉 spec 이 page.route mock · 운영 URL 비의존 | ❌ LIFO 순서 버그 |

---

## ① diff 범위 — PASS

`git diff origin/master...HEAD --stat` 결과:

```
api/hooks/ask-phone-on-display.ts          +42
components/order-chips/OrderChipDetail.tsx +58 / -9
components/order-chips/OrderChips.tsx      +3
e2e/flows/M3-1123-H-ask-display.spec.ts   +258
4 files changed, 352 ins, 9 del
```

#233 커밋(M3-1123-G) 재포함 없음. M3-1123-I-report rebase 결과(commit 1개 `3b24ad8`, base=master)와 일치.

---

## ② API 호출·응답 처리 — PASS

`classifyAskPhoneError` 분류:

| HTTP | body.message 포함 | 분류 | 처리 |
|------|-------------------|------|------|
| 200 | — | ok | 토스트 "Showing #N on display" + onClose() |
| 409 | "entering" / "busy" | phone_entry_busy | snapshot 무효화(훅 내부) → askOnDisplayDisabled 자동 반영 |
| 409 | "already_linked" / "already linked" | already_linked | 토스트 "Already linked" |
| 409 | "link_window_closed" / "link window" | link_window_closed | 토스트 "Link window closed (Enter phone here instead)" |
| 404 | — | server_pending | onServerPending() → "Server update pending" 비활성 |
| 기타 | — | error | 일반 오류 토스트 |

M0-1123-F-report §4 API 예시 (entering → 409 body.message="another order is currently **entering** phone", already_linked → "customer **already linked**", link_window_closed → "**link window** closed")과 모두 일치.

`entering_order_id`는 FetchError에서 추출 불가 — `phone_entry_busy` 시 `customer-display-snapshot` 무효화 → snapshot 재폴링 → `enteringOrderNum` 갱신 경로 타당. M3-1123-H-report §2 메모와 일치.

---

## ③ 다른 주문 입력 중 비활성 — PASS

- `phone_entry_busy` → `qc.invalidateQueries({ queryKey: ['customer-display-snapshot'] })` → snapshot `phone_entry_open=true` 재수신 → 기존 `askOnDisplayDisabled` prop이 버튼을 비활성
- `phone_deferred`는 서버 사이드 처리 — 클라이언트 타입 변경 없이 `phone_entry_open` 체크만으로 충분 (M3-1123-H-report §2 설계 메모 일치)
- `isDisabled = askOnDisplayDisabled || serverPending || askMutation.isPending` — 세 경우 모두 커버

---

## ④ "Enter phone here instead" 유지 — PASS

`link_window_closed` 처리:
```ts
// OrderChipDetail.tsx:62
showToast.info('Link window closed (Enter phone here instead)');
```
문구 그대로 유지.

---

## ⑤ spec LIFO 순서 버그 — CHANGES

**파일: `e2e/flows/M3-1123-H-ask-display.spec.ts`**

### 실행 결과

4/4 실패, 동일 오류:

```
TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
  - waiting for getByTestId('order-chips') to be visible
    at navigateToSell (.../M3-1123-H-ask-display.spec.ts:133:41)
```

unmocked 로그:
```
[e2e] unmocked: GET https://api.meros.id/admin/draft-orders/do_1?fields=...
```

### 근본 원인

Playwright는 LIFO(후입선처) 라우팅 — 나중에 등록한 route가 먼저 적용.

현재 각 테스트 순서:
```
setupBaseMock(page, ...)      // ← draft-orders** 등록 (낮은 우선순위)
page.route(.../ask-phone, ...)
navigateToSell(page, 'do_1')  // ← mockBaseAuth 호출 (나중 = 높은 우선순위)
```

`navigateToSell` 내부 `mockBaseAuth`가 나중에 등록되어 더 높은 우선순위를 가짐. `mockBaseAuth`의 catch-all `${API}/**`가 `draft-orders/do_1?fields=...` 요청을 가로채 `{ ok: true }` 반환 → 앱이 활성 draft 주문을 찾지 못함 → Sell 화면의 `order-chips` 미렌더.

`api-mocks.ts:5` 주석: "Playwright LIFO routing: last-registered route has HIGHEST priority."

### 수정 방향

`navigateToSell` (또는 별도 `initAuthAndBaseMocks`) 호출로 `mockBaseAuth`를 먼저 등록한 뒤, 이후에 spec-specific 라우트 등록:

```ts
// 각 test 내에서:
await seedAuth(page);
await page.addInitScript((id) => { localStorage.setItem('meros.secureStorage.v1.draft_order_id', id); }, activeDraftId);
await mockBaseAuth(page);                    // catch-all 먼저
await setupBaseMock(page, ...);              // 이후 등록 → 높은 우선순위
await page.route(.../ask-phone, ...);
await page.goto('/');
// 나머지 navigateToSell 로직 (waitForFunction / waitFor order-chips)
```

또는 `navigateToSell`을 setup(auth+mockBase)과 navigate(goto+wait)로 분리하는 리팩터.

---

## 종합

코드(훅·UI) 자체는 서버 계약과 완전 일치하고 diff 범위도 올바름. spec LIFO 순서 버그로 4/4 테스트 실패 — 머지 전 수정 필요.

**CHANGES: `e2e/flows/M3-1123-H-ask-display.spec.ts`** — `setupBaseMock` 호출을 `mockBaseAuth` 이후로 이동(또는 `navigateToSell` 내 순서 재조정)
