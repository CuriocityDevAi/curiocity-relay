storeport#468 APPROVE

## R0-1126-AU — storeport#468 (M0-1126-S) 리뷰 결과

**PR**: fix(commerce-core): M0-1126-S — POS 칩 Skipped+Ask again paid_age>30s 보존 (CD 는 대기)
**판정**: APPROVE
**PR 코멘트**: 제출 완료 (자가 PR · comment 형식)

---

### ① forPos=true 누수 없음 — 콜러 전수 grep 결과

`getActiveSnapshotForRegister` / `getActiveSnapshotByStockLocation` 전체 콜러:

| 경로 | forPos |
|------|--------|
| `/customer-display/snapshots/active` | 기본(false) ✓ |
| `/customer-display/customer-flow` | 기본(false) ✓ |
| `/admin/pos/loyalty/sessions/snapshots/active` | 기본(false) ✓ |
| `service.ts:327` (startSnapshotForRegister 내부 conflict 체크) | 기본(false) ✓ |
| `/admin/pos/registers/:id/snapshot` | `true` ✓ |
| `/admin/pos/customer-flow` | `true` ✓ |

CD 경로 2개 + loyalty route 1개 + 내부 service call 1개 = 모두 `forPos=false`.
POS 라우트 2개만 `forPos=true` — PR 설명과 일치. 기본값 `false` 선언 확인.

---

### ② POS 체류 중 부작용 분석

**새 장바구니 / Next customer 시 새 snapshot 이 이기는지**
- `pickBestSnapshot` 랭킹: `active`(rank 2) > `paid`(rank 3)
- stale paid+skipped 존재해도 새 active snapshot 이 항상 우선 ✓
- `service.ts:327` 내부 conflict 체크는 `forPos=false` → stale 제외 후 비교 → 새 주문 자유 생성 ✓
- 신설 테스트 케이스 2 "Next customer → POS 칩 none·['ask'] 초기화" PASS 직접 검증

**나눠결제(split tender) 중 엉뚱한 주문 칩**
- 나눠결제 중 현재 주문 `snapshot_state = 'active'` (rank 2)
- stale paid(rank 3) 보다 항상 우선 → 현재 주문 칩 정상 표시 ✓
- `cd-parallel-pay.spec.ts` 15건 전부 PASS ✓

**동시 2결제**
- M0-1123-B 보호(`service.ts:327` `forPos=false`)가 stale을 conflict 체크에서 제외
- 새 주문 snapshot 생성에 영향 없음
- `pickBestSnapshot` newest `updated_at` 기준으로 올바른 snapshot 선택 ✓

---

### ③ #466 머지 후 main(`413a1de`) 기준 통합 테스트 전체 재실행

PR base `413a1de` = `#467` 포함 → `#466`(`c7b7ab0`) 포함 확인.
worktree `/Users/kyu.lee/projects/curiocity-relay-wts/M0-1126-S` 에서 직접 실행.

| 스펙 | 건수 | 결과 | 비고 |
|------|------|------|------|
| cd-pos-sync-v4-pos-chip-skipped | 2 | ✅ PASS | 신설 |
| cd-pos-sync-v3 | 3 | ✅ PASS | V3-1 "GET active=null" 보존 |
| cd-pos-sync-v4 | 9 | ✅ PASS | |
| cd-pos-sync-v4-next-customer | 4 | ✅ PASS | |
| short-order-num | 5 | ✅ PASS | |
| cd-parallel-pay | 15 | ✅ PASS | |
| cd-pos-screen-sync | 7 | ✅ PASS | |
| cd-full-flow | 8 | ✅ PASS | |
| store-day-rehearsal | 10 | ✅ PASS | |
| tenders | 99 | ✅ PASS | |
| **합계** | **162** | **162/162 ✅** | |

---

### ④ CD "지난 주문 안 남음" 보존 (손님 화면 ① · Kyu OK 판정)

CD 경로 `forPos=false` → `isPostSettlementStale(paid_age>30s, settled=true)` 필터 그대로 적용
→ CD 응답 `null`(대기 화면). 신설 테스트 케이스 1 `cdSnap === null` 직접 어서션. 회귀 없음 ✓.

---

**결론**: forPos 누수 없음, 부작용 없음, 162/162 PASS. APPROVE.
