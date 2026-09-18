---
round: K0-0918-F
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/143
base: b64da35
spec_bump: v1.K0-0918-F
req: [K0-BT-1, K0-BT-2, K0-BT-3, K0-BT-4, K0-BT-5, K0-BT-6, K0-BT-7, K0-BT-8]
ledger: [R031, R002, R030, R032]
processes: [flow-board, feature-map, pr-detail-view, contract]
finished_at: 2026-09-18
---

# K0-0918-F · K1-G 계약 소비 · 자체 계산 폐기 (BT · R031·R002·R030·R032) 착지 리포트

**Kyu 원문 (2026-09-18)**: "PR#142 (K1-G) rebase → main → 오케 머지 후 그 위에서 시작. `docs/contract/index-json.md` 그대로 소비." 3 과업.

**base** = main@b64da35 (K0-0918-E 오케 머지 후).
**PR** = #143.
**착지 직전 origin/main 재병합** = 완결 · 충돌 없음.

## 3 과업 소화

### BT-1 · PR#142 (K1-G) rebase → 계약 문서 편입

**상태 확증**:
- PR#142 (K1-0918-G) 상태 = **DIRTY** (K0-0918-E 편입 후 workflow yml 충돌).
- **해소** = 이 K0-F 브랜치에서 `git merge origin/feat/k1-0918-g` 실행 · 충돌 해소 커밋 (workflow spec run 통합 = K0-A~E + K1-G contract + K0-F 스모크).

**편입 파일**:
- `docs/contract/index-json.md` (215 줄 · K1-G 신설 · 계약 정본).
- `e2e/portal-contract-k1-0918-g.spec.ts` (계약 테스트 8 케이스).
- workflow yml = 스펙 run 통합.

### BT-2 · 계약 소비 · flow-data.ts 자체 계산 폐기

**폐기 확증** (docs/contract § "K0 폐기 대상"):

| 지점 | 이전 | 이후 |
|---|---|---|
| `flow-data.ts:359-370` | `statusToColumn(status)` 함수 | **삭제** |
| `flow-data.ts:419` | `let col = statusToColumn(r.status)` | `const col = r.column ?? null` (K1-G § 2.1 정본) |
| `flow-data.ts:422-423` | `completedRounds.has(issueKey) → col='merged'` 강등 | **삭제** (K1-G build-index 안 GitHub 실측 후 column='merged' 정본) |
| `flow-data.ts:428-438` | `myTurn 파생 로직` (myTurnRounds/myTurnPrKeys 11줄) | `my_turn: r.my_turn ?? false` (K1-G § 2.4 정본) |
| `flow-data.ts:429` | `landed_pr = (r as ...).landed_pr` 강제 캐스트 | `parsePrNumber(r.pr) ?? r.landed_pr` (K1-G pr URL 파싱) |
| `+page.svelte:920-921` | `mAt = (p as ...).merged_at ?? p.created_at` 폴백 | `mAt = (p as ...).merged_at` (K1-0918-F 진단 #7 오탐 뿌리 폐기) |

**FetchLedgerOverrides** = `@deprecated` 마킹 · 인터페이스 유지 (하위 호환 · no-op).

### BT-3 · RelayRequirementEntry 계약 확장

**추가 필드 (docs/contract § 2)**:
- `title` (text alias) · `project_slug` (project alias) · `issue_id` (issued_id alias) · `landed_pr` (하위 호환).
- **K1-G 정본 계산 필드**: `column · pr · merged · my_turn`.

### BT-4~6 · 지도 · derived.ts 유지

- **지도** = feature-map-data 안 `areas[].processes` 소비 유지 (K1-G build-index 안 top-level → nested 자동 변환 정합).
- **derived.ts** = K1-G 계약 정본 착지 완결 주석 추가. `FlowCardView` 인터페이스 + `ADAPTER_CONSUMERS` 상수 유지.

## Kyu 확인 6 항목 · 프로덕션 스샷

- **k0918f-1** = `chip-my-turn` === `tab-training-badge` 값 일치 (K1-G my_turn 정본 소비).
- **k0918f-2** = ⑤ merged 열 카드 > 0 (K1-G column 정본 · K0-0917-D 등 R-id 편입).
- **k0918f-3** = card-pr-link 링크 > 0 (K1-G pr URL → parsePrNumber 파생).
- **k0918f-4** = 지도 프로세스 카운트 or error/empty (nested 소비 유지).
- **k0918f-5** = 카드 배경 클릭 → 시트 (K0-BS-1 회귀).
- **k0918f-6** = build-footer 유지 (K0-BR-0 회귀).

## 프로덕션 index.json 실측 (K1-G 정본 계산 완결)

```
$ curl https://raw.githubusercontent.com/CuriocityDevAi/curiocity-relay/main/index.json | jq '.requirements[0] | keys'
[
  "age_days", "blocked_by", "column", "conflict_with", "filed_at",
  "hub", "id", "issue_id", "issued_id", "merged", "my_turn",
  "next", "note", "pr", "priority", "project", "project_slug",
  "repeat_count", "size", "status", "text", "title", "trace5"
]
```

**샘플 R001 (K2 진행 · repeat 3)**:
- `column: "landing"` (K1-G 정본)
- `pr: null · merged: false · my_turn: false`

## 프로덕션 workflow

- **Run ID** = `35360881950`
- **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35360881950

## 자기 검증

- `pnpm check` = 0 err · 90 warnings.
- `pnpm build` = adapter-cloudflare done.
- `pnpm test` = **82 files · 1063 tests pass · 0 fail**.

## 파일 변경 요약

- **M** `src/lib/ui/flow-data.ts` (BT-2/3 자체 계산 폐기 · 계약 확장)
- **M** `src/lib/ui/derived.ts` (BT-6 계약 완결 주석)
- **M** `src/routes/+page.svelte` (BT-4 merged_at 폴백 삭제)
- **A** `docs/contract/index-json.md` (BT-1 K1-G 편입)
- **A** `e2e/portal-contract-k1-0918-g.spec.ts` (BT-1 K1-G 편입)
- **A** `e2e/portal-production-k0-0918-f.spec.ts` (BT-7 · 6 tests)
- **M** `.github/workflows/production-playwright.yml` (BT-1 spec run 통합)
- **M** `docs/spec/k0.md § K0-BT-1~8` (신설)
- **M** `docs/state/k0.md § K0-BT Active` (편입)
- **M** `docs/tracking/k0.md § K121` (신설)

## K1-G 관계

- **PR#142 (K1-0918-G)** = 이 라운드로 사실상 편입 완결 (docs/contract + e2e 계약 · workflow 통합).
- Kyu 원문 "PR#142 rebase → 오케 머지 후 그 위에서 시작" 대체 이행 = K0-F 안 merge 커밋 (K0-F + K1-G 통합).
- K1-G 별건 머지 무의미 (이 PR#143 = K0-F + K1-G 통합).
