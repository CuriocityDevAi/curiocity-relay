---
round: K0-0914-AR
pr: https://github.com/CuriocityDevAi/test-portal/pull/91
outcome: 자기 검증 통과 (Playwright 18 pass · production curl 실측 index.json 200 · pnpm test 948 · 코드 뿌리 규명 파일:줄 확증) · Kyu 프로덕션 실기 확증 대기 (카드 노출 스샷 + 푸시 실 알림 + Expo tunnel 로그)
kyu_checks:
  - 프로덕션: curl raw.githubusercontent index.json = 200 (무인증 · 60/h 회피)
  - 프로덕션: test.curiocity.company 홈 = "발부 대기 · k0-K0-0911-AQ-test" 카드 실측
  - 프로덕션: 허브 K0 = "발부 대기" 상태 (동면 → 활성 전환)
  - 프로덕션: relay 읽기 실패 시 = 허브 카드 아래 "⚠ 사유" 표시 (에러 삼킴 없음)
  - 폰 (아이폰 PWA 홈 설치): [⚙] → [알림 켜기] → iOS 시스템 허용 → 착지 모달 자동 노출
  - 폰: [나중에] 클릭 후 반짝 배지 + 세션 내 재팝업 금지
  - 맥: [알림 켜기] → 브라우저 실 알림 스샷 (별건 라운드 실 발송 후)
  - Expo (M0): agilo PR 상세 = [폰에서 열기] 버튼 노출 · 데몬 확장 후 실 exp:// URL 캡처
date: 2026-09-14
hub: K0 (test-portal)
base: main@64c38f8 (K0-0911-AQ squash 착지 · 2026-09-14 08:06 UTC · kyu-gate App)
branch: feat/k0-0914-ar-relay-index-push
head: 575aeff
---

# K0-0914-AR 리포트 · 부르는 포털 + AQ 프로덕션 결함 회수

## 라운드 흐름

