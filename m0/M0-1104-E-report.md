---
round: M0-1104-E
pr:
  storeport: storeport#175
outcome: sentry-event-arrives-CLOSED · M0-1104-C 미결 해소 · 리베이스·프로젝트 생성·DSN·스샷 착지
kyu_checks: 1 (sentry-event-arrives · PASS)
---

# M0-1104-E · Sentry 마무리 (PR #175 리베이스 · 프로젝트 생성 · DSN · 테스트 이벤트 스샷)

**일자**: 2026-11-04 · **허브**: M0 · **대상**: `apps/commerce-core` (Medusa v2) · **org**: `curiocity-devai` · **Sentry 프로젝트**: **`commerce-core`** (team `curiocity-devai` · region `de.sentry.io`).

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 0 | PR #175 를 origin/main 최신 위로 리베이스 · 충돌 해소 · 빌드 PASS · `--force-with-lease` push | ✓ |
| 1 | Sentry MCP 활성 (OAuth) · 프로젝트 `commerce-core` 생성 · DSN 획득 | ✓ (프로젝트는 Kyu 수동 생성 · member 권한 제약 탓) |
| 2 | DSN 로컬 export → `node apps/commerce-core/scripts/sentry-test.mjs` → Sentry Issues 2건 도착 스샷 | ✓ |
| 3 | `docs/runbooks/sentry.md` DSN 경로 1줄 · 프로젝트 슬러그 commerce-core 로 정렬 | ✓ |
| 4 | PR #175 CI feature-map 미분류 (sentry-test.mjs · 스샷 PNG) 해소 → 초록 | ✓ |

---

## 1. 리베이스 (요지)

**충돌**: 1 파일 · 3 블록 — `apps/commerce-core/src/api/admin/register-sessions/[id]/pos-complete/route.ts`

**뿌리**: 브랜치의 단일 commit (`5162f52`) 이 M0-1012-A 진단 로그 + M0-1104-C Sentry 승격 양쪽을 담고 있었고, 그동안 origin/main 이 M0-1012-A 만 단독으로 머지 (`f63bbeb`). pos-complete 의 catch(e) 3 지점에서 양측이 동일한 console.* 로그 라인을 작성 → merge 가 양쪽 수정으로 판정.

**해소**: 세 블록 모두 branch 쪽 채택 (console 로그 유지 + Sentry captureException/captureMessage 보존). 주석은 "M0-1012-A · 진단 로그 (console 유지) + M0-1104-C Sentry 승격" 통합 문구로 정리.

**external-refs**: 리베이스 중 충돌 없음 (main=2026-09-16 · branch=2026-11-04 · auto-merge).

**force-push**: `--force-with-lease origin feat/m0-1104-c-sentry-core` → `5162f52 → aaa0972` (이후 commit 3개 추가).

---

## 2. Sentry 활성

**MCP OAuth**: Kyu 브라우저 1클릭 승인. `mcp.sentry.dev/oauth/authorize` scope = `org:read project:write team:write event:write alerts:write`.

**조직·팀 확정** (MCP):
```
whoami            → curiocity.dev.ai@gmail.com
find_organizations → curiocity-devai (regionUrl=https://de.sentry.io)
find_teams        → curiocity-devai (id=4511765761228880)
```

**프로젝트 생성 시도**: MCP `create_project` 호출 → **HTTP 403** (`Your organization has disabled this feature for members`). OAuth 로 들어간 유저가 member role 이라 조직 정책상 거부.

**복구**: Kyu 가 Sentry Web UI 로 수동 생성 — name `commerce-core` · slug `commerce-core` · platform `node` · team `curiocity-devai`.

**DSN 획득** (MCP `find_dsns`): 1건 DSN 반환 → **로컬 `/tmp/sentry-dsn-m0-1104-e.env` (`chmod 600 · umask 077`) 에만 저장 · 챗/git/리포트/커밋 미노출 · 사용 후 `shred -u` 삭제 확인**.

---

## 3. 테스트 이벤트 전송 · 스샷

```
$ source /tmp/sentry-dsn-m0-1104-e.env
$ node apps/commerce-core/scripts/sentry-test.mjs
OK · 2 events sent to Sentry
```

**MCP `search_issues` 로 수신 확정**:
- **COMMERCE-CORE-1** · `Error: [M0-1104-C] test error · pos-complete simulation` (captureException · culprit `?(sentry-test)`)
- **COMMERCE-CORE-2** · `[M0-1104-C] sentry connectivity check · info` (captureMessage · level info)

