# K0-0807-X · 심문 게시 (loop 상주 파일럿 · v0.3 본체)

**round_id**: K0-0807-X
**hub**: k0 (test-portal)
**목적**: 데몬 안 루프 상주 · dry-run 파일럿 · K0 허브 화이트리스트 저위험
**timestamp**: 2026-08-10

---

## § ② 큐 · 원장 · 스펙 게시

### (1) dispatch 큐
- inbox (7): P2/P5/딥링크 · 무관
- active: 없음
- await-kyu (1 · STALE 14일): P2.2-0

### (2) EPIC-STATE
kyu-orchestrator v0.3 시리즈 · U 사가 종결 + W I+9 착지 후 **본체 조립 라운드**.

### (3) 현행 실측

**부품 준비 상태 (전량 조립 대상)**:
- `queue.mjs` (J) · enqueue/peek/dequeue 파일 큐
- `hubs.mjs` (K) · loadHubs · fallback 4건 · **K0 허브만 필터 가능**
- `approvals-store.ts` (U) · D1 · async · upsert/list/decide/pull
- `session-manager.mjs` (N) · createSessionManager · invoke · heartbeat · evaluateRestart · session-log 파일 append (W)
- `loop-orchestrator.mjs` (O) · createLoopOrchestrator · cycle(trigger) · dry-run 기본 · halt/heartbeat/counter 편입 (P)
- `halt-store.mjs` (P) · isHalted/writeHaltFlag/clearHaltFlag
- `heartbeat-monitor.mjs` (P) · writeHeartbeat · startHeartbeatMonitor
- `alerts.mjs` (P) · 4종 알림 · death dedupe
- `mission-board.mjs` (Q) · buildMissionBoard payload
- `session-log.mjs` (W) · 파일 append/tail
- `server.mjs` (Q · W) · endpoints (mission-board · halt · resume · session-log)

**미착지 (본 라운드 조립)**:
- `serve.mjs` = **loop-orchestrator 상주 미주입** · 인메모리 setInterval 미존재
- 실 loop trigger 발화 없음 (수동 invoke 만 시나리오)
- 폭주 방어 = counter 있음 · **화이트리스트 없음**

**W 실기 관찰 결함 (X-5 대상)**:
- session-log unit test 가 실 `~/.kyu-bridge/logs` 오염 (setSessionLogRoot 소비 안 함)
- **실측**: `find ~/.kyu-bridge/logs -name '*.log'` = 실 tmp 파일 확인 필요

---

## § ③ 심문 게이트

### (a) 확인 질문

**Q1. Loop trigger 소스 (핵심 · 판정 필수)**

Kyu 문언 = "주기적으로 사이클 실행 · relay/큐 판독 → 작업 판단". 3 후보:

- **(a1) setInterval 주기** (예: 60s) · 매 tick 마다 cycle() 발화 · 큐/상태 판독
- **(a2) watcher onNewReport** (relay 감지 시만) · 새 relay 게시 = trigger
- **(a3) 두 방식 병존** = setInterval (배경) + watcher (즉시 반응)

**K0 권고 = (a3) 병존** · 이유:
- setInterval = 큐 신규 항목 · 시간 경과 정합 (예: no_progress · 하트비트 만료)
- watcher = 다른 허브 relay 착지 즉시 반응 (오케 사가 후속)
- 두 소스 모두 cycle(trigger) 호출 · trigger.source 로 구분

**단**: 파일럿 스코프 (K0 만) = watcher 는 k0 relay 만 감지 = 사실상 setInterval 우세. **초판 = (a1) 만** · watcher 편입 별건 승격.

**K0 최종 권고 = (a1) setInterval 초판** · 60s 주기 · watcher 편입 별건.

**Kyu 판정**.

---

**Q2. 파일럿 화이트리스트 정본 (핵심)**

Kyu 문언 = "K0 허브 1개 · 저위험 작업만 (docs 청소류 · 화이트리스트로 명시)".

정확한 정의 필요:
- **작업 판단** = 무엇 기준? 
  - **(b1)** relay/dispatch inbox 파일명 패턴 (예: `20*-docs-*.md`)
  - **(b2)** 최근 라운드 리포트 = 결함 유형 (docs 정정 · 청소류)
  - **(b3)** config 화이트리스트 문언 = `['docs-cleanup', 'spec-typo-fix']` 같은 kind 태그

