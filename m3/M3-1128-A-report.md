PASS

## PR별 권장안

| PR | 제목 | 판정 | 이유 |
|----|------|------|------|
| #286 | test(e2e-cd-pos): M1-1127-F — R4 3-5 연속·3-6 새로고침 + case1 어설션 조이기 | **흡수 후 닫기** | case1.spec.ts 3개 어설션 변경 + sequential.spec.ts 전체가 PR#293에 완전 동일, PR#296에 진화형으로 흡수됨 |
| #287 | test(cd-pos): R0-1127-G — 기존 고객 OK → Confirm 재현(red) | **닫기** | DRAFT 진단 PR 역할 완료(버그 증명 → storeport#480 수정). 단 기존 고객 is_new=false OK→Confirm green 테스트 미흡수 → M0-1128-A 이후 별도 PR 필요 |

---

## PR#286 상세

**브랜치:** `feat/M1-1127-F-e2e-sequential`

### 흡수 대조

| 파일 | 변경 내용 | PR#293 | PR#296 |
|------|----------|--------|--------|
| `e2e/cd-pos/case1.spec.ts` W1 | `/\d/` → `/\+Rp\s*[\d,.]+/` | 완전 동일 | 완전 동일 |
| `e2e/cd-pos/case1.spec.ts` W2a | `.filter({visible:true}).first()` | 완전 동일 | 완전 동일 |
| `e2e/cd-pos/case1.spec.ts` W2b | `.not.toHaveCount(0)` → `.filter({visible:true}).toBeVisible()` | 완전 동일 | 완전 동일 |
| `e2e/cd-pos/sequential.spec.ts` (신규) | 3-5 연속 주문, 3-6 새로고침 (200줄) | **완전 동일** (diff=0) | **진화형** — FlashList micro-resize(M1-1127-L) + goto('/') full reload(M1-1127-R) 추가 |

**결론:** 흡수처 PR#296 (`fix/M1-1127-L-flashlist-reenter`). 모든 테스트 의도 보존됨.

---

## PR#287 상세

**브랜치:** `test/R0-1127-G-existing-customer-repro` (DRAFT)

### 흡수 대조

| 파일 | 변경 내용 | main | PR#293 | PR#296 |
|------|----------|------|--------|--------|
| `e2e/cd-pos/case1b-existing-customer.spec.ts` (신규) | 기존 고객(phone pre-seed, is_new=false) OK→Confirm red 재현 | ❌ 없음 | ❌ 없음 | ❌ 없음 |

> PR#296의 `case1b.spec.ts`는 Re-enter→CD 키패드 재오픈(storeport#480 게이트) 테스트로 **다른 시나리오** — fresh customer(is_new=true), Re-enter 흐름 커버.

### 미흡수 항목
- `case1b-existing-customer.spec.ts` 기존 고객(is_new=false) OK→Confirm 흐름 green 테스트 — 현재 어떤 활성 브랜치에도 없음

**결론:** DRAFT 진단 역할(isPostSettlementStale 서버 버그 증명) 완료 → 닫기. 기존 고객 경로 green 테스트는 M0-1128-A 이후 별도 PR로 추가 필요.

---

## 코멘트 등록

- PR#286: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/286#issuecomment-7230052353
- PR#287: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/287#issuecomment-7230054249
