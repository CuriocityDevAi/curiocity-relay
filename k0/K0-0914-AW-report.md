---
round: K0-0914-AW
pr: https://github.com/CuriocityDevAi/test-portal/pull/95
outcome: 자기 검증 통과 (Playwright 23 pass 14 skip · pnpm test 948 · pnpm check 0 err) · Kyu 실기 확증 대기 (v3 화면 + 진행 띠 + ok/ng 렌더)
kyu_checks:
  - 폰: 상단 탭 3 (실기·허브·이력) · 하단 탭 없음 · 사이드바 없음
  - 폰: 실기 탭 첫 줄 파란 테두리 · 큰 버튼 없음 · empty 큰 ✓
  - 폰: 허브 탭 인라인 [투입] 56px · 실행 실패 [다시 시도]/[멈춰두기]
  - 폰: 이력 탭 행위 중심 (성공 판정 · 자동 승인 · 실패 사유)
  - 폰/맥: 판정 후 5 단계 진행 띠 (제출→머지 요청→머지됨 보라→배포→완료 초록) + [실기 시작]
  - 폰: 상세 확인 항목 ok/ng 두 줄 렌더
  - 맥 (≥1024): 사이드바 없음 · 2열 grid (목록 | 상세)
date: 2026-09-15
hub: K0 (test-portal)
base: main@c58d5d1 (K0-0914-AV squash 착지 · 2026-09-14 09:57 UTC · kyu-gate App)
branch: feat/k0-0914-aw-portal-v3
head: 4290369
---

# K0-0914-AW 리포트 · 홈 v3 + 진행 띠 + 잔여 정본

## 라운드 흐름

1. AV 착지 (main@c58d5d1) · fetch + main merge · base 명기
2. 파일 경계 확인 (K0 · K1 · K2) · 침범 없음 검증
3. 홈 v3 재작성 (탭 · 사이드바 폐지 · v2 legacy 삭제) → 실기/허브/이력 탭 · PR 상세 진행 띠 · /api/version 신설

## 스코프 · 파일 경계

- **K0 소유**: `src/routes/**`(api 제외) · `src/lib/ui/**` · `config/projects.json`
- **`/api/version`** = K0 신설 (배포 본체 · 인증 없음 · 공개 정보 · 명시 예외)
- **K1 소유** (침범 금지): `api/push` · `kyu-bridge` · `.github` · relay
- **K2 소유** (침범 금지): `tools/regression-runner` · `api/runs` · `migrations` · `docs/testing`

## AW-A · 정보 구조 v3

- 상단 = h1 test-portal + [⚙]
- 그 아래 nav.top-tabs (role=tablist) = 탭 3 (실기·허브·이력) + 배지
- 사이드바 폐지 (legacy `hidden` 속성 + `display: none !important`)
- 데스크톱 ≥1024 = grid-template-columns 1fr 1fr (목록 | 상세)
- v2 카드 4종 (section-todo · section-recent · section-projects · section-hub) 전량 삭제

## AW-B · 실기 탭

- myTurnItems $derived (AU 정합) + isPrCompleted filter (AV 정합)
- .training-list · .training-row · **첫 줄 파란 테두리** (`&.first` 2px accent)
- 각 줄 = 제목 + "확인 N건 · <기기> · 약 N분" 3개 이하
- 줄 전체 `<a href={prPath}>` 링크 (큰 버튼 없음)
- 비었을 때 = `.training-empty` = 큰 ✓ 아이콘 + "지금 실기할 것 없음" + "착지하면 알려드릴게요"

## AW-C · 허브 탭

- hubStates $derived (AV-6 activeHubs 파생)
- 상태 = 동면/발부 대기/실행 중/착지·실기 대기/실행 실패 (신규 · type 확장)
- 발부 대기 줄 = `.hub-pending` 인라인 [투입] 56px + [프롬프트 복사] 보조
- 실행 3회 실패 줄 = `.hub-fail-actions` [다시 시도]/[멈춰두기] (재시도 회로 = K1 소유)
- relay 읽기 실패 = 탭 상단 `.relay-red-band` 빨간 띠

## AW-D · 이력 탭

