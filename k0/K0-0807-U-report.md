# K0-0807-U · I+8 실기 차단 4호 회수 · 승인 큐 저장소 D1 정본

**round_id**: K0-0807-U
**hub**: k0 (test-portal)
**pr**: test-portal_PR#71
**branch**: feat/k0-0807-u-approvals-durability
**status**: PR 심리 대기 · **⚠ Kyu 실기 § 1-3 merge 前 필수** (D1 provisioning)
**timestamp**: 2026-08-10

## 요지

**Kyu 실측 08-09 · I+8 실기 차단 4호 회수** — CYCLE v1.2 § ③ 심문 게이트 통과 (K0-0807-U-inquiry.md 정본 첫 정식 적용) · Kyu 승인 후 구현.

- **뿌리**: `approvals-store.ts:87` in-memory `Map` 이 Workers 다중 isolate 간 module state 공유 안 됨 (POST 인스턴스 A · GET 인스턴스 B = 별도 store)
- **K0-L 로컬 단일 프로세스 검증의 구멍 2호** (1호 = K0-0807-T loadHubs 미편입)
- **정본**: **Cloudflare D1 (SQLite)** · Kyu Q1(b) 승인
- **CLAUDE.md § 3 예외 명시**: "D1/KV 신설 지양" = 임시 캐시 대상 · 승인 큐 = **정본 상태** 예외

## 착지 (14 files · +1,164 insertions · -226 deletions)

| 파일 | 라인 | 역할 |
|------|------|------|
| `CLAUDE.md` § 3 | +9 | D1 예외 명시 · 오케 승인 큐 = 정본 상태 |
| `wrangler.toml` | +14 | `[[d1_databases]]` binding APPROVALS_DB · migrations_dir |
| `migrations/0001_approvals.sql` | 신설 | Q2 schema (id/hub/round_id/kind/priority/question/options_json/context_json/status/answer/comment/created_at/decided_at/pulled_at + INDEX 3종) |
| `migrations/README.md` | 신설 | 규약 · Kyu 실기 절차 |
| `src/lib/approvals-store.ts` | 재작성 | in-memory 완전 제거 · async 전환 · D1Like 인터페이스 · INSERT OR IGNORE + UPDATE · SQL 트랜잭션 원자 |
| `src/lib/auth/d1-env.ts` | 신설 | requireApprovalsDb pre-deploy 검증 (503 + 4단계 hint) |
| `src/routes/api/approvals/+server.ts` | async | WorkerEnv D1Env 확장 |
| `src/routes/api/approvals/[id]/decision/+server.ts` | async | 동일 |
| `src/routes/api/approvals/pull/+server.ts` | async | 트랜잭션 원자 (Q4) |
| `src/lib/approvals-store.test.ts` | 재작성 | in-memory D1 mock (Map + SQL 시뮬 · deps 추가 없음 · Q8 보수) |
| `tools/kyu-bridge/test/approvals-e2e.test.mjs` | 재작성 | async + db 주입 · 다중 인스턴스 회수 확증 케이스 신설 |
| `docs/kyu-clicks/U-approvals-d1-provision.md` | 신설 | Kyu 5단계 실기 절차 |
| `docs/design/kyu-orchestrator-v0.3.md` § 4.4.1 · § 9.13 | 신설 | 저장 계층 정본 + 결함 회수 표 |
| `docs/SPEC.md` v1.38 | +18 | 트레일러 |

## Kyu 판정 계약 (전 항목 승인)

| 항목 | 정본 | 소비 |
|------|------|------|
| Q1 저장 계층 | **(b) D1** (a KV eventual 60s stale · c DO 자작 프레임워크 성격 폐기) | approvals-store.ts · wrangler.toml |
| Q2 schema | id + JSON blob (options/context) + INDEX 3종 | migrations/0001_approvals.sql |
| Q3 async 전환 | 7 함수 전 Promise · interface 유지 | approvals-store.ts |
| Q4 pull 원자 | SELECT + UPDATE 트랜잭션 (statement 원자) | pullDecisions |
| Q5 실기 5단계 | create → toml → migrate → merge → curl | kyu-clicks U 문서 |
| Q6 wrangler.toml | database_id 는 Kyu 실기 후 편입 (커밋 별건) | wrangler.toml |
| Q7 in-memory | (e1) 완전 제거 · fallback 없음 | approvals-store.ts |
| Q8 테스트 | 보수 = MockD1 자작 · deps 추가 없음 | approvals-store.test.ts · approvals-e2e.test.mjs |
| Q9 migrations | 000N 순차 · 기존 편집 금지 · DROP 금지 | migrations/README.md |
| D1 pre-deploy | 미주입 시 503 + hint | src/lib/auth/d1-env.ts |
| D4 count 실 값 | countByStatus GROUP BY (미션 보드 편입 대비) | approvals-store.ts |

**폐기**: K0-0807-L 계획 (파일 큐 fallback 재적재) = 미착지 · D1 이 정본 소스 (design § 4.4.1 명시).

## Kyu 실기 지점 (⚠ merge 前 § 1-3 필수)

**docs/kyu-clicks/U-approvals-d1-provision.md** 5단계:
1. `npx wrangler d1 create approvals-db` (1회 · Kyu 로컬)
2. wrangler.toml 안 database_id 편입 (Kyu 직접 커밋)
3. `npx wrangler d1 migrations apply approvals-db --remote`
4. main merge → auto-deploy (1-3분)
5. 재실기 curl (T 문서 Access + Bearer 헤더 3종 정합) · POST 200 · GET 목록 표시 · pull 회수 · 재-pull 0

**뿌리 회수 확증**: GET 목록에 항목 표시 (이전 = "항목 없음").

## QC

```
pnpm check → COMPLETED 966 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
pnpm test  → Test Files  51 passed (51) · Tests  676 passed (676)
pnpm build → adapter-cloudflare ✔
```

## CLAUDE.md § 8 ③-relay 정본 첫 정식 적용

**K0-0807-T 신설 규약** = 심문 relay 게시 · 터미널 요약만 · Kyu 복붙 소멸.
**K0-0807-U = 정본 첫 정식 적용** (T 라운드 = 소급 사본):
- 심문 = [`K0-0807-U-inquiry.md`](https://github.com/CuriocityDevAi/curiocity-relay/blob/main/k0/K0-0807-U-inquiry.md) 게시 후 Kyu 회신
- 최종 리포트 = 이 파일 (`K0-0807-U-report.md`) · 별도

## 후속 (I+9 이연)

- **허브 탭 상세** `/hub/<slug>` (§ 9.9 · 헤드 SHA 재조회)
- **세션 로그 라이브 스트림** `/events/session-log/:hub` (§ 9.6)
- **SIGINT halt** (SPEC § 7.2 ⓓ 정본)
- **REG 회귀 통합** (SPEC § 17 · Deferred) = D1 관계 데이터 확장 · migrations/000N_ 신설
- **APPROVAL_DAEMON_TOKEN 자동 순환** (별건)

## PR

https://github.com/CuriocityDevAi/test-portal/pull/71
