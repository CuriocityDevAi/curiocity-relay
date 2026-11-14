# R0-1105-DZ — storeport #248 리뷰 리포트

**판정: CHANGES · 수정 항목: 3**

---

## REQ 1 · 가드 조건부 해제 — §3-2 표 대사 ✓

| 조합 | 계획서 §3-2 | 코드 |
|------|------------|------|
| 1차 tender · QRIS (split) | ✓ 허용 | activeTenders 가 비어있어 lastActive=undefined → 가드 미발동 ✓ |
| 1차 CASH/CARD captured + 2차 QRIS | ✓ 허용 | lastActive.method !== "qris" → 가드 미발동 ✓ |
| 1차 QRIS **PENDING** + 2차 any | ✗ 409 `qris_pending_cannot_split_next` | lastActive.method==="qris" && status!=="captured" → 409 ✓ |
| 양쪽 QRIS (1차 captured 뒤 2차) | ✓ 허용 | 1차 paid 웹훅 후 lastActive.status="captured" → 가드 미발동 ✓ |

- **S1 (max 2)**: `tenderCountBefore = activeTenders.length` (captured/pending only) → 회귀 없음 (`tenders/route.ts` 가드 391 행)
- **S4 (preorder 배타)**: `splitMode && effectiveOrderType === "preorder"` 가드 — 이번 PR 미변경 ✓
- 파일:줄: `tenders/route.ts` QRIS 가드 블록 (diff +391~+404), activeTender 필터 (+457~+467)

---

## REQ 2 · metadata.tenders append 순서 · 중복 엔트리 위험 ✓

**CASH/CARD → captured 선 append (short-circuit 직전)**
- QRIS 경로: `payment_session` 생성 → `payment_request_id` 확보 → **metadata.tenders append (status="pending")** → `pending` 응답 반환. 순서 정확 (`tenders/route.ts` QRIS short-circuit 블록, diff +513~+581).
- CASH/CARD 경로: 동기 capture 완료 후 append (status="captured", diff +1148~+1155). 순서 정확.

**중복 엔트리 방지**
- QRIS `alreadyIdx = existingTenders.findIndex(t => t.payment_collection_id === pc_id && status ∉ {expired, failed})` → 같은 PC 로 재시도 시 upsert (append 아님). ✓
- CASH/CARD 동일 패턴 (diff `alreadyIndex` 블록). ✓
- 완전히 새 PC 가 겹치는 동시 요청 경쟁(TOCTOU)은 이 PR 이전부터 있는 구조적 선행 문제 (metadata 업데이트가 비원자적). 이번 PR 에서 신규 도입된 위험은 아님.

**후방 호환 (status 필드 없음=captured)**
- `activeTenderStatus(t) = typeof t?.status === "string" ? t.status : "captured"` ✓

---

## REQ 3 · expired 후 늦은 paid 웹훅 → 초과 결제 경로 ⚠️ **CHANGES**

**경로 재현**
1. 1차 QRIS 50k → `payment.expired` 웹훅 → `metadata.tenders[0].status = "expired"`
2. 2차 CASH 100k (non-split) → captured → `is_complete=true` · 영수증 발행 · draft→order 전환 완료
3. (이후) Xendit 이 같은 `payment_request_id` 로 `payment.capture` 웹훅 발송 (손님이 만료 직전 스캔, 뱅킹 네트워크 지연 결제 완료)
4. `hooks/payment/xendit/route.ts` paid 핸들러에서 `matchIdx` 로직:
   ```
   matchIdx = findIndex(t => t.payment_collection_id === collectionId
                          || t.payment_request_id === paymentRequestId)
   → expired 엔트리 매칭됨 (index 0)
   → status !== "captured" 조건: "expired" !== "captured" → TRUE
   → nextTenders[0].status = "captured" 으로 덮어씀
   ```
5. `capturedSum` = 50k (qris:expired→captured) + 100k (cash:captured) = **150k**
6. `grandTotal` = 100k → `capturedSum >= grandTotal` → `is_order_complete = true`
7. **`createReceiptForOrder` 재호출 → 영수증 중복 발행** (기존 `receipt_id` 존재 여부 비체크)

**왜 7a58622 커밋은 이 버그를 막지 못하나**
7a58622 의 fix 는 `tenders/route.ts` 의 **append 경로** (새 tender 생성 시 같은 PC 의 expired 엔트리를 overwrite 하지 않게)에 적용됨. 웹훅 핸들러(`hooks/payment/xendit/route.ts`)의 paid 블록 `matchIdx` 조건에는 `expired` 제외 로직이 없다.

