#293 CHANGES · #292 APPROVE · 로컬 검증

## #293 — Customer 상세 요약·내역

### 통과
| 항목 | 결과 |
|---|---|
| `loyalty_earn` 저장 형식 (`applied?amount`) | ✅ `parseLoyaltyEarn`: `obj.applied ? Number(obj.amount)` — 형식 일치 |
| `loyalty_recover` 반영 | ✅ `Math.max(0, earned - recAmt)` 차감 |
| 테스트 — 실 line_item + 실 earnForOrder | ✅ T3·T4: `orderModule.createOrders` → `query.graph` 재조회 → `earnForOrder` 경유, 숫자 직주입 없음 |
| 인증 | ✅ `/admin/` 하위 — Medusa 프레임워크 auth 미들웨어 자동 적용 (기존 `/admin/pos/settings` 등 동일 패턴) |

### CHANGES — 취소·환불 주문 status 필터 누락
- **파일**: `src/api/admin/pos/customers/[id]/summary/route.ts:140`
- **내용**: `filters: { customer_id: customerId }` — `status` 필터 없이 모든 주문 조회 → 취소(`canceled`)된 주문이 `visit_count`·`total_revenue`에 합산됨
- **제안**: `status: ["completed", "returned"]` 추가, 또는 취소 포함이 의도라면 PR에 명시

PR 코멘트 게시 완료 (COMMENT 타입 — 자기 PR REQUEST_CHANGES 불가).

---

## #292 — 적립 토글 문구

### 서버 동작 대사 (`receipt-preview.ts:120-130`)
```
earn_on_balance_tender_only = FALSE → earnBase = total (전액 포함)
earn_on_balance_tender_only = TRUE  → earnBase = paidOtherAfterRefund (현금/카드분만)
```

새 문구 `"Don't earn points on the store-credit part"` — TRUE(ON) 시 적립금 사용분 제외를 정확히 설명. ✅

서버 코드(`receipt-preview.ts`, `earn.ts`) 변경 없음 — UI 텍스트 4줄만 수정. ✅

PR 코멘트 게시 완료 (COMMENT 타입 — 자기 PR APPROVE 불가).
