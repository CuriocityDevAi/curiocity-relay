---
round: K1-0916-E
pr: https://github.com/CuriocityDevAi/test-portal/pull/111
outcome: 자기 검증 통과 (프로덕션 실측 curl · status-watcher 4상태 정본 · 실 last_activity 정합 · 24h events ndjson 5 hubs · pnpm test 1000 pass · R029 정밀화 착지)
ledger_events:
  - '{"id":"R002","action":"consume","note":"실데이터 확증 · index.json events=69 · requirements=35 · status 4상태 실 push"}'
  - '{"id":"R029","action":"consume","note":"watcher 정밀화 최소 착지 · 4상태 정본 · dormant 필드 신설 대비"}'
kyu_checks:
  - 포털 홈 흐름판 = 4상태 정확 표시 (k0/k1 running · 나머지 idle · 각 last_activity 시각)
  - 24h events ndjson 5 hubs 실 파일 확증 (raw.githubusercontent 3+ line)
  - status/hubs.json curl fresh = built_at 최근 · state=running 만 최근 5분 활동
---

## 요지

3항 소화 · R002 실데이터 + R029 최소 정밀화 완결.

## 1. A1 · 프로덕션 실측 진단

**index.json** (schema v3):
- events count: **69**
- requirements: 35 (K0-0916-F yaml PATCH 후 신 항목 편입)
- rollup: filed=20 · max_age=54d · 🔴=2
- R002 trace5: read/reconcile/issued/landed all seen · priority=false

**status/hubs.json (진단 전)**:
- 6/6 hubs = state=running (부정확 · Kyu 지적 "전부 실행 중")

**원인 규명**:
- **파일**: `tools/kyu-bridge/src/status-watcher.mjs`
- **줄**: line 115 (`procs.find` · 프로세스 발견 시 무조건 running)
- **뿌리**: K1-0915-D 정본 = "Claude 프로세스 존재 = running"
- **해결**: 5분 활동 window 정본 착지 (Kyu K1-0916-E)

## 2. A2 · 4상태 정밀화

**신 정본** (Kyu R029 · 최소):
| state | 조건 |
| --- | --- |
| `running` | 최근 5분 안 tool_use 이벤트 (jsonl 세션 로그) |
| `idle` | 5분↑ tool_use 없음 (프로세스 있어도) |
| `waiting-inquiry` | 심문 파일 존재 & 리포트 없음 |
| `dormant` | DORMANT_HUBS set 표기 (config 신설 대비) |

**신 함수**:
- `loadRecentActivity()` = jsonl 마지막 500 line 파싱 · assistant tool_use timestamp 추출 · 각 hub 별 max ts
- `hasRelayReport()` = `gh api /repos/../contents/<hub>` 안 `-report.md` 존재 (waiting-inquiry 정본)

**폐기**:
- `listClaudeProcesses` (ps + lsof) → 프로세스 폴링 완전 제거
- 프로세스 유무 무관 · 시간 window 기반 정본

## 3. A3 · 재기동 + 24h events ndjson

**재기동 실측** (`docs/audits/K1-0916-E-status-relaunch.log`):
```
[kyu-bridge] fetch-reset · d6399fb2 → 7ea62ac6         ← K0-0916-F auto pull
[status-watcher] tick · n0=idle · t0=idle · m0=idle · k0=running · k1=running · k2=idle · relay=updated
[kyu-bridge] listening on http://127.0.0.1:9876
```

**fresh status/hubs.json (via gh api)**:
```
built_at: 2026-09-16T10:04:00.741Z
  n0: idle    · last_activity=2026-09-14T07:04:41  (2일 전)
  t0: idle    · last_activity=2026-09-16T09:17:08  (45분 전)
  m0: idle    · last_activity=2026-09-16T09:13:09  (50분 전)
  k0: running · last_activity=2026-09-16T10:03:46  (활동 중)
  k1: running · last_activity=2026-09-16T10:03:45  (활동 중)
  k2: idle    · last_activity=2026-09-16T08:51:26  (70분 전)
```

정확 판정 (5분 window 정합) · K1-0915-D "전부 실행 중" 부정확 완결.

**24h events ndjson 실 링크 (2026-09-16 오늘)**:
- https://raw.githubusercontent.com/CuriocityDevAi/curiocity-relay/main/events/k0/2026-09-16.ndjson (9 lines)
- https://raw.githubusercontent.com/CuriocityDevAi/curiocity-relay/main/events/k1/2026-09-16.ndjson (6 lines)
- https://raw.githubusercontent.com/CuriocityDevAi/curiocity-relay/main/events/k2/2026-09-16.ndjson (7 lines)
- events/m0/2026-09-16.ndjson · events/n0/2026-09-16.ndjson = 오늘 이벤트 없음 (지난 파일만 · 정상)

## 4. DOC · BUILD

- SPEC § 11 v1.K1-0916-E · § K1-status-4states · § K1-status-loadRecentActivity · § K1-A1-diag · § K1-A3-relaunch-24h
- state/k1.md Active K1-0916-E 편입 · SPEC 절 1 신설
- tracking/k1.md K77 등재
- docs/audits/K1-0916-E-status-relaunch.log (36 lines)

```
$ pnpm test  →  75 files · 1000 pass
$ pnpm check →  0 err
```

## 5. 원장 대사

- **R002** consume · 실데이터 확증 (프로덕션 index.json · status 4상태 정본)
- **R029** consume · watcher 정밀화 최소 착지 (⚠ 상충 없음 · dormant 필드 신설 대비만)

## 6. 다음 라운드 인수

- **dormant 편입** = config/projects.json 안 `dormant_hubs: []` 신설 (K0 회부 · K1 소유 아님)
- **트레이스 세션 매칭** = trace5 안 seen 시각 = 실 이벤트 timestamp 정본 (별건 강화 · K2 회부 가능)
- **월요일 09:00 WIB backlog push** = cron 자연 트리거 (다음 월요일)

*K1-0916-E · 2026-09-16 · 상태 정밀화 · 배관 허브 8번째 라운드*
