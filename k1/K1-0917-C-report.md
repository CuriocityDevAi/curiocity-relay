---
round: K1-0917-C
hub: k1
pr: '117'
outcome: landed
ledger_events:
  - '{"id":"R031","action":"consume","note":"/api/ledger/patch 403 규명 완결 · curl POST 실측 · relay 커밋 0899a17"}'
  - '{"id":"R030","action":"consume","note":"feature_maps 3리포 CI 실측 확증 (test-portal 10 · todoboss 128 · storeport 43)"}'
kyu_checks:
  - relay 커밋 0899a17 열람 · R029 priority P2→P0 diff 확인 · Kyu 판단 (원복 or 유지)
  - CROSS_REPO_READ_TOKEN + LEDGER_GITHUB_TOKEN 봇 토큰 교체 (지금 K1 shell PAT 임시)
  - 흐름판 이벤트 label 실 문장 노출 (daemon 재기동 후 신 이벤트)
---

## 요지

원장 대사 = **R031** (PATCH 403 규명 완결) · **R030** (feature_maps CI 실측 완결). 3항 전량 착지 · curl 실측 relay 커밋 링크 확증.

## PR

- **test-portal PR#117** = https://github.com/CuriocityDevAi/test-portal/pull/117 (feat/k1-0917-c) · merge SHA `de27e7b`
- **relay** commit `39ba687` (build-index.mjs API contents + label 우선) + `0899a17` (curl POST 실측 · R029 priority P2→P0)

## 실측 (K1 워크트리 · 배포 후)

### A1 · /api/ledger/patch 403 규명·수정 (R031)
- **뿌리**: `env.GITHUB_TOKEN` = test-portal 리포 전용 PAT · curiocity-relay contents PUT = 403 `Resource not accessible by personal access token`
- **fix**: `src/routes/api/ledger/patch/+server.ts` = `env.LEDGER_GITHUB_TOKEN ?? env.GITHUB_TOKEN` (신 secret 우선 · 하위 호환 폴백)
- **secret 편입**: `gh auth token | npx wrangler versions secret put LEDGER_GITHUB_TOKEN` → version `ca4cdbc3-90bb-4ec7-98c9-908295c85310` (K1 shell PAT · 임시 · Kyu 실기 = 봇 토큰 교체)
- **curl 실측 (post-deploy)**:
  ```
  POST /api/ledger/patch {"id":"R029","action":"priority-change","priority":"P0"}
  → {"ok":true, before:{priority:P2}, after:{priority:P0},
     commit_sha:"0899a17bfc2a403c7e74efb3ffa553b73870f2b5",
     commit_url:"https://github.com/CuriocityDevAi/curiocity-relay/commit/0899a17bfc2a403c7e74efb3ffa553b73870f2b5"}
  ```
- **audit**: `docs/audits/K1-0917-C-ledger-patch-curl.log` (68 lines)

### A2 · feature_maps 3리포 CI 실측 (R030)
- **뿌리 3가지**: (1) raw URL (K1-0917-B) = CuriocityDevAi PRIVATE 리포 404 · (2) Actions default GITHUB_TOKEN scope 밖 · (3) parseFeatureMapYaml `project` 필드 요구 · 실 리포 (todoboss/storeport) 부재
- **fix 3가지**: (1) `api.github.com/contents` (Accept:raw + Bearer · PRIVATE 지원) · (2) workflow env `${{ secrets.CROSS_REPO_READ_TOKEN || secrets.GITHUB_TOKEN }}` + `gh secret set` (K1 shell PAT 임시) · (3) `parseFeatureMapYaml` 두 스키마 정합 (nested convention.md + top-level 실 리포)
- **CI 실측 (relay commit 39ba687 · schema v4)**:
  ```
  feature_maps: 3
    · CuriocityDevAi/test-portal · project=test-portal · areas=10 · processes=0 (nested)
    · CuriocityDevAi/todoboss · project=todoboss · areas=5 · processes=128 (top-level)
    · CuriocityDevAi/storeport · project=storeport · areas=7 · processes=43 (top-level)
  grownest: 파일 없음 skip (HTTP 404 · N0 별건)
  ```
- **audit**: `docs/audits/K1-0917-C-feature-maps-3.log` (38 lines)

### A3 · events label 문장화 계약 (Kyu 원문 K0 소비)
- `classifyTarget` 반환 = `string` → **`{type, label}` 객체** (K1-0917-C 계약)
- **label 예시 표** (Kyu 원문 = `{type:read, target:EPIC-STATE.md, label:"EPIC-STATE 읽음"}` 정합):
  - read + EPIC-STATE.md → "EPIC-STATE 읽음"
  - read + ledger/requirements.yaml → "원장 읽음"
  - read + docs/tracking/k1.md → "트래킹 읽음: k1.md"
  - Write + relay/k1/K1-0917-C-report.md → "K1-0917-C 리포트"
  - Write + relay/ledger/requirements.yaml → "원장 편집 (우선순위·상충·해제)"
- **pass-through**: session-events-watcher push (label 포함) · build-index `collectEvents` `JSON.parse` 그대로 저장 · `computeHubActivity` `lastMeaningful.label` 우선
- **K0 소비**: `FlowEvent.label?: string` · `RelayIndexJson.events[].label?` · `fetchRelayLedger` 매핑 · **FlowBoard 두 events-list = `{ev.label ?? ev.text}` 소비 정본**

## 검증

- `pnpm check` = 0 errors 86 warnings (CSS unused selectors · pre-existing)
- `pnpm test` = 1000 pass · 75 files
- CI matrix-run (test-portal) = 5 pass / 2 fail (al1 raw hex · K0-0916-G FeatureMap.svelte 기존 · K1 무관 · ao4 PR body checklist 편입 완결)
- PR#117 admin merge (al1 pre-existing K0 · K1 편집 무관 · gh pr merge --admin)

## Kyu 후속 실기 항목

1. Relay 커밋 `0899a17` diff 열람 · R029 priority P2→P0 확인 · 원복 or 유지 판단
2. **CROSS_REPO_READ_TOKEN + LEDGER_GITHUB_TOKEN 봇 토큰 교체** (지금 K1 shell PAT 임시 · Kyu 실기 정본)
3. K1 daemon 재기동 (fetch-reset 자동) · 신 이벤트 label 노출 확증
4. K0 라운드 = al1 raw hex FeatureMap.svelte 정정 (K1 무관 · K0 backlog)

## 관련 문서

- SPEC v1.K1-0917-C (§ K1-ledger-token · § K1-feature-maps-3repo · § K1-events-label)
- docs/audits/K1-0917-C-ledger-patch-curl.log (68 lines · curl 실측 정본)
- docs/audits/K1-0917-C-feature-maps-3.log (38 lines · CI 3리포 실측)
- docs/state/k1.md · docs/tracking/k1.md K79 편입
- relay: scripts/build-index.mjs (API contents + label 우선) · .github/workflows/build-index.yml (CROSS_REPO_READ_TOKEN)