**K0 권고 = (b3) config 화이트리스트 태그 + 판독 세션 판정** · 이유:
- 자동 = 헤드리스 세션 스스로 판단 · 자동 개입 최소
- config = `loop.pilot.allowed_kinds = ['docs-cleanup', ...]`
- 판독 프롬프트 = "이 작업이 allowed_kinds 에 해당하는가? YES/NO"
- NO = kyu_decision 분기 (승인 큐 적재 · 자동 실행 금지)

**Kyu 판정** · 다른 후보 열려 있음.

---

**Q3. dry-run vs 실 모드 · 파일럿 flag**

기존 `config.loop.live` (K0-0807-O · P) = boolean.

파일럿 = 별도 flag?
- **(c1)** `loop.live=true` = 그대로 실 세션 (기존 정본)
- **(c2)** `loop.pilot=true` + `loop.pilot_hub='k0'` + `loop.pilot_allowed_kinds=[...]` = 파일럿 스코프 명시

**K0 권고 = (c2)** · 이유:
- `loop.live` 만 = 모든 허브 실 발화 (파일럿 초과)
- `loop.pilot` 활성 = pilot_hub 만 · pilot_allowed_kinds 만 실 세션 · 나머지 = dry-run
- Kyu 오케 사인 = pilot.* 설정 완료 · CLI 확인 후만

---

**Q4. 사이클 주기 (setInterval 시간)**

- **(d1)** 60s (분당 1회) · 오케 사가 속도 정합
- **(d2)** 5min · 저부하
- **(d3)** 15s (aggressive · 신속 반응 · claude CLI 시간 소요 대비 과빈도)

**K0 권고 = (d1) 60s** · 이유:
- claude 세션 invoke = 30-120s 소요 · 60s 주기 = 안전 (진행 중 skip · 다음 tick 대기)
- 하트비트 15s · TTL 30s (Q-I-8) = 60s = 4배 여유
- **loop.pilot_interval_ms** = config 조정 가능

---

**Q5. 폭주 방어 정본 (사이클당 세션 1개 · 연속 실패 N회)**

Kyu 문언:
- "사이클당 세션 1개" = 진행 중 세션 있으면 다음 cycle 발화 skip · **K0 권고 = 필수** (mutex 정본)
- "연속 실패 N회 시 자동 정지 + 승인 큐 알림"

**연속 실패 정의 · N 값**:
- **(e1)** no_progress 연속 3회 (Q-I-5 · 기존 P 정본 · **재사용**)
- **(e2)** invoke error (spawn 실패 · timeout) 연속 3회 (새 임계)
- **(e3)** 두 카테고리 별도 counter

**K0 권고 = (e3) 별도**:
- no_progress = 기존 loop-orchestrator counter (P · Q-I-5)
- invoke error = **신규 · pilotInvokeErrorCount** = 3회 도달 시 halt.flag write + kyu_decision approval 적재 ("파일럿 정지 · Kyu 개입 필요")

---

**Q6. K0 파일럿 = hubs 필터**

`loop.pilot.hub = 'k0'` 명시 = pilot_hub 로 부동 · 다른 허브 = skip.
- **폴백**: pilot_hub 미설정 = 파일럿 비활성 (dry-run 로그만)

**K0 권고 = 채택**.

---

**Q7. 승인 게이트 실 배선 (X-2)**

기존 loop-orchestrator = kyu_decision verdict 판정 시 approvalsStore.upsertApproval 소비 (live 모드).

실 배선 = **approvals-client** (kyu-bridge 안) 소비:
- upsert = `createApprovalsClient(config.approval_daemon)` · Access Service Token + Bearer
- 이미 K0-0807-T · U 배선 완료 · **loop-orchestrator 에 approvalsStore 로 주입**

승인 큐 정지 = **halt.flag 편입** or **loop-orchestrator 내부 pending 상태**?
- **(f1)** halt.flag write (이미 있는 정본) · Kyu 재개 = clearHaltFlag + resetNoProgress (기존 UI)
- **(f2)** 새 flag `pending-approval.flag` · Kyu 판정 pull 감지 시 자동 삭제

