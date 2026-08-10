# K0-0807-U · 심문 게시 (승인 큐 저장소 정본 변경 · Kyu 판정 필수)

**round_id**: K0-0807-U
**hub**: k0 (test-portal)
**목적**: I+8 실기 차단 = POST 200 → /approvals 목록 "항목 없음" 뿌리 회수
**timestamp**: 2026-08-10

---

## § ② 큐 · 원장 · 스펙 게시

### (1) dispatch 큐
- inbox (7): P2/P5/딥링크 · 무관
- active: 없음
- await-kyu (1 · STALE 14일): P2.2-0 access-before-real-data

### (2) EPIC-STATE
kyu-orchestrator v0.3 시리즈 후속 · K0-0807-T 착지 후 K0-0807-Q/T 두 라운드에서 놓친 다중 인스턴스 뿌리 회수.

### (3) 뿌리 실측 (K0 확증)

**Kyu 실측 뿌리 · Kyu 문언 정합**:
- `src/lib/approvals-store.ts:87` = `const store = new Map<string, Approval>()` = **모듈 싱글턴 in-memory Map**
- 주석 line 11 = "저장소: in-memory Map (Workers module singleton · 재기동 시 loss)"
- **문제**: Cloudflare Workers = 다중 인스턴스 (isolate) · 각 인스턴스 = 별도 module state
- POST 인스턴스 A 에 적재 → GET 인스턴스 B 에서 조회 = 빈 배열 (B module 의 store 는 비어있음)
- **CLAUDE.md § 3 정합 재검토 필요**: "D1 · KV 신설도 지양 (임시 캐시조차)" · **오케 승인 큐는 임시 캐시 아님 · 상태 전이 정합 본질**

**K0-L 로컬 검증의 구멍 (2호)**:
- test/approvals-e2e.test.mjs = Node 프로세스 단일 · module 공유 = 정상 통과
- 실 Cloudflare Workers = isolate 별 module 격리 = 재현 안 됨 (로컬 단일 프로세스 검증의 근본 구멍)

### (4) SPEC 정본 인용

**v0.3.md § 4.4** (line 290-303) = endpoint 4 종. 저장 계층 명시 없음 (자유 재량).
**v0.3.md § 4.5** (K0-0807-T 신설) = 인증 2 계층. 저장 무관.
**Q-I-2 하이브리드 (M 라운드)** = ledger 만 대상 (canonical.md + state.json). approvals 별개.

**wrangler.toml 실측**:
- kv_namespaces: 없음
- d1_databases: 없음
- durable_objects: 없음
- 지금 상태 = 완전 stateless Workers

---

## § ③ 심문 게이트 (본 라운드 = 큰 정본 변경 · Kyu 승인 필수)

### (a) 확인 질문

**Q1. 저장 계층 3 후보 · 정본 판정 (핵심 · Kyu 승인 필수)**

Kyu 성향 = "일관성 우선 · 규모 대비 최소 자작" · CLAUDE.md § 3 "D1/KV 신설도 지양" 과 상충.

| 후보 | 일관성 | 자작량 | 트랜잭션 | 규모 | K0 평가 |
|------|--------|--------|----------|------|---------|
| **(a) KV** | **eventual (~60s)** | 낮음 (get/put/list) | 없음 | TB · 초저비용 | **비적합** · 판정 직후 데몬 pull = stale pending 60s = 원 뿌리 재현 |
| **(b) D1 (SQLite)** | **strong** | 중간 (schema · SQL · migration) | SQL BEGIN/COMMIT | 5GB 무료 | **적합** · 일관성 + 관계 데이터 · REG 회귀 통합 대비 |
| **(c) Durable Object** | **strong (single isolate)** | 높음 (클래스 · fetch · alarm · 배선) | 자연 | 요청당 과금 | **적합** · 일관성 최고 · 자작 자연 |

