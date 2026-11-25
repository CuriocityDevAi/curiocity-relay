PASS

# M0-1125-I — PR #431 CHANGES 1건 마감

## 요약
- 브랜치: `feat/M3-1125-G-settings-impact-preview`
- 머지 커밋 후보: `6d5a658` (push 완료 · `230697f..6d5a658`)
- mergeable: **MERGEABLE** · mergeStateStatus: **CLEAN**

## 변경
1. **C3 — 닉네임 저장 후 왼쪽(저장값) 갱신**
   - `apps/commerce-core/src/admin/routes/pos-settings/sections/NicknameEditor.tsx`: `onSaved?: (v: string) => void` prop 추가 · 저장 성공 + `load()` 뒤 호출.
   - `apps/commerce-core/src/admin/routes/pos-settings/page.tsx`: `<NicknameEditor onSaved={setLocNickname} />`.
2. **previewSnapshot — formatOrderNumber 재사용**
   - `apps/commerce-core/src/admin/routes/pos-settings/lib/previewSnapshot.ts`: `needsOrderNumberHyphen` + 문자열 조립 → `formatOrderNumber(nick, SAMPLE_DATE=2026-11-25, 1001)`. 유효하지 않은 닉네임은 `PIM` 로 폴백. 형식 규칙(하이픈·월 문자) 변경 시 미리보기도 자동 동기화.
3. **Playwright 회귀**
   - `apps/commerce-core/e2e/admin/admin-smoke.spec.ts`: "닉네임 PIM3 저장 → chip 모달 왼쪽(savedValue)에 `PIM3-26B1001` 포함" 테스트 추가.

## 테스트 로그
- 로컬 유닛(해당 파일 범위): `pnpm --filter commerce-core test -- src/admin/routes/pos-settings/__tests__/settingImpact.unit.spec.ts` → **9 passed**.
- 전체 commerce-core 유닛(pre-push hook): **Test Suites: 61 passed, Tests: 683 passed**.
- 타입체크: `pnpm --filter commerce-core typecheck` → 0 error.
- 네이밍 3층: `scripts/naming-check.sh` → PASS.

## CI (PR #431 · 6d5a658)
| check | conclusion |
|---|---|
| markers-and-forbidden | SUCCESS |
| check (feature-map) | SUCCESS |
| changes-filter | SUCCESS |
| route | SUCCESS |
| heavy-mac | SKIPPED (cloud 경로) |
| heavy-cloud | SUCCESS |

## 리뷰 스레드 resolve
| thread id | path | isResolved |
|---|---|---|
| PRRT_kwDOTe-UYs67vTxd | lib/previewSnapshot.ts | true |
| PRRT_kwDOTe-UYs67vT5Z | page.tsx (line 712 · draft lift-up) | true |
| PRRT_kwDOTe-UYs67vT9R | page.tsx (location mode savedValue) | true |

각 스레드에 `반영: 6d5a658` 코멘트 후 `resolveReviewThread` GraphQL 뮤테이션으로 resolved=true 확인.

## 머지
- 셀프 머지 금지 — 러너/리뷰어 소관.
