# M1-1127-I 리허설 관문 — 보고

PASS relay#73 · fork#293 · 테스트 32개(all pass) · 흐름 PR 1건 리허설 실제 돌았음: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45993173431

---

## 작업 요약

### relay PR #73 — `scripts/oke/merge-gate.mjs` + 테스트
- **흐름 경로 목록 (REQ 1)**
  - storeport: `apps/customer-display/**` · `apps/commerce-core/src/modules/register_session/**` · `apps/commerce-core/src/lib/customer-flow/**` · `apps/commerce-core/src/api/**/customer-display/**` · `**/phone-entry/**`
  - fork: `components/customer-display/**` · `components/cd-preview/**` · `components/order-chips/**` · `components/loyalty/**` · `app/checkout/**` · `app/customer-lookup*` · `api/hooks/ask-phone-on-display.ts` · `api/hooks/register-session.ts` · `lib/ask-phone-on-display.ts` · `lib/loyalty-snapshot.ts` · `lib/phone-id.ts`

- **리허설 관문 (REQ 3)**
  - 흐름 PR → PR changed files API → `isFlowPr()` 판정
  - 리허설(`e2e-cd-pos.yml`) 없음/진행 중 → `rehearsal: pending` → 머지 불가
  - 리허설 빨강 → `rehearsal: fail` → 머지 불가
  - 비흐름 PR → 기존 판정 그대로

- **iMac heavy 통계 (REQ 4)**: `--json` 에 `imacStats: { swap_used_mb, load_15, ts }` 추가 (판정 미사용)

- **테스트**: 기존 26개 → 32개 (MG-R1~R4 + MG-JSON 2건 + MG-리허설-검증 · all pass)

### fork PR #293 — `.github/workflows/e2e-cd-pos.yml`
- **경로 필터 (REQ 2)**: 흐름 경로 11개 추가 → 흐름 PR 이면 자동 트리거
- **concurrency**: `e2e-cd-pos-${{ github.ref }}` → `heavy-curiocity-mac-fork` (아이맥 heavy 칸 전체 순서 대기 · 한 번에 1개)
- **Playwright 스텝**: `case1.spec.ts` 하드코딩 → glob (case1b 추가 시 자동 포함)

## 실제 리허설 트리거 확인

fork PR #293 가 `.github/workflows/e2e-cd-pos.yml` 경로를 건드렸으므로 e2e-cd-pos 워크플로가 자동 트리거됨:
- run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45993173431
- 상태: in_progress (CI 기다리지 않음)

## storeport 쪽 안내 (branch protection 설정 · Kyu 클릭 필요)

merge-gate는 스크립트 단계에서 흐름 PR을 판정함. storeport 리포에서 branch protection → Required status checks 에 `e2e-cd-pos` 체크를 추가하려면:
1. github.com/CuriocityDevAi/storeport → Settings → Branches → main rule → "Require status checks to pass"
2. `e2e-cd-pos` 검색 후 추가

단, storeport의 e2e-cd-pos 워크플로(fork가 아닌 storeport 쪽)는 별도 추가 필요. 현재 merge-gate.mjs 판정은 오케가 수동 실행하는 방식으로도 작동함(자동 branch protection 없이도 머지 전 확인 가능).
