---
round: K0-0916-A
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/103
base: fe6e96c
head: bc9c866
spec_bump: v1.K0-0916-A
req: [K0-AY-1, K0-AY-2, K0-AY-3, K0-AY-4, K0-AY-5]
finished_at: 2026-09-16
---

# K0-0916-A · AY 마일스톤 실기 준비 + 허브 실상태 소비 (착지 리포트)

**Kyu 원문 (2026-09-16)**: "AY = 마일스톤 실기 준비 + 허브 실상태 소비" · 5 항목 지시.

**base** = main@fe6e96c (K2-0915-B 오케 머지 후 · PR#99·100·101 병합됨).
**head** = feat/k0-0916-a-ay-milestone @ bc9c866.
**PR** = #103 · https://github.com/CuriocityDevAi/test-portal/pull/103.
**착지 직전 origin/main 재병합** = Already up to date.

## 파일 경계 준수

Kyu 09-15 정본: K0 = `src/routes/**`(api 제외) · `src/lib/ui/**` · `config/projects.json` + docs 편입 (state/k0.md · tracking/k0.md · SPEC · milestones/).
K1/K2 소유 (`api/`·`kyu-bridge`·`.github`·`tools/regression-runner`·`migrations`) 침범 없음.

## AY-1 · 허브 탭 실상태 소비

- **소비 소스** = relay `status/hubs.json` (K1-0915-D `§ K1-status-watcher` 정본).
- **소비 경로** = 클라이언트 브라우저 raw fetch (`raw.githubusercontent.com/CuriocityDevAi/curiocity-relay/main/status/hubs.json`). CORS 허용 확증 (`access-control-allow-origin: *`) · api/ 라우트 신설 없음 (K0 경계).
- **폴링** = 60초 (K1 status-watcher 주기 정합).
- **상태 점 4색** = running=`--accent` (파랑) · waiting-inquiry=`--wait` (주황) · idle=`--muted` (회색) · sleeping=`#111` (검정).
- **N분 전** = `updated_at` 기반 relativeTime.
- **[심문 보기] 링크** = `inquiry_url?` 옵셔널 (K1 확장 대기 · 부재 시 미노출).
- **탭 배지 재편** = 심문 대기 hub 수 + 발부 대기 prompts 수.
- **폴백** = hubs.json 실패 = `hubs-status-warn` 배너 · 기존 prompts 파생 유지.

## AY-2 · 다기기 P/F 이어 찍기 실측

- 신 spec `e2e/portal-multi-device-ay2.spec.ts` (chromium-phone) · Playwright 390 → 뷰포트 전환 1280.
- Kyu 요구 실 D1 case_state 정본 확증 = 프로덕션 실기 회부 (Cloudflare D1 편입 후 · 이 spec = UI 회귀만).
- dev 서버 Access JWT 401 회수 = `page.route` 로 격리 mock (prs · pr-cases · case-state · pr-status · pr-checks · gate · runs).
- Playwright 실행 = **1 pass** (ay2-1).

## AY-3 · AQ 이월 소형 완결 (kit 승격 제외)

- **Icon** = `src/lib/ui/Icon.svelte` 신설 · @primer/octicons dep 소비 · ICON_PATHS map (`git-pull-request` · `x-circle-fill` · `gear` · `kebab-horizontal`).
- **잔여 회수** = 인라인 SVG 3곳 (`src/lib/PrList.svelte:321` · `src/lib/BottomSheet.svelte:164` · `src/routes/+page.svelte` gear) → `<Icon name="..." />` 교체.
- **PopMenu** = `src/lib/ui/PopMenu.svelte` 신설 · bits-ui DropdownMenu 래핑 · 홈 헤더 [⋯] 편입 · 3 옵션 (설정 열기 · 허브 실상태 새로고침 · 전체 새로고침).
- **중첩 푸시** = 상세 페이지 안 케이스 확대 뷰 (`PushPage` 중첩 · 계층 4). 각 케이스 카드에 [확대] 버튼 · `zoomedCase` state · `.case-zoom` 뷰 (title · description · 딥링크) · [← 뒤로] 닫기.

## AY-4 · 마일스톤 실기 checks 초안

- 신설 파일 `docs/milestones/K0-0916-A-drill-checks.md`.
- **폰 8 단계** = 홈 화면 설치 (세 줄) → 알림 켜기 → 실기 탭 → PR 상세 → [테스트 열기] SSE 4단계 → 케이스 판정 → 종합 제출 → 진행 띠 보라→초록 → 푸시 수신.
- **맥 5 단계** = 두 열 · 이력 탭 행위 문구 · 허브 탭 실상태 · 배지 · 더보기 메뉴.
- **각 항목** = ok / ng 두 줄.
- **처음 하는 사람 기준** · **약어 0** (SSE · PWA · OTP 등 모두 풀어씀).
- 오케 검수 후 `curiocity-relay/milestones/` push 대상.

## AY-5 · AV 회귀

- Playwright chromium-phone = 21 pass · 9 skip · 0 fail.
- Playwright chromium-desktop + chromium-tablet = 3 pass · 5 skip · 0 fail.
- AV 1~7 항목 (환경 없는 버튼 · 폴백 안내 · 종합 판정 헤더 · 완료 제외 · pr-checks · 허브 파생 · iOS 배너) = 정합 유지.

## 자기 검증 결과

- `pnpm check` = 1044 files · **0 err** · 57 warnings (v2 legacy CSS unused)
- `pnpm test` = 74 test files · **987 pass**
- `pnpm build` = adapter-cloudflare done
- Playwright 다기기 = 신 spec ay2-1 pass · 회귀 정합

## 성능 예산 · 커밋 규약

- `raw hex` = 커밋 메시지 안 raw hex 사용 안 함 (Kyu 원문 BUILD 규약).
- 커밋 메시지 = `!` 미포함 (BUILD 규약).
- PR body frontmatter + test-checklist `req:` 필드 포함.

## 다음 라운드 인수 (분산)

- **K1** = relay status/hubs.json 스키마 확장 = `inquiry_url?` 필드 편입 (심문 대기 링크 실 연결) · 심문 대기 상태 전환 로직 (`<hub>/*inquiry*.md` 감지 시 state='waiting-inquiry').
- **K0** = 마일스톤 실기 실 체크 (오케 검수 후 relay milestones push · 실기일 확정).
- **K1** = `/api/gate` · `/api/env/open` 실 편입 (v0.5.0 프로덕션 확증).
- **K2** = `/api/runs` 실 데이터 (regression-runner 기록).

## 파일 변경 요약

- **A** `src/lib/ui/Icon.svelte` (신설)
- **A** `src/lib/ui/PopMenu.svelte` (신설)
- **A** `e2e/portal-multi-device-ay2.spec.ts` (신설)
- **A** `docs/milestones/K0-0916-A-drill-checks.md` (신설)
- **M** `src/routes/+page.svelte` (hubs.json 소비 · 배지 · PopMenu · Icon)
- **M** `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` (케이스 확대 중첩 푸시)
- **M** `src/lib/PrList.svelte` (Icon 교체)
- **M** `src/lib/BottomSheet.svelte` (Icon 교체)
- **M** `docs/SPEC.md` (§ K0-AY-1~5 · v1.K0-0916-A)
- **M** `docs/state/k0.md` (AY Active 편입)
- **M** `docs/tracking/k0.md` (K101 편입)
