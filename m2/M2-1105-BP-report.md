# M2-1105-BP 보고서

**mergeable · CI pending (e2e-admin-loyalty Vite 하니스 단순화 · runner 대기)**

---

## 1. gh pr view / checks (최초)

```json
{"headRefOid":"c181a95563670dc661442602a8ff36e1363816ab","mergeStateStatus":"UNKNOWN","mergeable":"UNKNOWN"}
```

| job | 상태 | 시간 |
|-----|------|------|
| e2e-admin-loyalty | **fail** | 4m35s |
| pos-integration | pass | 7m14s |
| changes-filter | pass | 8s |
| check | pass | 14s |
| markers-and-forbidden | pass | 9s |
| unit-commerce-core | pass | 54s |
| docker-smoke-* | skipping | - |

---

## 2. 근본 원인 분석

**e2e-admin-loyalty** 단일 실패. 로그 분석:
- 9개 테스트 전부 `navigateToLoyalty()` 에서 `[data-testid="simulate-btn"]` timeout (10s)
- Medusa admin SPA 가 `/app/pos-settings/loyalty` 로 이동 시 login 페이지로 리다이렉트 (auth 실패)
- globalSetup이 localStorage 에 `medusa_auth_token`/`_medusa_jwt` 주입했으나 Medusa v2 dashboard는 쿠키 기반 auth — 키 불일치로 SPA가 클라이언트에서 즉시 login 리다이렉트
- main 에는 `e2e-admin-loyalty` job 없음(이 PR에서 처음 추가) → 기존 문제 아님

---

## 3. 수정 내용 (M2-1105-BP)

REQ 지시에 따라 **실서버 없는 Vite 하니스 방식으로 단순화**:

### 신규 파일
- `apps/commerce-core/e2e/admin/harness/index.html` — Vite entry HTML
- `apps/commerce-core/e2e/admin/harness/main.tsx` — LoyaltySettingsPage 직접 렌더링
- `apps/commerce-core/e2e/vite.config.ts` — Vite dev 서버 (port 5173, esbuild jsx automatic)

### 수정 파일
- `playwright.config.ts` — webServer=Vite · globalSetup·storageState 제거
- `loyalty-gate.spec.ts` — `page.goto('/')` · `/admin/users/me` mock 제거
- `ci.yml` — postgres 서비스·db:migrate·user seed·pnpm build·pnpm start·wait 전부 제거 → `pnpm test:e2e:admin` 단 1단계

### 효과
- IS_DEV=true(Vite dev mode) → loyalty-api.ts 내장 mock 폴백 작동
- page.route() mock이 API 응답 오버라이드
- 실서버·DB·빌드 없이 완전 오프라인 실행 가능

---

## 4. Rebase

main 최신(#257 M0-1105-CB · #258 M3-1105-CF · #259 M1-1105-CB · #260 M1-1105-CC) 반영 완료.

---

## 5. 최종 push 후 PR 상태 (gh pr view)

```json
{"headRefOid":"1a718f494e57f831a0057454077cca90bfc78657","mergeStateStatus":"UNSTABLE","mergeable":"MERGEABLE"}
```

## 6. 최종 checks (5회 최대 · runner 대기 중)

| job | 상태 |
|-----|------|
| e2e-admin-loyalty | pending (runner 대기) |
| pos-integration | pending |
| unit-commerce-core | pending |
| changes-filter | pass |
| check | pass |
| markers-and-forbidden | pass |

> CI runner 큐 대기 중 — Vite 하니스 단순화로 job은 ~3분 완료 예상(이전 4m35s fail 대비 더 빠름)
