relay#73: FLOW_PATHS 커버·관문 로직 ✅ · storeport ask-phone-on-display 경로 누락 + storeport 흐름 PR rehearsal 영구 pending 갭 2건 지적 · fork#293: paths↔FLOW_PATHS 11개 일치 ✅ · concurrency 1 ✅ · run #45993173431 빨강(Playwright step 7 실패)

실행 명령:
```
git show origin/feat/M1-1127-I-rehearsal-gate:scripts/oke/merge-gate.mjs > /tmp/merge-gate-r73.mjs
node /tmp/merge-gate-r73.mjs --repo CuriocityDevAi/storeport --pr 474 --json  → flowPr=true
node /tmp/merge-gate-r73.mjs --repo CuriocityDevAi/storeport --pr 478 --json  → flowPr=true
node /tmp/merge-gate-r73.mjs --repo CuriocityDevAi/storeport --pr 479 --json  → flowPr=true
node /tmp/merge-gate-r73.mjs --repo CuriocityDevAi/storeport --pr 480 --json  → flowPr=true
node /tmp/merge-gate-r73.mjs --repo CuriocityDevAi/agilo-medusa-pos-fork --pr 293 --json  → flowPr=false
gh run view 45993173431 --json status,conclusion,jobs  → failure (step 7)
```

## REQ 1 · FLOW_PATHS 커버리지

storeport 5개 패턴 (손님 화면·register_session·customer-flow·CD API·phone-entry) + fork 11개 패턴 모두 흐름 경로 커버 ✅.

**갭 1**: `apps/commerce-core/src/api/admin/pos/orders/[id]/ask-phone-on-display/route.ts` 가 storeport FLOW_PATHS에 없음. PR#478은 `register_session/service.ts` 경유로 flowPr=true 판정됐으나, route.ts 단독 변경 시 비흐름 PR로 빠짐.

**갭 2**: storeport에 `e2e-cd-pos.yml` 없음 → merge-gate가 storeport workflow runs에서 rehearsal 조회 시 항상 "rehearsal: pending" → 모든 storeport 흐름 PR 머지 불가 고정. `decision-rehearsal-gate-20261127` 에 storeport 흐름 PR 운용 방법(companion fork PR 등) 명시 여부 확인 필요.

## REQ 2 · PR head 코드 + concurrency

run #45993173431: "Checkout fork" 단계가 fork PR head(`e25ca79`) 체크아웃 ✅. storeport는 `ci-mirror-main`(main 고정)으로 checkout → storeport PR 변경은 리허설에 미반영.

concurrency: `heavy-curiocity-mac-fork` · `cancel-in-progress: false` → 한 번에 1개 ✅.

## REQ 3 · merge-gate 로직

| 케이스 | 테스트 | 결과 |
|---|---|---|
| 흐름 PR + 리허설 없음 → pending | MG-R2 | ✅ |
| 흐름 PR + 리허설 빨강 → fail | MG-R3 | ✅ |
| 비흐름 PR → 리허설 불요 | MG-R4 | ✅ |
| 검증의 검증 | MG-리허설-검증 | ✅ |
| 기존 주 CI 판정 무변경 | 기존 테스트 유지 | ✅ |

테스트 32개 all pass. 기존 주 CI 로직 무변경 ✅.

## REQ 4 · 코멘트

- relay#73: https://github.com/CuriocityDevAi/curiocity-relay/pull/73#issuecomment-7217851177
- fork#293: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/293#issuecomment-7217856035