**K0 권고 = (f1) halt.flag 재사용** · 이유:
- 자작 최소 (별 flag 신설 없음)
- Kyu 명시적 재개 = halt.flag 정본 (SPEC § 7.2 ⓓ 정합)
- **부수**: reason = "kyu_decision_pending · approval_id=<uid>"

---

**Q8. Kyu 판정 pull 감지 · 자동 재개?**

Kyu 판정 완료 = /api/approvals decision endpoint 소비. 데몬은 어떻게 인지?

- **(g1)** approvals-loop (K0-0807-L · pull polling 15s) 편입 · pull 결과 = halt.flag 확인 후 삭제 = 재개
- **(g2)** 수동 재개 (Kyu resume-loop CLI · 홈 [▶ 재개])

**K0 권고 = (g2) 수동만 초판** · 이유:
- 자동 재개 = SPEC § 7.2 ⓓ 정본 "자동 재개 없음" 위배 우려
- Kyu 판정 완료 후 홈 [▶ 재개] 클릭 = 명시적 확증
- 자동 재개 = 별건 (approvals-loop 편입 시)

---

**Q9. 사이클 판독 프롬프트 (Kyu 화이트리스트 판정 기준)**

파일럿 = 판독 세션이 "저위험 docs 청소류인가?" 판정.

**프롬프트 템플릿 (loop-orchestrator READING_PROMPT_TEMPLATE 확장)**:
```
[파일럿 모드 · Kyu 승인 화이트리스트 필터]
현재 파일럿 허브 = <hub>
허용 작업 종류 = <allowed_kinds>

이 작업은 위 화이트리스트에 해당하는가?

응답 형식:
- kind 매치 = verdict='continue' · next_prompt = 작업 프롬프트
- kind 불일치 = verdict='kyu_decision' · question = "파일럿 화이트리스트 밖 · Kyu 승인 필요"
```

**K0 권고 = 채택** · loop-config 확장 (`pilot.prompt_prefix`).

---

**Q10. 폴킹 방어 · 서버 종료 시 loop stop**

serve.mjs shutdown = `watcher.stop() + server.close()`. loop 추가 = `loop.stop()` 도.

- **K0 권고 = loop.stop() 편입** · SIGTERM/SIGINT 시 진행 중 사이클 완결 후 새 발화 차단.

---

**Q11. X-5 tmp 격리 (W 결함 회수)**

W 실기 관찰 = unit test 가 실 `~/.kyu-bridge/logs` 오염.

**실측 확인 필요**:
- `find ~/.kyu-bridge/logs -type f` = 실 파일 존재 여부
- `session-log.test.mjs` = `setSessionLogRoot(tmp)` 편입 완료
- 다른 test?

**K0 권고 = grep · 실측 후 fix** (필요 시 다른 test 파일 격리).

---

**Q12. 테스트 매트릭스 (~20-25 케이스)**

- pilot loop-config 확장 (pilot.hub · pilot.allowed_kinds · pilot.interval_ms)
- serve.mjs loop 상주 편입 (setInterval + shutdown)
- 사이클당 세션 1개 mutex (concurrent cycle 방지)
- invoke error counter (별도 · e3 채택 시)
- 화이트리스트 판독 프롬프트 (파일럿 flag)
- kyu_decision 시 halt.flag write (reason 명시 · f1)
- 홈 재개 후 counter 리셋
- X-5 tmp 격리 회수 (실측 · 다른 test 파일)

**K0 권고 = 승인**.

---

### (b) 충돌 · 중복 지적

**C1.** `loop.live` (기존) vs `loop.pilot` (신설) 의미 겹침. K0 권고 = 파일럿 = live 상위 개념 (pilot 활성 = live 는 pilot_hub 만 · 다른 허브 = dry-run).

**C2.** SPEC § 7.2 ⓓ "자동 재개 없음" vs Q8 (g1) 자동 재개 = 충돌. K0 = (g2) 채택으로 회피.

**C3.** approvals-loop (K0-0807-L pull polling) = **미착지** (K0-0807-U D1 배선 만 · loop 상주 없음). Q8 (g1) 는 이 loop 편입 대기.

### (c) 반론

