# M0-1105-CD — 로열티 R7: 적립금 소멸 FIFO job + 수동 트리거 API

**결과: DONE (draft PR · CI 진행 중)** — 순수 FIFO 계산 + scheduled job + 수동 트리거 POST + 단위 11건 + 통합 1건. 로컬 unit 205 pass (이전 193 → +12). Typecheck clean. **PR: https://github.com/CuriocityDevAi/storeport/pull/261** (draft, base=main).

## 변경 파일

| 파일 | 역할 |
|---|---|
| `apps/commerce-core/src/lib/loyalty/expiry.ts` | 순수 FIFO 계산 (Medusa/DB 의존 X · 단위 테스트 1차) |
| `apps/commerce-core/src/lib/loyalty/expiry-runner.ts` | settings 읽기 + 계좌/거래 조회 + computeExpiry + debit 생성. job + route 공유 단일 지점 |
| `apps/commerce-core/src/jobs/loyalty-expiry.ts` | Medusa scheduled job (`"10 17 * * *"` = Asia/Jakarta 00:10) |
| `apps/commerce-core/src/api/admin/pos/loyalty/expire/route.ts` | `POST /admin/pos/loyalty/expire {dry_run?, now?}` → `{dry_run, enabled, expiry_days, expired_accounts, expired_amount, items?[], skipped_reason?}`. admin middleware 가 인증 |
| `apps/commerce-core/src/modules/loyalty_settings/__tests__/expiry.unit.spec.ts` | FIFO 단위 테스트 11건 |
| `apps/commerce-core/integration-tests/loyalty/expiry.spec.ts` | 통합 테스트 2건 (credit→debit 왕복 + skip 분기) |
| `docs/feature-map.yaml` | `commerce-core.loyalty-expiry-r7` 신설 (status=live) |

## REQ 체크

- **REQ 1 — settings 정본 사용 (enabled · expiry_days=0 무동작)** ✓ runner `enabled=false` → `skipped_reason="disabled"` · `expiry_days<=0` → `"no_expiry"`. 통합 테스트 둘 다 커버.
- **REQ 2 — FIFO 멱등 계산 (순수 함수)** ✓ `computeExpiry(transactions, expiry_days, now)` — 거래 chronological 정렬 (동시각 ties = id 안정) · 사용 debit 은 FIFO 로 오래된 bucket 부터 소진 · `reference="expiry"` + `reference_id="expiry:<credit_tx_id>"` debit 은 해당 credit remaining 에서만 차감 → 재주사 멱등.
- **REQ 3 — @medusajs/loyalty-plugin 재사용 + 잔액 가드** ✓ `debitAccounts([{reference:"expiry", reference_id:"expiry:<id>"}])` 호출. 잔액 초과는 플러그인 `service.debitAccounts_` 가 "Insufficient balance" MedusaError throw — 의도적으로 catch 하지 않음 (오차 시 job 실패로 가시화).
- **REQ 4 — 매일 매장 timezone 00:10 scheduled · 재실행 멱등** ✓ `schedule: "10 17 * * *"` (UTC 17:10 ≈ WIB 00:10). computeExpiry 로 멱등.
- **REQ 5 — POST /admin/pos/loyalty/expire {dry_run?} + admin 인증** ✓ route. `now?` 파라미터는 운영 QA 용 (통합 테스트 재사용 포함).
- **REQ 6 — 테스트 매트릭스** ✓ 단위: FIFO 표(적립 3+사용) / expiry_days=0 noop / 재실행 멱등 / dry_run 무변경(통합) / 추가 (문자열 amount · 동시각 ties · 사용 전소진 · 부분 expiry 재실행 · 음수 days · reference id 헬퍼). 통합: credit→시간경과→debit 왕복 + skip 분기.

## 자기 검증 — CI job 결과 (push 직후 스냅샷)

| Job | 상태 |
|---|---|
| changes-filter | pass (6s) |
| check (feature-map) | pass (14s) |
| markers-and-forbidden | pass (6s) |
| unit-commerce-core | pass (59s) |
| pos-integration | pending (unrelated) |
| docker-smoke-* | skipping (no relevant diff) |
| wrangler-check-care-agent | skipping |

## 설계 메모

- `expiry-runner.ts` 를 별도 파일로 분리 — job 과 admin route 가 같은 로직 공유. settings 읽기 · 계좌 전수 순회 · computeExpiry · debit 생성을 단일 지점.
- `reference_id = "expiry:<credit_tx_id>"` 포맷으로 멱등 보증. 다른 reference 와 충돌 없음 (adjustment · order_use 등은 자유 포맷).
- `exclude_product_ids` 등 설정은 적립 시점 정책 (R2/R4) · 소멸에는 영향 없음.
- `now` 파라미터는 테스트/수동 백필용 — 운영 cron 은 기본 Date.now().
- 운영 규모에서 계좌 수가 커지면 pagination 필요 (지금은 `{take: null}` 전수). TODO 로 인지. R7 요구 범위 밖.

## 금지 범위 준수

- POS 결제 라우트 (tenders/refund/return/void/xendit webhook) 수정 없음
- Admin UI 변경 없음 (관리자는 R7-admin UI 는 M3 다른 티켓 소관)
- `src/api/admin/pos/orders/[id]/customer/**` 건드리지 않음
- fork 저장소 (nari fork) 수정 없음
- PR 머지 없음 (draft)

## 운영 재확인

- cron 발사: `"10 17 * * *"` UTC = Asia/Jakarta 00:10. Medusa 2.17.2 scheduled job 러너가 발사.
- 멱등 보증: 중단 재개 시 이미 생성된 expiry debit 때문에 중복 처리 없음. 부분 성공 (일부 계좌만 debit 성공) 상태에서 재실행해도 성공한 계좌는 skip.
