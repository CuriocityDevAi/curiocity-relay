PASS

## M1-1125-E — pipeline-log 이벤트 기록

**PR**: https://github.com/CuriocityDevAi/curiocity-relay/pull/31
**브랜치**: `feat/M1-1125-E-pipeline-log`
**버전**: v8.3 → v8.3.1 (파일명 유지)

---

## selftest 로그

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

preflight (기존):
- `--selftest-stale-lock` → OK
- `--selftest-merge-fail3` → OK
- `--selftest-report-path-off` → OK
- `--selftest-main-guard-d` → OK
- `--selftest-main-guard-e` → OK
- `--selftest-safe-push-detached` → OK

---

## 이벤트 예시 jsonl

```jsonl
{"ts":"2026-11-25T03:10:00.000Z","id":"M1-1125-X","hub":"m1","event":"queued","model":"sonnet"}
{"ts":"2026-11-25T03:10:05.000Z","id":"M1-1125-X","hub":"m1","event":"started"}
{"ts":"2026-11-25T03:52:11.000Z","id":"M1-1125-X","hub":"m1","event":"report"}
{"ts":"2026-11-25T03:52:11.100Z","id":"M1-1125-X","hub":"m1","event":"artifact","repo":"CuriocityDevAi/storeport","pr_number":99,"head_sha":"abc123def456"}
{"ts":"2026-11-25T03:52:11.200Z","id":"M1-1125-X","hub":"m1","event":"done"}
```

---

## 구현 요약

| 항목 | 내용 |
|---|---|
| 신규 파일 | `scripts/lib/pipeline-log.mjs` |
| 수정 파일 | `scripts/hub-runner-v8.3.mjs` (v8.3.1) · `docs/hub-runner.md` |
| 테스트 | `scripts/test/hub-runner-pipeline-log.test.mjs` |
| 이벤트 형식 | `{ts, id, hub, event, ...extra}` NDJSON · 프롬프트당 1파일 |
| push 경로 | claim 커밋에 번들 (`git add status/pipeline/<ID>.jsonl`) |
| non-fatal | try/catch 전 구간 · 기록 실패가 러너 본 동작을 막지 않음 |
| RUNNER_SCOPE | `status/pipeline/` 추가 |
| archive 함수 | `archiveOldPipelineLogs(repoRoot)` — 14일 초과 → archive/ 이동 (스케줄 별도) |
