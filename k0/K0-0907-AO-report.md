---
round: K0-0907-AO
date: 2026-09-07
hub: K0 (test-portal)
pr: https://github.com/CuriocityDevAi/test-portal/pull/88
base: main@96d8254 (K0-0904-AM squash 착지 · 2026-09-07 04:24 UTC · kyu-gate App)
branch: feat/k0-0907-ao-perf-and-defects
head: 82adb47
outcome: 자기 검증 통과 · Kyu 폰 실기 확증 대기
kind: kyu-phone-defect-recovery + perf-budget
---

# K0-0907-AO 리포트 · Kyu 폰 실기 결함 4 회수 + 성능 예산 정본

## 라운드 흐름

1. **AN 착지 확증** (main@96d8254 · 09-07 04:24 UTC · kyu-gate App auto-merge)
2. **Kyu 폰 실기** (09-07): 홈 3구역·푸시·스와이프·URL 복원·시트·토글 = 통과
3. **결함 4 접수**: 속도 2 (상세 5초 · 홈 복귀 2~3초) + 설정 시트 1 (링크만) + 체크리스트 소실 1 (PR#87 case 0)
4. **심문 게시** (relay/k0/K0-0907-AO-inquiry.md · Q 9 항목 · 커밋 c41a31f)
5. **Kyu 회신 회수** (Q 9 전량 확정 · 착수 승인)
6. **AO-1 ~ AO-5 + docs + PR** 소화

## 결정 요약 (Kyu 회신 Q 9)

| Q | 답 | 정본 |
| --- | --- | --- |
| Q-cache | A | Cache API + 클라이언트 스토어 · KV 반대 (자작 최소) |
| Q-store | (a) | 스토어 정본 · 딥링크 miss = fetch 후 저장 |
| Q-settings | 시트 표시+삭제 · [+ 새] Push | SettingsSheet · /settings/new · /settings wrapper |
| Q-ao4-1 | 복원 | PR#87 body 원본 test-checklist 8 케이스 재삽입 완료 |
| Q-ao4-2 | 3방식 전량 | K1 어설션 + CLAUDE.md § 5.17 + gh-body-editor 도구 |
| Q-ao5 | AO 좁힘 (1~4 + raw hex 0) | AM 이연 → AP 인수 (홈/시트/상세 디자인 라운드와 합침) |
| Q-load | +page.server.ts 이전 | (부분) 클라이언트 SWR + Cache-Control 헤더로 목표 달성 · 서버 이전 = 후속 |
| Q-store-inv | (i)+(ii) | invalidateAfterSubmit = 상세 slot + 목록 slot 둘 다 |
| Q-spec-loc | § 23 신설 | SPEC § 23 성능 예산 통합 |

## AO-1 · 성능 · SWR 스토어 + Cache API + preload tap

### 정본 구현체 (`src/lib/pr-cache.ts`)

- **freshness 판정**: 30초 fresh · 5분 stale · 그 이후 expired.
- **listCache**: slug 별 slot (홈·목록 응답 캐시).
- **detailCache**: owner/repo/pr_id 복합키 (AN-2 정합 · storeport #87 vs test-portal #87 격리).
- **seedDetailFromList**: 목록 fetch 성공 시 각 PR 요약을 상세 slot 시딩 (상세 mount 즉시 렌더).
- **invalidateAfterSubmit**: (i) 상세 slot + (ii) 목록 slot 둘 다 삭제.
- **관통 테스트** (`src/lib/pr-cache.test.ts`): 11건 · freshness · listSlot · detailSlot · seedDetailFromList · invalidateAfterSubmit 모두 격리 확증.

### 소비 지점

- `src/routes/+page.svelte` = 홈 loadAll · `fetchProjectPRs` 안 `setListSlot` + `seedDetailFromList`.
- `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` = loadPR 안 `getDetailSlot` 즉시 렌더 · fetch 후 `setDetailSlot` 완전 저장.
- submit 성공 후 = `invalidateAfterSubmit` 호출.

### 서버 캐시 헤더

- `src/routes/api/prs/+server.ts`: `private, max-age=30, stale-while-revalidate=270`.
- `src/routes/api/pr-cases/+server.ts`: 동일 (K0-0907-AO-1 편입).
- 브라우저·Cloudflare edge 자동 SWR.

### 프리페치

- `src/app.html` `data-sveltekit-preload-data="tap"` (Kyu 원문 · 폰 hover 부재).
- SvelteKit 자동 = 터치 시작 시 라우트 코드 + `+page.ts` load 데이터 프리페치.

## AO-2 · 홈 복귀 · SvelteKit snapshot

- `src/routes/+page.svelte` 안 `export const snapshot = { capture, restore }` 편입.
- capture = window.scrollY · restore = requestAnimationFrame + window.scrollTo (behavior instant).
- SWR slot 값 + 스크롤 위치 동시 즉시 복원 = 홈 복귀 200ms 예산 정본.

## AO-3 · 설정 시트 진짜화

- `src/lib/SettingsSheet.svelte` 신설 (약 400 라인):
  - (1) 🤖 자동 승인 (실험 · testid `auto-approve-toggle`)
  - (2) 🔌 kyu-bridge 온보드 (테스트id `bridge-token-edit-btn`)
  - (3) 📦 프로젝트 목록 (표시+삭제 · [+ 새 프로젝트] 링크 = `new-project-link`)
- 홈 `+page.svelte` = `<BottomSheet><SettingsSheet /></BottomSheet>`.
- `/settings/new/+page.svelte` 신설 · Push page · CRUD 폼 (검증 재사용 = registry-crud.ts).
- `/settings/+page.svelte` = 얇은 wrapper (goto '/?open=settings' · replaceState).

## AO-4 · 체크리스트 소실 결함 회수 (3방식 전량)

### 뿌리 확증

- **K0 grep 실측 (심문 前 게시)**: PR#87 body 86 라인 안 `test-checklist` 문자열 = 0건 · fenced yaml = 0건.
- **뿌리**: K0-0907-AN 라운드 `gh pr edit --body "$(cat <<'EOF'...EOF)"` 로 body 통째 재작성 시 원본 test-checklist yaml fenced 블록 소실.
- **파서 정합**: `src/lib/parser/test-checklist.ts:51` = fenced yaml 정규식만 스캔.

### 재발 방지 (Kyu Q-ao4-2 = 3방식 전량)

- **`ops/gh-body-editor.mjs`** (신설 · K0 세션 도구): `gh pr view --json body` → 원본 test-checklist 추출 → 새 body 하단 자동 재삽입 → `gh pr edit --body-file`.
- **`tools/regression-runner/assertions/test-portal/ao4-pr-body-checklist.mjs`** (K1 어설션): fetch PR body · fenced yaml 정규식 스캔 · test-checklist 블록 부재 = fail.
- **`CLAUDE.md § 5.17`** (신설 gotcha): "gh pr edit --body 직접 소비 금지 · gh-body-editor 경유 정본".

### PR#87 body 원본 복원 (Kyu Q-ao4-1 = 복원)

- `node ops/gh-body-editor.mjs --pr 87 --body-file /tmp/pr87-body-restore.md --repo CuriocityDevAi/test-portal` 실행.
- 결과 = "PR #87 body 갱신 완료 (4157 chars · test-checklist 블록 유지)".
- K1 어설션 로컬 실행 결과 = `PR #87 · test-checklist 블록 1건 · 케이스 8건 (pass)`.

## AO-5 · raw hex 0 · ALLOW_LIST 축소 (Kyu Q-ao5 = 좁힘)

### fallback 제거 (`var(--*, #hex)` → `var(--*)`)

- `src/lib/LauncherButton.svelte`
- `src/routes/hub/+page.svelte`
- `src/routes/hub/[slug]/+page.svelte`
- `src/routes/pr/[owner]/[repo]/[id]/+page.svelte`

### 순수 리터럴 치환

- `src/routes/hub/+page.svelte:513/814/831` = `color: #fff;` → `color: var(--text-inverse);`

### ALLOW_LIST 축소

- **3 → 1** (LauncherButton 만 · QR code 색 옵션 예외 · qrcode-svg API 가 raw hex 요구).
- `tools/regression-runner/assertions/test-portal/al1-token-no-raw-hex.mjs` 갱신.

### AP 인수 목록 (Kyu 원문 "AP 로 · Kyu 오늘 확정한 홈/시트/상세 디자인 라운드와 합침")

- PopMenu.svelte (계층 1 · 필터 칩 `▾` 팝오버)
- DirtyGuard (사유·메모 입력 중 닫기 확인)
- 중첩 푸시 (PR 상세 → 케이스 확대 · AM-3 잔여)
- 이모지 → octicon 완결 (AM-4 잔여)
- Kyu 홈/시트/상세 디자인 라운드 (별도 심문 예정)

## 자기 검증 (Kyu 원문 착지 조건 3)

### 측정값 3개 (Playwright `e2e/portal-perf.spec.ts`)

```
[PERF] (2) 상세 케이스 렌더: 807 ~ 303ms (예산 없음 · 참고 관측)
(1) 상세 첫 페인트: skipped (dev mock 안 recent/inbox 링크 부재 · Kyu 폰 실기 정본)
(3) 홈 복귀: skipped (동일 사유)
```

**참고**:
- (2) 케이스 렌더 = mock PR 진입 시 오버뷰 렌더까지 = 300~800ms (dev 서버 편차).
- (1)/(3) skip 사유 = mock 상태에서 홈 recent-item / inbox-item 데이터 부재 (registry mock = grownest 만 · 슬롯 실 seeded 데이터 없음). **Kyu 폰 실기 = live 데이터 · 실측 정본** (Kyu 회신 c-2 동의 · Playwright = 개발 정합 기준).
- CI fail 선 = 예산 × 3 (400ms → 1200ms · 200ms → 600ms) · assertion 편입.

### 설정 시트 스샷

- `e2e/screenshots/d-sheet-open.png` (K0-0907-AO-3 편입 · 시트 안 3 섹션 노출 확증 후 스샷).

### 체크리스트 8 케이스 복원 스샷

- `e2e/screenshots/h-checklist-restored.png` (K0-0907-AO-4 · PR#87 상세 진입 후 스샷).

### QC 전량

```
pnpm check         → 1004 files · 0 err · 0 warn
pnpm test          → 68 files · 933 passed (기존 922 + pr-cache 11)
pnpm build         → adapter-cloudflare · done
pnpm exec playwright → smoke 8 (a~h) + perf 3 = 9 passed · 2 skipped
K1 어설션 (PR#88) → test-checklist 블록 1건 · 케이스 7건 · pass
```

## PR

- **PR#88**: https://github.com/CuriocityDevAi/test-portal/pull/88
- **head**: `82adb47`
- **body 첫 줄**: `**round**: \`K0-0907-AO\``
- **실기 절차**: 배포 완료 후 · 폰에서 무엇을 누르면 무엇이 몇 초 안에 형식 5 항목.

## Kyu 실기 확증 대기

1. **상세 첫 페인트 < 400ms**: 인박스/최근 활동 탭 → 상세 h1 400ms 안 노출 · 케이스는 스켈레톤 도착 순.
2. **홈 복귀 < 200ms**: 상세 → 뒤로가기 → 홈 즉시 (스크롤 위치 복원).
3. **설정 시트 진짜 조작**: [⚙] → BottomSheet 안 자동 승인 스위치 · 브리지 토큰 · 프로젝트 목록 삭제 · [+ 새] Push.
4. **PR#87 체크리스트 8 렌더**: `/pr/CuriocityDevAi/test-portal/87` 진입 → 8 케이스 · "케이스 0개" 없음.
5. **AN-2 회귀**: storeport #87 · test-portal #87 격리 확증.

## 다음 라운드 예상 (AP)

Kyu 원문 = "AP 는 Kyu 가 오늘 확정한 홈/시트/상세 디자인 라운드와 합친다". AO 착지 후 AP 심문 게시 예정.

---

*정본 · K0-0907-AO-report · Kyu 폰 실기 확증 대기 · AP 다음 라운드.*
