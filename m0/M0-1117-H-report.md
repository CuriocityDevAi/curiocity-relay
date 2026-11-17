라운드 12개(서버 8 · POS 4) · 신규 API 3 · Kyu 질문 3 · PR #330

# M0-1117-H 리포트 — 포인트 마이너스(빚) · 차감 환불(NET) 계획서

- 티켓: M0-1117-H · 실행 2026-11-17 · 허브 cwd `~/projects/storeport` → 전용 워크트리 `M0-1117-H-wt` 로 docs-only 작업 격리
- 산출물: `docs/plans/loyalty-negative-balance.md` (294줄 신설 · 코드 변경 0)
- PR: https://github.com/CuriocityDevAi/storeport/pull/330 (`docs/m0-1117-h-loyalty-negative-balance-plan` · 커밋 `9b53f2c`)
- 연관: #321 (M0-1116-AV · /refund QRIS) · #329 (M0-1117-G · Simulate 환불) · 선행 동반 예정 `docs/plans/customer-link-unify.md`
- 사용 시간: 약 20분 (40분 상한 · 중간 리포트 push 포함)

## 결론 (한 줄)
계획서 1개로 서버 8 라운드 + POS 4 라운드 + 신규 API 3 개 (`PATCH`/`DELETE /admin/pos/orders/:id/customer` · `GET /admin/loyalty/negative-events`) + 환불 응답 계약 확장 1 건으로 분해. Kyu 결정 3개(① 마이너스 표현 side-car ledger ② NET 2-phase confirm ③ Tender 순서 현금→QRIS→카드) 승인 후 라운드 집행.

---

## [REQ-1] 현재 구조 대사표 (파일:줄)

| 영역 | 정의 | 호출처 | 비고 |
| --- | --- | --- | --- |
| earn | `apps/commerce-core/src/lib/loyalty/earn.ts:131` | subscriber `loyalty-earn-on-paid.ts:83` · `link-customer-order.ts:318` · POS 연결 route `customer/route.ts:25` | `receipt-preview.ts:118–142` 공식 · 멱등 `loyalty_earn.ref` |
| redeem | 전용 라우트 없음 · `receipt-preview.ts:76–85` tender 계산 | 결제 시트 | `creditUsed ≤ creditBalance` cap (음수 불가) |
| recover | `lib/loyalty/recover.ts:93` | `/refund` route `705–709` **만** (void 미호출) | `recover.ts:219–222` 에서 `Math.max(0, min(requested, balanceBefore))` + `uncollected` 를 `order.metadata.loyalty_recover.entries[]` 로 기록 — **손님-레벨 "빚" 미집계** |
| 잔액 저장 | `@medusajs/loyalty-plugin` store_credit (`container.resolve("store_credit")`) · unsigned running balance | — | 자체 ledger view 없음 |
| /refund | `api/admin/pos/orders/[id]/refund/route.ts:89–746` | — | 멀티-tender · provider_id 접두어로 method · QRIS 선행 환불 (M0-1116-AV) |
| /void | `api/admin/pos/orders/[id]/void/route.ts:83–828` | — | **recover 미호출 공백** |
| 손님 연결 | `POST /admin/pos/orders/:id/customer` → `link-customer-order.ts` (upsert + 완료주문이면 earn) | — | **PATCH/DELETE 없음 · 스펙 문서 없음** |
| tender 식별 | `pp_cash_*`/`pp_edc_*`/`pp_xendit_qris_*` → cash/card/qris | refund/void route 76–81 | — |
| 감사 로그 | `modules/loyalty_settings/models/loyalty-audit.ts` | 일반 audit | negative 이벤트 재사용 or 별도 모델 (plan §3.8 = 별도 모델) |

## [REQ-2] 코어 vs 우회 vs 신규

- 코어로 될 것: 적립·사용·잔액 CRUD (`store_credit` plugin 메서드)
- 우회로 돌아감: recover 의 `uncollected` 주문-레벨 기록만
- **신규 필요**:
  - `loyalty_negative_balance` (customer 1:1 · signed balance) + `loyalty_negative_event` (append-only 이벤트 로그 · 멱등 ref)
  - NET preview 함수 `previewRecoverForOrder`
  - earn 안의 offset 분기
  - receipt-preview 유효 잔액 계산 + 사용 차단 플래그
  - void 에 recover 편입
  - 손님 연결 PATCH/DELETE 라우트
  - 운영 리포트 Admin list/summary

판정: **store_credit plugin fork 금지** (CLAUDE.md Q4 · 코어 fork 금지) → side-car ledger 가 유일한 안전한 길.

## [REQ-3] 설계 (요약 · 상세는 PR 문서 §3)

1. 마이너스 잔액 = side-car ledger · plugin 불변 · 유효 잔액 = plugin − negative
2. NET 환불 계산 = `refund_amount − shortfall` · shortfall > refund_amount 면 net=0 + 차액 negative 이월
3. Tender 우선순위 = 현금 → QRIS → 카드 (PSP 수수료/리스크)
4. 부분 환불 = `floor(earned × refund/total)` 유지 + 같은 NET 규칙
5. Earn offset = `min(creditEarned, negative)` plugin credit **직전** 차감 + `offset:<earn_ref>` 이벤트
6. 사용 차단 = `receipt-preview` effective_balance cap 0 + POS UI disable
7. 손님 연결 PATCH/DELETE = earn 전액 회수 요청 → 부족분 negative 이월 (`unlink_debt` | `patch_debt`)
8. 운영 리포트 = `loyalty_negative_event` 를 그대로 데이터 원천으로
9. 멱등 = `recover:<order>:<refund_ref>` · `unlink:<order>:<ts>` · `patch:<order>:<A>:<B>:<ts>` · `offset:<earn_ref>` (unique)
10. 동시성 = `SELECT FOR UPDATE` on negative_balance row + 기존 earn 멱등 플래그 유지

