relay#64: CHANGES · 필수 2건 · 권고 0건 · 테스트 519 pass 0 fail (oke-checkers 16/16)

## 검증 명령 및 결과

### 1. 테스트 실행

```
cd ~/projects/curiocity-relay-wts/R0-1127-I
node --test scripts/test/*.test.mjs
# 519 pass · 0 fail · 20731ms
node --test scripts/test/oke-checkers.test.mjs
# 16 pass · 0 fail (CQP 7 · MG 5 · CR 4)
```

### 2. 실제 PR merge-gate 실행

```
node scripts/oke/merge-gate.mjs --repo CuriocityDevAi/storeport --pr 472
→ MERGE-GATE FAIL CuriocityDevAi/storeport#472 c6690e7
  ✗ 주 워크플로(ci.yml 또는 CI)가 이 head 에서 실행된 기록 없음

node scripts/oke/merge-gate.mjs --repo CuriocityDevAi/storeport --pr 470
→ MERGE-GATE FAIL CuriocityDevAi/storeport#470 ea31e8c
  ✗ 주 워크플로(ci.yml 또는 CI)가 이 head 에서 실행된 기록 없음

node scripts/oke/merge-gate.mjs --repo CuriocityDevAi/curiocity-relay --pr 64
→ MERGE-GATE FAIL CuriocityDevAi/curiocity-relay#64 bb7b30f
  ✗ 주 워크플로(ci.yml 또는 CI)가 이 head 에서 실행된 기록 없음
  ✗ R0 APPROVE 코멘트가 이 head 이후에 없음
```

storeport#472 실제 check runs:
```
cancel-on-close     completed success
heavy-cloud         completed skipped
heavy-mac           completed success
actionlint          completed success
markers-and-forbidden completed success
route               completed success
check               completed success  ← 주 CI (이름 불일치)
changes-filter      completed success
```

진행 중 CI PR: 없음 (현재 없음)

## 필수 1 — merge-gate 거짓 실패: storeport CI 이름 `check` 미인식

storeport의 주 CI는 `check`로 명명되어 있으나 merge-gate는 `'ci'` / `'ci.yml'` / `'ci / ci'` 세 패턴만 인식.
머지된 모든 초록 storeport PR(#472, #470 등)이 "CI 한 번도 실행 안 됨"으로 거짓 실패.
REQ 1 "머지된 초록 PR = PASS" 불충족.

## 필수 2 — ALLOWED_SKIPPED 로직 무효: 허용 목록 외 skipped 거짓 통과

```bash
# 검증 fixture (some-other-job: skipped, NOT in ALLOWED_SKIPPED)
node scripts/oke/merge-gate.mjs --repo CuriocityDevAi/storeport --pr 999 \
  --fixture /tmp/test-skipped.json
→ MERGE-GATE PASS  ← 거짓 통과
```

원인 (merge-gate.mjs 82–96줄):
```js
} else if (conclusion !== 'success' && conclusion !== 'skipped') {
  // 'skipped' 는 이 조건에 걸리지 않음 → ALLOWED_SKIPPED 체크 미도달
  if (!ALLOWED_SKIPPED.some(a => name.includes(a))) { …
  }
}
```
`conclusion==='skipped'` 이면 세 번째 else-if가 false → 모든 skipped run 무조건 통과.
REQ 2 "허용 목록 외 skipped PASS 로 통과하지 않는지" 불충족.

## 정상 확인

| 항목 | 결과 |
|------|------|
| check run 0개 (relay) → PASS 로 내지 않음 | ✓ FAIL + 이유 2개 명시 |
| 가벼운 길 → 보존 요소만 면제, [REQ] 없으면 FAIL | ✓ |
| check-report R0 형식 (`fork#285: APPROVE …`) | ✓ PASS |
| check-report 허브 형식 (`PASS · PR #…`) | ✓ PASS |

## 오늘(11-27) 리포트 전수 직접 실행 (28건)

```
node scripts/oke/check-report.mjs $(find ~/projects/curiocity-relay -name "*1127*report*" | sort)
```

| 파일 | 결과 |
|------|------|
| M0-1127-A | WARN (초록+진행 중 혼재) |
| M0-1127-B~D | PASS |
| M0-1127-E~F | WARN |
| M1-1127-A~D | FAIL (판정 없음) |
| M1-1127-E~F | PASS |
| M2-1127-A~B | FAIL (자기 검증 흔적 없음) |
| M2-1127-C | PASS |
| M2-1127-D~E | WARN |
| M2-1127-F | FAIL (자기 검증 흔적 없음) |
| M2-1127-G | WARN |
| M3-1127-A~B | PASS |
| M3-1127-C | FAIL (자기 검증 흔적 없음) |
| M3-1127-D | PASS |
| M3-1127-E | WARN |
| M3-1127-F | FAIL (자기 검증 흔적 없음) |
| R0-1127-A | PASS |
| R0-1127-B | WARN |
| R0-1127-C | PASS |
| R0-1127-D~E | WARN |
| R0-1127-F | PASS |
| R0-1127-G | FAIL (판정 없음 + 혼재) |
| R0-1127-H | PASS |

PASS 11건 / WARN 10건 / FAIL 7건