**수정 지점 · 최소 변경**
`hooks/payment/xendit/route.ts` paid 핸들러 (diff `+matchIdx` 블록, 현재 조건: `matchIdx >= 0 && mdTenders[matchIdx]?.status !== "captured"`):

```typescript
// BEFORE
if (matchIdx >= 0 && mdTenders[matchIdx]?.status !== "captured") {

// AFTER — expired/failed 엔트리는 paid 로 소생 금지
if (
  matchIdx >= 0 &&
  mdTenders[matchIdx]?.status !== "captured" &&
  mdTenders[matchIdx]?.status !== "expired" &&
  mdTenders[matchIdx]?.status !== "failed"
) {
```

또는 `is_order_complete` 산출 직전에:
```typescript
// capturedSum 이 grandTotal 초과 = late-paid 역주행 · 영수증/convert skip
is_order_complete = grandTotal > 0 && capturedSum >= grandTotal &&
  capturedSum <= grandTotal + 1; // 1원 오차 허용; 초과시 로그만
```

전자(match 조건 필터)가 더 명확. `convertDraftOrderWorkflow` 는 `is_draft_order` 체크로 멱등 보호되지만, `createReceiptForOrder` 에는 없으므로 **영수증 중복은 실제 위험**임.

---

## REQ 4 · 웹훅 paid 블록 — 중간 tender 영수증·전환 차단 ✓

**is_complete 게이트**
```
capturedSum = Σ nextTenders.filter(t => t.status==="captured").amount
is_order_complete = grandTotal > 0 && capturedSum >= grandTotal
receipt / convert → is_order_complete=true 블록 안에서만
```
- 1차 QRIS paid (BS-c): capturedSum=50k < 100k → `is_order_complete=false` → 영수증 없음 ✓
- 2차 QRIS paid (BS-c): capturedSum=100k = 100k → `is_order_complete=true` → 영수증 발행 ✓
- BS-b 1차 QRIS paid 단독: `is_order_complete=false` ✓

**매칭 키 정확성**
`payment_collection_id` 우선 · `payment_request_id` 폴백 — QRIS tender 엔트리에 양쪽 필드 모두 저장됨 (`qrisTenderDetail.payment_collection_id` + `.payment_request_id`). 운용 중 PC 없는 레거시 엔트리는 PR_ID 로 폴백 가능. ✓

**7a58622 (terminal entry 보존) 타당성**
expired/failed tender append 시 같은 PC 의 terminal 이력을 덮어쓰지 않고 새 entry 로 추가. metadata.tenders 의 이력 연속성 보존 — 타당. 커밋 메시지 근거 충분. ✓

---

## REQ 5 · pnpm test:integration:pos + CI · BS-a..d 단정 강도 ✓

**CI 결과 (head 7a58622)**
| job | 결과 |
|-----|------|
| pos-integration | SUCCESS ✓ |
| unit-commerce-core | SUCCESS ✓ |
| markers-and-forbidden | SUCCESS ✓ |
| feature-map-check | SUCCESS ✓ |
| docker-smoke-* | SKIPPED (무관) |

로컬 직접 실행 불가 환경이나 CI pos-integration 통과 확인.

**BS-a..d 단정 강도**
| 케이스 | 검증 항목 | 강도 |
|--------|----------|------|
| #BS-a | webhook 응답 `is_order_complete/receipt_id/converted` + metadata.tenders 2건 all captured + `metadata.receipt_id` 일치 | 강 ✓ |
| #BS-b | 409 가드 (`qris_pending_cannot_split_next`) + 1차 paid 후 `is_order_complete=false` + 2차 CASH 완결 `is_complete/receipt_id` | 강 ✓ |
| #BS-c | 1차 paid `is_order_complete=false·receipt=null` + 2차 paid `is_order_complete=true·receipt truthy` + `prId2 !== prId1` | 강 ✓ |
| #BS-d | expired 웹훅 후 metadata `status=expired` + CASH 100k non-split 완결 + metadata.tenders[0]=expired·[1]=captured | 강 ✓ |

이름만 맞고 단정이 약한 케이스 없음. `xenditFetchCalls` mock 으로 실 Xendit API 0건 보장, 네트워크 의존 없음. ✓

---

## 종합

| REQ | 판정 |
|-----|------|
| 1 (가드 §3-2) | PASS |
| 2 (append 순서 · 중복) | PASS |
| 3 (expired late-paid overpay) | **FAIL** |
| 4 (웹훅 is_complete 게이트) | PASS |
| 5 (CI + 테스트 강도) | PASS |

**CHANGES: REQ 3** — `hooks/payment/xendit/route.ts` paid 핸들러의 `matchIdx` 조건에 `status ∉ {expired, failed}` 필터 추가. 영수증 중복 발행 방지.