**K0 권고 = (b) D1**. 이유:
1. **일관성 = strong** (Kyu 정본 정합 · 판정 즉시 pull 가능)
2. **관계 데이터 확장성**: 향후 REG 회귀 관리 통합 (SPEC § 17 · deferred) = case/pr/run 관계 데이터 · D1 자연
3. **schema 명료**: SQL DDL · migration 표준 (`wrangler d1 migrations apply`)
4. **DO 대비 자작 적음**: 클래스 · lifecycle · fetch handler 배선 불요
5. **CLAUDE.md § 3 "지양" 문언 재해석**: "임시 캐시조차 지양" = OK (승인 큐 = **정본 상태**) · 오케 승인 큐 = 자작 대체 불가능 (파일 없음 · GitHub API 도 부적합 · Kyu 판정 원장)

**K0 반론 대비**:
- KV 대안 (a) = 60s stale 허용 시 = 판정 후 데몬 pull 지연 (60s + polling 15s) = 최악 75s 늦음 = 실기 UX 저하
- DO 대안 (c) = 배선 복잡 · lifecycle 관리 자작 (alarm · state · fetch handler) · CLAUDE.md § 3 "자작 프레임워크 신설 금지" 저촉 우려

**Kyu 판정 대상** · K0 권고 = **(b) D1**.

---

**Q2. D1 채택 시 schema 정본**

```sql
CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  hub TEXT NOT NULL,
  round_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('approval','decision')),
  priority TEXT NOT NULL CHECK (priority IN ('normal','high','blocking')),
  question TEXT NOT NULL,
  options_json TEXT,       -- JSON.stringify(ApprovalOption[])
  context_json TEXT,       -- JSON.stringify(ApprovalContext)
  status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','pulled')),
  answer TEXT,
  comment TEXT,
  created_at TEXT NOT NULL,
  decided_at TEXT,
  pulled_at TEXT
);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_hub ON approvals(hub);
CREATE INDEX idx_approvals_pending_pull ON approvals(status, pulled_at)
  WHERE status IN ('approved','rejected') AND pulled_at IS NULL;
```

**K0 권고 = 위 schema** · options/context = JSON blob (relational 확장은 REG 통합 시).
- migration 파일 = `migrations/0001_approvals.sql`
- Kyu 실기 절차 = `npx wrangler d1 migrations apply approvals-db` (production)

---

**Q3. 기존 4 API 계약 변경 (async 필수 · interface 유지)**

현행 approvals-store.ts = 전부 sync (in-memory · Map · 즉시 반환). D1 = 전부 async (Promise). API 계약:
- `upsertApproval(a)` → `Promise<Approval>`
- `listApprovals(filter?)` → `Promise<Approval[]>`
- `getApproval(id)` → `Promise<Approval|undefined>`
- `decide(id, payload)` → `Promise<Approval|null>`
- `pullDecisions(opts?)` → `Promise<Approval[]>`
- `markPulled(ids)` → `Promise<number>`
- `countByStatus()` → `Promise<Record<ApprovalStatus, number>>`

**K0 권고 = 전 함수 async 전환** · SvelteKit route 는 이미 async handler · 자연.
- 데몬 pull idempotent 계약 유지 (concurrent pull 방지 = SQL 원자 UPDATE)
- upsert idempotent 계약 유지 (INSERT OR REPLACE · WHERE status='pending' 조건)

---

**Q4. pullDecisions 원자성 · SQL 정본**

현행 = 조회 후 별도 UPDATE = race condition (두 데몬 동시 pull 시 중복 회수).
D1 = 단일 트랜잭션 · 원자 갱신 정본:

```sql
-- 트랜잭션 안에서:
SELECT * FROM approvals
WHERE status IN ('approved','rejected') AND pulled_at IS NULL;

UPDATE approvals
SET status='pulled', pulled_at=?
WHERE status IN ('approved','rejected') AND pulled_at IS NULL;
```

D1 = statement-level transaction (`db.batch()` API). **K0 권고 = 채택** (원자 정본).

---

**Q5. Kyu 실기 시점 · D1 binding · migration 순서 (배포 순서 중요)**

Kyu 실기 = 아래 순서 (선-반영 필요):
1. **D1 database 생성** (Kyu 실기 · CLI 1회): `npx wrangler d1 create approvals-db`
2. **wrangler.toml 에 database_id 편입** (K0 커밋 · PR body 안내)
3. **migration 실행** (Kyu 실기 · CLI): `npx wrangler d1 migrations apply approvals-db --remote`
4. **PR merge** = auto-deploy · 새 코드가 새 binding 소비
5. **재실기 curl** = POST → 200 (D1 저장) · GET = 목록 표시

