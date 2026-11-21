#226 CHANGES · 다음 손님 잔상 X · 장바구니 품목 표시 X

---

## 판정 근거

### 1. 다음 손님 잔상 — X (문제 없음)

hint 초기화 경로 3개 확인:

| 경로 | 파일 | 처리 |
|---|---|---|
| Next customer 버튼 | `products.tsx` `executeNextCustomer()` | `await nextCustomer(sessionId)` 완료 후 `setPosScreenHint(null)` 명시 ✓ |
| Products 탭 포커스 | `products.tsx` `useFocusEffect` | 마운트 즉시 `setPosScreenHint(null)` ✓ |
| Cart 탭 이탈 | `cart.tsx` `useFocusEffect` cleanup | `return () => setPosScreenHint(null)` ✓ |

paid 화면(`checkout/success/[orderId].tsx`)이 cleanup 없이 `setPosScreenHint({ pos_screen: 'paid', ... })`를 세팅하지만, 이후 반드시 products 탭이 포커스를 받으므로 `useFocusEffect`에서 null로 클리어됨. 잔상 경로 없음.

---

### 2. 장바구니 품목 표시 — X (CHANGES 사유)

현재 diff의 liveSnapshot 계산:

```ts
return { ...(snapshot ?? {}), pos_screen: ps, ...(hint?.extras ?? {}) };
```

`PosScreenEmitExtras` 타입은 `qr_string?`, `amount?` 두 필드만 존재 (lib/pos-screen/types.ts).  
items·subtotal·tax\_total·discount\_total 등은 포함되지 않음.

**서버 snapshot=null(현재 운영 기본 케이스 — route.ts 버그 미수정) + `cart_review` hint 조합**에서:

```
liveSnapshot = { pos_screen: 'cart_review' }
→ CartScreen 렌더 → items 없음 → "빈 장바구니" 표시
```

Kyu 기대("거래 과정에 따라 변하는")에 못 미침.

**Playwright `?mock=1`이 이를 가림**: 테스트가 mock 데이터로 items를 주입하므로 CartScreen에 품목이 표시되어 PASS 4/4. 실제 운영(snapshot=null)은 커버되지 않음.

**요청 CHANGES:**

옵션 A (권장): `cart_review` hint 세팅 시 현재 draft order items·totals를 extras에 포함.  
`cart.tsx`의 `useFocusEffect`에서 `setPosScreenHint({ pos_screen: 'cart_review', extras: { items, total } })` 형태로 확장.  
이 경우 `PosScreenEmitExtras`에 items 필드 추가 필요.

옵션 B: PR 본문에 한계 명시 + 서버 fix(route.ts 1줄) 적용 시 CartScreen 품목 정상 표시됨을 문서화. 서버 fix 없이 `cart_review` 는 화면 전환만 되고 품목은 보이지 않음을 acknowledge.

---

### 3. 민감정보 — 없음 ✓

`PosScreenEmitExtras = { qr_string?: string; amount?: number }`.  
전화번호·이메일·결제수단 등 민감정보 없음. WebView 주입 안전.

---

### 4. useMemo 의존성·성능·번들 ✓

- `[snapshot, hint?.pos_screen, hint?.extras]` 의존성: `_hint`는 모듈 레벨 ref, `setPosScreenHint` 호출 시에만 갱신 → 불필요 재실행 없음.
- `hint?.extras` 객체 참조: `setPosScreenHint` 호출마다 새 객체지만 그것 자체가 변화의 신호이므로 의도에 맞음.
- 하드코딩 색 0 없음. 추가 번들 의존성 없음(기존 훅 import).
- 성능 영향 없음 (overlay 1개, snapshot 폴링 주기 종속).

---

### 5. 테스트

- vitest: 이 PR에 신규 테스트 없음.
- Playwright 4/4 통과: `?mock=1` mock 데이터 — 실제 snapshot=null 케이스를 커버하지 않음.
- lint: 변경 1파일, TypeScript 에러 없음(PR 체크리스트 기준).

---

## 요약

| 항목 | 판정 |
|---|---|
| 다음 손님 잔상 | X — 초기화 경로 3개 모두 확인 ✓ |
| 장바구니 품목 | X — snapshot=null 케이스에서 빈 장바구니 표시 (CHANGES 필요) |
| 민감정보 | 없음 ✓ |
| useMemo·성능 | 적절 ✓ |
| 테스트 | mock=1로 실운영 케이스 미커버 |
