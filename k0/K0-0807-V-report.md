# K0-0807-V · U 실기 ②③ 이관 · D1 배선 마무리

**round_id**: K0-0807-V
**hub**: k0 (test-portal)
**pr**: test-portal_PR#71 (U 라운드 브랜치 · V 커밋 push)
**branch**: feat/k0-0807-u-approvals-durability
**commit**: 182a1a8 (K0-0807-V · U 실기 ②③ 이관)
**status**: PR body 갱신 · Kyu 잔여 ④approve/⑤curl 대기
**timestamp**: 2026-08-10

## 요지

**K0-0807-U 실기 이관 라운드** — Kyu 문언 = "U 실기 ②③ 이관".
K0 이 대신 수행:
- ② wrangler.toml database_id 편입
- ③ migrations apply --remote 실행

Kyu 잔여:
- ④ PR approve → auto-merge → auto-deploy
- ⑤ 재실기 curl (뿌리 회수 확증)

## 실행 로그 (실측 · Kyu 로컬 l.youngkyu 계정 · 2026-08-10)

### ① wrangler.toml database_id 편입

**파일**: `wrangler.toml`
```toml
[[d1_databases]]
binding = "APPROVALS_DB"
database_name = "approvals-db"
# K0-0807-V · Kyu 실기 이관 (2026-08-10) · database_id 편입 완료.
# Kyu 로컬 CF 계정 (l.youngkyu) · npx wrangler d1 create approvals-db 출력값.
database_id = "514ec7e1-7fdc-45da-9edb-cdedd104c978"
migrations_dir = "migrations"
```

**커밋**: `182a1a8` · push origin/feat/k0-0807-u-approvals-durability.

### ② npx wrangler d1 migrations apply approvals-db --remote

**출력**:
```
 ⛅️ wrangler 4.114.0 (update available 4.120.0)
───────────────────────────────────────────────
Resource location: remote

Migrations to be applied:
┌────────────────────┐
│ name               │
├────────────────────┤
│ 0001_approvals.sql │
└────────────────────┘
? About to apply 1 migration(s)
Your database may not be available to serve requests during the migration, continue?
🤖 Using fallback value in non-interactive context: yes
🌀 Executing on remote database approvals-db (514ec7e1-7fdc-45da-9edb-cdedd104c978):
🌀 To execute on your local development database, remove the --remote flag from your wrangler command.
🚣 Executed 5 commands in 0.52ms
┌────────────────────┬────────┐
│ name               │ status │
├────────────────────┼────────┤
│ 0001_approvals.sql │ ✅     │
└────────────────────┴────────┘
```

**해석**:
- `5 commands` = CREATE TABLE + INDEX 3종 + wrangler 내부 (d1_migrations 등)
- `0.52ms` = 원격 D1 실행 시간
- `0001_approvals.sql ✅` = 정본 적용 확증

### ③ npx wrangler d1 info approvals-db · num_tables 검증

**출력 (요약)**:
```
num_tables            = 2
running_in_region     = WNAM (미서부 · Kyu 지연 정합)
database_size         = 45.1 kB
read_replication.mode = disabled
created_at            = 2026-08-10T07:29:08.306Z
```

**Kyu 요구 vs 실측**:
- Kyu 요구 = `num_tables = 1`
- 실측 = `num_tables = 2`
- **원인**: wrangler `d1 migrations apply` 는 **자동으로 `d1_migrations` 메타 테이블 생성** (마이그레이션 이력 관리). 정상 동작.
- **판정 = 정상 (FAILED 아님)**. approvals + d1_migrations = 2 = wrangler 정본 정합.

### ④ 실 테이블 목록 확증 · sqlite_master 조회

**명령**:
```bash
npx wrangler d1 execute approvals-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name" --json
```

**결과**:
```json
['_cf_KV', 'approvals', 'd1_migrations', 'sqlite_sequence']
```

**해석**:
- `_cf_KV` = Cloudflare D1 내부 (KV 어댑터)
- `approvals` = **우리 정본 테이블** (K0-0807-U migrations/0001)
- `d1_migrations` = wrangler 자동 (이력 관리)
- `sqlite_sequence` = SQLite AUTOINCREMENT 내부 (우리 schema 는 미사용이나 D1 초기화 시 존재 가능)

**num_tables = 2** = `approvals` + `d1_migrations` 만 카운트 (wrangler 가 시스템 테이블 `_cf_KV` · `sqlite_sequence` 제외 정합).

### ⑤ approvals schema 정합 확증

**명령**:
```bash
npx wrangler d1 execute approvals-db --remote --command "SELECT sql FROM sqlite_master WHERE name='approvals'" --json
```

**결과**:
```sql
CREATE TABLE approvals (
	id TEXT PRIMARY KEY,
	hub TEXT NOT NULL,
	round_id TEXT NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('approval','decision')),
	priority TEXT NOT NULL CHECK (priority IN ('normal','high','blocking')),
	question TEXT NOT NULL,
	options_json TEXT,
	context_json TEXT,
	status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','pulled')),
	answer TEXT,
	comment TEXT,
	created_at TEXT NOT NULL,
	decided_at TEXT,
	pulled_at TEXT
)
```

**정합**: migrations/0001_approvals.sql 정본과 완전 일치.

### ⑥ QC 재확증

```
pnpm check → COMPLETED 966 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
pnpm test  → Test Files  51 passed (51) · Tests  676 passed (676)
Duration     8.61s
```

**pass** · 이전 (K0-0807-U merge 前) 상태 유지.

## Kyu 잔여 실기 (PR #71 body 갱신 반영)

- **④ PR approve → auto-merge**
  - Cloudflare Workers Builds auto-deploy (1-3분)
  - 새 version 이 D1 binding `APPROVALS_DB` 활성 소비
- **⑤ 재실기 curl** (T 문서 § 4 Access + Bearer 헤더 3종)
  - POST 200 = 뿌리 회수 확증 (503 아님)
  - GET `/approvals` 브라우저 = 항목 표시 (이전 = "항목 없음" = 뿌리)
  - pull decisions 회수 · 재-pull 0 (idempotent · Q4 원자)

## 원장 · 감사 이력

| 항목 | 값 |
|------|----|
| database_id | 514ec7e1-7fdc-45da-9edb-cdedd104c978 |
| database_name | approvals-db |
| region | WNAM (미서부) |
| replication | disabled (단일 primary · 일관성 최고) |
| created_at | 2026-08-10T07:29:08.306Z |
| migration applied | 0001_approvals.sql (0.52ms) |
| tables | approvals + d1_migrations (num_tables=2) |
| Kyu 계정 | l.youngkyu |

## 후속

- Kyu ④/⑤ 완결 = K0-0807-U 회수 완료 (I+8 실기 차단 4호 종결)
- I+9 = 허브 탭 상세 + 세션 로그 스트림
- REG 회귀 통합 = 별건 라운드 (D1 관계 데이터 확장)

## PR

https://github.com/CuriocityDevAi/test-portal/pull/71
