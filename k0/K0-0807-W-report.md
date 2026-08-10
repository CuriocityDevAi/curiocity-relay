# K0-0807-W · I+9 착지 · 허브 탭 상세 + 세션 로그 라이브 스트림

**round_id**: K0-0807-W
**hub**: k0 (test-portal)
**pr**: test-portal_PR#72
**branch**: feat/k0-0807-w-hub-detail-session-log
**status**: PR 심리 대기 · Kyu 실기 5단계 (배포 후)
**timestamp**: 2026-08-10

## 요지

**I+9 착지** — 허브 탭 상세 `/hub/<slug>` (§ 9.9) + 세션 로그 라이브 스트림 (§ 9.6).
CYCLE v1.2 § ③ 심문 게이트 통과 (K0-0807-W-inquiry.md relay 게시 · **CLAUDE.md § 8 ③-relay 2회차 정식 적용**) · Kyu 전 항목 승인 · 즉시 구현.

**R1 확인 (Kyu 승인)**: 계약만 착지 · 실 로그 = loop 상주 별건 (UI 폴백 정본 표시).

## 착지 (10 files · +1,650 insertions)

| 파일 | 라인 | 역할 |
|------|------|------|
| `src/routes/hub/[slug]/+page.svelte` | 신설 ~500 | W-1 · 허브 탭 상세 · 4 섹션 + 세션 로그 collapse · D2 병렬 fetch · 10s/2s 폴링 |
| `src/lib/PrList.svelte` | 신설 ~280 | D1 · PR 리스트 컴포넌트 추출 · /prs + /hub 공유 · [↻] head SHA 재조회 |
| `src/routes/+page.svelte` | 1 line 갱신 | W-1c · 카드 href /hub/{slug} (placeholder 종료) |
| `tools/kyu-bridge/src/session-log.mjs` | 신설 ~130 | W-2a · 파일 규약 · append/tail/read/exists |
| `tools/kyu-bridge/src/session-manager.mjs` | +12 | invoke 시 파일 append · top-level makeSessionId export |
| `tools/kyu-bridge/src/server.mjs` | +45 | W-2b · GET /events/session-log/:hub?since=N |
| `src/lib/kyu-bridge-client.ts` | +50 | SessionLogResponse · sessionLog method · tryFetchSessionLog |
| `tools/kyu-bridge/test/session-log.test.mjs` | 16 case | 파일 규약 unit |
| `tools/kyu-bridge/test/server-session-log.test.mjs` | 7 case | endpoint unit |
| `src/lib/kyu-bridge-client.test.ts` | +3 case | client sessionLog + fallback |
| `docs/design/kyu-orchestrator-v0.3.md` § 9.6 · § 9.14 | 정본 갱신 | endpoint 확정 + 착지 표기 |
| `docs/SPEC.md` v1.39 | 트레일러 | 요약 |

## Kyu 판정 계약 (전 항목 승인)

| 항목 | 정본 | 소비 |
|------|------|------|
| Q1 라우트 | `/hub/<slug>` (단수) | routes/hub/[slug] |
| Q2 4 섹션 | 요약+PR+relay+승인 | +page.svelte |
| Q3 head SHA 재조회 | (c1) [↻] PR 재조회 (cache: no-store · ?refresh=1) | PrList showRefreshButton |
| Q4 세션 로그 소스 | (d1) session-manager 파일 append 신설 | session-log.mjs · session-manager.mjs |
| Q5 endpoint 방식 | (e1) polling 초판 (SSE 승격 별건) | server.mjs |
| Q6 스키마 | hub·session_id·log_path·next_offset·chunk·eof·size·mode | server.mjs 응답 |
| Q7 UI 위치 | (f1) 허브 탭 내 collapse · 홈 링크 별건 | routes/hub 하단 |
| Q8 폴링/UI | 2s · 200 lines · 자동 스크롤 토글 | pollHandle · line trim |
| Q9 폴백 3종 | 데몬/파일/대기 | UI conditional |
| D1 PrList 추출 | /prs + /hub 공유 | PrList.svelte |
| D2 병렬 fetch | 4 소스 · 10s/2s | startPolls |
| D3 loop_recent 필터 | 로컬 filter · 별 fetch 불요 | derived state |
| R1 확인 | 계약만 · 실 로그 loop 상주 별건 | UI 폴백 |

## Kyu 실기 지점 (PR body [실기] 최상단 5단계)

1. **데몬 재설치** (`kyu-bridge uninstall && install`) · session-log endpoint 활성 필요
2. **홈 → 카드 [탭 열기]** · `/hub/<slug>` 진입 확증 · 4 섹션 렌더
3. **[↻ head SHA 재조회]** 클릭 · `↻ 재조회 중…` 표시 · GitHub API 재호출
4. **[▶ 세션 로그 (live)]** collapse · Q9 폴백 3종 표시 확증 (loop 상주 없어 "세션 아직 시작 안 됨" = 정상)
5. **승인 항목 클릭** · `/approvals?id=<uid>` 진입

## QC

```
pnpm check → COMPLETED 969 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
pnpm test  → Test Files  53 passed (53) · Tests  699 passed (699)
pnpm build → adapter-cloudflare ✔
```

**신설 26 케이스** = session-log unit 16 + server-session-log 7 + client 3.

## CLAUDE.md § 8 ③-relay 2회차 정식 적용

- 심문 = [`K0-0807-W-inquiry.md`](https://github.com/CuriocityDevAi/curiocity-relay/blob/main/k0/K0-0807-W-inquiry.md) relay 게시 후 Kyu 승인 (터미널 = 요약만 · 복붙 소멸)
- 최종 리포트 = 이 파일

**적용 이력**:
- K0-0807-U = 정본 첫 정식 적용
- K0-0807-W = 2회차 정식 적용 (규약 안정 · 오케 상주 소비 정합)

## 이연 순증감 (스코프 밖 · Kyu 명시)

**신설 이연 (K0-0807-W)**:
- 실 loop 상주 (session-manager invoke = orchestrator loop 실 호출) — I+9 계약만
- 홈 [세션 로그 라이브] 링크 (§ 9.6 · Q7 별건)
- SSE 승격 (Q5 별건 · polling 량 관측 후)

**기존 이연 유지**:
- SIGINT halt (SPEC § 7.2 ⓓ 별건)
- REG 회귀 관리 통합 (SPEC § 17 Deferred)
- 닫힘/병합 이력 뷰
- 미션 보드 payload.pending_approvals.count 실 값 편입 (D4 · K0-0807-U 준비 완료)
- hubs.json auto-write CLI

## PR

https://github.com/CuriocityDevAi/test-portal/pull/72
