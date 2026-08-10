# K0-0807-X · v0.3 본체 조립 · loop 상주 파일럿 (K0 허브 · docs 화이트리스트)

**round_id**: K0-0807-X
**hub**: k0 (test-portal)
**pr**: test-portal_PR#73
**branch**: feat/k0-0807-x-loop-pilot
**status**: PR 심리 대기 · Kyu 실기 4단계 (배포 후)
**timestamp**: 2026-08-10

## 요지

**v0.3 본체 조립** — Kyu 사인 "루프가자".
CYCLE v1.2 § ③ 심문 게이트 통과 (K0-0807-X-inquiry.md · **CLAUDE.md § 8 ③-relay 3회차 정식 적용**) · 전 항목 K0 권고 승인.

**부품 조립 · 신규 프레임워크 금지**: J (dispatch 큐) · K (hubs registry) · N (headless 세션) · O (자동 루프 dry-run) · P (안전장치+하트비트) · Q (미션 보드) · U (승인 큐 D1) · W (세션 로그 파이프) 전량 소비.

**파일럿 스코프**: K0 허브 1개 · docs 청소류 화이트리스트 · **타 허브 확장 = 별건 사인**.

## 착지 (10 files · +2,050 insertions)

| 파일 | 라인 | 역할 |
|------|------|------|
| `tools/kyu-bridge/src/loop-config.mjs` | +15 | X-0 · pilot.* 별도 스코프 |
| `tools/kyu-bridge/src/loop-orchestrator.mjs` | +150 | X-1 · Q9 판독 프롬프트 확장 · Q5 mutex + e3 counter · Q7 f1 halt reason · pilot work invoke · 관측 API |
| `tools/kyu-bridge/src/loop-daemon.mjs` | 신설 ~120 | X-2 · Q1 setInterval 60s · Q10 stop 대기 |
| `tools/kyu-bridge/src/commands/serve.mjs` | 재작성 | X-3 · 조립 순서 · shutdown loop.stop 먼저 |
| `tools/kyu-bridge/src/mission-board.mjs` | +30 | X-4 · D1 pilot 배지 |
| `tools/kyu-bridge/src/server.mjs` | +12 | mission-board endpoint · pilot + lastCycleAt 편입 |
| `tools/kyu-bridge/src/commands/loop-status.mjs` | +15 | X-5 · D3 pilot 상태 |
| `tools/kyu-bridge/test/loop-daemon.test.mjs` | 신설 11 case | Q1 · Q10 · mutex |
| `tools/kyu-bridge/test/loop-orchestrator-pilot.test.mjs` | 신설 13 case | Q9 · Q5 e3 · Q7 f1 · pilot invoke |
| `tools/kyu-bridge/test/mission-board.test.mjs` | +3 case | D1 배지 |
| `tools/kyu-bridge/test/session-manager.test.mjs` | +tmp 격리 | X-5-fix Q11 W 결함 회수 |
| `docs/design/kyu-orchestrator-v0.3.md` § 9.15 | 신설 | 착지 표기 (계약 표 · dry-run 전환) |
| `docs/SPEC.md` v1.40 | 트레일러 | 요약 |

## Kyu 판정 계약 (전 항목 승인)

| 항목 | 정본 |
|------|------|
| Q1 trigger | (a1) setInterval 60s 초판 · watcher 별건 |
| Q2+R1 화이트리스트 | (b3) kind + path 이중 AND · 판독 세션 판정 |
| Q3 flag | (c2) loop.pilot.* 별도 스코프 |
| Q4 주기 | 60s (config 조정) |
| Q5 e3 방어 | mutex + no_progress 3회 + invoke error 3회 별도 |
| Q6 hub | pilot.hub 명시 |
| Q7 f1 정지 | halt.flag reason=kyu_decision_pending · approval_id |
| Q8 재개 | 수동만 (SPEC § 7.2 ⓓ) |
| Q9 프롬프트 | pilotSection 편입 |
| Q10 shutdown | loop.stop 먼저 · 진행 tick 자연 완결 대기 |
| Q11 X-5 격리 | setSessionLogRoot(tmp) 편입 |
| R1 kind+path | 두 필드 이중 필터 |
| R2 timeout | 재사용 (readingTimeoutMs/workTimeoutMs) |
| D1 [PILOT] 배지 | payload.hubs[].pilot |
| D2 ledger | LOOP CYCLE 재사용 |
| D3 loop-status | pilot 표시 |

## Kyu 실기 지점 (4단계 · PR body 최상단)

1. **데몬 재설치** (`kyu-bridge uninstall && install`) · loop-daemon 상주 배선 활성
2. **dry-run 관찰** (pilot 비활성 = start no-op) · loop-status 확인
3. **실 파일럿 활성** · config.loop.pilot 편집 · 재기동 · 60s 사이클 관찰 · 홈 [PILOT] 배지 확증 · 하트비트/verdict 실 값
4. **[🔴] 정지 왕복** · halt.flag write · 진행 사이클 자연 완결 · [▶] resume

## QC

```
pnpm check → COMPLETED 969 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
pnpm test  → Test Files  55 passed (55) · Tests  724 passed (724)
pnpm build → adapter-cloudflare ✔
```

**신설 27 케이스** = loop-daemon 11 + pilot 13 + mission-board 3.

## CLAUDE.md § 8 ③-relay 3회차 정식 적용

- 심문 = [`K0-0807-X-inquiry.md`](https://github.com/CuriocityDevAi/curiocity-relay/blob/main/k0/K0-0807-X-inquiry.md) relay 게시 · Kyu 승인
- 규약 상주 소비 (K0-0807-U 첫 · W 두 번째 · X 세 번째)

## 이연 순증감

**스코프 밖 이연 (K0-0807-X · Kyu 명시)**:
- 타 허브 loop 확장 (n0/t0/m0)
- 프롬프트 자동 주입 고도화
- SIGINT halt (SPEC § 7.2 ⓓ)
- 구 PR#40/#43 정리
- watcher onNewReport 통합 (Q1 a3)
- 자동 재개 approvals-loop 편입 (Q8 g1)

**기존 이연 유지**:
- REG 회귀 관리 통합 (SPEC § 17 Deferred)
- 닫힘/병합 이력 뷰
- 홈 [세션 로그 라이브] 링크
- SSE 승격
- pending_approvals.count 실 값 (U countByStatus 준비 완료)
- hubs.json auto-write CLI

## PR

https://github.com/CuriocityDevAi/test-portal/pull/73
