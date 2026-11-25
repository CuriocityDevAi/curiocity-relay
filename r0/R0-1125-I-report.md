APPROVE

## R0-1125-I — relay PR #31 (M1-1125-E · 러너 pipeline 이벤트 로그) 리뷰

**PR**: https://github.com/CuriocityDevAi/curiocity-relay/pull/31
**브랜치**: `feat/M1-1125-E-pipeline-log`
**버전**: v8.3 → v8.3.1 (파일명 유지)

---

## 체크 결과

| # | 항목 | 결과 |
|---|---|---|
| 1 | 기록 실패 non-fatal | ✓ |
| 2 | push safe-push 경로만 | ✓ |
| 3 | PR 번호 추출 결정적 | ✓ |
| 4 | 파일 수 폭증/충돌 위험 | ✓ 없음 |
| 5 | self-update 감지 방식 | ✓ |
| 6 | preflight + --selftest-pipeline-log 직접 실행 | ✓ |

---

## 상세

**1. 기록 실패 non-fatal**
`runClaim` 내 pipeline 블록 전체 `try { ... } catch { /* noop */ }` 감쌈.
`appendPipelineEvent` 자체도 내부 try/catch → 실패 시 `false` 반환 (예외 미전파).
러너 본 흐름(claim·커밋·push) 차단 없음.

**2. push safe-push 경로만**
`git(['add', 'status/pipeline/${id}.jsonl'])` 로 기존 claim 커밋에 번들.
새 rebase / force push 없음.
`RUNNER_SCOPE_PREFIXES` 에 `'status/pipeline/'` 추가 → out-of-scope 오인 차단.

**3. PR 번호 추출 결정적**
`extractArtifactFromReport` 첫 번째 GitHub PR URL regex 매칭 후 `parseInt(m[2], 10)`.
단일 패스, 동일 입력 → 동일 결과. 모호성 없음.

**4. 파일 수 폭증/충돌 위험 없음**
프롬프트당 1파일 (`status/pipeline/<ID>.jsonl`). ID 고유성으로 충돌 없음.
archive 함수는 호출자 스케줄 별도 — 자동 실행 없음.

**5. self-update 감지 방식 (버전·파일명)**
파일명 유지 (`hub-runner-v8.3.mjs`) + `RUNNER_VERSION` v8.3 → v8.3.1.
`detectUpdate` 는 `hub-runner-install.sh` 에서 타겟 파일명 파싱 후 SHA256 비교(`bytesDiffer`).
머지 후 origin/main 의 `hub-runner-v8.3.mjs` 콘텐츠가 달라지므로 `bytesDiffer: true` 정상 감지.

**6. preflight + --selftest-pipeline-log 직접 실행**

`--selftest-pipeline-log` 실행 결과 (직접):
```
  OK · 1. appendPipelineEvent 가 true 반환
  OK · 1. JSONL 파일 생성됨
  OK · 1. event=queued · got=queued
  OK · 1. id=TEST-001 · got=TEST-001
  OK · 1. hub=m1 · got=m1
  OK · 1. model=sonnet · got=sonnet
  OK · 1. ts ISO 형식
  OK · 2. 줄 수 5 · got=5
  OK · 2. 순서[0] = queued · got=queued
  OK · 2. 순서[1] = started · got=started
  OK · 2. 순서[2] = report · got=report
  OK · 2. 순서[3] = artifact · got=artifact
  OK · 2. 순서[4] = done · got=done
  OK · 2. artifact.pr_number=42 · got=42
  OK · 3. event=blocked · got=blocked
  OK · 3. reason=timeout · got=timeout
  OK · 4. 예외 미전파
  OK · 4. false 반환 · got=false
  OK · 5. PR URL 감지
  OK · 5. repo · got=CuriocityDevAi/storeport
  OK · 5. pr_number=99 · got=99
  OK · 5. PR 없으면 null
  OK · 5. 빈 리포트 null
  OK · 6. 1개 archive · got=1
  OK · 6. 원본 삭제
  OK · 6. archive/ 에 이동
  OK · 6. 새 파일 유지
[selftest-pipeline-log] OK · 6종 테스트 모두 통과
```

기존 preflight 6종:
- `--selftest-stale-lock` → OK
- `--selftest-merge-fail3` → OK
- `--selftest-report-path-off` → OK
- `--selftest-main-guard-d` → OK
- `--selftest-main-guard-e` → OK
- `--selftest-safe-push-detached` → OK

---

## 비고

GitHub 동일 계정으로 self-approve 불가 (API 제한). PR #31 에 COMMENT 리뷰로 APPROVE 판정 기록 완료.
스레드 없음 — resolve 대상 없음.