**R1.** 파일럿 = "저위험 · docs 청소류" · 하지만 **실 Kyu 판정 없이 docs 도 위험** (원장 · SPEC 오변경). 화이트리스트 = **kind 태그만으로 충분?** 파일 경로 필터 (`docs/**` · README.md 등) 편입 권고.

**K0 권고 = kind + path 이중 필터** = pilot.allowed_kinds + pilot.allowed_paths (glob). 판독 세션 = 두 조건 AND 판정.

**R2.** setInterval 60s · claude invoke 30-120s = **다음 tick 시 이전 세션 진행 중 · skip 정합**. 그런데 60s 계속 skip = 3-5 tick 후 자연 완결. OK. 하지만 **hang session** = 무한 대기 · timeout 필요. **timeout = loop-config.readingTimeoutMs (45s) · workTimeoutMs (120s)** 이미 있음 · 재사용.

**K0 권고 = 재사용 · 별도 정본 불요**.

### (d) 역제안

**D1. pilot 활성 상태 = 미션 보드 카드 배지**

파일럿 활성 시 = 카드 안 [PILOT] 배지 표시 (D3 삼중 인코딩 정합). Kyu 실시간 인지.

**K0 권고 = 이번 라운드 편입** · mission-board payload 안 `hubs[].pilot: {active, allowed_kinds, allowed_paths}` 필드.

**D2. 사이클 이력 = ledger LOOP CYCLE 마커 재사용**

기존 loop-orchestrator publish = ledger rounds append. 실 loop 상주 시 자동 축적 · 미션 보드 loop_recent 실 데이터 반영.

**K0 권고 = 채택** · 별 배선 불요.

**D3. CLI `kyu-bridge loop-status` 확장 (파일럿 표시)**

기존 loop-status = mode/timeout/counter/halt. 파일럿 필드 추가 = pilot.active · pilot.hub · 마지막 사이클 시각.

**K0 권고 = 채택** (관측 편의).

---

## 요약 판정 대기 (12 문 · 3 지적 · 2 반론 · 3 역제안)

1. **Q1** trigger 소스 · **K0 권고 = (a1) setInterval 60s 초판 · watcher 편입 별건**
2. **Q2** 파일럿 화이트리스트 정본 · **K0 권고 = (b3) kind 태그 + 판독 세션 판정**
3. **Q3** dry-run/live/pilot flag · **K0 권고 = (c2) loop.pilot.* 별도 스코프**
4. **Q4** 사이클 주기 · **K0 권고 = 60s (config 조정 가능)**
5. **Q5** 폭주 방어 · **K0 권고 = (e3) 사이클 mutex + no_progress 3회 + invoke error 3회 별도**
6. **Q6** K0 허브 필터 · **K0 권고 = pilot.hub 명시**
7. **Q7** 승인 정지 = halt.flag 재사용 · **K0 권고 = (f1)** reason 명시
8. **Q8** 자동 재개 없음 · **K0 권고 = (g2) 수동만 초판** (SPEC § 7.2 ⓓ 정합)
9. **Q9** 판독 프롬프트 확장 · **K0 권고 = 채택**
10. **Q10** shutdown loop.stop · **K0 권고 = 편입**
11. **Q11** X-5 tmp 격리 실측 · **K0 권고 = grep 실측 후 fix**
12. **Q12** 테스트 매트릭스 · **K0 권고 = 승인**
13. **R1** kind + path 이중 필터 · **K0 권고 = 채택**
14. **R2** timeout 재사용 · **K0 권고 = 채택**
15. **D1** 미션 보드 [PILOT] 배지 · **K0 권고 = 편입**
16. **D2** ledger 재사용 · **K0 권고 = 별 배선 불요**
17. **D3** loop-status pilot 표시 · **K0 권고 = 편입**

**정지**: Kyu 회신 후 실행. 즉시 구현 금지.

**게시 방식**: CLAUDE.md § 8 ③-relay 정본 **3회차 정식 적용** (K0-0807-U 첫 · W 두 번째 · X 세 번째 · 규약 상주 소비).

---

## PR 예정
- 브랜치: `feat/k0-0807-x-loop-pilot`
- Kyu 회신 대기 · 회신 후 구현 → PR → k0/K0-0807-X-report.md push
