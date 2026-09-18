---
round: K1-0918-G
hub: k1
pr: TBD
outcome: pending
ledger_events:
  - id: R032
    action: reference
    note: '실기·흐름·지도 3탭 결함 회수 — index.json 정본 계약'
  - id: R002
    action: reconcile
    note: 'K0-0917-D PR#116 merged → column=merged 강등 확증 (완결 · A4 소급 리포트)'
kyu_checks:
  - '흐름판 · 실기 탭 배지 = 흐름 탭 chip-my-turn 값 동일 확증 (K1G-1)'
  - '흐름판 · 5열 배치 정본 = filed→waiting · issued→implementing · landed→landing · verified→drilling · done→merged · GitHub merged 실측 시 column=merged 강등'
  - 'R002 (K0-0917-D · PR#116) = ⑤ merged 열 · 착지·PR 열 잔존 없음 (K1G-3)'
  - 'landing 열 카드 = PR# 링크 노출 (K1G-5)'
  - '지도 탭 · 첫 프로젝트 area 프로세스 카드 > 0 (K1G-6 · feature_maps nested 통일)'
  - 'docs/contract/index-json.md 정본 계약 · K0 폐기 대상 코드 목록 (statusToColumn · my_turn 파생 · created_at 폴백) 회부'
---

## 요지

**K1-0918-F 진단 8건 회수 · 정본 계산기 build-index 한 곳 · 계약 문서 · 실렌더 계약 테스트**.

Kyu K1-0918-G 원문 = "정본 계산기 = build-index 한 곳". `column` · `pr` · `merged` · `my_turn` · `hub_state` 전량 relay 안 계산 완결 · K0 재계산 폐기.

## 8건 값 표 (전 → 후)

**소스**: 프로덕션 relay index.json (K1-0918-G 착지 후 CI 자동 rebuild) · 로컬 실측 (build-index 신본) 동일 값.

