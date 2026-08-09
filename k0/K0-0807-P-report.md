# K0-0807-P · v0.3 구현 7탄 · I+7 안전장치 4 + 하트비트

**round_id**: K0-0807-P
**hub**: k0 (test-portal)
**pr**: test-portal_PR#68
**branch**: feat/k0-0807-p-safety-heartbeat
**status**: PR 심리 대기 (Kyu 검토 · 실기 없음 · 배포 무관)
**timestamp**: 2026-08-09

## 요지

**I+7 안전장치 4 + 하트비트 착지** — CYCLE v1.2 § ③ 심문 게이트 통과 후 진행.
Kyu 회신 전 항목 K0 권고 채택 (Q1-Q8 · D1-D5 · C3 재사용).

- **P-0** SPEC § 9.5 `60s` 문언 → `30s` 정정 (Q-I-8 정본 · R1)
- **P-1** 무진전 counter · verdict 기반 리셋 (Q6) · 3회 도달 = halt.flag write + 알림 + SAFETY event
- **P-2** 하트비트 별건 파일 (SPEC § 9.5 · Q2) · 데몬 대리 (Q4 · cycle + setInterval 15s) · TTL 30s (Q-I-8)
- **P-3** `stop-loop`/`resume-loop` CLI (Q1 · 원장 무결) · halt.flag persistence (D5) · 허브별 + global (Q-I-11)
- **P-4** 알림 4종 세만틱 계층 (Q7 문구 · Q8 notifier 유지) · death dedupe (D2)

## 착지 파일 (16 files changed · +1745 insertions)

| 파일 | 라인 | 역할 |
|------|------|------|
| `tools/kyu-bridge/src/halt-store.mjs` | ~90 | writeHaltFlag/clearHaltFlag/isHalted · 허브별 + global · fail-safe |
| `tools/kyu-bridge/src/heartbeat-monitor.mjs` | ~120 | writeHeartbeat (SPEC § 9.5 · atomic) · isExpired · scanExpired · startHeartbeatMonitor |
| `tools/kyu-bridge/src/alerts.mjs` | ~90 | sendAlert 4종 프리셋 · death dedupe · clearDeathDedupe |
| `tools/kyu-bridge/src/loop-orchestrator.mjs` | ~430 (+170) | § 6.6 확장 · halt 체크 skip · heartbeat write · counter · SAFETY event |
| `tools/kyu-bridge/src/loop-config.mjs` | +3 필드 | noProgressThreshold(3) · heartbeatIntervalMs(15000) · heartbeatTtlMs(30000) |
| `tools/kyu-bridge/src/commands/stop-loop.mjs` | ~25 | CLI |
| `tools/kyu-bridge/src/commands/resume-loop.mjs` | ~15 | CLI |
| `tools/kyu-bridge/src/commands/loop-status.mjs` | ~135 (+70) | 하트비트 · counter · halt flag 표시 확장 |
| `tools/kyu-bridge/bin/kyu-bridge` | +10 | stop-loop/resume-loop dispatcher |
| `tools/kyu-bridge/test/halt-store.test.mjs` | 10 case | 허브별·global·persistence·read |
| `tools/kyu-bridge/test/heartbeat-monitor.test.mjs` | 10 case | schema · TTL · atomic · scan · monitor |
| `tools/kyu-bridge/test/alerts.test.mjs` | 9 case | 4종·dedupe·격리 |
| `tools/kyu-bridge/test/loop-orchestrator-safety.test.mjs` | 8 case | E2E (P-1·P-2·P-3·P-4) |
| `tools/kyu-bridge/test/loop-orchestrator.test.mjs` | 기존 · beforeEach 확장 | halt/heartbeat root 격리 |
| `docs/design/kyu-orchestrator-v0.3.md` | § 6.7 신설 · § 9.5 정정 | 착지 표기 · P-0 |
| `docs/SPEC.md` | v1.35 트레일러 | 인용 |

## Kyu 판정 계약 요약

