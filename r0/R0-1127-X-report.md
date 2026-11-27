storeport#483: APPROVE·머지됨 (merge c5edf67 · squash · 2026-11-27T13:49:20Z) · fork#293: APPROVE·CI 대기 (e2e · case 1 실서버 FAILURE · 머지 보류) · relay#73: APPROVE (Oke 머지 위임 · CI 없음)

## gh pr merge 출력

```
storeport#483 → gh pr merge --squash (exit 0, no stdout — merged successfully)
mergedAt: 2026-11-27T13:49:20Z
mergeCommit: c5edf673b0f08f9ba6d1c71f385e4085352d09e0
```

## CI 상태

| PR | 주요 체크 | 판정 |
|----|-----------|------|
| storeport#483 | markers-and-forbidden ✓ · actionlint ✓ · heavy-mac ✓ · heavy-cloud SKIPPED | 전부 초록 → 머지 |
| fork#293 | route ✓ · lint ✓ · unit-tests ✓ · flow-tests ✓ · assertions ✓ · playwright ✓ · **e2e·case1 ✗** | UNSTABLE → 머지 보류 |
| relay#73 | (CI 없음) | UNKNOWN → Oke 머지 |

## REQ 1 · 갭 1·2 해소 확인

- **갭 1**: storeport `FLOW_PATHS` 에 `ask-phone-on-display/**`, `phone-entry/**`, `customer-flow/**` 경로 추가 (relay#73 merge-gate.mjs) ✓
- **갭 2**: storeport PR 리허설은 fork `e2e-cd-pos.yml` 런 목록에서 `run-name` 에 storeport sha 포함된 런을 조회 (`REHEARSAL_FORK` 매핑) ✓
- **#483 시크릿 없음 경고 확인**: `FORK_DISPATCH_TOKEN` 미설정 → `exit 0 + ::warning:: skipped: 시크릿 없음` → CI 빨강 없음, heavy-mac SUCCESS ✓

## REQ 2 · merge-gate 판단

시크릿 미설치 환경에서 `rehearsal: pending` 이 머지를 막으면 모든 storeport 흐름 PR 이 blocked → 시크릿 설치 전까지는 경고 처리가 맞음, 엄격 적용은 `FORK_DISPATCH_TOKEN` 설치 후 권장.

## 코멘트

- storeport#483: https://github.com/CuriocityDevAi/storeport/pull/483#issuecomment-7219987405
- fork#293: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/293#issuecomment-7219987939
- relay#73: https://github.com/CuriocityDevAi/curiocity-relay/pull/73#issuecomment-7219989698

## 비고

GitHub는 PR 작성자 본인 APPROVE 불허 (`CuriocityDevAi` = 작성자 = 리뷰어). `reviewDecision: ""` (필수 리뷰 없음) 확인 후 squash merge 직접 실행.
