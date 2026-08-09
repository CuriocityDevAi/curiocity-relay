# K0-0807-T · S 폐기 · I+8 실기 차단 3건 회수 (T-1 Access Service Token · T-2 loadHubs · T-3 방어)

**round_id**: K0-0807-T
**hub**: k0 (test-portal)
**pr**: test-portal_PR#70
**branch**: feat/k0-0807-t-i8-blockers
**status**: PR 심리 대기 · Kyu 실기 필수 · 배포 후 6단계 (본 리포트 [실기] 절 정본)
**timestamp**: 2026-08-09

## 요지

**Kyu 실측 08-09 · I+8 실기 차단 3건 회수** — CYCLE v1.2 § ③ 심문 게이트 통과 후 진행.
Kyu 회신 판정 전 항목 채택 (Q2 = b1 정정 · 나머지 K0 권고 채택).

**+ 신설 규약**: 심문 relay 게시 (CLAUDE.md § 8 ③-relay · 전 허브 강제 적용).
본 라운드 = 규약 첫 적용 (심문은 chat 회수 후 소급 사본 push · `K0-0807-T-inquiry.md`).

## 착지 (13 files · +640 insertions)

| 파일 | 라인 | 역할 |
|------|------|------|
| `CLAUDE.md` § 8 ③-relay | +14 | 심문 게시 규약 신설 (전 허브 강제) |
| `tools/kyu-bridge/src/approvals-client.mjs` | +15 | CF-Access-Client-Id/Secret 헤더 병존 (Q1 a2 · 후위 호환) |
| `tools/kyu-bridge/src/commands/serve.mjs` | +14 | loadHubs() 편입 (T-2) · runServe async · hubsSource 주입 (D3) |
| `tools/kyu-bridge/src/server.mjs` | +4 | payload.hubs_source 편입 (D3) · hubsSource opt |
| `tools/kyu-bridge/bin/kyu-bridge` | +1 | serve await |
| `src/lib/kyu-bridge-client.ts` | +2 | hubs_source? 필드 |
| `src/routes/+page.svelte` | +100 | T-3 방어 (진입 로그 · confirm · disabled · toast · 배너) |
| `docs/design/kyu-orchestrator-v0.3.md` § 4.5 · § 9.12 | +50 | 인증 계층 정본 + 결함 회수 표 |
| `docs/SPEC.md` v1.37 | +14 | 트레일러 |
| `docs/kyu-clicks/T-cf-access-service-token.md` | 신설 | Zero Trust 발급 · policy · config · 재실기 curl |
| `tools/kyu-bridge/test/approvals-client.test.mjs` | +4 case | CF Access 헤더 병존 · 후위 호환 · pullDecisions |
| `tools/kyu-bridge/test/server-mission-endpoints.test.mjs` | +1 case | hubs_source=registry 확증 |
| `tools/kyu-bridge/test/serve-loadhubs.test.mjs` | 신설 4 case | hubs 미주입 vs 주입 · hubsSource 자동/명시 |

## Kyu 판정 계약 (전 항목 채택 · Q2 정정)

| 항목 | 정본 | 소비 파일 |
|------|------|-----------|
| Q1 daemon-auth (a2) | Service Token + Bearer 병존 (인프라 + 앱 이중 방어) | approvals-client.mjs · daemon-auth.ts |
| **Q2 스코프 (b1 · Kyu 정정)** | **`/api/approvals/* 전체` (POST 도 Access 앞단 302)** | design § 4.5 표기 · kyu-clicks T 문서 |
| Q3 config 스키마 | approval_daemon.cf_access_client_id/secret (미설정 skip) | approvals-client.mjs · 후위 호환 |
| Q4 T-2 fix | serve.mjs loadHubs 편입 + payload.hubs_source | serve.mjs · server.mjs · mission-board.mjs |
| Q5 T-3 방어 | 진입 로그 (c1) · confirm (c2) · disabled (c3) · 성공 toast (c4) | +page.svelte · haltHub/resumeHub |
| Q6 confirm() native | 자작 최소 · 파괴적 action 정본 | +page.svelte |
| Q7 성공 toast 대칭 | 녹색 toast · 3s auto-dismiss · flashSuccess | +page.svelte |
| Q8 kyu-clicks T 신설 | Zero Trust 발급 · Service Auth · 재실기 curl | T-cf-access-service-token.md |
| D1 Q 문서 갱신 | T 문서 신설로 흡수 | T-cf-access-service-token.md |
| D2 loadHubs 로그 | 데몬 시작 시 source · count 로그 | serve.mjs |
| D3 hubs_source | payload 편입 + UI fallback 배너 | server.mjs · +page.svelte |
| C3 § 4 정정 | Access 계층 + Service Token 정본 편입 | design § 4.5 신설 |

## Kyu 실기 지점 (본 리포트 [실기] 절 = PR body 최상단)

1. **데몬 재설치** (loadHubs 편입 · T-2 fix)
2. **홈 4카드 표시 확증** (fallback 배너 표시)
3. **[🔴]/[▶] 왕복** (confirm 다이얼로그 · 성공 toast · 콘솔 로그 발화 확증)
4. **Cloudflare Service Token 발급** (Zero Trust · Non-expiring · Service Auth policy)
5. **config 확장** (cf_access_client_id/secret 두 필드)
6. **재실기 curl** (Access 헤더 3종 + Bearer · POST 200 · pull decisions 회수)

상세 = `docs/kyu-clicks/T-cf-access-service-token.md`.

## QC

```
pnpm check → COMPLETED 965 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
pnpm test  → Test Files  51 passed (51) · Tests  675 passed (675)
pnpm build → adapter-cloudflare ✔
```

**신설 9 케이스** = approvals-client Access 4 + server-mission-endpoints 1 + serve-loadhubs 4.

## 후속 (I+9 이연)

- **허브 탭 상세** `/hub/<slug>` (§ 9.9 · 헤드 SHA 재조회 · K0 UX 이연 4건)
- **세션 로그 라이브 스트림** `/events/session-log/:hub` (§ 9.6 · R2)
- **SIGINT halt** (SPEC § 7.2 ⓓ 정본 · Q5 별건)
- **hubs.json auto-write** CLI

## PR

https://github.com/CuriocityDevAi/test-portal/pull/70
