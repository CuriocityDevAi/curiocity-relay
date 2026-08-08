# K0-0807-L · v0.3 구현 3탄 · I+3 승인 큐 데이터 계층 (② 정본 · pull 15s + blocking 5s · E2E 왕복)

**허브**: K0 · test-portal
**일자**: 2026-08-08
**상태**: **완료** (PR #64 · **실기 없음** · 다음 Kyu 실기 지점 = I+8 미션 보드)

---

## [실기] · 없음 (내부 계층 · Kyu 명시)

**L = 데이터 계층 라운드**: 스키마 + API + 데몬 배선 + E2E 왕복 실증. UI 편입 = I+8.
**다음 Kyu 실기 지점 = I+8 미션 컨트롤 보드 (승인 큐 UI 편입 시점)**.

### 확인 A · CLI 실측 (Kyu 선택 · 실행 안 해도 됨)

```bash
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge approvals
# → 대기 승인 · 회수 판정 없음 (v0.3 오케 미착지 · 정상)
```

### 확인 B · Kyu clicks 후속 (I+8 편입 or 별건)

- APPROVAL_DAEMON_TOKEN Workers secret 설정 (`wrangler versions secret put`)
- 데몬 config 에 approval_portal_url + approval_daemon_token 편입
- 실제 왕복은 데몬 상주 + Kyu 접속 UI 편입 후 (I+8)

---

## E2E 왕복 실측 로그 (K0 직접 재현)

```
=== 1) 데몬 → 포털 · POST /api/approvals (Bearer daemon token) ===
  응답: {"ok":true,"approval":{"id":"k0-r1-uuid1","hub":"k0","round_id":"K0-0807-L",
  "kind":"decision","priority":"high","question":"CF Worker in-memory or D1?",
  "options":[{"id":"a","label":"in-memory (자작 최소)","k0_recommendation":true},
  {"id":"b","label":"D1"}],"context":{"summary":"승인 큐 저장소 선택"},
  "status":"pending","created_at":"..."}}

=== 2) Kyu 포털 · GET /api/approvals (Access JWT · pending 우선) ===
  대기 승인: 1건
  k0-r1-uuid1 · priority=high · status=pending

=== 3) Kyu 판정 · POST /api/approvals/:id/decision ===
  판정 결과: approved · answer=a · decided_at=2026-08-08T08:18:21.313Z
  comment: 'K0 권고 채택'

=== 4) 데몬 pull loop · GET /api/approvals/pull → local queue enqueue ===
  [approvals] pull 1건 · enqueue 1건
  pull 결과: {"ok":true,"count":1}

=== 5) 로컬 큐 decisions/ 확증 (I+1 queue.mjs 소비) ===
  local queue k0/decisions: 1건
  · id=k0-r1-uuid1 · status=approved · answer=a

=== 6) 재-pollOnce · idempotent (회수 없음 · pulled_at 마크됨) ===
  두 번째 pull: {"ok":true,"count":0}
```

**6 단계 전량 정확 동작 · 왕복 완결 확증**.

---

## 완료 요약

### PR #64 (feat/k0-0807-l-approvals-data-layer · `b42a904`)

- 14 파일 · 1214+ (신설만)
- pnpm check 961 파일 0 err 0 warn
- pnpm test 525 pass (신설 28: store 20 · client 4 · E2E 3 + queue count 정합 1)
- pnpm build ✔
- **PR #62 (J) + #63 (K) 위에 순차 rebase**

### L-1 · 승인 데이터 계층

**src/lib/approvals-store.ts (~200 라인)**:
- **스키마 (§ 4.2 정본)**: id · hub · round_id · **kind(approval|decision)** · priority(normal|high|blocking) · question · options[] · context · **status(pending|approved|rejected|pulled)** · answer · comment · timestamps
- **저장소**: in-memory Map (Workers module singleton)
  - CLAUDE.md § 3 자작 최소 정합 · D1/KV 신설 지양
  - 재기동 loss = 데몬 startup 재적재 (idempotent id 정합)
- **API**: upsertApproval (idempotent) · listApprovals (pending 우선) · decide · pullDecisions (자동 pulled 마크) · markPulled · countByStatus

### L-2 · API 4종 (인증 이원화)

**src/lib/auth/daemon-auth.ts (신설)**:
- `requireDaemonAuth` · Bearer HMAC (`APPROVAL_DAEMON_TOKEN` Workers secret)
- timing-safe 비교 · 자작 최소 deps 0

**API**:
- **POST /api/approvals** (Daemon Bearer) · upsert idempotent · 400 invalid_approval
- **GET /api/approvals** (Access JWT) · Kyu 목록 · hub/status 필터 · pending 우선
- **POST /api/approvals/:id/decision** (Access JWT) · approve|reject + answer + comment · 409 already_decided
- **GET /api/approvals/pull** (Daemon Bearer) · 미회수 반환 + 자동 pulled 마크 · **blocking=1 = 5s 대기 (Q-I-4 확정치)**

### L-3 · 데몬 배선

- **approvals-client.mjs**: postApproval · pullDecisions · Bearer 자동 · timeout 20s · 네트워크 실패 safe
- **approvals-loop.mjs**: 15s pull loop · 5-60s clamp (Q-I-4 정합) · 회수 → queue.enqueue(hub, 'decisions') 허브별 격리
- **commands/approvals.mjs (CLI)**: pending-approval + decisions 큐 요약 (허브별)
- **bin/kyu-bridge**: case 'approvals' 편입

### L-4 · 실증 (28 신설 케이스)

- store 20 (스키마 · idempotent · 정렬 · 상태 전이 · pull · markPulled · count)
- client 4 (Bearer · blocking · 네트워크 실패 · 401)
- E2E 3 (전체 왕복 · 여러 허브 격리 · 재시도 안전)
- queue count 정합 1 (K 라운드에서 처음 편입 · 승인 큐 정합)

---

## 이연 순증감

**implemented (K0-0807-L)**:
- 승인 큐 데이터 계층 (스키마 · in-memory Map · idempotent · 상태 전이)
- API 4종 (인증 이원화)
- 데몬 배선 (client · 15s loop · CLI approvals)
- E2E 왕복 실증 (28 케이스)

**신설 이연 (별건 라운드 · 순차)**:
- **I+4** 원장 공유 스캐폴드 (1일)
- **I+5** headless 세션 (2일)
- **I+6** 자동 투입 루프 (2일 · decisions → session 전달)
- **I+7** 안전장치 4 + 하트비트 (1.5일)
- **I+8** 미션 컨트롤 보드 + 세션 로그 라이브 (2.5일 · **Kyu 실기 지점** · 승인 큐 UI 편입)
- **I+9** 포털 허브 탭 4 + head SHA 재조회 (2일)

**Kyu clicks 후속 (I+8 편입 or 별건)**:
- APPROVAL_DAEMON_TOKEN Workers secret 설정

**병합 순서**:
- PR #62 (J) → #63 (K) → #64 (L) 순차 병합
- 이전 라운드 = 병합 완료

---

## 다음 대기 (Kyu 회신 후)

1. **PR 순차 병합** (실기 없음 · 내부 계층)
2. **I+4 착수 사인** (원장 공유 스캐폴드)
3. 순차: I+5 → I+6 → I+7 → **I+8 (Kyu 실기 지점 · 승인 큐 UI + APPROVAL_DAEMON_TOKEN 세팅)** → I+9

---

*K0-0807-L · 2026-08-08 · v0.3 구현 3탄 · I+3 승인 큐 데이터 계층 · ② 정본 · pull 15s+blocking 5s · E2E 왕복 실증 · 실기 없음 · 다음 실기 = I+8*
