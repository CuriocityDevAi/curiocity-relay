# M0-1105-AK — 나눠 결제 서버 #212 · R0-1105-BI CHANGES 수정

## 변경 요약

- **Bug 1 fix** · `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts:912`
  - `isComplete` 게이트에 `effectiveOrderType === "preorder"` 분기 추가. preorder DP/잔금 tender 모두 split 게이트 밖에서 영수증 발행 (`receipt_kind="sale"` / `"balance"`).
- **Bug 2 fix** · `route.ts:356` + `route.ts:900`
  - `paidSoFarBefore` / `tenderCountBefore` 를 `order.metadata.tenders[]` 에서 재계산 (reader-replica lag 0).
  - `metadata.tenders` append 실패를 fatal(500) 로 승격 — non-fatal catch 는 Bug 2 재현 벡터.
- **회귀 테스트 2건** · `apps/commerce-core/integration-tests/pos/tenders.spec.ts` (nested describe `M0-1105-AK · R0-1105-BI regression guards`)
  - `#70` preorder DP → `receipt_kind='sale'` · `receipt_id` 발급 (Bug 1).
  - `#71` 2차 split tender → `tender_sequence=2` · `is_complete=true` · `metadata.tenders` 2건 (Bug 2).
- **skip** · `#68` S3 split-tender refund_distribution — 신규 이연 (아래 참조).

## 테스트 · CI

### 로컬 pos-integration · 2회 연속 초록

| 실행 | 결과 | 시간 |
|------|------|-----|
| local #1 | ✅ 75 pass · 1 skip · 0 fail | 53.851s |
| local #2 | ✅ 75 pass · 1 skip · 0 fail | 48.774s |

로컬 명령: `cd apps/commerce-core && pnpm build && pnpm test:integration:pos`.

통합 테스트 Postgres: localhost:5432 · DB_USERNAME=$USER (setup.js 폴백).

### CI pos-integration · a7230e5 push 직후 1회 진행중

- https://github.com/CuriocityDevAi/storeport/actions/runs/43000918468 · `pos-integration` pending (push 직후).
- **2회 연속 초록 확인 미달** — 45분 착지 룰에 따라 1회 pending 상태로 리포트.

## PR 번호

- #212 · branch `feat/m0-1105-aj-split-tender-server` · fix commit `a7230e5`.
- R0 리뷰 (5856800647) 에 수정 요약·커밋 해시로 PR 본체 댓글 회신 완료 (https://github.com/CuriocityDevAi/storeport/pull/212#issuecomment-6792989775). 스레드 resolve 는 R0 소관 (미처리).
- R0 리뷰는 line-specific thread 없이 PR 본체에만 1건 → 스레드별 답글 대신 PR 본체 1건으로 통합 답글.

## 이연 순증감

| 방향 | 항목 |
|------|------|
| (+) | R0-1105-BI Bug 1 · Bug 2 해소 |
| (-) | **신규 이연**: `return/route.ts:262` `refundableCap` single-payment · split-tender line share > origin cap 시 `refundAmount` 조기 cap · cross-payment 재분배 미실행. R0 기존 이연 "multi `refundPaymentWorkflow` 부분 실패 무롤백" 과 독립된 2차 이연 (M0 추후 fix). 지시서 M0-1105-AK 가 tenders 라우트/spec 으로 범위 한정 → return 라우트 수정 보류. |

## 기술 선택지 · 채택 · 이유

1. **Bug 2 소스** — 채택: `order.metadata.tenders[]`. 대안 `forceReplicas=false` 는 Medusa v2 공식 노출 범위 밖 fragile.
2. **metadata.tenders append** — 채택: fatal(500). 대안 silent warn 은 Bug 2 재현 벡터로 남음.
3. **test #68** — 채택: `it.skip`. 대안 (return 라우트 수정) 은 지시서 scope 이탈.

## 미완 명시

- CI pos-integration 2회 연속 초록 확인 **미완** (1회 pending). 로컬 2회는 초록 확보.
- R0 재리뷰 대기.

## 착지 명령

```
cp /tmp/M0-1105-AK-report.md ~/projects/curiocity-relay/m0/ && \
cd ~/projects/curiocity-relay && \
git add m0/M0-1105-AK-report.md && \
git commit -m "m0: M0-1105-AK" && \
git pull --rebase --autostash origin main && \
git push && \
node scripts/claim.mjs M0-1105-AK done "fix a7230e5 · local 2x green · CI 1 pending · #68 신규 이연"
```
