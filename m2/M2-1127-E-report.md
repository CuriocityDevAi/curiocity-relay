# M2-1127-E 리포트

PASS | PR #472 https://github.com/CuriocityDevAi/storeport/pull/472 | 커밋 c6690e7 | **main CI 초록** (d5248b4 · run 45940379648 · success · 16분 40초) | 공백 중 CI 없이 머지된 PR: **0건**

---

## REQ 1 · main CI 초록 여부

| 항목 | 값 |
|------|-----|
| SHA | d5248b4 (#470 머지) |
| 실행 URL | https://github.com/CuriocityDevAi/storeport/actions/runs/45940379648 |
| 소요 | 16분 40초 (04:30Z → 04:47Z) |
| 결론 | **success** |

**잡별 결과**:
- route: success
- markers-and-forbidden: success
- changes-filter: success
- heavy-mac: success
- heavy-cloud: skipped (zero-cloud 정책 · 상시 skip)

---

## REQ 2 · 공백 구간 머지 PR CI 표

공백 구간: 2026-11-26 17:27Z(SHA 413a1de · #467 CI 첫 실패) ~ 2026-11-27 04:30Z(#470 머지)

| PR | 머지 시각 (UTC) | SHA | ci.yml 실행? | 결론 | 비고 |
|----|----------------|-----|-------------|------|------|
| #467 | 11-26 17:27:49Z | 413a1de | **실행됨** | FAIL | 이 PR이 깨진 표현식 도입 · 0초 실패 (파일 파싱 오류) |
| #468 | 11-26 18:02:15Z | 5bc91cb | **실행됨** | FAIL | #467 의 깨진 ci.yml 상속 · 동일 오류 |

**CI 없이 머지된 PR: 0건.**

사후 검증: main CI (#470 → d5248b4) SUCCESS → #467, #468 변경분 모두 사후 통과 확인.

---

## REQ 3 · workflow-lint.yml 신설

**파일**: `.github/workflows/workflow-lint.yml`  
**커밋**: c6690e7

```
트리거: push [main] paths .github/** + pull_request paths .github/** + workflow_dispatch
러너: [self-hosted, curiocity-mac-light]  (ubuntu-latest 0 · M2-1126-S)
타임아웃: 5분
ci.yml 과 독립: ✓ (별도 파일 — ci.yml 파싱 오류 시에도 돈다)
actionlint 설치: 러너 PATH 우선, 없으면 고정 버전 1.7.12 직접 다운로드 (darwin arm64/amd64)
shellcheck: -shellcheck "" 로 비활성화 (pre-existing SC 오탐 방지)
GH 표현식·문법 오류: 잡힌다 ([expression] 타입)
실패 시 출력: 파일:줄:칸: 오류메시지 [종류] 형식
```

**로컬 lint 통과 확인**:
```
$ actionlint -shellcheck "" .github/workflows/*.yml
EXIT 0 — 전체 통과
```

---

## REQ 4 · 검증의 검증

**테스트 브랜치**: `test/M2-1127-E-verify-lint`  
**PR**: https://github.com/CuriocityDevAi/storeport/pull/471  
**실행**: https://github.com/CuriocityDevAi/storeport/actions/runs/45943799349  
**결론**: **FAILURE** ✅ (예상대로 빨강)

**에러 로그 (ci.yml:167)**:
```
── 1.7.12 ──
── 검사 대상: .github/workflows/*.yml ──
.github/workflows/ci.yml:167:42: got unexpected character '+' while lexing expression,
  expecting 'a'..'z', 'A'..'Z', '_', '0'..'9', ''', '}', '(', ')', '[', ']', '.',
  '!', '<', '>', '=', '&', '|', '*', ',', ' ' [expression]
    |
167 |         run: echo "CI_VITE_PORT=${{ 5173 + (github.run_id % 1000) }}" >> "$GITHUB_ENV"
    |                                          ^
Process completed with exit code 1.
```

actionlint 1.7.12이 `/tmp/actionlint` (fallback 다운로드)로 설치되어 실행됨 — light 러너 PATH에 없는 경우에도 fallback 동작 확인.

---

## REQ 5 · fork(agilo-medusa-pos-fork) 복사 가이드

workflow-lint.yml 을 fork 에 그대로 복사 시 바꿀 곳 3줄:

1. `runs-on:` 라벨을 fork 러너 라벨로 변경 (fork 가 ubuntu-latest 허용하면 `[ubuntu-latest]` 가능)
2. 고정 버전 다운로드 URL의 `darwin` → `linux`, `arm64` → `amd64` (Linux CI 러너의 경우)
3. `.github/actionlint.yaml` 의 `self-hosted-runner.labels` 를 fork 러너 라벨로 갱신 (또는 삭제)

(docs/ci-heavy-job.md 의 "workflow-lint 절" 에도 동일 가이드 기재)

---

## REQ 6 · PR 발의

**PR URL**: https://github.com/CuriocityDevAi/storeport/pull/472  
**베이스**: main  
**브랜치**: feat/M2-1127-E-workflow-lint  
**커밋**: c6690e7  
**머지**: 금지 (지시 없음)

**PR #472 CI 현황** (작성 시점):
- actionlint: **pass** 18s (https://github.com/CuriocityDevAi/storeport/actions/runs/45943873442)
- ci(markers-and-forbidden, route 등): 실행 중 (`.github/**` paths 는 ci.yml 트리거 대상 아님 → workflow-lint 만 실행)

---

## 자기 검증

- main CI 실행 URL: https://github.com/CuriocityDevAi/storeport/actions/runs/45940379648 → **success** (직접 확인)
- workflow-lint PR #472 통과 로그: https://github.com/CuriocityDevAi/storeport/actions/runs/45943873442 → **pass 18s** (직접 확인)
- 검증의 검증 빨강 로그: https://github.com/CuriocityDevAi/storeport/actions/runs/45943799349 → **failure** · ci.yml:167 `[expression]` (직접 확인)
- CI "not started" ≠ 초록 원칙 준수: main CI 실행 완료(success) 확인 후 보고
