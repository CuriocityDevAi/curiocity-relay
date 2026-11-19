#206 · A Mac 경로 초록 X(runner 미등록) · 클라우드 경로 pos-int 실행 초록 O(10m24s) · C 실패=로컬 O · D busy 정확 O · 충돌 해소 O · 실패 단계 표 실측 O

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/206
branch: ci/M2-1119-J-one-heavy

## 실측 결과

### 클라우드 경로 (force_cloud=true dispatch · run 44474436190)
| job | 결과 | 소요 |
|-----|------|------|
| route | ✅ | 6s |
| flow-tests | ✅ | 2m34s |
| assertions | ✅ | 11m7s |
| heavy-cloud (ubuntu+postgres:16) | ✅ | 10m24s |
| heavy-mac | ⏭ 스킵 | — |

heavy-cloud: checkout ✅ → heavy-steps(setup-node · npm ci · DB ping · npm test) ✅ → postgres:16 서비스 정상

### Mac 경로 (PR push · 자동 route)
- route 출력: destination=mac (curiocity-mac 미등록 → in_progress job 없음 → 로컬 판정)
- heavy-mac: queued 대기 (self-hosted curiocity-mac runner 미등록)
- heavy-cloud: ⏭ 스킵 (destination=mac)
- **결론: Mac runner 등록 시 정상 동작 예상. 미등록 환경에서 대기(by design).**

### 실패 단계 표 실측 (ci-summary #206 코멘트 · SHA 1ccf64a)
```
CI: ❌ 3 failed
| CI / flow-tests | ❌ | 1m 26s |
| CI / route     | ✅ | 8s     |
| CI / heavy-cloud | ⏭ | -1s   |
```
ci-summary 가 flow-tests 단계명과 ❌ 를 정확히 표시 — 요건 충족.

## 수정 내용

### A — heavy-mac / heavy-cloud 분리
- `.github/workflows/ci.yml`: `route` job + `heavy-mac`(self-hosted) / `heavy-cloud`(ubuntu · services:postgres:16) 추가
- `.github/actions/heavy-steps/action.yml`: 공통 단계(setup-node · npm ci · DB ping · npm test) composite action
- 각 job 에서 `actions/checkout@v4` 먼저 실행 후 `./.github/actions/heavy-steps` 호출 (로컬 action 사용 조건)

### B — PR dirty 해소 + force_cloud 입력
- master HEAD 에서 분기 → ci-summary.yml 충돌 없음
- `workflow_dispatch.inputs.force_cloud` 추가 → 클라우드 경로 강제 테스트 가능

### C — 카운트 로직 수정
- `completed + in_progress + queued` heavy-cloud job 모두 카운트
- API 실패 / extra 비정수 / count 비정수 → `_route_mac()` 즉시 반환 (안전 기본값)
- 카운트 직후 3초 후 재확인 1회

### D — Mac busy 판정 정확화
- `runner_name == MAC_HEAVY_RUNNER_NAME` 필터로 ubuntu job 제외
- MAC_HEAVY_RUNNER_NAME 환경변수로 관리 (기본값: curiocity-mac)

## 추가 파일
- `.github/workflows/runner-watch.yml`: 30분 주기 쿼터 감시 · 초과 시 PR 라벨+코멘트
- `docs/ci-heavy-job.md`: 라우팅 구조 문서화
