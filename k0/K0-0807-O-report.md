# K0-0807-O · v0.3 구현 6탄 · I+6 자동 투입 루프

**round_id**: K0-0807-O
**hub**: k0 (test-portal)
**pr**: test-portal_PR#67
**branch**: feat/k0-0807-o-auto-input-loop
**status**: PR 심리 대기 (Kyu 검토 · 실기 없음 · 배포 무관)
**timestamp**: 2026-08-09

## 요지

**I+6 자동 투입 루프 착지** — 감지→판독→분기→투입→게시→재감지 폐쇄.
초판 = **dry-run 안전 기본** · 실 투입은 `config.loop.live=true` 명시 후만.

- **O-1 오케스트레이션**: `createLoopOrchestrator + cycle(trigger)` · 4 단계 (assemble → invoke → parse → publish)
- **O-2 dry-run 안전**: `live===true` 명시만 허용 · 판독 invoke 공통 실행 · 실 작업 invoke = live 전용
- **O-3 4 분기**: continue / kyu_decision / trial_ready / no_progress + unknown (안전 정지)
- **실 claude CLI 판독 실측**: JSON 파싱 · verdict=continue · 42.8s · nextWorkPrompt 805 chars

## 착지 파일

| 파일 | 라인 | 역할 |
|------|------|------|
| `tools/kyu-bridge/src/loop-orchestrator.mjs` | ~230 | 오케스트레이터 · 4 분기 핸들러 · history 20 |
| `tools/kyu-bridge/src/output-parser.mjs` | ~130 | JSON 우선 · bare · heuristic fallback · verdict alias |
| `tools/kyu-bridge/src/loop-config.mjs` | ~55 | default/load/update · live 명시 true 만 |
| `tools/kyu-bridge/src/commands/loop-status.mjs` | ~70 | CLI · 모드 · 최근 사이클 grep · 분기 통계 · LIVE 경고 |
| `tools/kyu-bridge/bin/kyu-bridge` | +5 | dispatcher |
| `tools/kyu-bridge/test/output-parser.test.mjs` | ~90 | 14 케이스 |
| `tools/kyu-bridge/test/loop-orchestrator.test.mjs` | ~180 | 11 케이스 |
| `docs/design/kyu-orchestrator-v0.3.md` | § 6.6 신설 | 착지 표기 (파일 · 라인 · 4 분기 표 · dry-run E2E 실측) |
| `docs/SPEC.md` | v1.34 트레일러 | § 6.6 정본 인용 |

**전체**: 9 files changed · 907 insertions.

## 분기 4종 (canonical 정합)

| Verdict | Action (dry-run) | Action (live) |
|---------|------------------|---------------|
| `continue` | nextWorkPrompt 로그만 · **미실행** | work invoke (claude -p) |
| `kyu_decision` | approvalPayload 로그 · **미적재** | approvalsStore.upsertApproval |
| `trial_ready` | trialSummary 로그 · I+7 알림 hook 대기 | 동일 |
| `no_progress` | signal 로그 · I+7 안전장치 회부 | 동일 |
| `unknown` | 정지 · Kyu 회부 | 정지 · Kyu 회부 |

## 실 claude CLI 판독 실측 (dry-run E2E)

```
=== 1) 모의 리포트 감지 (trigger 시뮬) ===
  report: K0-0807-M 원장 공유 완료 · PR #65 병합 · 다음 = I+5 headless 세션

=== 2) 판독 세션 invoke · 실 claude CLI 호출 ===
  [loop] cycle 시작 · hub=k0 · mode=dry-run · source=test
  [loop] dry-run · work invoke 미실행 · nextWorkPrompt 기록 (805 chars)

=== 3) 판정 결과 ===
  mode: dry-run
  branchTaken: continue
  parseMode: json
  reasoning: "K0-0807-M 원장 공유 완료 · PR #65 병합 · f5ba892 (I+5) 이미 커밋됨.
              트리거는 기술·구현 결정 (headless 세션 후속) · UX/스코프/secret/main
              병합 결정 부재 · CYCLE v1.2 § ③ 심문 게이트만 후속 세션에서 통과하면
              자동 진행 가능."
  next prompt chars: 805
  duration ms: 42892

=== 4) ledger publish 확증 ===
  publishedToLedger: true
  rounds/*.md · LOOP CYCLE 항목: 1

=== 5) 판독 응답 원문 (처음 300자) ===
  ```json
  {
    "verdict": "continue",
    "reasoning": "K0-0807-M 원장 공유 완료 · PR #65 병합 · f5ba892 (I+5) 이미 커밋됨…",
    "next_prompt": "[REQ]\nI+5 (f5ba892 · headless 세션 + 원장 실 시드) 후속 = I+6 착수…"
  }
  ```
```

## loop-status CLI 실측

```
$ kyu-bridge loop-status
kyu-bridge loop-status
  mode:         dry-run (안전 기본)
  readingTimeoutMs: 45000
  workTimeoutMs:    120000

최근 사이클: (없음 · loop 실행 이력 없음)
```

## QC

```
pnpm check → COMPLETED 961 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
pnpm test  → Test Files  44 passed (44) · Tests  602 passed (602) · Duration 6.17s
pnpm build → adapter-cloudflare ✔
```

**신설 25 케이스** = output-parser 14 + loop-orchestrator 11.

## 실기

**실기 없음** (내부 계층 · Kyu 실기 지점 = I+8 미션 보드).

## 후속

- **I+7** 안전장치 4 조건 정밀화 (무진전 counter · 하트비트 15s+TTL 30s · 긴급 정지 · onEvent 알림)
- **I+8** 미션 보드 UI (loop history · sessions · approvals 통합)
- **live 모드 활성화** = 별건 Kyu 사인 (본 PR 은 그릇+안전 스위치만)

## PR

https://github.com/CuriocityDevAi/test-portal/pull/67
