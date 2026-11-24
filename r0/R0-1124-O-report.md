CHANGES (1건)

## R0-1124-O — #249 재리뷰 결과

### 검증 항목

| 항목 | 판정 |
|------|------|
| `estimatedItemSize` 코드 제거 | ✅ diff 에 없음 — 완전히 삭제됨 |
| `flex:1` 래퍼 + `paddingBottom:72` 코드 | ✅ `sell.tsx` 반영 완료 |
| `sell.tsx` 코드 주석 원인 정정 | ✅ Yoga 높이 체인 설명으로 교체됨 |
| PR 본문 원인 설명 정정 | ❌ 미수정 |
| sell-scroll 하네스 포트 충돌 수정 (M3-1124-G) | ✅ `playwright.config.sell.ts` port 4322 |
| CI 전체 초록 | ✅ route/assertions/flow-tests/playwright 모두 pass |
| sell-scroll 9케이스 CI 실제 실행 | ✅ `m3-1124-d-sell-scroll-playwright.mjs` · PASS · 27.4s |
| master(#248) 과 mergeable | ✅ `mergeStateStatus: CLEAN` |
| PR 제목 "estimatedItemSize" 잔존 | ⚠️ 지적만 |

### 필수 수정 (1건)

**PR 본문 `## Summary` 원인 설명 미정정**

- 현재 본문이 여전히 `estimatedItemSize` 미설정을 원인으로, `estimatedItemSize={220} 추가`를 수정으로 기술
- 실제 코드에 `estimatedItemSize` 없음 (R0-1124-E 검증대로 FlashList 2.3.2 에서 무시되는 prop)
- 실제 유효 fix 는 `flex:1` 래퍼 + `paddingBottom:72` 두 개뿐
- PR body 를 실제 코드와 일치하도록 갱신 필요

### PR 제목

`estimatedItemSize` 잔존 — 머지 담당자가 교정 예정이므로 차단하지 않음.

### PR 코멘트

본인 PR이라 REQUEST_CHANGES 제출 불가 → COMMENT 로 판정 전달 완료.
