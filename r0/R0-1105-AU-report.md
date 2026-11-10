# R0-1105-AU — Review · storeport #206 (Delivery 배송지·받는 사람 연락처 서버 계약)

**판정: CHANGES — 단독 배포 금지 (§4 하위 호환 · 앱 M3-1105-AC 동시 배포 필수)**  
코드 자체는 올바름 · CI 초록 · 하지만 현재 앱이 `delivery` body를 보내지 않아 단독 배포 시 delivery 결제 전량 400.

---

## §1 CI 결과

```
pos-integration        PASS  2m10s
markers-and-forbidden  PASS  8s
changes-filter         PASS  6s
check                  PASS  13s
docker-smoke-*         SKIP  (Dockerfile 변경 없음 · nightly 별도 workflow)
```

- `pos-integration` PASS: **#26 갱신 · #44 · #45 · #45a · #45b · #45c · #46 모두 초록**.
- 기존 43개 회귀 없음 (CI 2m10s 완주).
- **판정: 초록.**

---

## §2 매핑 확인

| 계약 항목 | 구현 위치 | 결과 |
|---|---|---|
| `recipient_name` → `first_name` (last_name=null) | `tenders/route.ts:533–545` `updateOrderAddresses` | ✅ |
| `phone` → `phone` | 동 위치 | ✅ |
| `address_lines[0]` → `address_1` | `tenders/route.ts:535–537` | ✅ |
| `address_lines[1..]` → `address_2` (`\n` join) | `tenders/route.ts:538–541` | ✅ |
| `country_code` 변경 0 | 코드가 `country_code` 필드를 아예 넘기지 않음 (코멘트 명시) | ✅ |
| `updateOrderAddresses` 사용 (직접 SQL 없음) | `tenders/route.ts:533` `await (orderModule as any).updateOrderAddresses([...])` | ✅ |
| `metadata.delivery` 미러 | `tenders/route.ts:448–461` | ✅ |

`updateOrderAddresses` 실패는 **non-fatal** (console.warn) — metadata.delivery가 M3 앱의 실운영 SoT · shipping_address는 Admin UI 자동 표시용. 결제는 성공 직전 단계이므로 허용 설계.

---

## §3 검증 로직

| 조건 | 400 메시지 | 위치 |
|---|---|---|
| `order_type='delivery'` + `body.delivery` 없음 | `delivery is required for order_type='delivery' and must be an object with recipient_name, phone, address_lines` | `validateDeliveryBody:71` |
| `recipient_name` 누락/빈문자 | `delivery.recipient_name is required (non-empty string)` | `:82` |
| `phone` 형식 불량 | `delivery.phone must be a valid phone number (e.g. +62…, 08…, 8-15 digits)` | `:100` |
| `address_lines` 빈 배열 또는 >6 | `delivery.address_lines must contain between 1 and 6 non-empty strings` | `:116` |

**phone 규칙 구현 (tenders/route.ts:91–97):**
```ts
/^\+?62[0-9]{8,14}$/.test(phoneDigits)  // +62 형식
|| /^0[0-9]{8,13}$/.test(phoneDigits)   // 08xxx 형식
|| /^\+?[0-9]{8,15}$/.test(phoneDigits) // 8~15 자리 범용
```
`[\s\-()]` strip 후 검증 → 가볍게 인도네시아 형식. 계약과 일치 ✅.

**400 이면 paymentCollection 0건 (orphan 가드):**  
`validateDeliveryBody` 호출 위치 (`tenders/route.ts:330`) 는 "--- 1) Create/Reuse PaymentCollection ---" 주석보다 **앞**. 400 return 시 paymentCollection 생성 도달 불가 → orphan 0 ✅. #45 CI에서 실증.

**takeaway/pickup + delivery 동반 → 무시:**  
`if (effectiveOrderType === "delivery")` 가드로 delivery 외 타입에서는 `validateDeliveryBody` 자체를 호출하지 않음 ✅. #46 CI에서 실증.

---

## §4 하위 호환 · 머지 순서 (핵심) ⚠️

### Fork 앱(pos-r0 master) 그렙 결과

```
pos-r0/app/checkout/tender-cash/[draftOrderId].tsx:98–107
```

```ts
const tender = await createTender.mutateAsync({
  order_id: draftOrderId,
  provider_id: PROVIDER_CASH,
  input: { received_amount: receivedAmount },
  order_type: resolvedType,          // 'delivery' 가능
  // ← delivery body 없음
  ...(resolvedType === 'preorder' && !isBalanceFlow
    ? { preorder: { ... } }
    : {}),
});
```

