# K0-0807-Q · v0.3 구현 8탄 · I+8 미션 컨트롤 보드 (Kyu 실기 라운드)

**round_id**: K0-0807-Q
**hub**: k0 (test-portal)
**pr**: test-portal_PR#69
**branch**: feat/k0-0807-q-mission-board
**status**: PR 심리 대기 (Kyu 실기 필수 · 배포 후 6단계 절차)
**timestamp**: 2026-08-09

## 요지

**I+8 미션 컨트롤 보드 착지** — CYCLE v1.2 § ③ 심문 게이트 통과 후 진행.
Kyu 회신 전 항목 K0 권고 채택 (Q1-Q10 · R1-R3 · D1/D3/D4/D5/D6).

**첫 Kyu 실기 라운드** (I+1~I+7 = 내부 계층 · I+8 = UI 정본).

## 착지 요약 (12 files · +1,850 insertions)

| 파일 | 라인 | 역할 |
|------|------|------|
| `tools/kyu-bridge/src/mission-board.mjs` | ~140 | 통합 payload · Q4 · scanLoopHistory · computeKyuTodo |
| `tools/kyu-bridge/src/server.mjs` | +55 | GET /mission-board · POST /halt · POST /resume |
| `src/lib/kyu-bridge-client.ts` | +85 | Types + missionBoard/halt/resume + tryFetchMissionBoard |
| `src/routes/+page.svelte` | 신설 ~570 | 미션 보드 UI (§ 9.2 정본 · D3 · D4 · D5) |
| `src/routes/prs/+page.svelte` | git mv | 기존 PR 홈 이전 · REGISTRY 소비 무변경 |
| `src/routes/approvals/+page.svelte` | 신설 ~380 | R3 · 판정 UI · 딥링크 ?id= · Kyu 폰 정합 |
| `docs/kyu-clicks/Q-approval-daemon-and-hubs.md` | 신설 | Q10 6단계 실기 절차 + R1 hubs.json 안내 |
| `docs/design/kyu-orchestrator-v0.3.md` | § 9.11 · § 4.6 정정 | 착지 표기 + endpoint 정정 (Q-0) |
| `docs/SPEC.md` | v1.36 트레일러 | 인용 |
| `tools/kyu-bridge/test/mission-board.test.mjs` | 12 case | 초기·halt·하트비트·kyu_todo·scanLoopHistory |
| `tools/kyu-bridge/test/server-mission-endpoints.test.mjs` | 11 case | Bearer·payload·halt/resume·E2E |
| `src/lib/kyu-bridge-client.test.ts` | +4 case | missionBoard·halt·resume·fallback |

## Kyu 판정 계약 (전 항목 K0 권고 채택)

| 항목 | 정본 | 소비 |
|------|------|------|
| Q1 홈 정본 | `/` = 미션 보드 · `/prs` = 기존 PR 홈 · `/hub/<slug>` = I+9 이연 | 라우트 3종 |
| Q2 원장 분리 | 미션 보드 = hubs.json · PR 홈 = REGISTRY · slug lookup 조인 | 별개 |
| Q3 데이터 소스 | 데몬 직접 (127.0.0.1 Bearer 맥 전용) · 승인 큐만 Workers 서버 (Access JWT 폰/맥) | tryFetchMissionBoard · fetch /api/approvals |
| Q4 payload 스키마 | 통합 (hubs+halt+heartbeat+approvals+loop_recent) · Q-I-9 10s polling | mission-board.mjs |
| Q5 [🛑] 정본 | POST /halt = stop-loop = 자연 완결 · 원장 무결 · SIGINT halt = I+9 별건 | server /halt · haltHub() |
| Q6 secret 설정 | openssl + wrangler versions secret (헬퍼 CLI 불요) | kyu-clicks Q 문서 |
| Q7 초기 상태 | idle 대기 (💗 부재로 "조용함 ≠ 정상" 충족) | stateMeta() |
| Q8 loop history | 카드 verdict badge + 하단 최근 10건 병행 | +page.svelte |
| Q9 name/slug | name 크게 · slug 우측 mono badge | name-row |
| Q10 실기 순서 | 6단계 (배포 → 홈 → secret → config → 왕복 → [🛑]/[▶]) | kyu-clicks Q 문서 |
| R1 hubs.json | fallback 유지 + 실 파일 안내 | kyu-clicks § 2 |
| R2 세션 로그 | I+9 이연 | § 9.6 표기 유지 |
| R3 판정 UI | /approvals 전용 라우트 (폰 정합) | approvals/+page.svelte |
| D1 카드 클릭 | /prs?repo=<slug> placeholder (I+9 시 /hub/<slug>) | 카드 href |
| D3 삼중 인코딩 | 색상+아이콘+라벨 | stateMeta·heartbeatBadge·verdictBadge |
| D4 데몬 폴백 | "미기동" 배너 + [설정 열기] CTA | daemon-off 화면 |
| D5 폴링 최적화 | visibility hidden 시 skip | handleVisibility |
| D6 endpoint | GET /mission-board 신설 + § 4.6 정정 (Q-0) | server.mjs · § 4.6 |

**endpoint 정정 (C2 해소 · Q-0)**:
- `/events/mission-board` → `/mission-board`
- `/events/halt` → `/halt`
- `/events/resume` → `/resume`

## Kyu 실기 6단계 (kyu-clicks Q-approval-daemon-and-hubs.md)

**배포 완료 후** (Cloudflare Workers Builds · 1-3분):

1. **홈 진입 확증**: https://test.curiocity.company/ → "test-portal · 미션 컨트롤" 표시. `/prs` = 기존 PR 홈.
2. **데몬 재설치**: `kyu-bridge uninstall && kyu-bridge install` (신설 endpoint 포함 필요)
3. **APPROVAL_DAEMON_TOKEN 설정**: `openssl rand -hex 32` → `npx wrangler versions secret put APPROVAL_DAEMON_TOKEN`
4. **데몬 config 편집**: `~/.kyu-bridge/config.json` 안 `approval_daemon.token` 필드 같은 값
5. **모의 승인 왕복**: curl POST /api/approvals → /approvals 판정 → 데몬 pull 회수
6. **[🛑]/[▶] 왕복**: 홈 카드 [🛑] → CLI loop-status ⛔ → [▶] → 정상 복귀

## QC

```
pnpm check → COMPLETED 965 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
pnpm test  → Test Files  50 passed (50) · Tests  666 passed (666)
pnpm build → adapter-cloudflare ✔
```

**신설 27 케이스** = mission-board 12 + server-mission-endpoints 11 + kyu-bridge-client 4.

## 후속 (I+9 이연)

- **허브 탭 상세** `/hub/<slug>` (§ 9.3 · 헤드 SHA 재조회 · K0 UX 이연 4건)
- **세션 로그 라이브 스트림** `/events/session-log/:hub` (§ 9.6 · R2)
- **SIGINT halt** (SPEC § 7.2 ⓓ 별건)
- **hubs.json auto-write** CLI (자작 최소 별건)

## PR

https://github.com/CuriocityDevAi/test-portal/pull/69