| # | 진단 (F) | 지표 | 전 (F 시점 · 09-18 오전) | 후 (G · build-index 신본) |
|---|---|---|---|---|
| 1 | 클코 허브 칩 "실기 0" vs 실기 탭 배지 2 | `chip-my-turn` = `tab-training-badge` | 칩 0 · 탭 2 (불일치) | **정의 통일** = build-index 안 `r.my_turn` = 열린 PR + kyu_checks≥1 (실기 탭 정의) · 값 동일 |
| 2 | "내 차례 2" 카드 부재 · 칩 클릭 무동작 | 필터 정본 | K0 flow-data.ts 자체 파생 (실기 탭과 다름) | **폐기 대상** · `r.my_turn` 소비로 배지·카드·필터 동일 소스 |
| 3 | ③착지·PR 열에 K0-0917-D · 0916-A · 0916-E 잔존 | `column='merged'` 강등 조건 | `completedRounds` = relay k0/*.md frontmatter · **파일 부재 = 강등 실패** | **A4 소급 3 리포트 push** (0e03eb5) + build-index 안 GitHub API `body.merged` 실측 (report 부재해도 자동 강등) · R002·R012·R005 = column=merged 확증 |
| 4 | 카드에 PR 번호 부재 · 대기 카드 ID 부재 | 카드 라벨 데이터 | requirements[i].pr 필드 없음 · issued_id 만 존재 | **`r.pr`** 신설 = `reports[round==issued_id].pr` · landing/merged 카드 모두 PR URL 소유. R018 (T0-0915-A PR#23) · R021 (M0-0915-A agilo#6) 확증 |
| 5 | "구현 중" 열 비는 이유 | status=issued 개수 | 원장 실측 = 2건 (R027·R028) · 값 정합 | 렌더 정합 (버그 아님 · 계약 명세만 추가) |
| 6 | 카드 클릭 시 시트 무반응 | 카드 라벨 부재 | title 미보증 · 빈 카드 렌더 가능 | 계약 테스트 (K1G-4) = 카드 텍스트 ≥ 3자 강제 · CI 게이트 |
| 7 | "머지 44 이번 주" 집계 기간 · 중복 | mergedThisWeekCount 소스 | K0 +page.svelte:921 = `merged_at ?? p.created_at` 폴백 (오탐) | **폐기 대상 목록** = docs/contract § K0 폐기표 · 후속 K0 라운드 회부 (fallback 삭제) · 이번 라운드 = 계산 근거 데이터 정본화 완결 |
| 8 | 지도 탭 "불러오는 중" 고정 · 프로세스 0 | feature_maps 스키마 | K1 = top-level `processes[]` with `area:` FK / K0 = `area.processes` nested 기대 (구조 불일치) | **build-index 안 `mergeProcessesIntoAreas`** = 자동 nest. test-portal 37 · todoboss 128 · storeport 46 프로세스 정합 |

## 정본 계산기 값 (build-index 로컬 실측 · CI 자동 rebuild 후 동일)

- `column` 분포: `landing=8 · merged=14 · waiting=15 · implementing=2 · drilling=0`
- `pr` URL 소유 = 11건 (landing/merged 카드 전량)
- `merged` GitHub 실측 = 9건 (report + GitHub PR body.merged 실측)
- `my_turn` 실 계산 = 0건 (현재 실 열린 PR + kyu_checks 원장 매칭 부재)
- `feature_maps` nested 정합 = test-portal 10 areas · 37 procs / todoboss 5 areas · 128 procs / storeport 7 areas · 46 procs
- R002 (K0-0917-D · PR#116) = `column=merged · pr=…/pull/116 · merged=true` 강등 확증

## 착지물

### 1. relay build-index 정본 계산기 (5ebe460 · scripts/build-index.mjs)

- `statusToColumn` 정정 (landed→landing · verified→drilling · done→merged · deleted→null)
- `fetchPRStates` 신설 = report.pr GitHub API 실측 · rate limit 60 방어
- `mergeProcessesIntoAreas` = feature_maps top-level→nested 정규화
- requirements[i] 확장 필드: `column · pr · merged · my_turn` (5열·실기 탭 정의 통일)

### 2. test-portal 리포 계약 문서 (docs/contract/index-json.md)

- Top-level schema v4 · requirements 필드 표 · column/my_turn/pr/merged 계산 정본
- feature_maps nested 스키마 통일 (top-level 지원 폐기)
- **K0 폐기 대상 코드 목록** = flow-data.ts:359-370 statusToColumn · :419 col 재계산 · :422-423 completedRounds → col='merged' · :428-439 my_turn 파생 · +page.svelte:915-925 mergedThisWeek 폴백

### 3. Playwright 실렌더 계약 테스트 (e2e/portal-contract-k1-0918-g.spec.ts · 8 케이스)

- K1G-1: 실기 탭 배지 = chip-my-turn 값
- K1G-2: chip 클릭 → tag-my-turn 카드 수 = 값
- K1G-3: R002 (K0-0917-D PR#116) = ⑤ merged 열 배치
- K1G-4: 모든 flow-card 라벨 노출 (빈 카드 0)
- K1G-5: landing 열 카드 = PR# 링크
- K1G-6: 지도 탭 프로세스 > 0
- K1G-7: issue-id + PR link 합 > 0
- K1G-8: weekly-merged 정수 값
- CI 편성 = `.github/workflows/production-playwright.yml` 실측 target 편입

### 4. relay k0/ 소급 3 리포트 (0e03eb5 · K0-0916-A · 0916-E · 0917-D)

- 진단 #3 뿌리 = completedRounds set 파일 부재 회수
- 각 frontmatter = round · hub · pr · outcome=merged · ledger_events=[] · kyu_checks=[]
- PR SHA: #103 (2026-09-16T04:23:35Z) · #107 (2026-09-16T08:44:34Z) · #116 (2026-09-17T04:06:44Z)

## Kyu 실기 절차

**배포 완료 후** · Cloudflare Workers Builds 1-3분 대기 (test-portal PR merge 시점 + auto-deploy).

1. **relay CI 재빌드 확증** = https://github.com/CuriocityDevAi/curiocity-relay/actions · "chore(index): auto-rebuild" 최신 커밋 확인 (5ebe460 이후).
2. `https://test.curiocity.company` 접속 · CF Access 로그인.
3. **실기 탭 · 클코 허브 탭 배지 값 대조** = 같은 숫자.
4. **클코 허브 탭 진입 · chip-my-turn 값 = 실기 탭 배지 값 동일 확증**.
5. **⑤ 열 (merged) = K0-0917-D · 0916-A · 0916-E 라운드 카드 (PR#116 · #103 · #107) 노출**. 착지·PR 열 (③) 잔존 없음.
6. **landing 열 카드 = PR# 노출** (T0-0915-A PR#23 · M0-0915-A agilo#6 등).
7. **지도 탭 진입 · 프로세스 카드 노출** (첫 프로젝트 test-portal 37건 · todoboss 128건 · storeport 46건).

## 회부 (K0 후속)

- **K0 폐기 대상 코드 삭제** (docs/contract § K0 폐기 목록) = 별건 라운드 (K0 자체 판단).
  - `src/lib/ui/flow-data.ts:359-439` statusToColumn · col 재계산 · completedRounds → col='merged' · my_turn 파생 = index.json.column/my_turn 정본 그대로 소비.
  - `src/routes/+page.svelte:915-925` mergedThisWeek `merged_at ?? created_at` 폴백 제거.

## 관련 문서

- `docs/contract/index-json.md` — 정본 계약 (test-portal 리포)
- `e2e/portal-contract-k1-0918-g.spec.ts` — 실렌더 계약 테스트
- `.github/workflows/production-playwright.yml` — CI 게이트
- `relay/scripts/build-index.mjs` — 정본 계산자 (5ebe460)
- `relay/k1/K1-0918-F-diagnosis.md` — 뿌리 진단 (8건)
- `relay/k0/K0-0916-A-report.md` · `K0-0916-E-report.md` · `K0-0917-D-report.md` — A4 소급