**K0 권고 = 이 순서 정본화** · kyu-clicks 문서 신설 (T 문서 옆).

**대안 순서 (D1 생성을 K0 이 수행)**: `wrangler d1 create` 는 API token 필요 · Kyu 로컬 CF 계정 로그인 정합 · **Kyu 실기 정본**.

---

**Q6. wrangler.toml 편입 (database_id)**

```toml
[[d1_databases]]
binding = "APPROVALS_DB"
database_name = "approvals-db"
database_id = "TBD-Kyu-실기-후-편입"
```

**K0 권고 = 편입 · database_id 는 Kyu 실기 후 K0 이 별건 커밋** (또는 Kyu 가 직접 편집).

---

**Q7. 기존 in-memory Map 제거 vs 병존 (fallback)**

- **(e1) 제거**: D1 이 없으면 (env.APPROVALS_DB 미주입) = 500 반환
- **(e2) 병존**: D1 우선 · 미주입 시 in-memory fallback (개발 편의)

**K0 권고 = (e1) 제거** · 이유:
- 결함 뿌리 = in-memory · 그대로 두면 실수로 재발 위험
- 개발 편의 = vitest 안에서 mock D1 or wrangler dev binding 소비 (Cloudflare 공식)
- fallback = 자작 · CLAUDE.md § 3 "임시 캐시조차 지양" 정합

---

**Q8. 테스트 (D1 in local · mock 방식)**

**후보**:
- **(f1) miniflare D1 bindings** (Cloudflare 공식 로컬 D1 · vitest-pool-workers 통합)
- **(f2) sql.js in-memory** (자작 SQL mock)
- **(f3) 자작 stub Map** (트랜잭션 시뮬)

**K0 권고 = (f1) miniflare + vitest-pool-workers** · Cloudflare 공식 · 실 D1 API 검증.
- 단, deps 추가 (vitest-pool-workers · @cloudflare/workers-types 이미 있을 것).
- 자작 최소 정합.
- **대안** = 기존 test 는 in-memory mock 유지 (별도 unit) + 실 D1 E2E 는 Kyu 실기 6단계에서만.

**보수적 권고 = 기존 unit test 는 approvals-store.ts 안 interface 만 mock (테스트 격리) · 실 D1 통합 검증은 Kyu 실기** · deps 추가 없음.

---

**Q9. migration 파일 위치 · schema evolution 규약**

- `migrations/0001_approvals.sql` = 초판
- `migrations/000N_<desc>.sql` = 후속 (예: REG 회귀 통합 시 case_pr 관계 테이블)
- `wrangler d1 migrations create` CLI 로 생성 · Kyu 명시적 실기.

**K0 권고 = migrations/ 디렉터리 신설 · README** (규약 명시).

---

### (b) 충돌 · 중복 지적

**C1.** **CLAUDE.md § 3 자작 최소 · D1/KV 신설 지양** = 현행 정본. Kyu 정본 변경 승인 필요. 이번 라운드가 첫 예외 (오케 승인 큐 = 정본 상태 · 임시 캐시 아님).

**C2.** approvals-store.ts:11 주석 "데몬 startup 시 pending-approval 파일 큐로부터 재적재 (idempotent id)" = **미착지** (파일 큐 fallback 계획만 있음 · Kyu 실측 문제 재현 = 파일 큐 없어도 결함). D1 도입 시 이 계획 폐기 (SPEC § 4 정정 대상).

**C3.** SPEC § 4 저장 계층 정본 불명확 (자유 재량). K0-0807-U = 명시 필요.

---

### (c) 반론

**R1. CLAUDE.md § 3 정본 재해석**: "D1 신설 지양"은 **임시 캐시** 대상 · 승인 큐 = **본질 상태** (Kyu 판정 원장) · 자작 대체 불가능. 예외 명확 근거 있음.

