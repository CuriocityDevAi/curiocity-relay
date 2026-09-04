# K0-0904-AL · 리포트 (시각 레이어 · GitHub 모바일 문법)

**round**: `K0-0904-AL`
**hub**: k0 (test-portal)
**PR**: https://github.com/CuriocityDevAi/test-portal/pull/86
**branch**: `feat/k0-0904-al-visual-github-mobile`
**commit**: `8600ed3`
**timestamp**: 2026-09-04

---

## 요약

Kyu 원문 (09-04): "test-portal 을 GitHub 모바일 앱처럼 · 화이트 배경 · 스크린샷이 정본".

`docs/design/reference/github-mobile/*.PNG` 5장 그대로 구현.

**범위 통제** (Kyu 명시 · 그대로 준수):
- 이번: **AL-1** 라이트 테마 + **AL-2a** [할 일] + **AL-2b** [PR 목록] + **AL-3** 명명 통일 + **AL-4** Playwright + **AL-5** workflow fix
- 다음 라운드: PR 상세 병행 (AH-4) · 허브 재구성 · 이모지 → octicon 완전 · 다크

---

## 폰 스샷 5장 (Kyu 요구)

스크린샷 파일 = `k0/K0-0904-AL-screenshots/*.png`. 원본과 나란히 배치:

| # | 파일 | 대응 스크린샷 (참조) |
|---|------|----------------------|
| 01 | `01-inbox.png` | `docs/design/reference/github-mobile/inbox.PNG` |
| 02 | `02-inbox-empty.png` | inbox.PNG 빈 상태 |
| 03 | `03-pr-list.png` | `docs/design/reference/github-mobile/pull-requests.PNG` |
| 04 | `04-pr-row-pill.png` | pull-requests.PNG pill/chip 확대 |
| 05 | `05-hub.png` | (이관된 미션 컨트롤 · 재구성 다음 라운드) |

---

## AL-1 · 라이트 테마 + Primer 토큰

**정본 파일**:
- `src/lib/kit-tokens.css` (재작성 · Primer palette light)
- `docs/design/token-mapping.md` (신설 · 매핑표 정본)
- `src/routes/+layout.svelte` (inline hex 제거)

**Primer palette light 매핑**:
- `--bg` = neutral-50 (`#f6f8fa`) canvas 연회색
- `--surface-elevated` = neutral-0 (`#ffffff`) 흰 카드
- `--fg` = neutral-900 (`#1f2328`)
- `--muted` = neutral-500 (`#59636e`)
- `--border` = neutral-200 (`#d1d9e0`)
- `--accent` = blue-500 (`#0969da`)
- `--pass` = green-500 · `--fail` = red-500 · `--wait` = yellow-500 · `--hold` = purple-500
- 본문 14px · 메타 12px · 터치 44px

**설치**:
- `pnpm add @primer/primitives @primer/octicons` (11.10 · 19.34)
- 아이콘 = SVG 인라인 (search · sync · git-pull-request)

## AL-2a · [할 일] 화면 (inbox.PNG 문법)

**정본 파일**: `src/routes/+page.svelte`

- 큰 굵은 제목 "할 일" (20px · font-weight 700)
- 상단 우측 icon-btn 2 (search + sync · Primer octicon SVG 인라인)
- 필터 칩 4개 (전체 · 실기 · 승인 · 도장 · localStorage `test-portal:inbox-filter:v1`)
- 행 = `.row-dot` (kind별 색 · accent/wait/pass 원형 마커) + `.row-path` (회색 경로) + `.row-title` (굵은 제목) + `.row-time` (상대시간)
- `relativeTime(iso)` = `4h` · `25d` · `6mo` 문법 (inbox.PNG 준용)
- 0건 = `.empty-zero` 1.5rem "지금 할 일이 없습니다"

## AL-2b · [PR 목록] (pull-requests.PNG 문법)

**정본 파일**: `src/lib/PrList.svelte` · `src/routes/prs/+page.svelte`

