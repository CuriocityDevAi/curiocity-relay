# K0-0903-AG · 리포트 (포털 재설계 · 하루가 시작되는 곳)

**round**: `K0-0903-AG`
**hub**: k0 (test-portal)
**PR**: https://github.com/CuriocityDevAi/test-portal/pull/83
**branch**: `feat/k0-0903-ag-tabs-inbox-copy`
**commit**: `c6c1459`
**timestamp**: 2026-09-03

---

## 요약

**Kyu 원문 목적**:
> "포털을 '도장 찍으러 들르는 곳'에서 '하루가 시작되는 곳'으로 바꾼다."

08-24 결정 정본 착지 · 재설계·재질문 금지 · 구현 방식 갈림길만 자체 판단.

**범위 통제** (Kyu 명시 · 그대로 준수):
- 이번 라운드: **AG-1** 하단 탭 3 · **AG-2** 할 일 인박스 · **AG-4** 말투 정리
- **다음 라운드**: AG-3 PR 목록·상세 GitHub 문법 · AG-5 디자인 토큰

---

## 뿌리 · 정본 조치

### AG-1 하단 탭 3

- **정본 파일**: `src/routes/+layout.svelte` (재작성 · 60→121 라인)
- 하단 탭 3 = `[할 일][PR][허브]` · 기본 활성 = 할 일
- `.app { max-width: 480px; margin: 0 auto }` (이전 720 폐지 · 데스크톱 단일 컬럼)
- safe-area · `padding-bottom: calc(64px + env(safe-area-inset-bottom))` · 아이폰 홈바 대비
- 하단 탭 = `position: fixed` · `padding-bottom: env(safe-area-inset-bottom)` · z-index 30
- min-height 56px · font-size 14px 본문 (AG-5 예열)
- active tab derived = `resolveTab(page.url.pathname)` · `/` · `/pr/*` → 'todo'
- **폐지 화면 회수**:
  - `/approvals` UI = `src/routes/approvals/+page.svelte` 삭제 · `+page.ts` 신설 = `throw redirect(308, '/')` · 북마크 안정성
  - 홈 미션 컨트롤 = `git mv src/routes/+page.svelte → src/routes/hub/+page.svelte` · [허브] 탭

### AG-2 할 일 인박스

- **정본 파일**: `src/lib/inbox.ts` (신설 · 218 라인 · aggregation 계층 정본)
  - `buildPrInboxItems(project, prs, caseSummaries)` = closed/missing/malformed 배제 · allPass → stamp · 아니면 → test
  - `buildApprovalInboxItems(approvals)` = 질문 원문 · options 인라인 · priority별 subtitle
  - `sortInbox(items)` = approval > stamp > test · 그룹 안 최신순
  - `projectDisplayName(project)` = slug → 표시명 매핑 (`grownest`→`GrowNest` · `todoboss`→`TODOBOSS` · `storeport`→`StorePort`)
  - `caseSummaryText(pr)` · `shortHeadline(pr)` = 사람 언어 조립 (라운드 ID · 커밋 해시 · 컴포넌트명 노출 없음)
- **정본 파일**: `src/routes/+page.svelte` (재작성 · 신 할 일 인박스)
  - 병렬 fetch (`Promise.all`) = `/api/approvals?status=pending` + 각 프로젝트별 `/api/prs` + `/api/case-state?summary=1`
  - 0건 = `.empty-zero` = 5rem padding + 1.5rem 문구 "지금 할 일이 없습니다" + 0.85rem 부제
  - 승인 항목 인라인 = `.approve-btn` (var(--pass) 초록) + `.reject-btn` (var(--fail) 빨강 outline) · POST `/api/approvals/:id/decision`
  - 승인 옵션 있으면 `.opt-btn` (label 별 버튼 · surface-2)
  - PR 항목 = `<a class="row-main" href={item.href}>` · 상세 push · 최소 44px 터치
  - `[환경 열기]` 조건부 노출 (project.previewPort 있으면 LauncherButton)
- **정본 파일**: `src/lib/inbox.test.ts` (신설 · 15 종)

**Kyu 원문 정합 확증**:
- "지금 손으로 해야 할 것만" → closed/missing/malformed PR 배제 · aggregation 3종만
- "각 항목은 한 문장으로" → `${projName} · ${headline}` + subtitle 사람 언어
- "라운드 ID · 커밋 해시 · 컴포넌트명 금지" → 매핑 없음 · 테스트 검증
- "0건이면 '지금 할 일이 없습니다' 를 크게" → `.zero-msg { font-size: 1.5rem; font-weight: 600 }`
- "항목을 누르면 상세(PR 화면)로 push" → `<a href={pr.href}>` · 승인 항목은 인박스 안 (2단 마스터-디테일 폐지)

