# M0-1105-AJ · P6 분할 결제 서버 코딩 (보고)

**브랜치**: `feat/m0-1105-aj-split-tender-server`
**PR**: https://github.com/CuriocityDevAi/storeport/pull/212
**원장 근거**: `ledger/decision-p6-split-20261111.md` S1~S4 ("전부 권장.") · `ledger/decision-p6-20261110.md` Q4 (최대 2개 tender)
**계획서**: `docs/plans/P6-split-tender-plan.md` (브랜치 `docs/p6-split-tender-plan` · M0-1105-AH)

## 변경 요약

### 서버 (3 커밋)
1. **커밋 1 `feat(pos): split tender server · amount < grand_total · S1 S4 가드 (1/3)`** — `157af15`
   - `tenders/route.ts`: `body.split=true` 수용 (amount < grand_total 허용) · PC 2개 + Payment 2개 (옵션 B) · `paid_so_far/remaining/is_complete` 응답 · S1 (2 tender 상한 · 3번째 400) · S4 (preorder+split 400) · 중간 tender 는 receipt mint + draft→order 전환 보류 · `order.metadata.tenders[]` 에 per-tender 상세 persist → 마지막 tender 가 영수증 tenders 재구성 · register_session 은 중간 tender 에도 즉시 가산.
   - `orders/[id]/route.ts` (GET): `paid_so_far` · `remaining` 노출 (앱 재진입 복귀).

2. **커밋 2 `feat(pos): split tender void/refund/return · S2 S3 (2/3)`** — `a3cd9d4`
   - `void/route.ts`: `body.tenders[]` 수용 · S2 PIN 규칙 (CASH 1건 포함 → PIN 필수 · all CARD → 불필요) · 각 `card_terminal` 엔트리 자체 approval_code 6자리 검증 · Cash Movement 는 CASH 포션 합계 1건.
   - `refund/route.ts`: 동일 S2 규칙 + `pin_required` 응답.
   - `return/route.ts`: S3 CASH-first 분배 — captured payment 를 `cash → qris → card` 순으로 정렬해 refundAmount 를 소진 · 응답·metadata 에 `refund_distribution[{payment_id, method, amount}]` 포함.

3. **커밋 3 `test(pos): split tender S1 S2 S3 S4 통합 테스트 + fixture (3/3)`** — `65bd117`
   - `integration-tests/pos/tenders.spec.ts` · 기존 파일의 nested describe 로 M0-1105-AJ 추가 (⛔ 새 spec 파일 금지):
     * **#66 S1**: 2 tender 완결 뒤 3번째 → 400 `max 2 tenders`.
     * **#67 S2**: CARD-only refund tenders → 200 (PIN 불필요) · CASH 포함 tenders without PIN → 400.
     * **#68 S3**: cash 40k + card 60k 결제 · 품목 1개 (50k) 반품 → `refund_distribution[0]` = cash 40k · `[1]` = card 10k.
     * **#69 S4**: preorder + `split=true` → 400 `split tender is not allowed on preorder`.
   - `integration-tests/pos/fixtures/m0-1105-aj.*.json` · 10개 fixture:
     split-tender-{1,2}.{request,response}.json · split-3rd-tender.400.response.json · preorder-split.400.response.json · refund-{mixed-no-pin,card-only}.{request,response}.json · return-split-cash-first.{request,response}.json · get-order-remaining.response.json.

## 테스트 · CI

- **typecheck**: `pnpm --filter commerce-core typecheck` → 0 error ✓
- **unit**: `pnpm --filter commerce-core test` → 5 suites · 33 tests pass ✓
- **pos-integration (CI)**: PR 생성 뒤 자동 트리거 · 현재 pending (로컬에서 Postgres 미기동 상태라 미실행 — CI 결과 확인은 PR 체크아웃 뒤). **CI 결과 재확인 2회 미실시 — 착지 불가 상태**.

## 이연 순증감

- **AJ 완료 범위**: 서버 split 결제 (tenders · void · refund · return) + S1~S4 정착 통합 테스트.
- **후속 (별도 티켓)**: 영수증 renderer (M0-1105-AK) · 앱 PWA "Pay in parts" UI (M0-1105-AL) · 추가 통합 시나리오 (M0-1105-AM).

## PR 본문 포함 (선택지·채택·이유 3줄)

1. **옵션 B · PC 2개 + Payment 2개** 채택. 옵션 A 는 Medusa 2.17 의 `payment_collection.amount` 변경 불가 전제라 "잔액" 을 PC amount 로 표현할 길이 없음.
2. 영수증 tender 재구성 소스: `order.metadata.tenders[]` 에 per-tender 상세 persist — 멱등하고 단순.
3. Receipt renderer 는 기존 tenders 배열 입력 그대로 재사용 (M3 renderer 변경 없음).

## 착지 명령

```
cp /tmp/M0-1105-AJ-report.md ~/projects/curiocity-relay/m0/ && cd ~/projects/curiocity-relay && git add m0/M0-1105-AJ-report.md && git commit -m "m0: M0-1105-AJ" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M0-1105-AJ done "split 서버·보이드/환불/반품 혼합 + S1-S4 통합 테스트 · CI pos-integration 2회 확인 전 착지 금지"
```

## 미완 명시 (45분 시점 상태)

- CI `pos-integration` 2회 연속 초록 **미확인** — 로컬에서 Postgres 미기동으로 통합 테스트 미실행.
- PR 머지 전 CI 결과 재검증 필수.
