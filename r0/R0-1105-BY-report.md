# R0-1105-BY 진단 리포트
작성: 2026-11-12 · Sonnet 4.6

---

## S1 — 2차 Card 거절 `amount must equal grand_total`

### 오류 문구 발생 위치
**서버** `storeport/apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts:447-455`

```ts
if (
  effectiveOrderType !== "preorder" &&
  !splitMode &&          // ← splitMode = body.split === true (line 360)
  amount !== orderTotal
) {
  res.status(400).json({
    type: "invalid_data",
    message: `amount must equal grand_total (expected ${orderTotal}, got ${amount})`,
  });
  return;
}
```

### 앱 2차 Card 호출 경로/body
엔드포인트: **단일·분할 공통** `POST /admin/pos/orders/:id/tenders`

앱 `onConfirmSecondCard` (split-tender/[draftOrderId].tsx:187-200) body:
```
{
  provider_id: "pp_edc_manual_default",
  amount: remaining,          // 400,000 (서버 1차 응답값)
  input: { bank, approval_code, card_last4 },
  order_type: "takeaway",
  // ← split: true 없음 ← BUG
}
```

서버는 `body.split === true` 가 아니면 `splitMode = false` → 단일 결제 경로로 판단 →
`amount(400,000) ≠ orderTotal(489,500)` → 400.

### 2차 호출 경로 판정 (코드 기준)