### AG-4 말투 검수 · 원문 → 수정문 표

Kyu 실측 6+ 건 · 사용자 언어 치환 · 코드 주석 안 라운드 ID/SPEC § 는 유지 (사용자 미노출).

| # | 원문 | 수정문 | 파일 |
|---|------|--------|------|
| 1 | 이 리포는 `kyu-devenv` 매트릭스에 등록되어 있지 않습니다 (SPEC § 15.3) | 이 프로젝트는 아직 원버튼 환경이 없습니다 | `+page.svelte:1186` |
| 2 | PR 상태 미조회 (Workers token 부재 or API 실패) | 상태를 불러오지 못했습니다 | `+page.svelte:1459` |
| 3 | 이 케이스에 대한 관찰 · Claude Code 판독 대상 | 메모 (선택) | `+page.svelte:1292` |
| 4 | 실패 사유 · D1 case_state.reason 저장 | 무엇이 잘못됐는지 한 줄 | `+page.svelte:1291` |
| 5 | 실패 사유 (blur 시 저장) | 실패 사유 | `+page.svelte:1287` |
| 6 | 판정 3택 (성공/실패/보류) 중 하나를 먼저 선택하세요 (K0-0730-I 필수 검증) | 판정 (성공/실패/보류) 중 하나를 먼저 선택하세요 | `+page.svelte:1324` |
| 7 | Claude Code 트랙 세션이 판독할 사유 | 왜 이렇게 판정했는지 한두 줄 | `+page.svelte:1389` |
| 8 | Permalink (A5 · SPEC § 4.4) | 이 판정 링크 | `+page.svelte:1505` |
| 9 | 코멘트 markdown preview (SPEC § 5.1) | 보낸 코멘트 미리보기 | `+page.svelte:1582` |
| 10 | Desktop = Kyu 맥에서 Playwright headed 브라우저 오픈 · HAR 자동 캡처 (SPEC § 14.10 V0) | 데스크톱 브라우저를 열어 확인 지점으로 이동합니다 | `+page.svelte:1605` |
| 11 | 모바일 = Playwright 아님. 폰 브라우저에서 딥링크 직접 오픈. | 폰 브라우저에서 링크를 바로 엽니다. | `+page.svelte:1603` |
| 12 | 브라우저 프리셋 (SPEC § 14.5 K29) | 브라우저 프리셋 | `+page.svelte:1612` |
| 13 | 딥링크 상태 (선택 · K30 · 예: ...) | 이동할 화면 경로 (선택 · 예: ...) | `+page.svelte:1627` |
| 14 | V0 명령 (터미널 붙여넣기 · SPEC § 14.10) | 터미널에 붙여넣을 명령 | `+page.svelte:1631` |
| 15 | test=1 스위치가 dev 빌드에서만 활성화 (운영 no-op · SPEC § 16.4) | (삭제) | `+page.svelte:989` |
| 16 | 활성 케이스: (자동 귀속 안 됨) | 활성 케이스: (선택된 항목 없음) | `+page.svelte:1316` |
| 17 | 스크린샷 hint 4줄 (K0-0730-H · 64KB · dataUrl · user-attachments) | (삭제) | `+page.svelte:1317-1322` |
| 18 | 병합 완료 · GitHub main 반영 | 병합 완료 | `+page.svelte:1461` |
| 19 | 제출 완료 · 병합 대기 (kyu-gate check 실패) | 판정 실패 · 병합 대기 | `+page.svelte:1462` |
| 20 | Kyu 판정을 다시 성공으로 제출하거나, 로컬 실기 결함 회수 후 재제출하세요 | 판정을 다시 성공으로 제출하거나 확인 항목을 재실행 후 제출하세요 | `+page.svelte:1468` |
| 21 | PR 상태 확인 중… | 상태 확인 중… | `+page.svelte:1457` |
| 22 | check 상세 ↗ | 상세 열기 ↗ | `+page.svelte:1465` |

---

## 폐지 화면 테스트 정리 (Kyu 요구)

- `approvals-store.test.ts` = **유지** · 승인 큐 데이터 계층 = /api/approvals endpoints 존치 · UI 만 이관
- `kyu-bridge-client.test.ts` = **유지** · 미션 보드 데이터 계층 = /hub 화면에서 여전히 소비
- **신 화면 테스트** = `src/lib/inbox.test.ts` (15 종):
  - projectDisplayName 3 (매핑 · 미매핑 · undefined)
  - buildPrInboxItems 7 (closed 배제 · missing 배제 · malformed 배제 · stamp · test 부분/미판정 · 사람 언어 · fail 카운트)
  - buildApprovalInboxItems 2 (질문 그대로 · blocking priority)
  - sortInbox 2 (그룹 순서 · 그룹 안 최신순)
  - 라운드 ID · 커밋 해시 노출 없음 확증