Card EDC 경로(`tender-cash/[draftOrderId].tsx:118–128`)도 동일 — `delivery` body 없음.

**판정: `#206 단독 배포 시 앱 delivery 결제가 깨짐`**  
현재 앱에서 `order_type='delivery'` 로 tenders POST 시 delivery body가 없으므로, #206 배포 즉시 모든 delivery 결제에서 서버가 400 반환.

### 권장 머지 순서 (1개)

**앱 M3-1105-AC (delivery 주소 입력 UI + tenders body) 완료 후 #206과 동시 배포.**  
서버와 앱을 같은 Railway deploy cycle에 묶으면 중간 상태 없이 전환 가능. grace 모드 추가는 "차후 삭제를 잊을 위험" 이 있어 불채택.

---

## §5 #205(fulfill · M0-1105-Y) 파일 겹침·충돌 여부

| 파일 | #205 | #206 | 상태 |
|---|---|---|---|
| `integration-tests/pos/tenders.spec.ts` | ✅ 변경 (#39~#43 추가) | ✅ 변경 (#26 갱신 · #44~#46 추가) | **충돌 가능** |
| `src/api/admin/pos/orders/[id]/fulfill/route.ts` | ✅ | — | 겹침 없음 |
| `src/api/admin/pos/orders/[id]/tenders/route.ts` | — | ✅ | 겹침 없음 |
| `src/api/admin/pos/orders/[id]/route.ts` | — | ✅ | 겹침 없음 |
| `src/modules/receipt/service.ts` | — | ✅ | 겹침 없음 |
| `medusa-config.ts` | ✅ | — | 겹침 없음 |

**충돌 세부:**  
두 PR 모두 `tenders.spec.ts` 의 같은 위치(기존 테스트 블록 끝 `expect(hit).toBeFalsy()` 직후)에 append. 머지 순서에 따라 git merge conflict 발생 · 그러나 양쪽 추가가 비겹침이므로 trivially resolvable (두 블록 순서대로 나열).

**영수증 snapshot delivery 블록:**  
`receipt/service.ts` 에 `delivery: input.order.delivery ?? null` 추가 ✅. #44 CI에서 `rcpt.data.receipt.snapshot.delivery.recipient_name` 실증.

**`metadata.delivery.stage` 키 일관성:**  
`awaiting_dispatch` / `dispatched` 값이 #200(M0-1105-T)부터 일관 사용 · #206이 그대로 계승 ✅. #205(fulfill/route.ts)도 `dispatched` 값 유지.

---

## §6 판정 (영어)

**CHANGES — do not merge standalone; requires coordinated deploy with M3-1105-AC.**

The implementation is correct: CI green (pos-integration PASS 2m10s, all 7 new/updated tests pass), mapping matches spec (`updateOrderAddresses` with `first_name=recipient_name`, `address_1=address_lines[0]`, `address_2=address_lines[1..].join('\n')`, no `country_code` mutation, no raw SQL), 400 guard fires before `paymentCollection` creation (orphan=0 verified by #45), takeaway+delivery ignored (#46), English error messages match the contract table.

**Blocking issue — backward compatibility:**  
`pos-r0/app/checkout/tender-cash/[draftOrderId].tsx:98–107` and `:118–128` send `order_type: 'delivery'` without a `delivery` body. After #206 ships to server, every delivery payment from the current app returns `400 delivery is required…`, breaking delivery orders entirely.

**Required action before merge:**  
Ship app M3-1105-AC (delivery address input + `delivery` body in tenders POST) in the same deploy cycle as #206. No code change needed in the server PR itself — this is a deployment gate, not a code defect.

**Minor (non-blocking):**  
`tenders.spec.ts` will conflict with #205 if that merges first; trivially resolvable by appending both addition blocks in order.

---

## 재실행 로그

```
git -C ~/projects/storeport fetch origin                      # OK · origin/feat/m0-1105-z-delivery-address
gh pr checks 206 --repo CuriocityDevAi/storeport              # pos-integration PASS · all checks green
grep createTender pos-r0/app/checkout/tender-cash/...tsx       # delivery body 없음 확인
git diff origin/main...origin/fix/m0-1105-y-fulfill-provider   # #205 파일 목록 확인
```

---

*R0-1105-AU · 2026-11-10 · claude-sonnet-4-6*