- h1 "Pull Requests" (스크린샷 정합)
- 프로젝트 탭 = `projectDisplayName(project)` 소비 (registry 단일 소스)
- 각 행 `.pr-row-link`:
  - 좌 git-pull-request octicon SVG (16px · currentColor · pill 색)
  - `.pr-row-path` = "CuriocityDevAi/test-portal #85" 회색 12px
  - `.pr-row-title` = 굵은 제목 14px · 2 라인 clamp
  - `.pr-row-chips` = pill 4색 + 진행도 chip (`3/5`) + 어설션 chip (`🤖3·👤4`)
  - 우 `.pr-row-time` = 상대시간
- 상단 필터 칩 = 전체 · 판정 대기 · 판정 완료 (localStorage)

## AL-3 · 명명 통일

- `src/routes/prs/+page.svelte:8` = `import { projectDisplayName } from '$lib/inbox'`
- `src/routes/prs/+page.svelte:149` = `{projectDisplayName(project)}` (slug 노출 회수)
- 어설션 `al3-registry-single-source.mjs` 자동 감지 (정본 정의처 + 감사 지점 소비 확증)

## AL-공통 · 하단 알약 바 + 헤더

**정본 파일**: `src/routes/+layout.svelte`

- `.bottom-tabs` = `position: fixed` · `bottom: 12px + safe-area` · `left: 50%; transform: translateX(-50%)`
- `border-radius: var(--radius-round)` · `box-shadow: var(--shadow-elevated)`
- 활성 탭 = `.tab.active { background: var(--accent-light); color: var(--accent) }` pill
- 68px min-width · 44px touch target · 56px min-height

## AL-4 · Playwright 자기 검증 (Kyu 승인 규약 A · 설치 범위)

**설치 완료**:
```bash
pnpm add -D @playwright/test  # 1.62.1
npx playwright install chromium  # already cached
```

**정본 파일**:
- `playwright.config.ts` (chromium + 390×844 뷰포트 · webkit iPhone emulation 회피)
- `e2e/portal-smoke.spec.ts` (5 tests · 3탭 + 인박스 + PR 목록)
- `e2e/screenshots/01~05*.png` (스샷 5장)

**실행 결과**:
```
Running 5 tests using 1 worker

  ✓  1 [chromium-phone] › [할 일] 홈 진입 · 탭 3개 · 필터 칩 · 큰 제목 (422ms)
  ✓  2 [chromium-phone] › [할 일] 0건 = "지금 할 일이 없습니다" 큰 문구 (380ms)
  ✓  3 [chromium-phone] › [PR] 탭 · 상단 필터 칩 · 프로젝트 탭 (262ms)
  ✓  4 [chromium-phone] › [PR] 목록 행 pill · 프로젝트명 registry 정본 (789ms)
  ✓  5 [chromium-phone] › [허브] 탭 · 미션 컨트롤 이관 확증 (211ms)

  5 passed (6.9s)
```

**dev 서버 자동 기동**: `pnpm dev -- --host 127.0.0.1 --port 5173` (Playwright webServer)

**다음 라운드 재사용**: spec 확장 (상세 병행 · 어설션 뱃지 · 다크 등)

## AL-5 · workflow 실패 알림 억제

**뿌리 (Kyu 폰 3건 알림 재현)**:
- `gh run list --workflow=kyu-gate-auto-merge.yml --limit 20 --json ...`
- failure 3건 실측 (2026-09-04T07:35~07:37)
- 로그: `X Pull request CuriocityDevAi/test-portal#81 is not mergeable: the base branch policy prohibits the merge.`
- 즉 workflow 정상 · check_run event trigger 정상 · pr_context 있음
- **Kyu 추정 "push-to-main 에서 도는 것" 은 오해** · 실측 = check_run event 정상 · merge 실패 = base branch policy (K0-0904-AK-1 stale SHA 별건 fix)

**정본 조치** (`.github/workflows/kyu-gate-auto-merge.yml:129-155`):
```yaml
if gh pr merge "${PR_NUMBER}" --repo "${REPO}" --squash --delete-branch 2>/tmp/merge.err; then
  gh pr comment ... "✓ kyu-gate 자동 병합 완료"
else
  err=$(cat /tmp/merge.err)
  echo "::warning::auto-merge 실패 (Actions failure 알림 억제)"
  gh pr comment ... "## ⚠ kyu-gate 자동 병합 스킵 ..."
fi
exit 0
```

