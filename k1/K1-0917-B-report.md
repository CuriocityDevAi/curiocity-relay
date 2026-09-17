---
round: K1-0917-B
hub: k1
pr: '114'
outcome: landed
ledger_events:
  - '{"id":"R031","action":"consume","note":"게이트 오판·SSE 실패 규명+수정 착지"}'
  - '{"id":"R030","action":"consume","note":"feature_maps 집계 편입 (스키마 v4)"}'
  - '{"id":"R011","action":"consume","note":"허브 카드 last_action/files/tests 배관 완결"}'
kyu_checks:
  - 배포 후 curl PR#23 verdict=none · reason=required check 정의 없음
  - Todoboss SSE 4단계 실 완주 로그 확증 (63 lines)
  - relay index.json schema_version=4 · hubs 실 데이터 노출
  - K0 흐름판 허브 카드 last_action 실 문장 노출 (배포 후)
---

## 요지

원장 대사 = **R031** (게이트 오판 · SSE 실패) · **R030** (feature_maps 집계) · **R011** (허브 카드 실 데이터). 4항 모두 착지 · 실 SSE 4단계 완주 로그 확증 · relay schema_version 3→4.

## PR

- **test-portal** = https://github.com/CuriocityDevAi/test-portal/pull/114 (feat/k1-0917-b)
- **relay** = commit `091eb4a` (scripts/build-index.mjs) + workflow env `${{ secrets.GITHUB_TOKEN }}` pass

## 실측 (K1 워크트리)

### A1 · 게이트 required 정정 (R031)
- `config/projects.json` v6 · required_checks 실 CI 이름만 (grownest/storeport/todoboss/agilo=[] · test-portal=[kyu-gate,matrix-run(test-portal)])
- `src/lib/server/runs/gate.ts` · `required.length===0 → verdict=none` guard (이전 empty→green trivial 폐기)
- PR#23 pre-deploy curl = verdict=none (기존 required 부재) · post-deploy 예상 = verdict=none · reason="required check 정의 없음"

### A2 · SSE Todoboss PR#23 4단계 실 완주 (R031 · SSE 부분)
- `tools/kyu-bridge/src/env-clone.mjs:cloneUrl` = GH_TOKEN URL 임베딩 (launchd keychain -25308 회수)
- `tools/kyu-bridge/src/env.mjs:handleEnvOpen` = subprocessEnv PATH 명시 (install/migrate/seed · pnpm ENOENT 회수 · § 5.16 자매)
- **실 SSE 로그** (docs/audits/K1-0917-B-sse-todoboss-23-complete.log · 63 lines):
  - clone: fresh clone → `/Users/kyu.lee/projects/.kyu-env/CuriocityDevAi__todoboss/pr-23` (5s)
  - install: pnpm install 4.1s · 320 packages (Progress: resolved 390, reused 309)
  - start: pnpm dev · vite 6.4.3 (port 4321)
  - ready: `elapsed_ms=7827` · `autologin_applied=true` · `url=http://127.0.0.1:4321/?test=1&autologin=admin`

### A3 · relay `collectFeatureMaps()` (R030)
- `scripts/build-index.mjs:collectFeatureMaps` + `parseFeatureMapYaml` 신설 (deps 0 · areas/processes/files 3층 · inline+multiline files 정합)
- **schema_version 3 → 4** (v3 호환 · feature_maps + hubs 필드 추가)
- `docs/feature-map-convention.md` 스키마 정본 (K0-0916-G 편입 · 로컬 검증 완료)
- **로컬 build 실측** = feature_maps=1 (test-portal · 10 areas)
- **CI 실측** = feature_maps=0 (CuriocityDevAi 리포 PRIVATE · Actions GITHUB_TOKEN scope 밖 · raw fetch 404). Kyu 실기 항목 = Actions secret `CROSS_REPO_READ_TOKEN` (PAT) 편입 후 재실행

### A4 · 허브 카드 실 데이터 (R011)
- `scripts/build-index.mjs:computeHubActivity` 신설 · 최근 24h 집계 · `index.json.hubs[hub] = {last_action, files_touched, tests_touched, updated_at}`
- `src/lib/ui/flow-data.ts:FlowHubMetric` 확장 · `RelayIndexJson.hubs?` 필드 · `fetchRelayLedger` metrics enrich
- **실 index.json hubs** (schema v4):
  - `k0`: `리포트: K0-0917-B-report.md` · files=8 · tests=0
  - `k1`: `대사: k1.md` · files=2 · tests=0
  - `k2/n0/t0/m0`: last_action=null (24h 활동 없음)

## 검증

- `pnpm check` = 0 errors 85 warnings (CSS unused selectors · pre-existing)
- `pnpm test` = 1000 pass · 75 files (Vitest 4.1.10)
- SPEC `§ K1-gate-required-real · § K1-sse-4step-complete · § K1-feature-maps-collect · § K1-hubs-activity-24h` 신설 (docs/SPEC.md § 11 v1.K1-0917-B)
- docs/state/k1.md · docs/tracking/k1.md K78 편입

## Kyu 실기 항목 (배포 후)

1. curl PR#23 · verdict=none · reason 변경 확인
2. curl test-portal PR#114 · verdict = required=[kyu-gate,matrix-run(test-portal)] 정합
3. Todoboss PR#23 브라우저 흐름판 [환경 열기] 4단계 실 노출 (daemon 재기동 완료 후)
4. index.json hubs 실 데이터 확인 · schema_version=4
5. **Actions secret PAT 편입** (feature_maps CI 정본 · PRIVATE 리포 접근)

## 관련 문서

- SPEC v1.K1-0917-B (§ K1-gate-required-real · § K1-sse-4step-complete · § K1-feature-maps-collect · § K1-hubs-activity-24h)
- docs/audits/K1-0917-B-sse-todoboss-23-complete.log (63 lines)
- docs/audits/K1-0917-B-gate-pre-deploy.log (54 lines)
- relay: docs/feature-map-convention.md · scripts/build-index.mjs (schema v4)