## [REQ-4] 환불 응답 계약 확장 (하위 호환)

기존 필드 유지 + 추가:
`original_refund_amount` · `points_shortfall` · `net_refund_amount` · `negative_balance_after` · `tender_adjustments[]` (method/original/adjusted/shortfall_applied) · `confirm_required`

**2-phase**: `body.preview=true` (dry-run · DB 미변경) → POS 확인 → `body.confirmed=true + preview_ref=<Idempotency-Key>` (commit)

Tender 차감 순서 기본값: 현금 → QRIS → 카드 · POS 에서 `tender_adjustments` 명시로 override

## [REQ-5] 작업 분할

### 서버 8 (M0 · 각 30~45분)
| # | 범위 | 주인 파일 | 선행 |
| --- | --- | --- | --- |
| S1 | migration · negative ledger 모듈 | `modules/loyalty_negative/**` · `migrations/*.ts` | — |
| S2 | `recoverForOrder` → shortfall 이월 | `lib/loyalty/recover.ts` | S1 |
| S3 | `earnForOrder` → offset | `lib/loyalty/earn.ts` | S1 (S2 와 병렬) |
| S4 | `previewRecoverForOrder` + /refund 계약 | `lib/loyalty/preview-recover.ts` · `/refund/route.ts` | S2 |
| S5 | /void 에 recover 편입 | `/void/route.ts` | S4 |
| S6 | 손님 연결 PATCH/DELETE | `/customer/route.ts` · `link-customer-order.ts` | S2 |
| S7 | receipt-preview 유효 잔액 + 차단 | `lib/loyalty/receipt-preview.ts` | S1 |
| S8 | Admin negative-events list/summary | `/admin/loyalty/negative-events/**` | S1 |

파일 주인 충돌 없음 (recover/earn/refund/void/customer route/receipt-preview 가 모두 서로 다른 파일).

### POS 4
P1 환불 시트 NET + confirm (S4 후) · P2 결제 시트 사용 disable (S7 후) · P3 손님 상세 빚 배지 + 이벤트 (S8 후) · P4 주문 상세 Change/Unlink confirm (S6 후)

### 테스트 (돈 단위: IDR 정수 · 1P = Rp 1)
9 시나리오 자동화 (plan §6):
① 적립→사용→전액환불 shortfall · ② 사용 일부만 shortfall · ③ 부분 환불 혼합 tender · ④ earn offset · ⑤ negative 손님 사용 UI 차단 · ⑥ DELETE 손님 unlink · ⑦ PATCH A→B · ⑧ Void shortfall · ⑨ 재시도 멱등

### 전체 타임라인
R1 (S1+S2+S3) → R2 (S4+S5+P1) → R3 (S6+P4) → R4 (S7+P2) → R5 (S8+P3)

## [REQ-6] Kyu 결정 (3)

### Q1. 마이너스 잔액 표현 — **권장 A = side-car ledger**
- A: side-car (`loyalty_negative_balance` + `loyalty_negative_event`) · plugin 불변
- B: plugin fork 해서 signed
- 이유: Q4 코어 fork 금지 · migration 1건 · 영향 반경 최소

### Q2. NET 환불 confirm — **권장 B = 2-phase (preview → confirm)**
- A: 1-phase 서버 즉시 진행
- B: preview 응답 → POS 계산원 확인 시트 → commit
- 이유: 티켓 원문 "계산원 확인 후 진행" · 매장 사고 방지

### Q3. Tender 차감 순서 — **권장 = 현금 → QRIS → 카드 기본값 + POS override**
- 이유: 현금 환불 수수료 0 · QRIS skip 시 Xendit 왕복 생략 · EDC 리스크 가장 커서 최후

## 범위 밖 (명시)
- (B) 추가 결제 복원 = Phase 2
- store_credit plugin fork = 금지
- WA 알림 · 손님 간 이체 · 만료 재조정 = Phase 2

## 작업 격리 (워크트리 위생)
- 허브 `~/projects/storeport` 는 다른 세션의 customer-display 변경이 있어 그대로 유지
- 전용 워크트리 `~/curiocity-live/storeport-wts/M0-1117-H-wt` 에서 `docs/m0-1117-h-loyalty-negative-balance-plan` 분기 · commit · push · PR 완료
- 코드 수정 0 · 운영 DB 쓰기 0 · railway CLI 미사용 · /loop 미사용

## 착지 확인
- Storeport PR #330 열림 · docs-only · processes: [infra.docs-plans]
- CI feature-map-check: 변경 파일 = `docs/plans/*.md` (src 아님) 라 통과 예상
- 다음 단계: Kyu 가 3개 결정 승인 → S1~S8 티켓 발급 (relay M0 큐)