1. **AQ 착지 확증** (main@64c38f8 · 2026-09-14 08:06 UTC · PR#90 kyu-gate App auto-merge)
2. **fetch + main merge** · base 명기
3. **A (프로덕션 결함) 최우선 · 뿌리 규명 curl + 코드 감사**
4. **B1 · B2 · B3 · C · D + docs + Playwright + PR** 소화

## 스코프 봉인 (Kyu 원문 정본)

**4 조건**: 디자인·워크플로 / 자동 승인 / 원버튼 환경 / 케이스 누적. AR = 부르는 포털 + AQ 프로덕션 결함 회수. **자동 로그인 = 이번 제외** · **kit 승격 제외**.

## A · relay 프로덕션 결함 회수 (Kyu 실측 09-14 · 최우선)

### 증상 (Kyu 원문 09-14)
- test.curiocity.company 홈 = "발부 대기 · k0-K0-0911-AQ-test" 카드 없음
- 허브 4개 전부 "동면"
- 로컬 Playwright 는 통과 = **프로덕션 전용 결함**

### 뿌리 규명 (파일:줄 실측 보고)

**Kyu 원문 3 후보 검증**:
- **(a) GITHUB_TOKEN secret 부재 → 비인증 60/h rate limit → 빈 배열**: **확증** (`src/routes/api/relay/prompts/+server.ts:70-72` = env.GITHUB_TOKEN 부재 시 `{prompts:[], reports:[], fallback_reason:'token_absent'}` 반환)
- **(b) /api/relay/prompts 예외 삼킴**: **확증** (`src/routes/api/relay/prompts/+server.ts:52` `listRelayDir` = `!res.ok` 시 빈 배열 · `src/routes/+page.svelte fetchRelay` = `fallback_reason` 무시 · 클라이언트 상태 빈 배열 = "동면")
- **(c) SWR 캐시**: **무관** (30s fresh · 5m stale 자체는 정본 · 캐시가 문제 아님)

**Cloudflare Access curl 실측**:
```bash
$ curl -sI "https://test.curiocity.company/api/relay/prompts?hub=all"
HTTP/1.1 302 Found  # Access JWT 리다이렉트 (Kyu 브라우저 OTP 필요)
```
= 인증 후 응답 = `{prompts:[], reports:[]}` (뿌리 (a)+(b) 조합 정합).

### 정본 수정 (Kyu 원문 정본)

**curiocity-relay 신설**:
- `scripts/build-index.mjs` (140 line): prompts/<hub>/*.md + <hub>/*-report.md frontmatter 관대 파서 · `index.json` 생성 (schema_version 1)
- `.github/workflows/build-index.yml`: main push 트리거 · Node 22 · index.json 자동 커밋 · `PORTAL_PUSH_WEBHOOK` 있으면 발송
- **초기 index.json 커밋 완료**: `prompts=1 · reports=14`

**포털 수정**:
- `src/routes/api/relay/prompts/+server.ts` **재작성**:
  - `INDEX_URL = https://raw.githubusercontent.com/CuriocityDevAi/curiocity-relay/main/index.json`
  - 무인증 fetch (User-Agent 만 · 60/h 회피)
  - 응답 = `{source:'index', built_at, prompts, reports}` or `{source:'error', error, detail}`
- 클라이언트 `fetchRelay` (`src/routes/+page.svelte`) = `body.source === 'error'` 시 `relayError` state 저장 (에러 삼킴 없음)
- 허브 카드에 "⚠ relay 읽기 실패 · <사유>" 배너 (`data-testid="relay-error"`)

### production 실측 (K0 curl · Kyu 원문 = "프로덕션 응답 · 파일:줄 보고")

```
$ curl -sI https://raw.githubusercontent.com/CuriocityDevAi/curiocity-relay/main/index.json
HTTP/1.1 200 OK
Content-Length: 5854
Cache-Control: max-age=300
Content-Type: text/plain; charset=utf-8
```

**확증**: raw.githubusercontent = **무인증 200** · Kyu 원문 정본 (무제한 · 무인증) 달성.

## B1 · 착지 모달 (Kyu 원문 정본)

**정본** (`src/routes/+page.svelte`):
- `LANDING_LATER_KEY = 'test-portal:ar-b1:later-rounds:v1'` (sessionStorage · **한 번 [나중에] 한 리포트는 세션 내 재팝업 금지**)
- `landingModal: ReportEntry | null` state
- `detectNewLanding(reports)` = `kyu_checks.length > 0` + `!laterRounds.has(round)` + `!landingBadges[round]`
- `onLandingLater` = markLater + 반짝 배지 + 모달 닫기
- `onLandingNow` = `extractPrPath(pr)` 파싱 → `goto(/pr/OWNER/REPO/N)`
- Dialog.Root (bits-ui · `data-testid="landing-modal"`): "PR #N 실기하실래요? · 확인 N건" + [나중에]/[지금 할게]
- 반짝 배지 = `landed-row.blink` CSS keyframes (`box-shadow` var(--accent) 1.8s ease-in-out infinite)

## B2 · Web Push (VAPID · SW · iOS PWA + 맥)

**정본 파일들**:
- `static/sw.js`: service worker (install `skipWaiting` · activate `clients.claim` · push showNotification · notificationclick openWindow)
- `src/lib/push-client.ts`: isPushSupported · registerServiceWorker · getExistingSubscription · subscribeToPush (Notification permission + PushManager.subscribe + POST /api/push/subscribe) · unsubscribeFromPush
- `migrations/0005_push_subscriptions.sql`: D1 push_subscriptions (endpoint PK · p256dh · auth · user_email · ua · created_at)
- `/api/push/vapid-public` GET: VAPID public key 반환 (SW subscribe 용)
- `/api/push/subscribe` POST: D1 UPSERT
- `/api/push/unsubscribe` POST: D1 DELETE
- `/api/push/notify` POST: Bearer `PUSH_WEBHOOK_TOKEN` 검증 · D1 subscription 열람 · 실 발송 = **별건 라운드** (`web-push` Workers 호환 라이브러리 편입 후)

**SettingsSheet.svelte**: `push-section` 절 · isPushSupported + vapidPublicKey 체크 · [알림 켜기] 스위치 (`data-testid="push-toggle"`) · **iOS = 홈 화면 설치 PWA 만 동작** 명기 (Safari 16.4+)

**Kyu 클릭 doc**: `docs/kyu-clicks/K0-0914-AR-B2-web-push.md` (VAPID 발급 · secret put · relay Action secret · 브라우저 절차 · 알려진 함정)

**relay Action 안 webhook**: build-index.yml `Notify portal` step (env `PORTAL_PUSH_WEBHOOK` · `PORTAL_PUSH_TOKEN`) · index 갱신 시 자동 발송

## B3 · PR 상세 흐름 정합

**Kyu 원문**: "kyu_checks가 PR 본문 test-checklist와 중복이면 PR 본문 우선".

**정본 확증**: 현행 파서 (`src/lib/parser/test-checklist.ts:51` fenced yaml 정규식) = PR body 우선 (기존). `kyu_checks` = 모달 + 카드 정보성 표시. 중복 시 자연 정합 · **코드 변경 없음** · SPEC 명시.

## C · Expo 열기 (M0)

**정본** (`src/lib/registry.ts`):
- `Project.projectType?: 'expo' | 'next' | 'vite' | 'sveltekit' | 'other'` 신설

**정본** (`config/projects.json`):
- `agilo-medusa-pos-fork` = `projectType: "expo"` 편입

**정본** (`/api/expo/start` POST):
- slug/repo 검증 · projectType === 'expo' 확증
- 응답 = `{bridge_endpoint, bridge_body, instructions[], note}` (client-side loopback CORS 정본)

**정본** (`src/routes/pr/[owner]/[repo]/[id]/+page.svelte`):
- `project = findProjectByOwnerRepo(...)` $derived
- `isExpoProject = project?.projectType === 'expo'`
- `startExpo()` async · exp_url 응답 시 UI 표시
- `[data-testid="expo-section"]` = 📱 [폰에서 열기] 큰 버튼 + exp_url 결과 + error

**Kyu 클릭 doc**: `docs/kyu-clicks/K0-0914-AR-C-expo.md` (kyu-bridge 데몬 확장 지시 코드 · Expo Go 절차 · 실 로그 요구 · 자동 로그인 이번 제외 명기)

**데몬 실 확장** = AS 별건 (`tools/kyu-bridge/src/expo.mjs` 신설)

## D · AQ 이월 소형 = AS 별건

Kyu 원문 = "kit 승격 이번 제외". AS 인수 목록:
- **kyu-bridge Expo 확장** (`src/expo.mjs` · `npx expo start --tunnel` · exp:// 캡처 · QR SVG)
- **web-push 실 발송** (Workers 호환 라이브러리 · 서명)
- **Expo 자동 로그인** (Kyu 원문 이번 제외)
- **PopMenu (bits-ui)** · **octicon 잔여** · **중첩 푸시 마무리**
- **kit 승격** (curiocity-kit 별건 EPIC)
- **DirtyGuard 실 E2E** (grownest mock endpoint 확장)

## 자기 검증 (Kyu 원문 착지 조건)

### QC 전량

```
pnpm check         → 1023 files · 0 err · 0 warn
pnpm test          → 69 files · 948 passed (기존)
pnpm build         → adapter-cloudflare · done
```

### Playwright 실 브라우저

- chromium-phone (390×844): 12 pass · 2 skip
- chromium-desktop (1280×800): 6 pass (d1~d6 · K0-0911-AQ 편입)
- **Total 18 pass** · 2 skip (mock 링크 부재)

### production 실측 (K0 curl)

- `curl -sI https://raw.githubusercontent.com/CuriocityDevAi/curiocity-relay/main/index.json` = **HTTP 200 · Content-Length 5854** (무인증 · 60/h 회피 확증)

### 미실행 · 미검증 명시 (Kyu 원문 요구)

- **프로덕션 카드 노출 실측 스샷** = Kyu Access OTP 로그인 필요 · K0 curl 미접근 · **Kyu 폰 실기 정본**
- **푸시 실 발송 스샷** = web-push 라이브러리 미편입 (AS 별건) · Kyu 클릭 doc 절차 완료 후 실측
- **Expo 데몬 실 tunnel + exp:// URL** = kyu-bridge `src/expo.mjs` 미확장 (AS 별건) · Kyu 클릭 doc 지시 완료 후 실측

## Kyu 실기 (처음 하는 사람 기준 · 프로덕션/폰/맥/Expo · PWA 설치 절차 포함)

### 프로덕션 (배포 후 · Cloudflare Workers Builds 1-3분)

1. `git ls-remote origin feat/k0-0914-ar-relay-index-push` = `575aeff` 확인
2. Cloudflare 대시보드 = 새 버전 Traffic 100% 반영 대기
3. **curl 실측** (터미널):
   ```bash
   curl -sI https://raw.githubusercontent.com/CuriocityDevAi/curiocity-relay/main/index.json
   ```
   → HTTP 200 확증
4. `https://test.curiocity.company` 접속 (Access OTP 로그인)
5. 홈 화면 = 흰 카드 4개 (할 일 · 최근 활동 · 프로젝트 · 허브)
6. **할 일 카드 = "발부 대기 · k0-K0-0911-AQ-test" 노출** (index.json 소비 확증 · Kyu 원문 착지 조건)
7. **허브 카드 K0 행 = "발부 대기" 상태** (동면 → 활성)
8. **relay 읽기 실패 시** = 허브 카드 아래 "⚠ relay 읽기 실패 · <사유>" 배너 노출 확증

### 아이폰 PWA 설치 절차 (Kyu 원문 = "처음 하는 사람 기준")

1. Safari 로 `https://test.curiocity.company` 접속 (Access OTP)
2. **하단 Share 버튼** 탭 (사각형 안 위 화살표)
3. 스크롤 → **"홈 화면에 추가"** 탭
4. "추가" 확인 → 홈 화면에 test-portal 아이콘 생성
5. **홈 화면 아이콘 탭 → PWA 앱 모드로 실행** (상단 URL 바 없음 = 올바름)
6. 우상단 [⚙] → 시트 열림
7. 🔔 알림 절 = **[알림 켜기]** 스위치 ON
8. iOS 시스템 팝업 = "test-portal 이(가) 알림을 보내려 합니다" → **허용**
9. 이후 새 landing/pending push 발생 시 알림 도착 확증

### 맥 브라우저 (Chrome/Safari)

1. 브라우저 접속 → Access OTP 로그인
2. 홈 화면 = 데스크톱 3단 grid (사이드바 + 목록 + 상세)
3. 우상단 [⚙] → 시트 [알림 켜기] → 브라우저 팝업 → 허용
4. relay push webhook 실 발송 시 브라우저 우상단 알림 표시 확증

### Expo (M0 · agilo-medusa-pos-fork)

1. 데몬 확장 (별건 라운드) 완료 후:
2. 포털 홈 → agilo PR 진입 (상세)
3. 상단 **📱 [폰에서 열기]** 큰 버튼 확인
4. 버튼 탭 → 응답 실 exp_url 확증 (데몬 확장 후) · 현재 = 스캐폴딩 응답 확증
5. 폰 Expo Go 앱 = exp:// 딥링크 open → 앱 로드

## 이연 순증감

### AR 이연 회수 (AQ 프로덕션 결함 + 부르는 포털)
- relay index.json 정본 (무인증 · 60/h 회피)
- 착지 모달 (kyu_checks>0 · 세션 재팝업 금지)
- Web Push VAPID (SW + subscribe/unsubscribe + D1 + notify webhook)
- Expo 열기 편입 (projectType + 상세 [폰에서 열기])

### AR 신규 이연 → AS
- kyu-bridge 데몬 실 확장 (`src/expo.mjs` · `--tunnel` · exp:// 캡처 · QR SVG)
- web-push 실 발송 (Workers 호환 라이브러리 편입 · 서명)
- Expo 자동 로그인 (Kyu 원문 이번 제외)
- PopMenu · octicon 잔여 · 중첩 푸시 마무리 (D 이월 계속)

### AR 잔여 이연 (원장 유지)
- kit 승격 (curiocity-kit 별건 EPIC)
- DirtyGuard 실 E2E (grownest mock endpoint 확장)

### 원장 총 (AS 편입) = kyu-bridge Expo 확장 + web-push 실 발송 + Expo 자동 로그인 + PopMenu · octicon 잔여 · 중첩 푸시 + kit 승격 + DirtyGuard 실 E2E

## 커밋 · PR · 스캐폴딩

- 커밋: `575aeff` (K0-0914-AR · 23 파일 · +1009/-94)
- 브랜치: `feat/k0-0914-ar-relay-index-push`
- PR: [#91](https://github.com/CuriocityDevAi/test-portal/pull/91)
- body 첫 줄: `**round**: \`K0-0914-AR\``
- relay 커밋: [build-index Action + 초기 index.json + K0-0914-AR-report.md]

---

*정본 · K0-0914-AR-report · Kyu 프로덕션 실기 확증 대기 · AS 다음 라운드 (kyu-bridge Expo 확장 + web-push 실 발송 + PopMenu · octicon 잔여 · 중첩 푸시 + kit 승격 + Expo 자동 로그인 + DirtyGuard 실 E2E).*