**대시보드 스샷**: `storeport/docs/M0-1104-E-sentry-events.png` (800×1196 PNG · PR #175 본문 임베드).

**대시보드 URL**: `https://curiocity-devai.sentry.io/issues/?project=commerce-core&query=M0-1104-C`

---

## 4. 산출물 (storeport PR #175 · base main 위 4 commits)

| commit | 파일 | 변경 |
|------|------|------|
| `aaa0972` | `instrumentation.ts` · `package.json` · `scripts/sentry-test.mjs` · `pos-complete/route.ts` · `docs/runbooks/sentry.md` · `external-refs/*/README.md` × 4 · `pnpm-lock.yaml` | M0-1104-C Sentry wiring (리베이스된 원본 커밋) |
| `802f7ec` | `docs/runbooks/sentry.md` | DSN 경로 1줄 (`Sentry → Settings → Projects → commerce-core → Client Keys`) |
| `53833c8` | `docs/runbooks/sentry.md` | 프로젝트 슬러그 `meros-core → commerce-core` 전면 정렬 (헤더·토큰 이름·API URL·export 예시) |
| `6c40afe` | `docs/M0-1104-E-sentry-events.png` · `docs/feature-map.yaml` | 대시보드 스샷 + feature-map 등재 (sentry-test.mjs 흡수) |
| `7452296` | `docs/feature-map.yaml` | 스샷 PNG 패턴 흡수 (`docs/M0-*-sentry-*.png` → observability) |

---

## 5. 검증

### 빌드 (리베이스 후)
```
$ pnpm --filter commerce-core build
Backend  2.78s · Frontend 13.80s
```
PASS · exit 0.

### feature-map-check
```
scanned: 695 files → matched=695 unmatched=0 (0.0%)
L3 areas=7  L2 processes=50 (children=3)  L1 total=9
```
PASS (지역 full-scan + CI diff mode 둘 다 0 unmatched).

### CI (PR #175 head `7452296`)
| 체크 | 결과 |
|------|------|
| `check` (feature-map) | ✓ PASS |
| `changes-filter` | ✓ PASS |
| `markers-and-forbidden` (Anchor Tauri 잔재) | ✗ FAIL — **PRE-EXISTING on origin/main** (f63bbeb 동일 fail · PR 무관) |
| `docker-smoke-*`, `wrangler-check-care-agent` | skipping (영향 파일 없음) |

---

## 6. 규약 정합

| 규약 | 상태 |
|------|------|
| DSN 코드 미박스 · 환경변수 | ✓ |
| DSN 챗/리포트/커밋 미노출 (로컬 /tmp chmod 600 · 사용 후 shred) | ✓ |
| env=NODE_ENV · release=SHA · tracesSampleRate 0.1 | ✓ |
| 3 진단 지점 승격 (console 유지 + Sentry) | ✓ |
| pnpm --filter commerce-core build PASS (리베이스 후) | ✓ |
| feature-map 695/695 matched (unmatched 0) | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |
| 테스트 이벤트 Sentry 대시보드 스샷 | ✓ **착지** |

---

## 7. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +2 (sentry-event-arrives 미결 완결 · feature-map 미분류 CI 빨강 해소) |
| 등재 | +1 (infra.observability L2 프로세스 신설) |
| 미결 | 0 (M0-1104-C kyu_checks 전부 PASS) |
| **총 순증감** | **-2** |

---

## 8. 다음 게이트

1. **Kyu**: Railway Variables 에 `SENTRY_DSN` 투입 → 자동 재배포 → `BOOT OK ... · sentry on` 확인.
2. **Kyu**: 오케 조회용 Auth Token (scopes: `event:read project:read org:read`) 생성 → 1Password "Meros · ops" 전달.
3. **PR #175 머지 가능** (`markers-and-forbidden` 는 main-pre-existing · 머지 차단 아님 if admin override · 별건 라운드에서 Anchor Tauri cleanup).
4. **별건 M0-1104+**:
   - Expo 앱 (fork) Sentry 연결 (`@sentry/react-native`).
   - Sentry → Linear/Slack 심각도 라우팅 (`create_alert_rule` MCP 활용).
   - Release health (앱 Sentry 이후).

---

*M0-1104-E · 2026-11-04 · 리베이스 → MCP OAuth → 프로젝트 생성 (Kyu 수동) → DSN → 테스트 이벤트 2건 → 대시보드 스샷 → feature-map 초록 · 이연 -2 · sentry-event-arrives CLOSED*
