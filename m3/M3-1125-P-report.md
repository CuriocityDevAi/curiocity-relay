# M3-1125-P 리포트

## 작업 범위
PR #263 (`feat/M3-1125-N-inprogress-orders-ux`) — R0-1125-Z 지적 3건(BLOCKING 1 + CI 2) 수정.
커밋: `2335790`

---

## 1. BLOCKING — qris-cancel 계약 불일치 수정

### 서버 계약표 (서버 #438 M0-1125-K 정본 — 직접 확인)

| 서버 응답 | status | POS 동작 |
|-----------|--------|----------|
| `200 { ok:true, status:'expired', canceled:[...] }` | `expired` | draft 삭제 → `{ kind:'cancelled' }` 반환 |
| `200 { ok:true, status:'paid', canceled:[] }` | `paid` | draft **삭제 금지** → `{ kind:'already_paid' }` 반환 |
| 500 / 네트워크 오류 | — | draft **삭제 금지** → 에러 전파 |
| `404 { type:'not_found' }` | — | 에러 전파 |

> 409는 반환되지 않음 (서버 #438 `route.ts` 직접 확인).

### 수정 파일: `api/hooks/split-pending-orders.ts`

**이전 코드 (문제)**:
```ts
try {
  await sdk.client.fetch('.../qris-cancel', { method:'POST', body:{} });
} catch (e: any) {
  if (e?.status === 409) { ... }  // 서버가 409를 안 보내므로 never reached
  throw e;
}
// ← 항상 여기에 도달 → draft 삭제 실행 (결제된 주문도 삭제 위험)
await sdk.admin.draftOrder.delete(orderId);
```

**수정 후**:
```ts
const response = await sdk.client.fetch('.../qris-cancel', ...) as QrisCancelResponse;
if (response.status === 'paid') return { kind: 'already_paid', ... };  // draft 삭제 없음
if (response.status !== 'expired') throw new Error(...);               // draft 삭제 없음
await sdk.admin.draftOrder.delete(orderId);                            // expired 일 때만
```

---

## 2. 행동 테스트 3케이스

파일: `__tests__/m3-1125-p-discontinue-behavior.test.ts`

| 케이스 | 조건 | delete 호출 횟수 | 반환값 | 결과 |
|--------|------|-----------------|--------|------|
| (a) | fetch → `{ status:'paid' }` | 0회 | `{ kind:'already_paid', orderId:'ord_1' }` | ✅ PASS |
| (b) | fetch → `{ status:'expired' }` | 1회 (`ord_1`) | `{ kind:'cancelled' }` | ✅ PASS |
| (c) | fetch → `Error('Network error')` | 0회 | Error 전파 | ✅ PASS |

**로컬 실행 로그**:
```
 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  15:13:39
   Duration  182ms
```

---

## 3. lint 로컬 실행 로그

**원인**: `app/(tabs)/orders.tsx` Prettier 형식 에러 3건 + `split-tender/[draftOrderId].tsx` 1건
- orders.tsx:68 — ternary 단일 라인화
- orders.tsx:107 — `<Text>` 속성 단일 라인화
- orders.tsx:165 — 텍스트 내용 인라인화
- split-tender:207 — ternary 형식 (괄호 내 단일 라인)

**수정 후 로컬 결과**:
```
✖ 69 problems (0 errors, 69 warnings)
  0 errors and 2 warnings potentially fixable with the --fix option.
```
→ **errors 0** ✅ (warnings 69건은 모두 기존 코드의 react-hooks/set-state-in-effect 등 — 이번 브랜치 도입 아님)

---

## 4. assertions 로컬 실행 로그

**원인**: `m3-1105-c-english-assertions.mjs` — `app/(tabs)/orders.tsx` 한글 UI 문자열 9건
- `'QRIS 대기 중'` → `'QRIS pending'`
- `'이미 결제 완료'` → `'Payment already completed'`
- `'주문이 이미 결제되었습니다. 주문 목록을 확인하세요.'` → `'This order has been paid. Check your orders.'`
- `'주문 취소됨'` → `'Order cancelled'`
- `'취소 실패'` → `'Cancel failed'`
- `title="주문을 취소할까요?"` → `title="Cancel this order?"`
- `'받은 돈 없음 · 대기 중인 QR 도 취소됩니다.'` → `'No payment received · pending QR will also be cancelled.'`
- `'돌아가기'` → `'Go back'`
- `'취소 확인'` → `'Confirm cancel'`

**수정 후 로컬 결과**:
```
  총 47 개 · 47 PASS · 0 FAIL · wall 34.1s
```
→ **47/47 PASS** ✅

---

## 5. CI 상태

push 직후 (`2335790`) CI 트리거됨.
- 로컬 lint: **0 errors** ✅
- 로컬 assertions: **47/47** ✅
- 로컬 행동 테스트: **3/3** ✅
- CI 결과: push 후 GitHub Actions 대기 중 (본 리포트 작성 시점 미완료 — 로컬 검증으로 초록 확인)

## 6. 미변경 항목
- `QRIS_CANCEL_ENABLED` 플래그: **false 유지** (task 지시대로)
- #262 브랜치: 미접촉
