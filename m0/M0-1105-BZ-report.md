# M0-1105-BZ · 로열티 1단계 진단 — 리포트

**플러그인 재사용: 부분** — 데이터 모델·Admin UI·refund-to-credit 재사용, POS 결제 흐름(draft order + tenders)은 cart checkout 아님 → 적립 훅·사용 선할인·잔액 hold 는 신규 코드.

## 산출
- PR(draft · docs-only · 코드 변경 0): https://github.com/CuriocityDevAi/storeport/pull/253
- Branch: `feat/m0-1105-bz-loyalty-phase1-diag`
- 파일: `docs/plans/loyalty-phase1-diagnosis.md` (185 lines)
- Base commit: `82ac983` (origin/main)
- Head commit: `c4b84cc`
- 워크트리: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1105-BZ-wt`

## 핵심 결론
1. **플러그인 설치 가능** (`@medusajs/loyalty-plugin@2.22.2` · Medusa 2.14.0+ · 우리 2.17.2 호환). 단 `debitStoreCreditAccountWorkflow` 의 잔액 검증 분기는 **v2.21.1+ 전용** → 자체 가드 필수 (R5).
2. **POS = cart 아님** · 플러그인의 `addStoreCreditsToCartWorkflow` 사용 불가. 대안 3안 중 **선할인(b)** 권장 — `tenders/route.ts` 가 body `loyalty_use` 수신 → SC/PB1 산출 후 차감 → `debitAccountsWorkflow` + 결제 실패 시 역상쇄.
3. **적립 훅** = `tenders/route.ts` `isComplete` 분기 (cash/EDC) + xendit webhook (QRIS). 멱등: `account_transaction.reference_id === order.id`.
4. **Admin 파라미터 자리** = 기존 `pos_settings.settings` JSONB 에 `loyalty` 블록 추가 (migration 0). 필드: `enabled · earn_rate_pct · earn_base · round_mode · min_use_amount · max_use_pct_per_order · expiry_days · signup_bonus · exclude_product_ids · earn_on_balance_tender_only`.
5. **소멸** = 플러그인 미지원 → 자체 cron (`apps/commerce-core/src/jobs/loyalty-expiry.ts` · 00:00 KST) + `/admin/pos/loyalty/expire` 수동 트리거.
6. **고객 식별** = Medusa Customer `phone` 존재하나 Admin 필터 `GET /admin/customers?phone=...` 는 **v2.17.2 에 없음** (PR #17169 이후). → 직접 `customerModule.listCustomers({phone})` + 정규화 유틸 (`+62` E164). POS 현재 결제 흐름은 customer 를 **안 붙임** → `POST /admin/pos/orders/:id/customer` 신설이 전제 (R3).

## 라운드 분할 (7개 서버 + MEROS 앱)
| R | 범위 | 상한 |
| --- | --- | --- |
| R1 | 플러그인 설치 실측 (로컬 브랜치 · push 금지) · migrate · Admin UI 스모크 | 45분 |
| R2 | `pos_settings.loyalty` 블록 + Admin 설정 UI | 45분 |
| R3 | POS 손님 연결 (`POST /admin/pos/orders/:id/customer` · 전화 정규화) | 30분 |
| R4 | POS 적립 훅 (tenders + xendit webhook · 멱등 · flag off skip) | 45분 |
| R5 | POS 적립금 사용 (선할인 · 자체 lock · 결제 실패 역상쇄) | 45분 |
| R6 | 환불 경로 회수 (`/refund` `/refund-retry` `/return` `/void` · split 정합) | 45분 |
| R7 | 소멸 cron + 수동 트리거 | 30분 |
| MEROS 앱 | 번호 입력 → 조회·연결 UI + 적립금 사용 UI + 영수증 라인 | 45분 × 2 |
| 손님용 앱 | Store API 노출 · phone-auth · 잔액/내역 (별도 티켓) | — |

## Kyu 승인 대기 Q (R1 전)
- **Q1** 적립 베이스 = subtotal / subtotal_with_sc / grand_total? (제안 subtotal)
- **Q2** 적립 라운드 = floor / round / ceil? (제안 floor)
- **Q3** `min_use_amount` 대상 = 사용 금액 (제안) vs 주문 총액?
- **Q4** 적립금 사용 라인의 PB1 적용 전/후? (제안 후 = 세후 공제 · 세무 안전)
- **Q5** guest 손님(번호 미입력) = 적립 0 degrade OK? (제안 OK)
- **Q6** 소멸 기본값 `expiry_days` = 180 (6개월 · 제안) / 365?

## 위험 (10 중 상위 3)
- **버전 괴리**: 플러그인 코드가 2.21+ workflow 참조하면 설치/migrate 실패 가능 → R1 실측 전제.
- **세무 리스크**: 적립금을 세전 공제 시 PB1 과세 금액 축소. 세후 공제 안전 (Q4).
- **동시성**: 플러그인 hold 없음 · 2.17.2 는 debit 검증도 없음 → PG row lock 자체 가드 (R5 필수 범위).

처리 시간: 약 25분. 코드 변경 0. src 수정 0. 패키지 설치 0 (문서 진단만 · R1 때 실측).
