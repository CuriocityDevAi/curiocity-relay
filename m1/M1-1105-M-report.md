---
round: M1-1105-M
pr:
  fork: agilo-medusa-pos-fork#46
  fork_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/46
  fork_commit: 7aef4a9
outcome: tenders body 에 cashier_user_id + register_session_id 자동 주입 · UI 변경 0 · api/hooks/** 만
kyu_checks: 0 (UI 변경 0 · tenders 요청 body 필드 2개 자동 포함만)
---

# M1-1105-M · tenders 자동 wiring (P5 Q3 결정 "예")

**일자**: 2026-11-07 · **허브**: M1 · **성격**: work-queue #8d · P5 계획 M1-1105-L §3 M1-coding-α 의 일부 (tenders wire 만) · **승인**: 사전 "work-queue · 바로 PR".

---

## 0. 원문 (work-queue #8d)

fork master(`26b6b78`). 앱 tenders 호출(`api/hooks/pos-payments.ts` `useCreateTender` 및 draft-orders pos-complete 경로가 남아 있으면 그것도) 에 `body.cashier_user_id = 로그인 유저 id` · `body.register_session_id = 현재 open 세션 id` 자동 포함. 세션 없으면 생략 (서버 optional). UI 변경 0. Playwright `m3-1105-d` 에 요청 body 어설션 2개 추가. 색/영어 어설션 · CI green.

---

## 1. diff 요약 (2 파일)

### `api/hooks/pos-payments.ts` (+20 / -2)

```ts
+ import { useAuthCtx, useMedusaSdk } from '@/contexts/auth';
+ import { useSettings } from '@/contexts/settings';
+ import { useCurrentOpenSession } from './register-session';

  export const useCreateTender = () => {
    const sdk = useMedusaSdk();
    const qc = useQueryClient();
+   const auth = useAuthCtx();
+   const settings = useSettings();
+   const openSession = useCurrentOpenSession(settings.data?.stock_location?.id);
+   const cashierUserId = auth.state.status === 'authenticated' ? auth.state.user.id : undefined;
+   const registerSessionId = openSession.data?.id;
    return useMutation({
      mutationFn: async (input) => {
        const { order_id, ...rest } = input;
-       const body = rest;
+       const body = { ...rest };
+       if (!body.cashier_user_id && cashierUserId) body.cashier_user_id = cashierUserId;
+       if (!body.register_session_id && registerSessionId) body.register_session_id = registerSessionId;
        return await sdk.client.fetch(`/admin/pos/orders/${order_id}/tenders`, { method: 'POST', body });
      },
      ...
    });
  };
```

**머지 전략**: 호출부가 명시 넘기면 호출부 값이 우선 (`if (!body.<field>) body.<field> = derived`). 세션 없으면 생략 (서버 optional).

### `scripts/m3-1105-d-playwright.mjs` (+44 / -0)

- `let tenderRequestBody = null;` state 변수 신설 (`runFlow` 안쪽).
- tenders POST 핸들러에 body 캡처: `tenderRequestBody = JSON.parse(route.request().postData() ?? '{}')`.
- `register-sessions` GET mock **override 추가** (`useCurrentOpenSession` 이 `rss_test_01` 세션을 derive 하게끔 — 기본 harness mock 은 empty).
- 어설션 2 신설:
  - `(5b-i) tenders body.cashier_user_id 포함`
  - `(5b-ii) tenders body.register_session_id 포함`

### pos-complete 경로 (변경 0)

storeport `/admin/register-sessions/:id/pos-complete` 서버 route 는 `cashier_user_id` 를 body 로 받지 않음 (실측 `route.ts:143-144`). URL 에 이미 `session_id` 가 있고 캐셔는 `req.auth_context.actor_id` 에서 derive. 따라서 `useCompleteDraftOrder` · `useRetryPayment` · `usePosComplete` 는 **변경 불필요**.

### fixtures 변경 0

`fixtures/pos-tender-cash-response.json` 응답 shape 그대로 (요구 명시).

---

## 2. 어설션 로그

### m3-1105-d Playwright (로컬 · happy + fail 2 라운드)

```
=== RUN · happy ===
...
  ✓ (5a) /checkout/success 라우팅
  ✓ (5b) POST tenders 1회
  ✓ (5b-i) tenders body.cashier_user_id 포함 (로그인 유저 id 자동 주입)
  ✓ (5b-ii) tenders body.register_session_id 포함 (현재 open 세션 id 자동 주입)
  ✓ (5c) GET receipts 1회 이상
  ✓ (5d) payment-success 블록 노출
  ✓ (5e) ReceiptCard 노출 · 서버 snapshot 소비
  ✓ (5f) Hand over 버튼 노출
...
=== RUN · 400 fail ===
...
  ✓ (FAIL-5a) Payment failed 토스트
  ✓ (FAIL-5b) tenders 1회 · success 미진입

24/24 passed · 0 failed
```

### 회귀 (전원 pass · 로컬)

```
$ npx tsc --noEmit                                → 신규 에러 0 (잔존 global.css pre-existing)
$ node scripts/m3-1105-a-color-assertions.mjs    → 37/37 passed
$ node scripts/m3-1105-c-english-assertions.mjs  →  5/5 passed
$ node scripts/m1-1105-a-assertions.mjs          → 33/33 passed
$ node scripts/m1-1104-a-assertions.mjs          → 44/44 passed
$ node scripts/m1-1104-b-assertions.mjs          → 26/26 passed
$ node scripts/m1-1105-h-assertions.mjs          → 27/27 passed
$ rm -rf dist && npx expo export -p web --output-dir dist
$ node scripts/m1-1105-b-playwright.mjs          →  6/6 passed
```

---

## 3. CI 링크 (fork PR #46)

- **lint**: pass (1m0s) · https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42339851776/job/128304891841
- **assertions + playwright**: pass (4m45s) · https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42339851639/job/128304892033

두 job 모두 green. 로컬 full suite 전원 green 과 CI 전원 green 일치.

---

## 4. 규약 정합

| 규약 | 정합 |
|------|------|
| fork master(`26b6b78`) 위 작업 | ✓ |
| `useCreateTender` 안에서 자동 주입 (UI 변경 0) | ✓ |
| 세션 없으면 생략 (서버 optional) | ✓ (caller-wins 머지 전략) |
| `fixtures/pos-tender-cash-response.json` 그대로 | ✓ (변경 0) |
| Playwright `m3-1105-d` 요청 body 어설션 2 신설 | ✓ (5b-i · 5b-ii) |
| 색 · 영어 · M1 어설션 전원 pass | ✓ (§2 회귀) |
| 파일 주인 `api/hooks/**` + `scripts/m3-1105-d-playwright.mjs` 어설션 추가만 | ✓ (2 파일) |
| 호출부 (app/checkout/tender-cash) 변경 0 | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 5. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (work-queue #8d · P5 Q3 결정 "예") |
| 해소 | +1 (M1-1105-L §3 coding-α · tenders wire 분 · pos-complete 는 서버가 derive 하므로 wire 불필요 확인) |
| 미완 (Kyu 도장) | 0 (UI 변경 0) |
| **총 순증감** | **+2 해소** |

---

## 6. 다음 게이트

1. **PR #46 CI 확인** → 머지. 서버/네이티브 영향 0.
2. **M1-1105-L §3 coding-α 남은 분**: OpenShiftSheet + _layout 가드 신설 (별건 라운드).
3. **M1-1105-L §3 coding-β**: Settings "Close shift" 행 (M2 소유).
4. **M3-coding**: ReceiptCard cashier · session 표기 (M3 소유).

---

*M1-1105-M · 2026-11-07 · tenders body cashier_user_id + register_session_id 자동 주입 · fork PR #46 · api/hooks 1 + scripts 1 = 2 파일 · UI 변경 0 · m3-1105-d 24/24 pass (신 어설션 2 포함) · 회귀 전원 pass · CI green (lint 1m0s · playwright 4m45s)*
