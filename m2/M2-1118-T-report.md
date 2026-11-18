#382 정리 · diff 파일 5개 · 충돌 해소 O · it O

## 처리 요약

- 방법: cherry-pick 충돌 (add/add: customer-display-me.spec.ts · pin-audit.spec.ts) → 중단 후 직접 적용
- origin/main 기반 임시 브랜치(tmp/rb2b-clean)에서 R-B2b 5파일 직접 작성 후 force-with-lease push

## diff 확인 (origin/main...origin/refactor/M2-1118-R-rb2b-order-snapshot)

```
 apps/commerce-core/eslint.config.ts                |  2 +-
 register_session/models/order-snapshot.ts          | 64 +---------------------
 register_session/order_snapshot/model.ts           | 64 ++++++++++++++++++++++
 register_session/service.ts                        |  2 +-
 docs/feature-map.yaml                              |  1 +
 5 files changed, 70 insertions(+), 63 deletions(-)
```

다른 PR diff 0 — linux-check.yml · customer-display-me.spec.ts · pin-audit.spec.ts · M0-1118-J 커밋 없음.

## 테스트 결과

- commerce-core unit: 539/539 PASS (47 suites)
- customer-display vitest: 166/166 PASS (10 files)
- event-contracts vitest: 21/21 PASS (2 files)
- TypeScript .ts 파일 에러: 0 (249개 에러는 기존 .tsx admin UI 무관)

## PR #382 머지 가능성

- mergeable: MERGEABLE
- mergeStateStatus: UNSTABLE (force-push 후 CI 재실행 중)

## 비고

- order_snapshot/model.ts: M0-1118-J의 pos_screen/seq 필드 포함하여 작성 (cherry-pick 버전에 없었던 필드 보완)
- models/order-snapshot.ts: re-export 3줄로 교체
- service.ts: import ./models/order-snapshot → ./order_snapshot/model
