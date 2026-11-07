---
name: R0-1105-Q · 허브-1107-Q 재리뷰 relay
description: fork #46 (M1-1105-M tenders 자동 주입) + #47 (M3-1105-J 팔레트 D1) 전부 APPROVE · 스샷 5장 D1 의도 확인 · accent 로고 외 20건 기록
author: R0
dated: 2026-11-07
---

# R0-1105-Q · fork #46 · #47 리뷰 relay

**스코프**: fork 열린 PR 2개 (M1-1105-M · M3-1105-J).
**정본**: `agilo-medusa-pos-fork@26b6b78` (master · #44 머지 후) · `storeport@946d31c`.
**금지**: 코드 수정 · 커밋.

## 판정 요약

| PR | head | 판정 | 핵심 근거 |
| --- | --- | --- | --- |
| #46 (M1-1105-M) | `7aef4a9` | **APPROVE** | useCreateTender 가 로그인 유저·open 세션을 derive 해 undefined 생략 가드와 함께 주입 · 호출부 override 허용 · UI 변경 0 · 5b-i/ii 어설션이 `route.request().postData()` 로 실체 body 캡처 |
| #47 (M3-1105-J) | `e59ec4d` | **APPROVE** | 토큰 15 × 2 파일 전수 글자 단위 일치 · 컴포넌트 코드 수정 0 · 스샷 5장 모두 주 버튼/선택 탭/비활성 무채색 확인 · accent 로고 외 20건/10파일 기록 (수정 요청 아님) |

둘 다 **머지 OK** · 리그레션 없음.

---

## #46 · M1-1105-M (tenders 자동 주입)

### 1. useCreateTender 변경 (api/hooks/pos-payments.ts +20)

```typescript
const auth = useAuthCtx();
const settings = useSettings();
const openSession = useCurrentOpenSession(settings.data?.stock_location?.id);
const cashierUserId = auth.state.status === 'authenticated' ? auth.state.user.id : undefined;
const registerSessionId = openSession.data?.id;

mutationFn: async (input: PosTenderInput) => {
  const { order_id, ...rest } = input;
  const body: Omit<PosTenderInput, 'order_id'> = { ...rest };
  if (!body.cashier_user_id && cashierUserId) body.cashier_user_id = cashierUserId;
  if (!body.register_session_id && registerSessionId) body.register_session_id = registerSessionId;
  return (await sdk.client.fetch(`/admin/pos/orders/${order_id}/tenders`, { method: 'POST', body })) as PosTenderResponse;
}
```

| 축 | 구현 | ✓ |
| --- | --- | --- |
| `cashier_user_id` = 로그인 유저 id | `auth.state.status === 'authenticated' ? auth.state.user.id : undefined` | ✓ |
| `register_session_id` = 현재 open 세션 id | `useCurrentOpenSession(settings.data?.stock_location?.id).data?.id` | ✓ |
| 세션 없을 때 undefined 키 **미전송** | `if (!body.register_session_id && registerSessionId)` 가드 · falsy 시 body 에 key 추가 안 함 → fetch body 에서 생략 | ✓ |
| 호출부 명시 시 override 허용 | `if (!body.X && Y)` — body 에 이미 있으면 덮어쓰지 않음 | ✓ |
| 호출부 UI 변경 0 | `app/checkout/tender-cash/[draftOrderId].tsx` 미수정 (diff 범위 밖) | ✓ |

### 2. draft-orders pos-complete 경로

`api/hooks/draft-orders.tsx:733` 가 호출하는 `POST /admin/register-sessions/:id/pos-complete` 는 **다른 서버 route** · body `{order_id, payment_method, invoice_number?}` 만 전송하고 **서버가 `req.auth_context.actor_id` 로 user_id 를 도출** (storeport@946d31c `src/api/admin/register-sessions/[id]/pos-complete/route.ts:146` 확인) · session_id 는 **path param** `:id`.

→ 두 축 모두 서버가 자체 확보하므로 **pos-complete 경로엔 body 주입 불필요** · fork 가 draft-orders.tsx 를 수정 안 한 것은 **정확한 설계** · 지적 사항 아님 ✓

### 3. Playwright 어설션 5b-i / 5b-ii — 실제 body 캡처

```javascript
// mock 라우트 핸들러 안
tenderRequestBody = JSON.parse(route.request().postData() ?? '{}');

// 5b-i
check('(5b-i) tenders body.cashier_user_id 포함 (로그인 유저 id 자동 주입)',
  typeof tenderRequestBody?.cashier_user_id === 'string' && tenderRequestBody.cashier_user_id.length > 0, ...);
// 5b-ii
check('(5b-ii) tenders body.register_session_id 포함 (현재 open 세션 id 자동 주입)',
  typeof tenderRequestBody?.register_session_id === 'string' && tenderRequestBody.register_session_id.length > 0, ...);
```

- `route.request().postData()` → Playwright 가 앱이 실제 전송한 **request body** 를 반환 → 실측 ✓
- 두 축 모두 `typeof === 'string' && length > 0` → non-empty string 요구 · undefined 미전송 케이스는 실패 유발
- register-sessions GET mock 추가 (fake session `rss_test_01`) → `useCurrentOpenSession` 파이프라인 전체 실행 ✓

### 4. 서버 contract 호환

storeport@946d31c `src/api/admin/pos/orders/[id]/tenders/route.ts`:
- `body.cashier_user_id` → `capturePaymentWorkflow` 의 `captured_by` 로 사용 (라인 ~310)
- `body.register_session_id` → `register_session.addExpectedByMethod` 호출 조건 (라인 ~340)
- 둘 다 **optional** · 미전송해도 서버 200 유지 ✓

---

## #47 · M3-1105-J (팔레트 D1)

### 1. 토큰 15 값 — 원장 D1 vs PR (글자 단위)

| # | Token | 원장 D1 | PR `brand.ts` | PR `tailwind.config.js` | ✓ |
| --- | --- | --- | --- | --- | --- |
| 1 | `surface` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | ✓ |
| 2 | `surface-muted` | `#F2F2F0` | `#F2F2F0` | `#F2F2F0` | ✓ |
| 3 | `ink` | `#0E1B18` | `#0E1B18` | `#0E1B18` | ✓ |
| 4 | `ink-muted` | `#6F6F6F` | `#6F6F6F` | `#6F6F6F` | ✓ |
| 5 | `ink-subtle` | `#B5B5B5` | `#B5B5B5` | `#B5B5B5` | ✓ |
| 6 | `ink-disabled` | `#C8C8C8` | `#C8C8C8` | `#C8C8C8` | ✓ |
| 7 | `line` | `#E3E3E3` | `#E3E3E3` | `#E3E3E3` | ✓ |
| 8 | `accent` | `#E8A33D` | `#E8A33D` | `#E8A33D` | ✓ |
| 9 | `accent-soft` | `#FBE4B6` | `#FBE4B6` | `#FBE4B6` | ✓ |
| 10 | `success` | `#0E1B18` | `#0E1B18` | `#0E1B18` | ✓ |
| 11 | `success-soft` | `#EDEDEB` | `#EDEDEB` | `#EDEDEB` | ✓ |
| 12 | `warning` | `#9B6D1F` | `#9B6D1F` | `#9B6D1F` | ✓ |
| 13 | `warning-soft` | `#FBF1DC` | `#FBF1DC` | `#FBF1DC` | ✓ |
| 14 | `danger` | `#C62828` | `#C62828` | `#C62828` | ✓ |
| 15 | `danger-soft` | `#FBE3E3` | `#FBE3E3` | `#FBE3E3` | ✓ |

**15 / 15 전수 글자 단위 일치** · brand.ts ↔ tailwind.config.js 동일 값 · 원장 D1 과 완전 일치. 출처 원장: relay `m3/M3-1105-J-report.md` §3 표.

### 2. 컴포넌트 코드 변경 목록 (허용 범위 = 토큰 값 + 색 어설션)

| 파일 | 변경 종류 | 범위 ✓ |
| --- | --- | --- |
| `constants/brand.ts` | 15 토큰 값 + 주석 | 허용 (토큰 값) |
| `tailwind.config.js` | 15 토큰 값 + 주석 | 허용 (토큰 값) |
| `scripts/m3-1105-j-screenshots.mjs` | 신규 (223 줄) · 스크린샷 자동화 | 허용 (색 어설션/도구) |
| `screenshots-m3-1105-j/*.png` | 5장 (login · products · detail · cart · checkout-cash) | 문서 (코드 아님) |

**app/** · components/** · lib/** 수정 0** · M3-1105-A 절차 (2 파일만) 준수. Kyu 허용 범위 안에서 더 엄격 (색 어설션 교정조차 없음).

### 3. 스샷 5장 — D1 의도 확인

| 스샷 | 확인 요소 | 결과 |
| --- | --- | --- |
| **01-login.png** | Meros 로고 (M 블록만 앰버) · "Sign In" 비활성 = surface-muted bg + ink-disabled 글자 | **무채색** ✓ |
| **02-products.png** | 상단 "○ Closed … Tap to open" = danger red (허용) · "12 left" chip = **grey bg** (success-soft `#EDEDEB`) · "3 left" = warning-soft 앰버 · "Sold out" = grey · 탭 바 greyscale | **녹색 chip 완전 제거 확인** ✓ |
| **03-product-detail-sold-out.png** | "● Sold out · 0 left" = danger red (허용) · "Sold out" 버튼 = surface-muted bg + ink-disabled 글자 | **주 버튼 자리 무채색 비활성** ✓ |
| **04-cart.png** | "Open register" = **ink bg + 흰 글자** · "Register is closed" = warning amber (허용) · Cart 탭 선택 = ink | **주 버튼 greyscale** ✓ |
| **05-checkout-cash.png** | "Process payment" = **ink bg + 흰 글자** · Exact/50k/100k preset = line border + ink · "Cancel" = outline ink | **선택 탭 greyscale + 주 버튼 greyscale** ✓ |

**주 버튼 · 선택 탭 · 비활성 버튼 · in-stock chip (= "Paid" 칩 토큰)** = 전부 무채색 · 유채색 노출 = danger (Closed · Sold out · O dot) + warning (저재고 · Register is closed) + 로고 M 블록 뿐 · **D1 의도 완전 일치**.

### 4. accent 사용처 — 로고 외 **20건 · 10 파일** (지적 사항 아님 · 기록)

로컬 grep `grep -rnE 'accent|TOKEN_ACCENT' app/ components/` 실측 20건 · PR body 와 일치.

| 파일 | 라인 | 호출 | 성격 |
| --- | --- | --- | --- |
| `app/(tabs)/orders.tsx` | 111 | `border-accent bg-accent-soft` (선택 method chip) | 선택 상태 강조 |
| `app/register/close.tsx` | 120 | `text-accent` (`diff > 0`) | 숫자 양/음 구분 |
| `components/RegisterBadge.tsx` | 54 | `text-accent` ("Pickup") | 상태 chip |
| `components/MultiSelectFilter.tsx` | 2 · 68 · 73 | `TOKEN_ACCENT` import · `text-accent` · `<Check color={TOKEN_ACCENT} />` | 선택 표시 |
| `components/SearchInput.tsx` | 16 | `focus:border-accent` | 포커스 테두리 |
| `components/ui/OrderStatus.tsx` | 2 · 193 · 194 · 195 | `bg-accent-soft` · `TOKEN_ACCENT` · `text-accent` ("Draft") | Draft 주문 chip |
| `components/form/MultiSelectField.tsx` | 2 · 29 · 34 | `text-accent` + Check icon | 폼 선택 |
| `components/form/SelectField.tsx` | 2 · 41 · 46 | `text-accent` + Check icon | 폼 선택 |
| `components/form/TextField.tsx` | 87 | `focus:border-accent` | 포커스 테두리 |
| `components/orders/OrderTypeChip.tsx` | 22 · 28 | `bg-accent-soft` + `text-accent` (takeaway) | 주문 유형 chip |

**총 20 라인 · 10 파일**. 본 PR 은 토큰 **값만 교체** 하므로 이 호출부들은 **D1 accent 값 (`#E8A33D` 앰버) 로 자동 전환**됨 (코드 변경 없음). Kyu 의도 "로고 외 accent 미사용" 에 어긋나나 **본 PR 리뷰에서 지적 아님 · 기록** (다음 라운드 Kyu 판단).

**가장 눈에 띄는 호출부** (팔레트 D1 하에서 앰버로 렌더될 자리):
1. Orders 선택 method chip (bg-accent-soft)
2. OrderStatus Draft chip
3. OrderTypeChip takeaway
4. form 선택 Check icon
5. focus 테두리 (SearchInput · TextField)

→ 다음 라운드 판단 포인트: 모두 ink/surface-muted 로 교체 (가장 보수적) vs 일부 (focus 테두리 · Check icon) 는 accent 유지 vs 상태 구분용 (Draft/takeaway/Pickup) 중립 축 재설계.

---

## 환경 보조

- fork master 로컬 재현: `git fetch origin && git reset --hard origin/master` → `c03c254`
- #46 로컬 재현: `git checkout origin/feat/m1-1105-m-tenders-wire` → `7aef4a9`
- #47 로컬 재현: `git checkout origin/feat/m3-1105-j-palette-d1` → `e59ec4d`
- storeport main 참조: `/Users/kyu.lee/projects/storeport@origin/main = 946d31c` (pos-complete body 축 확인)
- 스샷 5장 Read 도구로 시각 확인 (PNG 멀티모달 렌더)
- accent grep: `grep -rnE 'accent|TOKEN_ACCENT' app/ components/` → 20건 실측

## 참조

- 직전 리뷰: `r0/R0-1105-P-report.md` (storeport #194 M0-1105-L APPROVE · O/P relay push)
- fork master HEAD: `c03c254a...` (#44 `26b6b78` 포함)
- storeport main HEAD: `946d31cdd9eadd42c149d81639044eaf02d41fad`
- GitHub review 제출 (COMMENT · self-authored 제약):
  - [#46](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/46) · APPROVE
  - [#47](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/47) · APPROVE
