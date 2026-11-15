# M0-1105-CN 리포트 — loyalty spec CI 편입 + 동명 마이그레이션 금지 + prod 런북

PR #277 · loyalty spec 3종 CI 결과 = pending (pos-integration run in flight) · naming-check 결과 = PASS(검사 1~4)

## 브랜치 · PR

- 브랜치: `feat/m0-1105-cn-loyalty-ci` (base: `origin/main` · 분기 `b17ff55`)
- PR: https://github.com/CuriocityDevAi/storeport/pull/277 (ready · 머지 안 함)
- 커밋 3건:
  - `24cc041` test(commerce-core): REQ1 — loyalty spec CI 편입
  - `3f7fc3a` chore(naming-check): REQ2 — 동명 마이그레이션 금지 검사 4
  - `85f0194` docs(runbook): REQ3 — prod-migration-check 런북 신설

## REQ 1 — `apps/commerce-core/scripts/test-integration-pos.sh`

- `SPECS=(integration-tests/pos/*.spec.ts integration-tests/loyalty/*.spec.ts)` — glob 두 디렉토리에서 열거 후 존재하는 항목만 필터.
- 로컬 열거: pos 12 + loyalty 4 = 16개. loyalty 쪽에 customer-link / expiry / link-earn / store-credit-smoke 전부 수집됨.
- jest 는 spec 하나당 재기동 (cross-realm Map 충돌 방지 · M0-1105-AP 패턴 유지).
- link-earn 의 "earnForOrder × 2 동시 → credit tx 1건" case (M0-1105-CK · R0-EY C1) 이 R4 적립 1회 멱등을 지속 검증.
- CI 결과: PR #277 의 `pos-integration` job 이 pending (first run · 완료 후 PR 코멘트 참조). 실패 발생 시 추가 라운드 필요.

## REQ 2 — `scripts/naming-check.sh` 검사 4

- 추가된 검사: `find apps/commerce-core/src/modules -path '*migrations*' -name 'Migration*.ts' | xargs -n1 basename | sort | uniq -d` 가 비어있지 않으면 fail.
- 발견 시 중복 basename 과 실제 경로 모두 출력 (어느 timestamp 를 바꿀지 안내).
- 로컬 실행: `bash scripts/naming-check.sh` → PASS (검사 1~4 모두). 양성 샘플 (`/tmp` 임시 트리) 로 duplicate 탐지 동작 확인.
- 재발 원인 (silent_pass) 배경: 2026-11-15 loyalty_settings vs customer_display_settings 동명 (#274 a346fc7 로 해소) — basename 기반 migration 추적이 모듈 간 간섭.

## REQ 3 — `docs/runbooks/prod-migration-check.md` (신규)

- 체크 1: Railway `commerce-core` 서비스 → Deployments → 최근 SUCCESS 배포 → Deploy Logs 에서 `Migrated Migration20261115110000` (loyalty_settings) · `Migration20261115210000` (customer_display_settings) 양쪽 라인 검색.
- 체크 2: Admin → Settings → Loyalty 화면이 500 없이 열림 · `GET /admin/loyalty/settings` 가 200 응답.
- CLAUDE.md §5 (대시보드 Success 배지 오독 금지) 와 연결 · 재배포 조치 포함.

## 금지사항 준수

- /loop · Monitor · 예약 깨우기 · `gh --watch` · PR 머지 · 리포트 중간 push: 전부 미사용.
- 자기 워크트리 (storeport main worktree · 새 브랜치 `feat/m0-1105-cn-loyalty-ci` from 최신 `origin/main`) · 항목마다 commit+push · 첫 push 직후 PR(ready) 준수.

## 이연 순증감

- 신규 이연: 없음.
- 기존 이연: M3-1105-CR(#276) 가 연결 안 돼 있지는 않음 — 본 티켓 범위 밖.
- 확인 필요: `pos-integration` CI 결과 (PR #277 Actions). 실패 시 loyalty spec 쪽 수정 라운드 필요.
