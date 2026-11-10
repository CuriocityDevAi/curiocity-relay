# R0-1105-AZ — 리뷰 리포트
# storeport #208 · 품목(수량) 단위 부분 환불 + 재고 되돌리기 (M0-1105-AC · stacked on #207)

**claim**: started 2026-11-10 · R0-1105-AZ  
**PR**: https://github.com/CuriocityDevAi/storeport/pull/208  
**branch · HEAD**: `feat/m0-1105-ac-return-partial` · `ee3770b`  
**리뷰어**: R0 (엄격)  
**판정**: **CHANGES** (2 required · 1 minor)

---

## 실행 로그

- CI 미실행: stacked PR (base = `feat/m0-1105-ab-void-refund-pin` / #207) → `pull_request: branches: [main]` 트리거 미발화. M0-1105-AC-report 에서 로컬 typecheck EXIT=0 · lint 통과 확인됨.
- 로컬 통합 테스트 미실행: `.env.test` 미존재 · postgres 연결 불가 · docker 미설치. **코드·테스트 정독으로 판정** (CI 미실행 명시).
- storeport 클론 `origin/feat/m0-1105-ac-return-partial` fetch · route.ts (614줄) 전문 + tenders.spec.ts diff 전문 + manager-pin.ts 헬퍼 전문 정독.
- PR 코멘트 제출: GitHub MCP `pull_request_review_write` → COMMENT (자기 PR → REQUEST_CHANGES 불가 → COMMENT 대체). 인라인 코멘트 4개(hashReturnItems:74-81, guard A:181-191, stockLocationId:295-300, test#52:2800-2860).

---

## 판정 상세

### [CHANGES 1 — CRITICAL] 해시 가드가 합법적인 분할 반품을 차단
**위치**: `route.ts:74-81` (hashReturnItems) · `route.ts:181-191` (guard A) · `tenders.spec.ts` test #52

**문제**: `hashReturnItems` 는 `line_item_id:quantity` 조합만 해시. qty=2 품목을 qty=1 씩 두 번 반품하면 두 요청 모두 같은 해시 → 첫 번째 성공 후 두 번째는 409.

**재현**:
1. Order: Pastry × qty 2 (unit 60k = total 120k)
2. Return 1: `items:[{line_item_id:"orli_A", quantity:1}]` → hash `"abc..."` → 200 OK, 저장
3. Return 2: `items:[{line_item_id:"orli_A", quantity:1}]` → hash `"abc..."` → **409** (guard A 발동)

M0-1105-AC §5 `두 번 나눠 반품 (qty 1 → qty 1) · 누적 OK` 미충족.

**테스트 모순**: test #52 이름 `"두 번 나눠 반품 · 누적 OK · 두 return_id 서로 다름"` 이지만 최종 assertion = `expect(caught.status).toBe(409)`. 이름·명세·코드 간 3중 모순.

**수정 방향** (택 1):
1. Guard A 제거 — Guard B(수량 누적) + `refundPaymentWorkflow` 내부 validator 로 충분
2. 해시에 "해당 line 에 대한 기존 반품 횟수" 포함하여 연속 반품 구분
3. 클라이언트 제공 `idempotency_key` 필드 사용

---

### [CHANGES 2 — MEDIUM] `stockLocationId` fallback 이 session ID 를 store ID 로 사용
**위치**: `route.ts` stockLocationId 선언부 (PIN 검증 직전)

```ts
const stockLocationId =
  (((order.metadata as any)?.stock_location_id as string | undefined) ??
    body.register_session_id) ||   // ← register_session_id 는 위치 ID 가 아님
  "default";
```

`order.metadata.stock_location_id` 가 없으면 `body.register_session_id` (`rs_01HXXX` 형태)를 storeId 로 사용. `verifyManagerPin({ storeId: "rs_01HXXX", pin })` → `HMAC(secret, "rs_01HXXX:2026-11-10")` 계산 → 어드민이 보여주는 PIN(실제 위치 ID 기반)과 불일치 → 모든 현금 반품 401.

**수정**: `body.register_session_id` fallback 제거. `"default"` 유지 또는 400 반환.

---

### [MINOR] 미사용 변수 `orderTotal`
**위치**: `route.ts` 금액 계산 섹션 (`const orderTotal = toNum(order.total)`)

선언 후 함수 전체에서 미참조 (line amount 계산은 `ori.total` 사용). 삭제.

---

## Non-blocking 메모 (코멘트에 포함)

- **동시 요청 409 TOCTOU**: Guard A 는 metadata persist(step 5) 전에 체크 → 동시 요청 2개가 모두 guard A 통과 가능. `refundPaymentWorkflow` 내부가 payment 중복을 막으나 재고 중복 복귀는 보호 안 됨. POS 단말 단수 운영상 위험 낮음 → 허용범위.
- **전액 소진 시 주문 상태**: `refundPaymentWorkflow` 가 refund row 를 쌓아 올리며 처리. #207 `/refund` 와 동일 패턴 → 수용.
- **fixture 키 일치**: 6개 fixture response 키 모두 `res.json(...)` 응답 shape 와 일치. ✓
- **금지 파일**: `fulfill/**` · `tenders/route.ts` 미수정. ✓
- **헬퍼 재사용**: `verifyManagerPin` · `RECEIPT_MODULE` · `REGISTER_SESSION_MODULE` · `POS_SETTINGS_MODULE` — #207 헬퍼 임포트, 복사 없음. ✓
- **#207 PIN 키 이름**: M0-1105-AD 가 수정 중 · 이 route 는 `verifyManagerPin` 호출만 하므로 자동 반영됨.

---

## 착지 명령

```bash
cp /tmp/R0-1105-AZ-report.md ~/projects/curiocity-relay/r0/ \
  && cd ~/projects/curiocity-relay \
  && git add r0/R0-1105-AZ-report.md \
  && git commit -m "r0: R0-1105-AZ" \
  && git pull --rebase --autostash origin main \
  && git push
```

claim done.
