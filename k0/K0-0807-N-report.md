# K0-0807-N · v0.3 구현 5탄 · I+5 headless 세션 + 원장 실 시드 (Q-I-3 UUID · Q-I-14 재시작 3회 · 실 claude 호출)

**허브**: K0 · test-portal
**일자**: 2026-08-09
**상태**: **완료** (PR #66 · **실기 없음** · 다음 Kyu 실기 지점 = I+8 미션 보드)

---

## [실기] · 없음 (내부 계층 · Kyu 명시)

**N = 세션 관리자 + 실 claude 호출 검증**. UI 편입 = I+8.
**다음 Kyu 실기 지점 = I+8 미션 컨트롤 보드**.

### 확인 A · 시드 재현 (Kyu 선택)

```bash
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge ledger seed \
  ~/projects/test-portal/docs/seed/orchestrator-seed-v1.json --overwrite
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge ledger
```

### 확인 B · sessions CLI

```bash
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge sessions
# → 4 허브 · 예정 UUID · n0 active_round=N0-0730-Z9
```

### 확인 C · § 6.5 · SPEC v1.33

문서 판독 · UUID + CLI 실측 확증.

---

## 완료 요약

### PR #66 (feat/k0-0807-n-headless-session · `aa960c6`)

- 9 파일 · 1044+ (신설만)
- pnpm check 961 파일 0 err 0 warn
- pnpm test 577 pass (신설 25: session-manager 17 · prompt-assembler 8)
- pnpm build ✔
- main 직접 기반 (J/K/L/M 병합 완료 · main HEAD 5eb6a8d M)

### N-0 · 원장 실 시드 (오케 제공 · Kyu SEED 변환)

**docs/seed/orchestrator-seed-v1.json (신설)**:
- **canonical** (원문 유지 · 862 chars):
  - 분기 기준 (자동 vs Kyu 게이트)
  - 라운드 규약 (4-block · ID · relay push · PR 형식 · docs-only auto-pass)
  - 포트 정본표 (todoboss 4000/4173 · grownest 3000/3002 · storeport 3010/3011)
  - 품질 규약 (실 DOM · react-hooks/rules-of-hooks · 자산 이식)
- **state** (v1 · 4 허브 스냅샷 · rounds_index K0-0807-M done)
- **hubs 4개** (스키마 변환 적재):
  - k0: idle · next=I+5(본 라운드)
  - n0: running · active=N0-0730-Z9 · PR#288 approve 목전 · Z10 예약
  - t0: idle · M+N 통합 실기 대기
  - m0: idle · AL Expo Go 실기 12단계 (fork_PR#2)
- **rounds 2026-08-09**: K0-0807-M done · PR#65

**실 적재 확증**:
```
seed 완료: written=7 · skipped=0 · overwrite=false
  written: canonical, state, hubs/k0, hubs/n0, hubs/t0, hubs/m0, rounds/2026-08-09

ledger summary:
  canonical:  OK (862 chars)
  state:      v1 · hubs=4 · rounds=1
  hubs:       k0, m0, n0, t0
  recent:     2026-08-09
```

### N-1 · Headless 세션 관리자 (§ 6 정본)

**tools/kyu-bridge/src/session-manager.mjs (~240 라인)**:
- **makeSessionId(hubKey)** = deterministic UUID v5-style (SHA-256 `orch-<hubKey>` → UUID)
  - **Q-I-3 정합**: claude CLI `--session-id` valid UUID 요구 · 재호출 시 동일 UUID
- transition · 6 상태 lifecycle + ledger writeHub sync + event 기록 (최근 50건)
- heartbeat · lastHeartbeatAt 갱신
- **evaluateRestart(hubKey, onEvent?)** · Q-I-14 정합:
  - MAX_RESTART_ATTEMPTS = 3
  - 4번째 = decision:'death' + onEvent hook (죽음 알림 · I+7 편입)
- resetRestartCount · getSession · listSessions
- **invoke(opts)** · spawn claude -p --session-id + prompt · timeout · error 안전
  - stdout/stderr 캡처 · exitCode · durationMs
  - 성공 → idle · 실패 → stuck

**tools/kyu-bridge/src/prompt-assembler.mjs (~120 라인)**:
- **assemblePrompt(ctx)** · **조립·실행 분리 (§ 6.3 정본)**
- 편입: canonical → hub state → decisions 큐 (기본) → pending (옵션) → roundPrompt
- sections/charCounts 감사 반환 · maxDecisions cap · payload.id 우선

**tools/kyu-bridge/src/commands/sessions.mjs**:
- CLI `kyu-bridge sessions` · ledger read · 미시작 = 예정 UUID 표시

### N-2 · 실증 (25 신설 케이스 + 실 claude CLI)

**session-manager.test.mjs (17)**:
- Q-I-3 UUID (v5 정합 · 재호출 동일 · 허브 격리)
- lifecycle transition
- heartbeat
- Q-I-14 evaluateRestart (MAX=3 · 4번째 death · reset · 허브 독립)
- invoke spawn mock (성공/error/exit non-zero/extraArgs 순서)
- listSessions

**prompt-assembler.test.mjs (8)**:
- hubKey required · 조립 · decisions 편입 · maxDecisions cap · 허브 격리 · 빈 ledger

### 실 claude CLI 호출 실측 (K0 직접 재현)

```
=== 1) makeSessionId · deterministic UUID ===
  session-id (k0-e2e): 758b72bd-d1a0-537e-86a8-1f42d89574db
  재호출 동일: true

=== 2) 실 claude CLI 호출 · 판독형 무해 프롬프트 ===
  claude -p --session-id 758b72bd-... --no-session-persistence 'Reply with OK'
  ok: true · exitCode: 0 · durationMs: 10268
  stdout: "OK\n" (판독형 응답 정확)
  sessionId (전달): 758b72bd-d1a0-537e-86a8-1f42d89574db
```

**정합 확증**:
- deterministic UUID = 매 호출 동일 (Q-I-3 재접속 정합)
- 실 claude CLI 는 UUID 형식 요구 → 우리 makeSessionId 정합
- 판독형 응답 정확히 회수 (stdout "OK\n")

---

## 이연 순증감

**implemented (K0-0807-N)**:
- 원장 실 시드 (canonical + state + hubs + rounds · 오케 제공)
- session-manager (Q-I-3 UUID · lifecycle · Q-I-14 restart · invoke)
- prompt-assembler (조립·실행 분리)
- CLI kyu-bridge sessions
- 실 claude 호출 실측

**신설 이연 (별건 라운드 · 순차)**:
- **I+6** 자동 투입 루프 (2일 · 조립기+실행기 orchestration · trigger 감지)
- **I+7** 안전장치 4 + 하트비트 (1.5일 · evaluateRestart onEvent hook 편입)
- **I+8** 미션 컨트롤 보드 (2.5일 · **Kyu 실기 지점** · sessions/ledger 데이터 소스)
- **I+9** 포털 허브 탭 4 + head SHA 재조회 (2일)

**병합 순서**:
- PR #66 (N) = Kyu 사인 후 병합
- 이전 라운드 = 병합 완료

---

## 다음 대기 (Kyu 회신 후)

1. **PR #66 병합** (실기 없음)
2. **I+6 착수 사인** (자동 투입 루프 · trigger 감지 · 조립+실행 orchestration)
3. 순차: I+7 → **I+8 (Kyu 실기 지점)** → I+9

---

*K0-0807-N · 2026-08-09 · v0.3 구현 5탄 · I+5 headless 세션 + 원장 실 시드 · Q-I-3 UUID + Q-I-14 재시작 3회 · 실 claude CLI 호출 실측 · 실기 없음 · 다음 실기 = I+8*
