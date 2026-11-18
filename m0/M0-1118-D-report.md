PR #362 · diff +79 -28 · R-A1-APP 포함 O

## 지시
`queue/m0/M0-1118-D.md` — #359 (ebf8a3c, M0-1118-C 수정 전 469105d) 로 main 에 들어간 `docs/plans/pos-finish-shared.md` 를, hub-m0 워크트리에 남아 있던 M0-1118-C 수정본(R0-1118-F APPROVE)으로 복구.

## REQ 실행 요약

### 1. 수정본 확인
- 워크트리: `/Users/kyu.lee/curiocity-live/storeport-wts/hub-m0`
- 미커밋 modified: `docs/plans/pos-finish-shared.md`
- `git diff --stat` = **+79 -28** (지시 기대치 일치)
- 파일 383 lines · R-A1-APP 라인 5건 존재 (plan:77, 83, 89, 306, 314, 316, 327, 365, 377 — grep 확인)

### 2. 보관 · 브랜치 분기 · 재적용
- 백업: `cp docs/plans/pos-finish-shared.md /tmp/M0-1118-D-pos-finish-shared.md`
- `git stash push -m "M0-1118-D-plan-fix-backup" -- docs/plans/pos-finish-shared.md` (stash@{0})
- `git fetch origin` · `git checkout -b docs/M0-1118-D-plan-fix origin/main`
- 수정본 복원: `cp /tmp/M0-1118-D-pos-finish-shared.md docs/plans/pos-finish-shared.md`
- `git diff --stat` = **+79 -28** (origin/main 대비 · 지시 기대치 일치 · 충돌 없음)

### 3. 커밋 · push · PR
- 커밋: `6309aa0 docs(plans): M0-1118-D — pos-finish-shared C1·C2·§4.4 반영 (R0-1118-F APPROVE)`
- push: `docs/M0-1118-D-plan-fix` → origin (new branch)
- PR: **#362** (ready · base=main · head=docs/M0-1118-D-plan-fix) — https://github.com/CuriocityDevAi/storeport/pull/362
- PR 본문: M0-1118-C 리포트 C1(R-A1-APP 신설)·C2(엔드포인트 정정)·§4.4(결정 4건) 요약 + R0-1118-F APPROVE 링크 + 원장(decision-pos-finish-20261118.md D3) 명시

## 산출물
- Commit: 6309aa0 (local hub-m0 · origin/docs/M0-1118-D-plan-fix)
- PR: #362 · OPEN · ready · additions=79 deletions=28
- 파일 1개 (`docs/plans/pos-finish-shared.md`) · docs-only 스코프 유지

## R-A1-APP 포함 검증
- plan 본문 라인 77, 83, 89, 306, 314, 316, 327, 365, 377 에서 `R-A1-APP` 문자열 확인
- 순서 라인 (plan:316): `R-A1-0 → R-A1-APP (fork repo · 머지+배포) → R-A1-1 → ...`
- §5 라운드 표 (plan:306): R-A1-APP 신설 · 45분 · pos-r0 fork · R-A1-1 선행 blocker
- §2.1 S2 (plan:77): "클라이언트 영향 無 아님 — 앱 라운드 R-A1-APP 가 선행되어야 함"

## 머지 처리
- **머지 금지** (오케 몫) — PR OPEN 상태로 반환.

## 부산물 (정리 필요 시)
- hub-m0 stash@{0}: `M0-1118-D-plan-fix-backup` (원 브랜치 `docs/M0-1118-B-pos-finish-plan` 수정본 백업 · 안전차원 보존).
- `/tmp/M0-1118-D-pos-finish-shared.md` 파일 백업.

## 소요
- 약 5분 (15분 상한 내)