---

## QC

- **pnpm check** = 985/0/0 (재설계 후 무결)
- **pnpm test** = 63 files · 819 pass (기존 804 + inbox 15)
- **pnpm build** = ✔ (adapter-cloudflare)
- **git** = clean · commit `c6c1459`

---

## Kyu 실기 절 (스샷 기준 · 어디를 보면 무엇이 보여야)

### 배포 후 (auto-deploy)

1. Cloudflare Workers Builds Deployments 새 버전 확증
2. `git ls-remote origin main` = PR#83 merge SHA

### 스샷 지점

**스샷 1 = 홈 (`/`)**:
- 화면 아래 = 세 개 탭 `[✓ 할 일][◆ PR][⌂ 허브]` (파란색 = 할 일 활성)
- 아이폰 홈바 위쪽으로 안전 여백 (홈바 위 겹침 없음)
- 데스크톱 창을 크게 열어도 콘텐츠는 가운데 480px 이내 · 좌우 어두운 배경
- 인박스 = 항목 목록 or "지금 할 일이 없습니다" 큰 문구

**스샷 2 = 인박스 항목 (0건 아닐 때)**:
- 각 줄 = 한 문장 · 예: "GrowNest 룰렛 소리 확인 · 실기 대기 · 확인 4건" + [환경 열기] 버튼
- 라운드 ID `N0-0902-A` · 커밋 해시 `4c2174e9` · 컴포넌트명 `PieFace` 노출 없음
- 승인 대기 항목 = 인라인 [승인]/[반려] 버튼 (2단 마스터-디테일 없음)

**스샷 3 = 인박스 0건**:
- 화면 위쪽 큰 글씨 = "지금 할 일이 없습니다"
- 아래 작은 회색 = "새 PR 이 열리거나 승인 요청이 오면 여기에 나타납니다."

**스샷 4 = [PR] 탭 클릭**:
- 이전 라운드 착지 그대로 = 필터 3 · 진행도 · 판정 완료 뱃지 · 프로젝트 탭

**스샷 5 = [허브] 탭 클릭**:
- 이전 홈 (/) 내용 그대로 이관 = 미션 컨트롤 · 허브 카드 · 최근 사이클

**스샷 6 = `/approvals` 접속 시도**:
- 자동으로 홈 (`/`) 로 이동 · 승인 항목은 인박스 안

**스샷 7 = PR 상세 화면 말투**:
- 어디에도 `kyu-devenv 매트릭스` · `Workers token` · `Claude Code 판독` · `SPEC § 15.3` · `K0-0730-H` 노출 없음
- 필드 라벨 = "메모 (선택)" · "실패 사유" · "이 판정 링크" · "보낸 코멘트 미리보기"
- 스크린샷 섹션 = 4줄 내부 메모 없음 · 필수 hint 만

---

## 이연 순증감

**AG 신규 이연** (Kyu 명시 · 범위 통제):
- **AG-3 PR 목록·상세 GitHub 문법**: 카드→구분선 행 · Primer StateLabel pill · env chip 폐지 · 확인 항목 목록↔상세 병행 · 종합/케이스 판정 분리 (Kyu 09-03 실측 "케이스 강제 pass 없이는 머지 불가 = 자기 검증 PR 순환" AG-3 안 해소)
- **AG-5 디자인 토큰**: @primer/primitives · @primer/octicons · 시스템 폰트 14/12 · 44px · 명명 registry 단일화

**AG 이연 회수** = 없음 (AE/AF 이연 전량 유지)

**원장 총** = K44/K45 · AD-4/AD-6 재확증 · AE (verdict 3분화 · 재판정 · 컴포넌트명) · AF (/prs ratio) · **AG-3 상세 재설계** · **AG-5 디자인 토큰**

**K1 회귀 자동 승인** = 이 라운드 범위 밖 · AI 라운드 별건 (Kyu 명시 · 건드리지 않음)

---

## 다음 라운드 대비

Kyu AG 실기 회신 후:
- **AH (예상)** = AG-3 PR 목록·상세 GitHub 문법 (Primer StateLabel · 병행 · 종합/케이스 분리)
- 또는 **AH** = AG-5 디자인 토큰 (@primer 도입)
- 또는 **AH** = AG 실기 결함 회수 (결함 노출 시)

Kyu 판정 대기.