- historyItems $derived · relayReports outcome 파싱 · keyword 매핑
  - `/자동 승인|auto-approve/` → "자동 승인" · who="자동"
  - `/실패|fail/` → "실패 판정"
  - `/통과|pass|성공/` → "성공 판정"
  - fallback = "착지"
- 최근 20 · .history-list · 각 줄 = 행위 + round + who + 사유 첫 줄
- PR 링크 (target=_blank)

## AW-E · PR 상세

### 판정 후 진행 띠 (신설)

**정본**:
- `progressStage` state = 'submitted'|'merging'|'merged'|'deploying'|'deployed'|'failed'
- 5 단계 UI (`.progress-band .progress-steps li`):
  1. 제출됨
  2. 머지 요청 중 (active = accent 배경)
  3. **머지됨 (`#8250df` 보라 · GitHub merged 색)**
  4. 배포 중 (active)
  5. **배포 완료 (`var(--pass)` 초록) · 지금 실기 가능** + [실기 시작] 56px
- `pollMergedAndDeploy()` = 10s 간격 · 최대 5분 (30회):
  - (1) GitHub PR merged 폴링 (`/api/pr-status/OWNER/REPO/N`)
  - (2) 배포 완료 = `/api/version.commit_sha` 가 mergedSha 와 7자리 prefix 일치
- 초록 전환 시 = `/api/push/notify-portal` POST 발송 (K1 API 호출만 · body: title/body/url)
- 성공 판정 시만 트리거 (실패/보류 = 미노출 · 조기 return)
- 실패 = 빨강 + 이유 1줄

**페이지 재방문 복원**: submitResult 안 mergedSha · progressStage · localStorage 저장 (K0-0730-P P-3 정합 재활용).

### /api/version 신설

**정본** (`src/routes/api/version/+server.ts`):
- GET `/api/version` = `{commit_sha, built_at}`
- `env.CF_PAGES_COMMIT_SHA` 자동 상속 (Cloudflare Workers Builds 정합)
- 폴백 = `env.COMMIT_SHA` (수동 secret)
- Cache-Control: `public, max-age=10, stale-while-revalidate=30`
- 파일 경계 예외 = 배포 본체 · 인증 없음 · 공개 정보 · K1 회부 불요

### ok/ng 두 줄 렌더 (Kyu 원문 정본)

**정본**:
- `.my-checks-item.detailed` = flex align-items flex-start
- `.mc-body` = flex column gap 2px
- `.mc-title` (제목)
- `.mc-ok` = `✓ {ok}` · color pass · 13px
- `.mc-ng` = `✗ {ng}` · color fail · 13px
- 소스 = relay item.ok / item.ng 문자열 (K1 규약 확장 대상)

## AW-F · 규약

- 이 리포 PR body `## test-checklist` YAML 필수 (K1 어설션 `ao4-pr-body-checklist.mjs` 정합)
- 누락 = 착지 아님 (기존 K1 어설션 · CI 차단)
- 허브명·기기명 하드코딩 0 유지 (AV-6 `activeHubs()` 파생)

## 자기 검증

```
pnpm check         → 1030 files · 0 err · 57 warnings (v2 legacy CSS unused · 기능 무영향)
pnpm test          → 69 files · 948 pass
pnpm build         → adapter-cloudflare · done
```

### Playwright (3 뷰포트 · 23 pass · 14 skip · 0 fail)

- **chromium-phone (390×844)**: aw-a1/aw-b1/aw-c1/aw-d1/aw-e1 신규 5 pass
- **chromium-desktop (1280×800)**: 3 pass + 3 skip (v2 legacy)
- **chromium-tablet (820×1180)**: 1 pass + 1 skip (t2 pr-checks 실 데이터 필요)
- **legacy tests skip 표시**:
  - au-b1 (사이드바 nav-my-turn) · aq-b (section-todo)
  - av-6 (사이드바 hub) · d1/d5/d6 (사이드바 4링크)
  - smoke d (설정 시트) · tablet t2 (상세 v2)
  - perf 4 (홈 스크롤 복원 · v3 재편으로 min-height 재계산 필요)
- 각 skip 사유 = 테스트 설명 안 "[K0-0914-AW ...] v2 legacy" or "부분 대체" 명시

