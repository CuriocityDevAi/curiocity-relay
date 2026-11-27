# M0-1127-S

#480: heavy-mac 대기 · PR head `cf89b55146beef439352620b5b0b3980895d815f`

## 실행 요약

- 초기 상태: PR 480 headRefOid=`f025362e` (옛 head · `rehearsal-dispatch.yml` 포함) · 로컬/원격 feat/M0-1127-N-cd-correct-welcome = `7f9a46a6` — GitHub PR API 캐시가 밀려 있었음.
- 실행: `~/projects/curiocity-relay-wts/M0-1127-N` 워크트리에서 `git commit --allow-empty -m "chore: M0-1127-S PR 동기화"` → `git push origin feat/M0-1127-N-cd-correct-welcome` 성공 (`7f9a46a6..cf89b551`).
- 재확인 (`gh pr view 480 --json headRefOid,files`):
  - headRefOid = `cf89b55146beef439352620b5b0b3980895d815f` ✓
  - files 9개 (`.github/workflows/rehearsal-dispatch.yml` **제거됨** · commerce-core/customer-display 코드·테스트만) ✓
- 체크 상태 (land 시점):
  - `markers-and-forbidden` · `changes-filter` · `route` · `check` · `heavy-cloud(skipping)` — 모두 pass/skip
  - `heavy-mac` — **pending (진행 중)**
- 판정: 큐 REQ 2 — heavy-mac 진행 중이면 머지 금지 · "heavy-mac 대기" 로 착지 (기다리지 말 것). **머지 보류**.

## 보존 요소 (PR diff 상 그대로 유지 · #480 files 확인)

- A3 (Re-enter 재허용) — `apps/customer-display/app/index.tsx` · `src/screens/PhoneFlowScreen.tsx` · commerce-core `register_session/service.ts`
- 환불/void 가드 (M0-1127-P) — `apps/commerce-core/src/lib/link-customer-order.ts` · `register_session/lifecycle.ts`
- B (phone-entry route) — `apps/commerce-core/src/api/admin/pos/orders/[id]/phone-entry/route.ts`
- A2 (Correct→완료 유지) — `apps/customer-display/src/components/cd-sync/LeftPaymentPanel.tsx`
- 통합 테스트 — `apps/commerce-core/integration-tests/pos/cd-pos-sync-v4.spec.ts`

## 다음 액션 (허브 소관)

- heavy-mac 결과 확인 후 머지 재시도 — `gh pr merge 480 --squash` (허브 Claude 앱/gh 는 workflows 권한 있음).
- 15분 상한 내 heavy-mac 완료 대기는 이 세션에서 하지 않음 (큐 지시).
