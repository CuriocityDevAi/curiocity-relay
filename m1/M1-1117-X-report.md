#296 rebase OK · 충돌 0 · it.sh 실행 X

## Rebase
- 브랜치: `feat/m1-1116-h-integration-runner` → origin/main (7c28f93) 위로 rebase
- 커밋 1개 (`0cf9e22`) · 자동 충돌 없음 · force-push 완료
- `apps/commerce-core/package.json`: main 변경 전부 보존 + `"test:integration": "bash scripts/it.sh"` 추가 확인

## it.sh --help
스크립트에 `--help` 플래그 없음 → `--help`를 패턴으로 인식,
"❌ 패턴 '--help' 에 맞는 spec 없음" 출력 후 후보 목록 표시 (exit 1).
스크립트 자체는 정상 실행됨.

사용법 (소스 주석):
  bash scripts/it.sh                  # pos + loyalty 전체
  bash scripts/it.sh tenders          # 파일명 패턴 필터

## it.sh tenders (짧은 패턴 1개)
```
▶ 실행할 spec (1개):
    integration-tests/pos/tenders.spec.ts

=== [it.sh] tenders ===
...
TypeError: api.post is not a function
  at post (integration-tests/pos/helpers.ts:58:30)
  at Object.<anonymous> (integration-tests/pos/tenders.spec.ts:143:40)

Test Suites: 1 failed, 1 total
Tests:       96 failed, 96 total
Time: 7.017 s

::warning::[it.sh] tenders failed — continuing

==============================
 pos-integration 결과
 통과: 0 / 1
 실패: tenders
==============================
```

**서버 부팅 실패 → M0-1117-R 버그로 기록 (수정 범위 외)**

pg_isready는 accepting connections 상태이나 Medusa test runner 내부에서 app 초기화 실패.
`api.post is not a function` = medusa-test-runner.ts 407번 줄, app 미부팅 시 나타나는 패턴.