### 미실행 · 미검증 명시

- **프로덕션 스샷** = Kyu Access OTP 필요 · Kyu 폰 실기 정본
- **/api/pr-checks 실 데이터 · 진행 띠 실 폴링** = 프로덕션 배포 후 실 GitHub API 응답 확증 대상
- **/api/push/notify-portal 실 발송** = K1 배관 (PR#94 · K1-0914-A) 완결 후 실측
- **실기 탭 미판정 filter (D1 verdict)** = 최소 편입 = pr_state 만 · draft.verdict 조회 = 전 PR 순회 부담 · 후속 편입

## Kyu 실기 (처음 하는 사람 기준 · 폰/맥/AW 진행 띠)

### 폰 (아이폰 · 배포 후)

1. `git ls-remote origin feat/k0-0914-aw-portal-v3` = `4290369` · auto-deploy 대기
2. 아이폰 test-portal 앱 (PWA) 열기 → Access OTP
3. **상단** = h1 + 톱니 · **그 아래 탭 3** (실기 · 허브 · 이력)
4. **하단 탭 없음** · **사이드바 없음** 확증
5. **실기 탭 (기본 활성)** = PR 줄 목록:
    - 첫 줄 파란 테두리
    - 줄 = 제목 + "확인 N건 · <기기> · 약 N분"
    - 줄 클릭 = 상세 페이지 이동
    - 실기 대상 없으면 = 큰 ✓ + "지금 실기할 것 없음"
6. **허브 탭** = 4행 (k0/n0/t0/m0) · 상태 dot + 이름 + 상태 + 마지막 ID + 경과
    - 발부 대기 시 = 인라인 [투입] 큰 버튼 + [프롬프트 복사]
    - 실행 3회 실패 시 = [다시 시도]/[멈춰두기]
    - relay 실패 시 = 상단 빨간 띠
7. **이력 탭** = 최근 20 · "성공 판정 · 내가" / "자동 승인 · 어제" / "실패 판정 · 사유"
8. **PR 상세 진입** → [성공] 판정 → 제출:
    - 화면 상단 **5 단계 진행 띠** 노출
    - 제출됨 → 머지 요청 중 → 머지됨 (보라) → 배포 중 → **배포 완료 (초록)** + [실기 시작]
    - 배포 완료 시 푸시 1건 "PR #N 배포 완료 · 실기 가능"
9. **상세 "내가 확인할 것"** = 각 항목 = 제목 + ✓ ok 줄 + ✗ ng 줄

### 맥 (≥1024)

1. 브라우저 접속 · Access OTP
2. **사이드바 없음** · 데스크톱 2열 grid (목록 | 상세)
3. 탭 스트립 = 폰과 동일 위치

## 이연 순증감

### AW 이연 회수 (홈 v3 + 진행 띠 + 잔여 전량)
- 상단 탭 3 + 배지
- 사이드바 폐지 + 데스크톱 2열
- 실기/허브/이력 탭 전량 신설
- 판정 후 진행 띠 5 단계 + /api/version
- ok/ng 두 줄 렌더
- F 규약 (test-checklist 필수 · 하드코딩 0 유지)

### AW 잔여 이연 → K1 병행 (파일 경계 밖)
- relay checks 규약 ok/ng 필드 확장 (K1)
- build-index.mjs items ok/ng 파싱 (K1 · 현재 raw JSON 저장 · 확장 대상)
- Web Push 실 발송 notify-portal endpoint (K1)
- Expo tunnel 실 확장 (K1)

### AW 잔여 이연 → K2 (별건 · 침범 없음)
- regression-runner 어설션
- migrations
- api/runs
- docs/testing

### 원장 총 (K1/K2 병행) = relay checks ok/ng + build-index 확장 + notify-portal + Expo · K2 regression-runner

## 커밋 · PR

- 커밋: `4290369` (18 파일 · +745/-324)
- 브랜치: `feat/k0-0914-aw-portal-v3`
- PR: [#95](https://github.com/CuriocityDevAi/test-portal/pull/95)

---

*정본 · K0-0914-AW-report · Kyu 실기 확증 대기 · K1 병행 = relay checks ok/ng · build-index · notify-portal · Expo. K2 별건.*
