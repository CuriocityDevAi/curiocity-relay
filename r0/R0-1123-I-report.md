#235: APPROVE

## 검토 결과

**단위 테스트**: 7/7 PASS (`vitest run __tests__/m2-1123-e-receipt-queue-num.test.ts`)
**CI**: `route` pass · `lint/assertions/flow-tests` pending (진행 중)

---

## ① ESC/POS · 화면 영수증 둘 다 `pos_order_num` 표시

**ESC/POS** (`lib/printer/receipt-escpos.ts:192-196`):
```ts
if (snap.pos_order_num != null) {
  b.alignCenter().bold(true).line(`Queue #${snap.pos_order_num}`).bold(false).alignLeft();
  b.rule();
}
```
로고 블록 → store header → rule 다음, No./Date 블록 앞에 위치. ✅

**화면** (`components/receipt/ReceiptCard.tsx:249-266`):
```tsx
{snap.pos_order_num != null ? (
  <>
    <View testID="receipt-queue-block">
      <Text testID="receipt-queue-num">#{snap.pos_order_num}</Text>
      <Text>Queue</Text>
    </View>
    <View className="my-1 h-hairline w-full bg-line" />
  </>
) : null}
```
로고 블록 아래, No./Date 블록 위. `text-5xl font-bold`. ✅

---

## ② 값 없을 때 줄 생략

- ESC/POS: `snap.pos_order_num != null` — null·undefined 모두 블록 미생성. ✅
- ReceiptCard: 동일 가드 — 렌더 없음. ✅
- 단위 테스트 REQ-2 (null·undefined) 2건 명시 검증. ✅

---

## ③ #233·#234 파일 충돌·키 불일치

**#235 변경 파일** vs **#233 변경 파일** (api/hooks/draft-orders.tsx · sell.tsx · cart/* · order-chips/* · e2e/flows/M3-1123-G*):
→ 겹치는 파일 없음. ✅

**#235 변경 파일** vs **#234 변경 파일** (app/checkout/success/* · SuccessReceiptAnim.tsx · OrderTypePicker.tsx · e2e/helpers/api-mocks.ts · e2e/flows/M0-1123-E* · screenshots):
→ 겹치는 파일 없음. ✅
→ `e2e/helpers/api-mocks.ts` — #234가 수정, #235는 미수정. 머지 순서에 무관. ✅

**키 이름 일치**: `types/receipt.ts:128` `pos_order_num?: number | null` ↔ #233 `metadata.pos_order_num`. ✅

**SuccessReceiptAnim**: #234가 수정하지만 `ReceiptCard`를 렌더하므로 번호 표시 1곳 준수. 티켓 충돌 없음. ✅

---

## ④ spec 운영 URL 의존 없음

`e2e/flows/M2-1123-E-receipt-num.spec.ts`:
- `const API = 'https://api.meros.id'` — `page.route()` 인터셉션 패턴으로만 사용. 실제 HTTP 요청 없음.
- `mockBaseAuth(page)` — catch-all `${API}/**` 포함 → 미등록 엔드포인트도 로컬 풀필.
- `mockCashSaleFlow(page)` → `mockCashFlowWithQueueNum` LIFO 오버라이드.
- `navigateTo(page, '/')` → 로컬 dev server → SPA pushState. 운영 URL 접근 없음.
- `loadFixture('pos-receipt-response.json')` — `mockCashSaleFlow`가 이미 사용 중인 로컬 fixture.

기존 모든 e2e spec과 동일 패턴. CI 타임아웃 위험 없음. ✅

---

## 판정: APPROVE

4개 체크 항목 전부 통과. 단위 테스트 7/7 PASS. 운영 URL 의존 없음.