**R2. KV 대안 (60s stale) 은 오케 승인 큐 UX 저하** (판정 후 데몬 회수 최악 75s 지연 · Kyu 실기 대기 시간). 일관성 정본 우선 = D1/DO 만 선택지.

**R3. DO 대안 = 자작 프레임워크 성격** (Class 배선 · alarm · fetch handler) · CLAUDE.md § 5 #3 "자작 프레임워크 신설 금지" 저촉 우려. D1 = SQL = 표준.

---

### (d) 역제안 (관제 통상 필요 UX)

**D1. 배포 순서 검증 · pre-deploy 체크**
- PR merge 前 = D1 binding 존재 확증 (wrangler.toml + wrangler d1 list)
- migration 미실행 시 = Worker 부팅 실패 대신 명확한 500 (`d1_migration_pending`)
- **K0 권고 = 필수** (Kyu 실기 왕복 줄이기)

**D2. 데이터 감사 CLI**
- `kyu-bridge approvals` = 이미 있음 (K0-0807-L) · D1 소비로 전환
- 데몬은 이 CLI 로 실 데이터 조회 가능 (Access Service Token + Bearer + Access 헤더 필수)
- **K0 권고 = 계약 유지** (변경 없음 · client 만 async 전환)

**D3. TTL / 정리 정책**
- pulled_at 이후 30일 자동 삭제 (감사 유지 vs DB 용량)
- **K0 권고 = 이번 라운드 밖** (SPEC § 4 정본 미정 · 별건 · 지금은 무제한)

**D4. countByStatus 미션 보드 편입**
- K0-0807-Q 미션 보드 payload = pending_approvals.count = null (Workers 별도 소비 정본)
- D1 도입 시 = mission-board 도 D1 소비 가능 (동일 Worker 스코프)
- **K0 권고 = 이번 라운드 편입 옵션** · payload.pending_approvals.count 실제 값 반환 (Q4 스키마 유지)

**D5. 테스트 매트릭스 (~15-20 케이스)**
- approvals-store.ts async 전환 · unit test 갱신 (기존 mock 소비)
- D1 schema · migration 파일
- pullDecisions 원자 (concurrent 시뮬)
- countByStatus 미션 보드 편입 (D4 채택 시)
- **K0 권고 = 승인**

---

## 요약 판정 대기 (9 문 · 3 지적 · 3 반론 · 5 역제안)

1. **Q1** 저장 계층 (a KV / b D1 / c DO) · **K0 권고 = (b) D1** · **Kyu 승인 필수** (CLAUDE.md § 3 정본 변경)
2. **Q2** D1 schema 정본 · **K0 권고 = 위 SQL**
3. **Q3** async 전환 · interface 유지 · **K0 권고 = 채택**
4. **Q4** pullDecisions 트랜잭션 원자 · **K0 권고 = SQL 트랜잭션**
5. **Q5** Kyu 실기 5단계 순서 · **K0 권고 = 정본화**
6. **Q6** wrangler.toml 편입 (database_id 는 Kyu 실기 후) · **K0 권고 = 채택**
7. **Q7** in-memory 제거 (e1) vs 병존 (e2) · **K0 권고 = (e1) 제거**
8. **Q8** 테스트 방식 · **K0 보수 권고 = 기존 unit mock 유지 + 실 D1 = Kyu 실기 E2E**
9. **Q9** migrations 디렉터리 + README · **K0 권고 = 채택**
10. **R1** CLAUDE.md § 3 재해석 · **K0 근거 제시**
11. **D1** pre-deploy 검증 · **K0 권고 = 필수**
12. **D4** mission-board payload.pending_approvals.count 실제 값 · **K0 권고 = 편입 옵션**
13. **D5** 테스트 매트릭스 승인 · **K0 권고 = 승인**

**정지**: Kyu 회신 후 실행. 즉시 구현 금지 (CYCLE v1.2 § ③).

**게시 방식**: CLAUDE.md § 8 ③-relay 첫 정식 적용 (K0-0807-T 신설 규약) · 이 파일이 정본 · 터미널 = 요약만.

---

## PR 예정
- 브랜치: `feat/k0-0807-u-approvals-durability`
- Kyu 회신 대기 · 회신 후 구현 → PR → k0/K0-0807-U-report.md push