이후 auto-merge 실패 시 = 실패 코멘트만 · Actions failure 알림 없음 (Kyu 폰 조용).

## 어설션 3 자체 검증

**신설 파일** (K1 러너 시그니처 준수):
1. `al1-token-no-raw-hex.mjs`
   - src 하위 raw hex 스캔 · 정규식 강화 (알파벳 hex 만 · PR #NNN 배제)
   - `ALLOW_LIST` = kit-tokens.css + 이연 파일 (LauncherButton · hub · PR 상세 · 다음 라운드 명시)
2. `al2-tabs-three-rendered.mjs`
   - `+layout.svelte` 안 nav.bottom-tabs · href 3종 (`/` · `/prs` · `/hub`) · aria-current 정합
3. `al3-registry-single-source.mjs`
   - `projectDisplayName` 정의처 확인 + 감사 지점 (`prs/+page.svelte` · `inbox.ts`) 소비 확증

**러너 결과**:
```
 ak1-stale-head-guard-pure            │ pass
 al1-token-no-raw-hex                 │ pass
 al2-tabs-three-rendered              │ pass
 al3-registry-single-source           │ pass
 migration-case-state-pk-preserved    │ pass
 exit_code = 0
```

---

## QC

- **pnpm check** = 996/0/0 ✅
- **pnpm test** = 67 files · 904 pass ✅
- **pnpm build** = ✔ (adapter-cloudflare) ✅
- **러너 self** = pass 5 · exit 0 ✅
- **Playwright smoke** = 5 pass · 스샷 5장 ✅
- **git** = clean · commit `8600ed3` · push 완료

---

## 자기 검증 (Kyu 승인 규약 A · 3 라운드)

- **(a) 러너 로컬 실행** ✅ **PASS** (5 assertions · exit 0)
- **(b) Playwright smoke** ✅ **PASS** (5 tests · 스샷 5장 첨부 · 이 리포트 옆 폴더)
- **(c) CI 초록** = push 후 실측 (regression.yml matrix-run)

---

## Kyu 실기 절

배포 후:
1. 폰 브라우저 접속 → 연회색 배경 + 흰 카드 + 검정 본문 (라이트) 확증
2. `[할 일]` 탭 = inbox.PNG 정합 (큰 제목 · 필터 칩 4 · 하단 알약 바)
3. `[PR]` 탭 = pull-requests.PNG 정합 (h1 · git octicon · pill · owner/repo #N · 상대시간)
4. `[허브]` 탭 = 미션 컨트롤 이관 (재구성 다음 라운드)
5. 자동 병합 실패 시 폰 알림 없음 (workflow suppress)

---

## 이연 순증감

**AL 신규 이연**:
- PR 상세 목록↔상세 병행 (AH-4 잔여 · 다음 라운드)
- 허브 재구성 (home.PNG "My Work" 카드 그룹)
- LauncherButton raw hex 정리
- 이모지 → octicon 완전 교체
- 다크 테마 편입

**AL 이연 회수**:
- **AG-5 디자인 토큰** = **회수** (SPEC § 20.2 Primer 매핑)
- **AH-4 카드→행 pill** = AF/AH 착지 후 AL 에서 pull-requests.PNG 문법으로 완결
- **AK Playwright 스샷 미검증** = **회수** (AL-4 설치 + 5장 확증)

**원장 총** = AH-4 상세 병행 · AH-2 서버 fix · AI-2 러너 실행 · AI-3 카탈로그 승격 · AI-5 unverified · AK dedup-cleanup 실 실행 · CI 실측 · **AL PR 상세 병행 · 허브 재구성 · 이모지 → octicon · 다크**

---

## 다음 라운드 대비

Kyu AL 실기 회신 후:
- **AM (예상)** = PR 상세 병행 (목록↔확대 · 각 행 pass/fail · AH-4 잔여)
- 또는 **AM** = 허브 재구성 (home.PNG My Work 아이콘 타일)
- 또는 **AM** = 다크 테마 편입 + 이모지 → octicon 완전

Kyu 판정 대기.
