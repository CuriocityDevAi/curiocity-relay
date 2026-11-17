PR #354 · Wing 픽업 설계서 · 신규 10 · 우회 7 · 코어 1

## PR
https://github.com/CuriocityDevAi/storeport/pull/354 — docs(plans): M0-1117-Q — Wing 픽업 예약 설계서 (대사표·상태·모델·API)

브랜치: `docs/M0-1117-Q-wing-pickup-plan` (origin/main 분기 · SHA 325c8bc)
PR 본문 첫 줄 "docs-only · 구현 아님" 반영 완료.

## 산출
`docs/plans/wing-pickup-reservation.md` 1개 신설 (+255 lines)

### 1. 대사표 집계 (코어 / 우회·재사용 / 신규)
- **코어 1**: F1 Product/Variant (Medusa v2 기본)
- **우회(재사용) 7**:
  - F2 레터링 metadata (pos-complete route 46-54)
  - F7 pickup_at 필드 (receipt service.ts:1 이미 보유)
  - F8 QRIS 선결제 — **Kyu W4 확정** · `payment_xendit` provider 재사용 (qris-simulate/route.ts:45 · webhook xendit/route.ts:69)
  - F9 WhatsApp 번호 식별 (find-customers-by-phone.ts:199 + phone-id.ts:25-60)
  - F10 취소 2일 전 17:00 (pos-void workflow NET · M0-1117-O)
  - F16 예약 재고 hold (pos-refund cancel-if-unshipped.ts:45-59 inventory reservation)
  - (F2가 레터링 UI 재사용 축에도 걸침) · 열거 7건
- **신규 10**:
  - F3 제품×날짜 cap · F4 예약 창 · F5 3구간 · F6 불가일
  - F11 미수령→폐기 상태전이 · F12 커스텀 사람 확인 · F13 대량 Rp 1M 룰
  - F14 WhatsApp 자동 발송 (care-agent attribution) · F15 Todoboss outbox 발사기 · F18 Wing 홈 UI
- **F17 배송 = 스코프 아님** (Kyu 23:44 · 픽업만)

### 2. 상태 흐름 11개
`draft_cart` → `auto_reserved` / `awaiting_human` → `pending_payment` → `paid` → `picked_up` / `no_show_held` → `disposed` + 부가 `cancelled` / `rejected` / `expired`.
상태 저장 = `order.metadata.pickup_state` (별도 모듈 없이 Medusa metadata + workflow step enforce).

### 3. 데이터 모델 4+1
- `pickup_reservation_cap` (stock_location_id · product_id · variant_id · date · cap_total · cap_reserved · source)
- `pickup_window_config` (stock_location_id · window_index 1|2|3 · start/end · capacity_per_window)
- `pickup_blocked_date`
- `pickup_disposal_log` (order_id · items_json · reason · disposed_at)
- `order.metadata.pickup_*` + `line_item.metadata.lettering_text`

### 4. API 초안 4 축
- Wing storefront `/api/wing/*` (products · availability · carts · pickup · checkout · qris-session · orders status · cancel)
- Commerce Core `/store/pickup/*` + `/admin/pos/pickup/hand-over` + `/admin/pickup/caps|windows|blocked-dates|human-review`
- CareAgent `apps/care-agent/src/{link,attribution,handoff}/**`
- Todoboss outbox: `commerce.order.*.v1` (#349) · 열린 질문 Q4 로 `inventory.transfer.*.v1` + `pickup.scheduled.v1` 추가 제안

### 5. 열린 질문 (Kyu 결정 필요 · 기술은 권장안으로 고정)
Q1 3구간 기본값 · Q2 구간별 상한 · Q3 자동 폐기 승인 UX · Q4 outbox v2 추가 · Q5 달력 '그 날' 숨김 vs 유도 · Q6 매장별 vs 단일 매장 · Q7 레터링 금지어·길이 · Q8 손님 조회 키.

### 6. 기술 결정 (권장안으로 고정 · 질문 아님)
- LLM = Claude Haiku (의도 파악)
- 매니저 경로 = 매니저 WhatsApp 단독 시작
- 자동답 승격 = 일치율 80% + Kyu 리뷰
- 가용성 = 규칙 기반(AI 금지)
- 언어 = 손님이 쓴 언어 그대로

## 라운드 분해(참고)
R1 pickup_slot migration + cap Admin → R2 Wing 그리드·달력 → R3 레터링 metadata → R4 Wing storefront QRIS(W5 cart 분기 뒤) → R5 사람 확인 flow → R6 미수령 cron → R7 Todoboss outbox → R8 손님 조회 UI

## 체크 리스트
- [x] docs-only (src 미변경 · lint-staged markdown 전용)
- [x] naming-check PASS
- [x] 테스트 523/523 PASS (pre-push hook)
- [x] `processes: [infra.docs-plans, wing.storefront, commerce-core.pickup-slot, care-agent.link-issuer]` 커밋/PR 본문 모두 포함
- [x] 뿌리 = Kyu 22:59 · 23:33 · 23:44 결정 + 노티드 조사
