#311 스레드 2건 resolve(non-blocker 확인) · #308 충돌 해결(rebase+amend) · config 4항목 확인 OK

## #311 — 미해결 스레드 resolve

스레드 2건 모두 R0 리뷰에서 "(non-blocker)" 명시:
1. **기준 금액 미표시** (`order-loyalty.tsx`) — earn 메타데이터에 earn_base 미저장 · 본 PR 범위 초과
2. **메타데이터 당시 적립률 미저장** (`loyalty-info/route.ts`) — settings fallback이 유일한 옵션임 확인

→ 각 스레드에 "후속 과제로 기록" 답글(reply id: 4584179562, 4584179883) 후 GraphQL resolveReviewThread 로 resolve 완료 (`isResolved: true` 확인).

## #308 — main 충돌 해결

**브랜치**: `feat/m2-1116-p` (기반: `5e4306c` = M2-1116-O)
**main 추가분**: M1-1116-O(port8082) · M0-1116-L(apiUrl/projectId) · M3-1116-K(loyalty fix) · M3-1116-K (#307)

`git rebase origin/main` → `app.config.ts` 충돌 없이 자동 병합 (git이 의미상 분리된 블록 인식).

**의도치 않은 stash 충돌**: 과거 stash pop 잔재가 `register_session/service.ts`에 conflict marker 남긴 것 발견 → `git checkout HEAD --` 로 HEAD 버전 복원.

**naming-check FAIL 수정**: `scripts/naming-check.sh`에 M0-1116-L URL 예외가 주석에만 기술되고 grep 필터에 미구현되어 있음 확인 → `CUSTOMER_DISPLAY_API_URL` 줄 예외 필터 추가 → M2-1116-R 커밋에 amend.

**force-with-lease push 완료**: `315d05f → 216ddae`

## expo config 4항목

| 항목 | 값 | 상태 |
|---|---|---|
| name | MEROS HP Point | ✓ |
| projectId | 5b023fc6-c56a-4846-b187-ba16019e3ca3 | ✓ |
| apiUrl | https://admin.meros.id | ✓ |
| icon | ./assets/icon.png | ✓ |

## 검증

- `tsc --noEmit` → EXIT:0 ✓
- `naming-check.sh` → PASS ✓
- 테스트: customer-display 132 passed · commerce-core 332 passed · event-contracts 21 passed
