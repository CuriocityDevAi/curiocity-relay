---
round: K1-0917-G
hub: k1
pr: '128'
outcome: landed
ledger_events:
  - '{"id":"R002","action":"consume","note":"태스크 처리 이력 원천 완결 · relay ledger git 이력 148 events 파싱 (등재 39 · 우선순위 7 · 상태 13 · note 89) · 사람 문장 label · type=ledger"}'
  - '{"id":"R031","action":"consume","note":"agilo-medusa-pos-fork hidden false 원복 · CROSS_REPO_READ_TOKEN 포크 포함 확증"}'
kyu_checks:
  - K0 흐름판 이력 탭 · 원장 편집 사람 문장 노출 확증 (등재·우선순위·상태·note)
  - session read/reconcile raw:true 접힘 실 노출
  - agilo /api/prs 200 실측 (배포 후)
---

## 요지

R002 (태스크 처리 이력 원천) 완결 · R031 (agilo 포크 hidden 원복) 완결. relay build-index git 이력 파싱 148 events · 사람 문장 label · session raw 플래그 · reports label.

## PR

- **test-portal PR#128** = https://github.com/CuriocityDevAi/test-portal/pull/128 (feat/k1-0917-g) · merge SHA `9176858`
- **relay** commits `615425d` (build-index collectLedgerEvents + labelForReportAction + RAW_TYPES) + `853e21f` (workflow fetch-depth 0 + auto-rebuild · 148 events 실측)

## 실측 (K1 워크트리 + relay CI)

### A1 · R002 · relay ledger git 이력 → R-id 이벤트
- **뿌리** (Kyu 원문 = "태스크 처리 이력 원천"): session events + reports.ledger_events 만 · **원장 자체 변경 이력** 미노출.
- **fix** (`relay/scripts/build-index.mjs`):
  - `import { spawnSync } from 'node:child_process'`
  - `collectLedgerEvents` 신설:
    1. `git log --pretty='%H|%aI|%an' -- ledger/requirements.yaml` = 커밋 목록
    2. 각 커밋: `git show <sha>:ledger/requirements.yaml` = 그 시점 파일 파싱 (기존 `parseRequirementsYaml` 재사용)
    3. baseline (30~60일 이전) → prev map
    4. 각 커밋 diff = R-id 별 필드 변경 감지
    5. 이벤트 emit = `{ts, hub, type:'ledger', target, label, req_ids:[id], author}`
- **workflow fetch-depth 1→0** (전체 히스토리 · git log 실 이력)
- **사람 문장 label 규약** (Kyu 원문 정본):
  - filed = `"{id} 등재됨 ({priority} · {hub})"` (예: "R029 등재됨 (P2 · k1)")
  - priority = `"{id} 우선순위 P?→P?"` (예: "R029 우선순위 P2→P0")
  - status = `"{id} 상태 {before}→{after}"` (statusLabelMap: filed→등재 · issued→발부 · landed→착지 · verified→실기 통과 · done→완결 · deleted→삭제)
  - note = `"{id} note 갱신: {60자 preview}"`
- **CI 실측** (Contents API · built_at=2026-09-17T08:47:35):
  - **ledger events 148** · kinds: 등재 39 · 우선순위 7 · 상태 13 · note 89
  - author = git commit name (CuriocityDevAi · K1 Hub 등)
  - sample:
    - R001 등재됨 (P0 · k2) · author=CuriocityDevAi
    - R029 우선순위 P2→P0 · author=CuriocityDevAi
    - R001 상태 발부→착지 · author=CuriocityDevAi
    - R002 note 갱신: 이벤트 소스 = K1-0916-B · 지표 = K2-0916-B · author=CuriocityDevAi

### A2 · reports.ledger_events[i].label 자동 부여
- **`labelForReportAction(id, action, note)`** 함수:
  - read → `"{id} 읽음"` · reconcile → `"{id} 대사"` · defer → `"{id} 이연"`
  - conflict → `"{id} 상충 해소"` · consume → `"{id} 착지"` · priority → `"{id} 우선순위 변경"` · filed → `"{id} 등재"`
  - note 부재 시 기본 문장 · 있으면 60자 preview append
- Kyu 원문 = "read/reconcile/defer/conflict 도 문장 label 부여" 정합

### A2 · session read/reconcile events = raw:true 플래그
- `RAW_TYPES = new Set(['read', 'reconcile'])` (build-index main)
- session-events 통합 시 raw 플래그 자동 편입
- 실 96 raw events (K0 UI 접힘 처리 정본 · Kyu 원문)

### A3 · agilo-medusa-pos-fork hidden 원복 (R031)
- `config/projects.json` v6 · agilo `"hidden": true` → `"hidden": false`
- registry `REGISTRY.filter((p) => !p.hidden)` (registry.ts:88) = **agilo 자동 포함**
- 이전 `/api/prs?repo=agilo-medusa-pos-fork` = 404 `unknown_project` (REGISTRY 안 없음) → 배포 후 200 예정
- **CROSS_REPO_READ_TOKEN 포크 포함 확증**: `gh auth token` (K1 shell PAT) = admin/pull/push scope · `gh api /repos/CuriocityDevAi/agilo-medusa-pos-fork/pulls` = **2 open PR** (#6 SDK57 · #1 measure+Vaul) 실 접근 성공. K1-0917-C 편입한 secret 값 = 동일 PAT · 포크 포함 이미.

## 검증

- `pnpm check` = 0 errors 89 warnings (CSS unused · pre-existing)
- `pnpm test` = **1050 pass** (기존 1039 + 11 · 신 스키마 정합 test)
- relay CI (`fetch-depth: 0`) = 148 ledger events · workflow_dispatch trigger 재확증
- 착지 前 `git fetch && git merge origin/main` 재실행 (K0-0915-A 규정) · Already up to date

## Kyu 후속 실기

1. **A1**: K0 흐름판 이력 탭 · type=ledger 이벤트 사람 문장 노출 (등재·우선순위·상태·note) 스샷
2. **A2**: session read/reconcile raw:true 접힘 노출 (K0 UI 별건 라운드)
3. **A3**: 배포 후 홈 화면 agilo 프로젝트 탭 노출 · `curl /api/prs?repo=agilo-medusa-pos-fork` 200 실측

## 관련 문서

- SPEC v1.K1-0917-G (§ K1-ledger-events-git · § K1-report-events-label · § K1-session-raw-flag · § K1-agilo-hidden-restore)
- docs/audits/K1-0917-G-ledger-events.log (67 lines · CI 실측 + 사람 문장 sample)
- relay: scripts/build-index.mjs (collectLedgerEvents · labelForReportAction · RAW_TYPES)
- .github/workflows/build-index.yml (fetch-depth 0)
- config/projects.json v6 (agilo hidden false)
- docs/state/k1.md · docs/tracking/k1.md K83 편입