| 항목 | 정본 | 소비 파일 |
|------|------|-----------|
| Q1 CLI 이름 | `stop-loop`/`resume-loop` (SIGINT halt = I+8 별건) | commands/stop-loop.mjs · resume-loop.mjs |
| Q2 하트비트 매체 | SPEC § 9.5 별건 파일 + hubs 요약 유지 | heartbeat-monitor.mjs |
| Q3 TTL | 30s (Q-I-8 · § 9.5 `60s` 정정) | loop-config.mjs · design.md § 9.5 |
| Q4 배출 주체 | 데몬 대리 (cycle + setInterval) | loop-orchestrator.mjs · heartbeat-monitor.mjs |
| Q5 counter 매체 | 메모리 Map (데몬 재시작 = 리셋) | loop-orchestrator.mjs noProgressCounters |
| Q6 진전 판정 | verdict 기반 (no_progress 만 counter++) | loop-orchestrator.mjs 7) 로직 |
| Q7 문구 | 4종 default 채택 | alerts.mjs buildPreset |
| Q8 notify 분리 | notifier.mjs 유지 · alerts 는 세만틱 계층 | alerts.mjs |
| D1 config | 3필드 추가 | loop-config.mjs |
| D2 dedupe | death 만 · 허브별 | alerts.mjs |
| D3 CLI | loop-status 확장 | commands/loop-status.mjs |
| D5 persistence | halt.flag 재기동 유지 (uninstall --purge 예외) | halt-store.mjs |
| C3 재사용 | evaluateRestart onEvent 훅 (K0-0807-N) 재구현 금지 | heartbeat-monitor.mjs 별건 파일 관측 계층 |

## E2E 흐름 (P-5 실증)

```
1) no_progress cycle 1회  → counter=1 · halt 없음
2) no_progress cycle 2회  → counter=2 · halt 없음
3) no_progress cycle 3회  → counter=3 · noProgressLimitReached=true
                           → halt.flag write · sendAlert('no_progress', count=3)
                           → SAFETY event ledger append
4) 다음 cycle              → branchTaken='halted' · skippedDueToHalt=true
                           → invoke 미호출 (원장 무결)
5) kyu-bridge resume-loop k0 → halt.flag 삭제
6) resetNoProgress('k0')  → counter=0
7) 다음 cycle              → branchTaken='continue' (정상 재개)
```

## K0 CLI 실측

```
$ kyu-bridge stop-loop k0 --reason "K0-0807-P dry-run test"
[stop-loop] halt.flag write → /Users/kyu.lee/.kyu-bridge/queue/k0/halt.flag
  scope: k0
  reason: K0-0807-P dry-run test
  재개 = kyu-bridge resume-loop k0
  halted_at: 2026-08-09T00:10:53.415Z

$ kyu-bridge loop-status
kyu-bridge loop-status
  mode:              dry-run (안전 기본)
  readingTimeoutMs:  45000
  workTimeoutMs:     120000
  noProgressLimit:   3 (Q-I-5)
  heartbeatInterval: 15000 ms
  heartbeatTtl:      30000 ms (Q-I-8)

허브 상태 (halt · 하트비트 · counter):
  ⛔ k0     · hb=(없음)       · state=-        · task=-
  ○ n0     · hb=(없음)       · state=-        · task=-
  ○ t0     · hb=(없음)       · state=-        · task=-
  ○ m0     · hb=(없음)       · state=-        · task=-

$ kyu-bridge resume-loop k0
[resume-loop] halt.flag 삭제 · scope=k0 · 재개 가능
```

## QC

```
pnpm check → COMPLETED 961 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
pnpm test  → Test Files  48 passed (48) · Tests  639 passed (639) · Duration 5.18s
pnpm build → adapter-cloudflare ✔
```

**신설 37 케이스** = halt-store 10 + heartbeat-monitor 10 + alerts 9 + safety E2E 8.

## 실기

**실기 없음** (내부 계층 · Kyu 실기 지점 = I+8 미션 보드).

## 후속 (이연 순증감)

- **I+8** 미션 보드 UI · halt/heartbeat/counter 시각화 (⛔ · 💗/💀 · counter) + [🛑] 버튼 (SPEC § 7.2 ⓓ SIGINT halt · 다른 정본)
- session 하트비트 스코프 파일 표기 (실 session_pid 프로세스)
- counter persistence = 별건 EPIC (현재 = 메모리 · 데몬 재기동 시 리셋 = 새 관측 정본)

## PR

https://github.com/CuriocityDevAi/test-portal/pull/68
