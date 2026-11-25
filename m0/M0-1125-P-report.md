PLAN READY

## 경로
- 계획서: `relay plans/partial-refund-plan-20261125.md`
- 워크트리: `~/projects/curiocity-relay-wts/M0-1125-P` (branch `docs/M0-1125-P-partial-refund-plan` · commit `1be396d6d` · 로컬만 · push 는 러너 소관)

## 출발점
- M3-1125-N 리포트(`m3/M3-1125-N-report.md`) 의 "필요 서버 API 명세" 3항목(①qris-cancel M0-1125-K 소관 · ②draft order void · ③Close as partial refund + refund_in_progress 플래그) 을 받아 **돈 안전 + 재사용성** 관점으로 확장.
- 원장 Kyu 14:21 원문(P2 cancel+refund · P3 continue/close) 보존.

## 계약 표 요약 (쉬운 말)

| 상황 | 캐셔가 누르는 버튼 | 부르는 서버 | 성공 응답 `status` |
|---|---|---|---|
| 일부만 받았는데 취소 | [Cancel & refund] (매니저 PIN) | **기존** `POST /void` **에 draft 분기 추가** | `canceled_full_refund` · 돈 반환 · draft 삭제 |
| QRIS 환불 실패 재시도 | [Continue refund] | **기존** `POST /refund-retry` (변경 0 · 응답에 `status` 필드 명문화만) | `refund_completed` 또는 `refund_partial` |
| 돈 일부 돌려주고 종결 | [Close as partial refund] (매니저 PIN · 금액 재확인) | **신규** `POST /close-partial-refund` | `closed_partial` · 추가 돈 이동 없음 |
| My Orders 카드 리스트 | — (자동 로딩) | **신규** `GET /orders/in-progress` (draft-orders ∪ refund-partial) | `items[].kind = 'payment_in_progress' \| 'refund_in_progress'` |

응답 통일: 200 + body `status` 필드 (PR #438 qris-cancel 패턴 재사용). 4xx 는 서버/입력 오류·돈 안전 거절 전용.

**금전 수단별 환불 경로** (P2 Cancel & refund 모달):
- CASH → `refundPaymentWorkflow` 장부 기록 + `cash_movement(-amount)` + 서랍 open · **매니저 PIN 필수**
- CARD → EDC 단말에서 REFUND 승인 선행 → 캐셔가 6자리 승인번호 입력 → 서버 장부 기록 · 서랍 X
- QRIS → Xendit `/v3/refunds` 선행 (all-or-nothing) → 성공 시 장부 기록 · 실패 시 `qris_refund_rejected` 로 중단 (fallback 가이드 노출)

## Kyu 결정 필요 항목 (3개 · 쉬운 말)

**Q-A · 경로 선택**: 일부 받은 주문 취소 + 환불 기능을 **① 지금 있는 `/void` 엔드포인트를 늘리는 쪽** vs **② 완전히 새 엔드포인트 (`DELETE /draft-orders/:id`) 를 만드는 쪽** — 어느 쪽이 좋나?
- M0 추천 = **① /void 확장**. 이유: 환불·cash_movement·영수증·loyalty 회수 코드가 이미 전부 `/void` 안에 돌고 있어 draft 삭제 호출 1개만 끼우면 됨. 새로 만들면 95% 가 중복 코드.

**Q-B · CASH 환불할 때 매니저 PIN 요구할까?**
- M0 추천 = **네**. 기존 `/void` · `/refund` · `/return` 과 똑같이 CASH 가 있으면 PIN 필수. QRIS·CARD 만이면 PIN 생략. 기존 규칙과 일관.

**Q-C · "Close as partial refund" 눌렀을 때 주문 자체는 어떻게 되나?**
- 선택지:
  - (a) 주문도 **canceled** 로 바뀜 (품목은 이미 손님이 받았는데 "취소" 로 기록 → 회계상 이상)
  - (b) 주문은 **완료 상태 유지**, return 만 `status=closed_partial` 로 종결 → "주문은 성립 · 환불은 부분 종결" 이 회계상 깔끔
- M0 추천 = **(b)**. 품목이 손님 손에 간 이상 주문 자체는 성립. 돌려준 돈만 기록하고 return 만 닫음.

## 라운드 분할 (plan 승인 후 바로 착수 가능)
- R1 (30m · docs) · R2 (45m · void draft 분기 + withOrderLock) · R3 (30m · /orders/in-progress 신규) · R4 (30m · /close-partial-refund 신규) · R5 (30m · /refund-retry status 필드) · R6 (45m · M3 handoff).
- 각 라운드 **독립 PR + 테스트 녹색** 전제.

## 리스크 요점
- R-1 · `is_draft_order=true` + `paid_so_far>0` 주문의 order.status 가 "draft" 인지 "pending" 인지 미확증 → `deleteDraftOrdersWorkflow` validate 거절 가능. R2 선행 로컬 테스트로 확증 필수.
- R-2 · `/void` 가 webhook race 중 draft 삭제와 경합 가능 → `withOrderLock` 로 감싸고 삭제 직전 fresh 재조회.
