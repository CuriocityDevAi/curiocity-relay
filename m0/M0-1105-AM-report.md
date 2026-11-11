# M0-1105-AM 보고 · 환불 실패 시 "남은 금액 다시 환불" 서버 + R0-1105-BK 지적 (결정 A)

## 변경 요약
- `apps/commerce-core/src/api/admin/pos/orders/[id]/return/route.ts`
  - `orderReturnQueue` · `withOrderLock` 를 export (retry 공유 · R0-1105-BK).
  - `tender_results[]` (idx · payment_id · method · amount · status: succeeded|failed|pending · at · error) 를 plan 길이만큼 유지 · 응답에 노출.
  - partial-failure 분기에서도 `returns[]` entry 를 `status='partial'` 로 영속 (retry 참조).
  - 성공 분기의 `returns[]` entry 에도 `tender_results`, `requested_amount`, `failed_amount`, `status: 'completed'` 추가.
- `apps/commerce-core/src/api/admin/pos/orders/[id]/refund-status/route.ts` (신규)
  - `GET` · `total_captured` · `total_refunded` (payment refunds row 합) · `remaining_refundable` · `returns[]` · `partial_returns[]` (UI 편의 flat).
  - Medusa BigNumber `{value, precision}` 형태를 `toNum` 로 정상 환산 (`numeric_` fallback 유지).
- `apps/commerce-core/src/api/admin/pos/orders/[id]/refund-retry/route.ts` (신규)
  - `POST` · `return_id` 로 실패 tender 몫만 재시도. CASH/QRIS 포션 포함 시 `manager_pin`, CARD 포션 포함 시 6자리 `terminal_approval_code` 필수 (S2).
  - S3 순서 (CASH→QRIS→CARD) 유지. `withOrderLock` 공유 + 상태 재조회로 두 번 눌러도 이중 환불 없음. 전부 성공 시 inventory 복귀 (원 /return 이 skip 한 경우).
- `apps/commerce-core/integration-tests/pos/tenders.spec.ts`
  - 기존 파일에 **nested describe** (M0-1105-AM · 환불 실패 재시도) 로 6건 추가 (#74–#79). 신규 spec 파일 없음.

## 테스트·CI
- `pnpm --filter commerce-core typecheck` → 에러 0.
- `bash scripts/naming-check.sh` → PASS.
- `bash scripts/upstream-tracking-check.sh` → PASS.
- `pnpm --filter commerce-core test:integration:pos` 로컬 2회 전수 pass:
  - Run 1: `Tests: 83 passed, 83 total · Time: 63.955 s` (`/tmp/M0-1105-AM-pos-run1.log`)
  - Run 2: `Tests: 83 passed, 83 total · Time: 58.231 s` (`/tmp/M0-1105-AM-pos-run2.log`)
- Lint (pre-commit husky): 통과 (commit hook 에서 prettier + unit tests 39/39 pass).

### 신규 테스트 어설션 요약 (기계 판정 가능)
- `#74` GET /refund-status → `total_captured=100000`, `total_refunded=40000`, `remaining_refundable=60000`, `returns[0].status='partial'`, `tender_results` cash=succeeded/card=failed, `partial_returns[0].failed_tenders[0]={method:'card', amount:10000}`.
- `#75` POST /refund-retry → `status='completed'`, `retried=[{method:'card',amount:10000}]`, `refunded_amount=10000`, `total_refunded_amount=50000`, `remaining_failed_amount=0`. 재조회 `total_refunded=50000`.
- `#76` retry 2회 (순차) → 두번째 응답 `already_complete=true, retried=[], refunded_amount=0`. `total_refunded=50000` (이중 X).
- `#77` retry 2회 (동시 · `Promise.all`) → `refunded_amount` 합 = 10000 (한쪽만 성공). `total_refunded=50000` (이중 X).
- `#78` CARD 포션만 남은 retry 에 `terminal_approval_code` 미입력 → 400 `terminal_approval_code required`.
- `#79` 존재하지 않는 `return_id` → 404.

## PR
- 번호: **#214** (브랜치 `feat/m0-1105-al-refund-safety`)
- URL: https://github.com/CuriocityDevAi/storeport/pull/214
- 커밋: `c0f5e34 feat(pos): refund 실패 시 '남은 금액 다시 환불' · GET status + POST retry (M0-1105-AM)`
- PR 본문: `[REQ]` 6항목 (per-tender 결과·GET 상태·POST retry·R0-1105-BK·통합 테스트·API 계약) 전부 커버. API 계약 (GET/POST 경로·요청/응답 필드·오류 코드) 작성 완료. 기술 선택지 A/B/C 와 채택 (C) 사유 3줄 기재. 확인 항목 체크리스트 포함.

## 이연 순증감
- **소진 2건**:
  - R0-1105-BK "동시 이중 제출 멱등성 미처리" (`withOrderLock` 공유 + 상태 재조회).
  - 결정 A "환불 실패 시 남은 금액 다시 환불" (GET /refund-status + POST /refund-retry).
- **신규 이연 0건**.

## 착지
```sh
cp /tmp/M0-1105-AM-report.md ~/projects/curiocity-relay/m0/ && \
cd ~/projects/curiocity-relay && \
git add m0/M0-1105-AM-report.md && \
git commit -m "m0: M0-1105-AM" && \
git pull --rebase --autostash origin main && \
git push && \
node scripts/claim.mjs M0-1105-AM done "환불 실패 시 '남은 금액 다시 환불' 서버 + R0-1105-BK 지적 소진 · #214 c0f5e34"
```
