#260 APPROVE

## master vs PR vitest 비교 (clean clone · npm ci)

| | Test Files | Tests |
|--|--|--|
| master | 79 passed (79) | 1011 passed / 6 expected fail / 3 todo |
| PR #260 | 79 passed (79) | 1011 passed / 6 expected fail / 3 todo |

master 도 이미 0 실패 — R0-1125-P 가 보고한 7 파일 실패는 #256(M2-1125-G) 머지 이후 해소됨. PR 적용 후도 동일하게 79 passed.

## 확인 항목

### 1. `.claude/**` exclude 누락 없음
master 79파일 · PR 79파일 — 동일. `__tests__/` 와 `tests/flows/` 는 `.claude/**` 패턴에 걸리지 않으므로 정상 테스트 누락 없음.

### 2. define 중복 키 제거
master 에 `define: { __DEV__: false }` 블록이 2개 존재(identical). PR은 첫 번째 블록(주석 포함)을 제거하고 두 번째를 유지. 값이 동일(`false`)하므로 동작 변경 없음.

## CI `__tests__/` 포함 여부 (`.github/workflows/ci.yml` 확인)

| job | 실행 커맨드 | `__tests__/` 포함? |
|-----|------------|-------------------|
| `assertions` | `node scripts/run-all.mjs assertions` | ❌ (`scripts/*-assertions.mjs` 만) |
| `flow-tests` | `npm run test:flows` → `vitest run tests/flows/` | ❌ (`tests/flows/` 만) |
| `playwright` | `node scripts/run-all.mjs playwright` | ❌ (playwright harness 만) |

**`__tests__/` 를 커버하는 CI job 없음 — 사실 확인됨.** 별도 job 추가 필요 (이 PR 범위 밖).

## 처리

- GitHub PR #260 에 COMMENT(APPROVE 취지) 제출 완료 — 자기 PR approve API 제한으로 COMMENT 대체.
- 스레드 없음 (resolve 대상 없음).