| 조합 | 1차 (split: true ✅) | 2차 split: true | 결과 |
|------|---|---|---|
| **Cash 1st + Card 2nd** (실기 #69) | `onProcessFirst` line 143 ✅ | `onConfirmSecondCard` line 193 ❌ | **400** |
| Cash 1st + Cash 2nd | `onProcessFirst` line 143 ✅ | `onProcessSecond` line 177 ❌ | **400** |
| Card 1st + Cash 2nd | `onConfirmFirstCard` line 160 ✅ | `onProcessSecond` line 177 ❌ | **400** |
| Card 1st + Card 2nd | `onConfirmFirstCard` line 160 ✅ | `onConfirmSecondCard` line 193 ❌ | **400** |
| QRIS 조합 | — | — | **UI 미지원** (split 화면 Cash/Card 탭만) |

**결론**: 2차 단계 모든 조합이 동일하게 실패. Cash 2nd도 `onProcessSecond`에 `split: true` 없음.

### #212 통합 테스트가 왜 못 잡았나
테스트 `#66` (tenders.spec.ts:4330-4353)은 2차 tender API 직접 호출 시 **`split: true` 를 명시적으로 포함**:
```ts
await api.post(`/admin/pos/orders/${order.id}/tenders`, {
  provider_id: "pp_edc_manual_default",
  amount: 60000,
  split: true,   // ← 테스트는 올바르게 보냄
  input: { bank: "BCA", approval_code: "100001", card_last4: "1111" },
});
```
테스트는 서버 로직만 검증 (정상 통과). 앱 컴포넌트가 `split: true` 를 누락하는 버그를 커버하는 E2E 테스트가 없어서 통과.

### 고칠 위치/방향

**앱 side (pos-r0 fork)** — 코드 2줄 추가, 서버 무수정:

| 함수 | 파일:라인 | 수정 내용 |
|------|-----------|-----------|
| `onProcessSecond` | split-tender/[draftOrderId].tsx:177 | `...commonExtras` 앞에 `split: true,` 추가 |
| `onConfirmSecondCard` | split-tender/[draftOrderId].tsx:193 | 동일 |

### M0-1105-AR 겹침 여부
M0-AR은 storeport 서버 `tenders/route.ts` metadata `pos_totals` 저장 담당. 본 버그는 **앱(pos-r0) 2차 tender body**에 `split: true` 누락이므로 서버 파일 무수정 → **겹침 없음**.

---

## S1 후속 — Order #69 복구 절차 (코드 기준)

**현재 2단계에서 Cancel 누르면** (`split-tender/[draftOrderId].tsx:253-262`):
```ts
showToast.error('1st payment already processed', {
  text2: 'Contact manager to void before retrying',
});
return;  // 화면 이동 없음, 재시도 버튼 없음
```
→ 토스트만 표시, 다시 카드 입력도 불가 (렌더 그대로 유지).

**복구 절차 (코드 기반)**:
1. 캐셔 → Orders 탭 → Order #69 (1차 Cash 완결, 미변환 draft 상태)
2. Order Detail 화면 (`orders/[orderId].tsx`) → Void 버튼 → `VoidRefundSheet`
3. CASH 1건 포함 → `ManagerPinSheet` PIN 입력 필수 (plan §S2 · tenders.spec.ts #67 로 고정)
4. Void 성공 → 1차 현금 89,500 환불 (`refund_distribution` CASH-first · spec #68 S3)
5. 처음부터 재주문

**재시도 가능 여부**: 불가. 앱 Split 화면에 2차 재시도 경로 없음. Void 후 Cart에서 재시작 필요.

---

## S2 — 숫자 키패드 랜덤 원인

### Approval code / Card last4 현재 설정

| 칸 | 파일:라인 | keyboardType | inputMode | secureTextEntry | 상태 |
|---|---|---|---|---|---|
| `approval_code` TextInput | CardTenderPanel.tsx:79 | `numeric` | ❌ 없음 | 없음 | **불완전** |
| `card_last4` (DigitsInput) | CardTenderPanel.tsx:96 | `numeric` ✅ (DIGITS_INPUT_PROPS) | `numeric` ✅ | 없음 | 정상 |

**불일치**: `approval_code`는 평범한 `TextInput`에 `keyboardType="numeric"` 만. `DigitsInput.tsx:28-34`의 `DIGITS_INPUT_PROPS`(`keyboardType + inputMode` 모두)를 쓰지 않음.

### "랜덤" 원인 3가지 (코드+iPad 거동 기준)

1. **bank 칸 → approval 칸 전환 타이밍**: `bank` TextInput(CardTenderPanel.tsx:63-70)은 `keyboardType` 없음(QWERTY) + `autoCapitalize="characters"`. bank 포커스 후 approval 탭 시, iPadOS는 QWERTY → numeric 전환을 한 사이클 늦게 적용하는 케이스 존재 → "때로는 큰 키보드, 때로는 숫자 팝업"처럼 보임.

2. **`inputMode` 누락**: `DigitsInput.tsx:32` 주석: "inputMode 는 keyboardType 와 중복되지만 Android/웹에서 확실하게 숫자 키패드를 띄움". `approval_code`에 `inputMode` 없으면 iOS는 괜찮아도 Android/웹뷰 경로에서 numeric 패드 미보장.

3. **iPad 외장/플로팅 키보드**: `DigitsInput.tsx:9-11` 주석에 명시 — ① `secureTextEntry=true` 이면 보안 입력으로 전환돼 QWERTY 강제 ② `textContentType="oneTimeCode"` 도 keyboard 덮어씀. `approval_code`는 두 props 없으나, iPad 외장 키보드 연결 시 플로팅 숫자 팝업 자체가 미출현 (iOS 하드웨어 감지 경로).

### 앱 전체 숫자 전용 칸 · 현재 설정 표

| 칸 | 파일:라인 | keyboardType | inputMode | 비고 |
|---|---|---|---|---|
| 승인번호 approval_code | CardTenderPanel.tsx:79 | `numeric` | ❌ | **수정 필요** |
| 카드 끝 4자리 last4 | CardTenderPanel.tsx:96 (DigitsInput) | `numeric` | `numeric` ✅ | DIGITS_INPUT_PROPS |
| 현금 받은 금액 received | CashTenderPanel.tsx:116 | `numeric` | ❌ | 잠재 불안정 |
| Split 1차 금액 | split-tender/[draftOrderId].tsx:333 | `numeric` | ❌ | 잠재 불안정 |
| 배송 전화번호 phone | DeliveryInputs.tsx:123 | `phone-pad` | ❌ | phone-pad 의도적 |

**수정 방향**: `approval_code` TextInput → `DigitsInput` 컴포넌트로 교체 (or `{...DIGITS_INPUT_PROPS}` spread). `bank` 칸은 텍스트이므로 그대로.

---

## S3 — 화면 상단에 경로명 노출

### 원인
`app/_layout.tsx` Stack 선언에 `checkout/split-tender/[draftOrderId]` 항목 **없음**.

```tsx
// 등록된 checkout 경로들:
<Stack.Screen name="checkout/[draftOrderId]" options={{ title: 'Checkout', headerShown: false }} />
<Stack.Screen name="checkout/success/[orderId]" options={{ title: '' }} />
<Stack.Screen name="checkout/tender-cash/[draftOrderId]" options={{ title: '' }} />
<Stack.Screen name="checkout/delivery/[draftOrderId]" options={{ title: '' }} />
// ← checkout/split-tender/[draftOrderId] 없음 ← BUG
```

Expo Router는 Stack.Screen 선언 없는 화면을 열 때 route segment `checkout/split-tender/[draftOrderId]` 를 그대로 헤더 title로 사용.

### 고칠 위치
`app/_layout.tsx` line 81 (delivery 아래):
```tsx
<Stack.Screen name="checkout/split-tender/[draftOrderId]" options={{ title: '' }} />
```

### 같은 문제 있는 다른 route
없음. 신규 추가된 route 중 `checkout/delivery/[draftOrderId]`는 line 81에 이미 등록됨.
(다른 신규 파일 `components/`, `api/hooks/` 등은 route가 아님)

---

## 항목별 요약 표

| 항목 | 원인 | 재현 | 고칠 방향 | 파일:라인 | M0-AR/M3-AW 겹침 |
|------|------|------|-----------|-----------|------------------|
| **S1 400 Card 2nd** | 앱 2차 tender body에 `split: true` 누락 | 항상 재현 (2차 모든 조합) | 앱 `onProcessSecond`, `onConfirmSecondCard`에 `split: true` 추가 | split-tender/[draftOrderId].tsx:177, 193 | **없음** (앱 side) |
| **S1 #212 미검출** | 테스트가 `split: true` 명시, 앱 component E2E 없음 | — | fork 에 E2E 시나리오 추가 (별도 태스크) | tenders.spec.ts:4330 | 없음 |
| **S1 Order #69 복구** | 2단계 Cancel이 toast만 표시, 재시도 경로 없음 | Void → PIN → 환불 → 재주문 | 현 흐름 유지 or 2단계 재시도 버튼 추가 고려 | split-tender/[draftOrderId].tsx:253 | M3-AW(Void) 간접 연관 |
| **S2 키보드 랜덤** | bank 칸 QWERTY 후 approval 칸 전환 타이밍, inputMode 누락 | iPad 에서 비결정적 | approval_code에 `DigitsInput` or `DIGITS_INPUT_PROPS` 적용 | CardTenderPanel.tsx:79 | 없음 |
| **S3 경로명 노출** | `_layout.tsx` Stack.Screen 등록 누락 | 항상 재현 | `checkout/split-tender/[draftOrderId]` Stack.Screen 추가 | app/_layout.tsx (line 81 이후) | 없음 |

---

## 이연 순증감

- 신규 이연: 없음
- 해소 이연: 없음
- PR: 없음 (진단만)

---

*착지 명령 (실행 주체: 이 보고서를 받는 Relay 세션)*
```bash
cp /tmp/R0-1105-BY-report.md ~/projects/curiocity-relay/r0/ && \
cd ~/projects/curiocity-relay && \
git add r0/R0-1105-BY-report.md && \
git commit -m "r0: R0-1105-BY" && \
git pull --rebase --autostash origin main && \
git push && \
node scripts/claim.mjs R0-1105-BY done "split 2차 split:true 누락(앱 177·193) · layout Stack.Screen 미등록 · approval_code inputMode 없음"
```
