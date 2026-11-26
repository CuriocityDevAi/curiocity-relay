PASS · PR #468

# M0-1126-S · POS 칩 Skipped+Ask again paid_age>30s 보존 (CD 는 대기)

- PR: https://github.com/CuriocityDevAi/storeport/pull/468
- Branch: `fix/M0-1126-S-pos-chip-skipped-ask-again`
- Worktree: `~/projects/curiocity-relay-wts/M0-1126-S`
- Head: `1ac067b` on top of `origin/main@2a25f34`
- 커밋/push/PR 완료 (승인 없이 · 지침대로).

## 원장 대사 (닻)

- V4-8 6상태 Skipped + Ask again (2026-11-24 승인).
- `decision-success-single-phone-button-20261126` (결제 완료 화면 = Ask phone 하나 · 서버 phone-entry 판정 유지).
- Kyu 실기 2026-11-26 23:05 🔴 증상 ② — "결제 후 20초 뒤 POS 칩이 Ask phone 으로 돌아감".
- M0-1126-R-report.md "미동봉 ②" 를 본 PR 로 회부.

## 선택지 · 권장안

**권장**: `forPos` 옵션 분기 (본 PR 채택).

`getActiveSnapshotForRegister` / `getActiveSnapshotByStockLocation` 에 선택적 `forPos: boolean = false` 를 추가해, `isPostSettlementStale` 필터를 POS 응답 두 라우트에서만 건너뛴다.

- 변경 지점 = 2 라우트 + 2 서비스 메서드. 14+ 콜러 중 11+ 는 미변경 (기본값 false 로 CD 동작 보존).
- `pickBestSnapshot` 랭킹(phone_entry_open=1 > active=2 > paid=3) 은 그대로라 Next customer / 새 cart 시 신규 active(idle) snapshot 이 우선 → POS 칩이 자동으로 "ask" 로 초기화.
- CD 경로는 touch 하지 않아 "지난 주문 안 남음" 특성이 서버 단에서도 그대로 보장.

**대안 (비채택) **:
- A. `isPostSettlementStale` 자체 제거 → CD 가 지난 주문을 다시 그려 #196 재현 리스크 ↑.
- B. 새 메서드(`getPosSnapshotForRegister`) 신설 → 공용 로직 중복 · 14+ 콜러 중 일부가 "어느 쪽 써야 하나" 분기를 매번 판정해야 함.

## 원인 표 (증상 → 파일:줄 → 수정)

| # | 증상 (Kyu 실기) | 원인 (파일:줄) | 수정 |
|---|-----------------|-----------------|------|
| ② | 결제 후 20초 무입력 → POS 칩 "Skipped · Ask again" 대신 "Ask phone" | `apps/commerce-core/src/modules/register_session/service.ts:603` — `getActiveSnapshotForRegister` 가 `isPostSettlementStale` 로 paid+settled+paid_age>30s 를 걸러 POS 폴링에도 null 반환 → 기본값 "Ask phone" 으로 칩 복귀. | `forPos` 옵션 추가 (기본 false=CD 유지) · POS 라우트 2개만 `forPos=true` 전달해 필터 건너뜀. |

## [BUILD] 테스트 우선

- 신설 `integration-tests/pos/cd-pos-sync-v4-pos-chip-skipped.spec.ts` 2건을 먼저 작성 → 수정 전 2건 모두 FAIL (POS 응답 null 확인) → 수정 후 2건 모두 PASS.
- 테스트 시나리오:
  1. paid_at 과 skipped_at 을 `Date.now() - 31_000` 으로 backdate → GET `/admin/pos/registers/:id/snapshot` 응답 `snapshot.customer_flow.state === 'skipped'` · `actions === ['ask_again']` · GET `/customer-display/snapshots/active` 응답 `snapshot === null`.
  2. 같은 상태 → POST `/admin/pos/registers/:id/next-customer` → POS 응답 `customer_flow.state === 'none'` · `actions === ['ask']`.

## 지난 테스트가 못 잡은 이유

