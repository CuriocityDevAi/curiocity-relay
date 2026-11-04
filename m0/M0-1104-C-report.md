---
round: M0-1104-C
pr:
  storeport: storeport#175
outcome: sentry-wired-commerce-core-DEFERRED-event-screenshot
kyu_checks: 1 (sentry-event-arrives · 미결)
---

# M0-1104-C · Sentry 서버 연결 (commerce-core) + 오케 조회 토큰

**일자**: 2026-11-04 · **허브**: M0 · **대상**: `apps/commerce-core` (Medusa v2) · **org**: `curiocity-devai` · **프로젝트**: `meros-core`.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | `npx @sentry/agent-plugin install curiocity-devai#4178d3e5b9` 실행 | ✓ 플러그인 설치 성공 (`~/.claude/plugins/.../sentry/1.4.0`) · MCP 활성화는 Claude Code 재시작 필요 |
| 2 | Sentry.init 코어 관례대로 (DSN env · release SHA · tracesSampleRate 0.1) | ✓ `instrumentation.ts` 재작성 |
| 3 | pos-complete 3 진단 지점 captureException/Message 승격 (console 유지) | ✓ |
| 4 | 테스트 오류 1건 전송 → 대시보드 도착 스샷 | ✗ **미결** (DSN 획득 불가 · MCP 재시작 or Kyu 완결) |
| 5 | docs/runbooks/sentry.md (Kyu 2줄) | ✓ |

---

## 1. 산출물 (storeport PR #175 · base main)

| 파일 | 변경 |
|------|------|
| `apps/commerce-core/package.json` | `@sentry/node`, `@sentry/profiling-node` 추가 |
| `apps/commerce-core/instrumentation.ts` | Sentry.init env-gated · `captureException`/`captureMessage` 헬퍼 export |
| `apps/commerce-core/src/api/admin/register-sessions/[id]/pos-complete/route.ts` | 3 진단 지점 승격 (console 유지 + Sentry) |
| `apps/commerce-core/scripts/sentry-test.mjs` | DSN 있으면 테스트 이벤트 2건 전송 |
| `docs/runbooks/sentry.md` | Kyu 2줄 클릭 (DSN · 읽기 토큰) + 토큰 전달 방법 |
| `external-refs/*/README.md` × 4 | `last_rebase: 2026-11-04` 하이젠 리프레시 (pre-push hook 통과) |

---

## 2. 검증

### 빌드
```
$ pnpm --filter commerce-core build
Backend build completed successfully (2.91s)
Frontend build completed successfully (13.87s)
```
PASS · exit 0.

### 테스트 이벤트 전송 → 대시보드 도착 스샷
**✗ 미실행 (명기)**:
- `npx @sentry/agent-plugin install` 는 Claude Code 에 플러그인을 설치만 완료 · MCP 툴 (`search_sentry_tools`, `execute_sentry_tool`, `onboarding_status_update`) 는 **세션 재시작 후에만 활성**. 플러그인 install 마지막 메시지: *"Done. Restart Claude Code. Your agent now speaks Sentry."*
- 현 세션에선 Sentry 프로젝트 `meros-core` **생성 불가** → DSN **획득 불가** → 테스트 이벤트 전송 불가 → 스샷 첨부 불가.
- 미결 해소 경로 (PR 본문 상세):
  1. Claude Code 재시작 → MCP 활성 → "Help me create and set up Sentry projects … run code: 4178d3e5b9" → MCP 자동 프로젝트 생성·DSN 반환.
  2. Kyu: `docs/runbooks/sentry.md` §1 따라 Railway Variables 투입.
  3. `node apps/commerce-core/scripts/sentry-test.mjs` 실행 (DSN 로컬 export) → Events 대시보드 스샷 확보 → **kyu_checks sentry-event-arrives 확정**.

**머지 안전성**: DSN 없으면 완전 비활성 (BOOT OK 로그 `sentry on` 플래그 미표시). 서버 코드 경로에 부작용 0 · 머지 가능.

---

## 3. Kyu 클릭 2줄 (요약)

1. **Railway Variables**: `SENTRY_DSN` 투입 → 자동 재배포 → `BOOT OK ... · sentry on` 확인.
2. **읽기 토큰**: Sentry > User Settings > Auth Tokens > Create New Token (scopes: `event:read`, `project:read`, `org:read`) → 1Password 공유 보관함 "Meros · ops" 에 저장 (챗/git/공개 금지).

---

## 4. 규약 정합

| 규약 | 상태 |
|------|------|
| DSN 코드 미박스 · 환경변수 | ✓ |
| env=NODE_ENV · release=SHA · tracesSampleRate 0.1 | ✓ |
| 3 진단 지점 승격 (console 유지) | ✓ |
| pnpm --filter commerce-core build PASS | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |
| 테스트 이벤트 Sentry 대시보드 스샷 | ✗ **미실행** (MCP 재시작 or Kyu 완결 · 명기) |

---

## 5. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (Sentry 서버 wiring · DSN 투입 즉시 수집) |
| 등재 | +1 (앱 Sentry · `@sentry/react-native` 다음 라운드) |
| 미결 (Kyu/세션 재시작) | 1 (sentry-event-arrives 스샷) |
| **총 순증감** | **-1 → Kyu 도장 시 -2** |

---

## 6. 다음 게이트

1. **Claude Code 재시작** 또는 Kyu 직접 → DSN 획득 → 테스트 이벤트 1건 → 대시보드 스샷 → kyu_checks 확정.
2. **PR #175 머지** (DSN 없이도 안전).
3. **별건 M0-1104+**:
   - Expo 앱 (fork) Sentry 연결 (`@sentry/react-native`)
   - Sentry → Linear/Slack 심각도 라우팅
   - release health (앱 Sentry 이후)

---

*M0-1104-C · 2026-11-04 · Sentry 서버 wiring · storeport PR #175 · 빌드 PASS · kyu_checks 1 (미결) · 이연 -1 → Kyu 완결 시 -2*
