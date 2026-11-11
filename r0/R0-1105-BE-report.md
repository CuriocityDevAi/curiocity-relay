# R0-1105-BE 리뷰 리포트

원장 대사: M0-1105-AG-report.md · M1-1105-AN-report.md · ledger/decision-delivery-ui-20261110.md #2·#3

---

## 판정

| PR | 판정 | 한 줄 |
|---|---|---|
| storeport #209 | **APPROVE** | 가드 위치·키 일치·회귀 전부 OK · CI 미확인(API 403, 머지 전 초록 필요) |
| fork #83 | **APPROVE** | orderStatusLabel 재사용·토큰 일치·4조합 스샷·충돌 없음 전부 OK |

---

## 체크 표

### ① storeport #209 · delivery courier 가드

| 항목 | 결과 | 근거 |
|---|---|---|
| 주문 종류 판정 위치 = 실제 저장 위치 | ✅ | `order_type = order.metadata.order_type`; body.method 무관 |
| 검사가 재고·예약·상태 변경보다 앞 (400 시 부작용 0) | ✅ | guard → idempotency가드 → method검증 → 재고차감 → completeOrder 순서; 400 시 즉시 return |
| takeaway 회귀 | ✅ | spec #5 takeaway hand_over → 200; 가드 조건 `=== "delivery"` 만 |
| preorder 회귀 | ✅ | 가드 미적용; preorder 흐름 불변 |
| 앱 FulfillSheet courier 키 ↔ 서버 읽는 키 일치 | ✅ | 앱: `courier: method === 'delivery' ? courier : undefined` → 키 `courier`; 서버: `body.courier` |
| CI 초록 | ⚠️ 미확인 | PR check runs API 403; PR body `[ ] CI pos-integration` 미완료. typecheck/unit 로컬 pass |
| main(#207 머지됨) 충돌 | ✅ 없음 | #207 변경 파일: void/refund/manager-pin/tenders.spec; #209 변경 파일: fulfill/route.ts + fulfill-delivery-guard.spec.ts (신규). 파일 겹침 없음. mergeable_state=unknown 은 GitHub 연산 지연 |

### ② fork #83 · orderStatusLabel 적용

| 항목 | 결과 | 근거 |
|---|---|---|
| orderStatusLabel 재사용 (규칙 복제 X) | ✅ | `import { orderStatusLabel } from '@/lib/order-status-label'`; lib 미변경 |
| 목록 칩과 같은 토큰 | ✅ | orders.tsx·[orderId].tsx `statusLabelTone` 동일 (bg-warning-soft/text-warning · bg-success-soft/text-success · bg-surface-muted/text-ink-muted) |
| 4조합 스샷 | ✅ | 01-awaiting-dispatch · 02-awaiting-pickup · 03-deposit-paid · 04-completed; Playwright 8/8 pass |
| master(#77 #80 #81 #82 머지됨) 충돌 | ✅ 없음 | #80 commit 메시지 "app/orders/** 미수정(파일 주인 보호)" 명시; #81 run-all 정비; #82 EAS owner. `[orderId].tsx` 겹침 없음 |
| 번들 안전 | ✅ | `orderStatusLabel` 이미 orders.tsx 번들 내; `clx` 이미 존재; 신규 heavy dep 없음 |

---

## 실행 로그

```
PR #209 storeport · 변경 파일 2개:
  - apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts (+30)
  - apps/commerce-core/integration-tests/pos/fulfill-delivery-guard.spec.ts (신규 +248)

가드 삽입 위치 (route.ts line ~264):
  order fetch → order_type/stage 선언 → delivery courier 가드(400) → idempotency 가드 → method 검증 → 재고차감

spec 5건:
  #1 delivery·courier 생략 → 400 · inventory/reservation 불변
  #2 delivery·courier 공백 → 400
  #3 delivery·stage=hand_over·courier 생략 → 400
  #4 delivery·courier 있음·hand_over → 200·fulfilled·completed·재고 -1
  #5 takeaway·hand_over → 200 (회귀)

PR #83 fork · 변경 파일 3개:
  - app/orders/[orderId].tsx (+26 / -1)
  - scripts/m1-1105-an-assertions.mjs (신규 +121)
  - scripts/m1-1105-an-screenshots.mjs (신규 +224)

OrderStatusLabel 컴포넌트: orderStatusLabel() 호출 → statusLabelTone 매핑 → chip
assertions 17/17 · vitest 13/13 · playwright 8/8 (4장)
```

---

## 착지 명령

```bash
cp /tmp/R0-1105-BE-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-BE-report.md && git commit -m "r0: R0-1105-BE" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-BE done "storeport#209 APPROVE(CI미확인·머지전초록필요) · fork#83 APPROVE"
```