- 기존 cd-pos-sync-v4 ② (Skipped → Ask again) 는 `skipSnapshot` 직후만 검증, `paid_age>30s` 창을 재현하지 않았음.
- 기존 cd-pos-sync-v3 V3-1 은 `/customer-display/snapshots/active` 만 봐 POS 응답과 분리 요구를 발견하지 못함.
- 신설 spec 은 `svc.updateOrderSnapshots({ paid_at, skipped_at })` 로 시각을 결정론적으로 backdate → `isPostSettlementStale` 가 반드시 발화하는 조건을 실시간 대기 없이 재현.

## 검증 (실행 · 모두 통과)

- `apps/commerce-core`: `npx tsc --noEmit` ✓ (에러 0).
- `apps/commerce-core`: 단위 `TEST_TYPE=unit` ✓ (877/877 · 75 suites).
- `apps/commerce-core`: 통합 (POS) — 전부 통과:
  - cd-pos-sync-v4-pos-chip-skipped (신설, 2건)
  - cd-pos-sync-v4 (9건) · cd-pos-sync-v4-next-customer (4건)
  - cd-pos-sync-v3 (3건 · V3-1 "GET active=null" 그대로 보존)
  - cd-full-flow (8건) · cd-pos-screen-sync (7건) · cd-parallel-pay (15건)
  - short-order-num (5건 · #465 regression) · store-day-rehearsal (10건) · tenders (99건)
- `scripts/naming-check.sh` ✓ ("meros" 매치 0).

### 미실행 (운영 책임)

- 🟡 실 iPad Safari 매장 CD + POS 웹 Kyu 실기 재검증 — 로컬 integration 으로 결정론적 PASS. 실 매장 timing 은 운영 재검증 요청.
- 🟡 POS 웹 Playwright 스샷 — POS fork 는 외부 레포이고 본 변경은 서버 계약뿐이라 Playwright 자동화 대신 integration 테스트로 contract 를 봉인. 칩 렌더링 자체는 POS fork 쪽 책임.

## 보존 요소 (영향 없음 확인)

- cd-pos-sync-v4 ①~⑧·⑦+ (V4-7/V4-8 전체 재실행 통과).
- short-order-num 5 (#465 regression 재실행 통과 · 서버 발급 짧은 주문번호 기능 미영향).
- CD "지난 주문 안 남음" 동작 (cd-pos-sync-v3 V3-1 재실행 통과 — Kyu OK 판정 손님 화면 ① 그대로).
- 계약 v1.4 응답 모양 — 필드 추가·삭제·이름변경 없음.
- `apps/customer-display/**` 미변경 (storeport#466 리뷰 중 · 지침대로 건드리지 않음).
- `register_session` short number (#465 머지됨) · POS fork · Anchor 미건드림.

## 산출물 (diff)

- 5 files changed, +243 / −5.
  - `apps/commerce-core/src/modules/register_session/service.ts` (+13/−2) — `forPos` 옵션 추가 (두 메서드).
  - `apps/commerce-core/src/api/admin/pos/registers/[id]/snapshot/route.ts` (+5/−2) — `forPos=true` 전달 (두 분기).
  - `apps/commerce-core/src/api/admin/pos/customer-flow/route.ts` (+8/−1) — `resolveSnapshot` 2분기에 `forPos=true` 전달.
  - `apps/commerce-core/integration-tests/pos/cd-pos-sync-v4-pos-chip-skipped.spec.ts` (+216 신규) — 2 시나리오.
  - `docs/feature-map.yaml` (+1) — 새 spec 등록 (customer-display-customer-flow).

## 선언

- 운영 DB · SSH · railway CLI 사용 안 함.
- 리포트는 `/Users/kyu.lee/.hub-runner/reports/m0/M0-1126-S/report.md` 에만 1회 저장. git repo 에 리포트 쓰지 않음 (push 하지 않음).
- 작업 worktree: `~/projects/curiocity-relay-wts/M0-1126-S` — 러너 폴더(`~/projects/curiocity-relay`) 는 건드리지 않음.
- 실행 시간: ~55분 (60분 한도 내).
- 커밋·push·PR 발의 = 본 지침 "승인 없이" 에 따라 자동 진행.
