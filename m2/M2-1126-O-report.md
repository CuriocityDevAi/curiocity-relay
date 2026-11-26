PASS relay#54 e2135eef0414cff06abca11e88e00a72dde4f4b4

## 작업 브랜치
- 기반: `feat/M2-1126-N` (PR #54)
- 작업: `feat/M2-1126-O` (fix 커밋 추가 후 push)

## 변경 내용

### 1. W114-jsonl-delta 항등식 테스트 → 픽스처 실측 (REQ 1)
- **삭제**: `assert.equal(46 - 22, 24)` 형태의 산술 항등식 (항상 pass)
- **추가**: `scripts/test/fixtures/ci-watch-w114-sample.jsonl` 픽스처 파일
  - storeport heavy-cloud × 3 (success×2 + skipped×1)
  - fork heavy-cloud × 2 (success×2)
  - route × 1 (marker)
  - assertions × 3 (success×2 + skipped×1)
  - self-hosted heavy-mac × 1 (runner_kind != cloud)
- **새 테스트**: 픽스처 로드 → `countRealCloud` 직접 호출
  - `countBefore` = 3 (heavy-cloud repo 미전달 시뮬레이션 → 모두 마커)
  - `countAfter` = 6 (repo 포함 → storeport heavy-cloud 3건 추가)
  - delta = 3 단언

### 2. `isMarkerJob(run.name)` → `isMarkerJob(run.name, repo)` (REQ 2)
- **파일**: `scripts/ci-watch.mjs:288`
- **수정**: `fetchQueuedForRepo(repo)` 내부에서 `repo` 미전달 → 전달
- M2-1126-N 이후 `heavy-cloud` 판정에 repo 필요 (repo 없으면 backward-compat로 마커 취급)

## 테스트 결과

### W114 단독 (10/10 PASS)
```
# tests 10
# pass 10
# fail 0
```

### ci-watch 전체 (ci-watch-w110 ~ w114 포함, 58/58 PASS)
```
# tests 58
# pass 58
# fail 0
```

### ci-watch 전체 파일 (ci-watch-*.test.mjs, 233 tests)
```
# tests 233
# pass 230
# fail 3   ← feat/M2-1126-N 기존 실패 (ci-watch-machines P-2a·P-2c·P-3a)
           ← 이번 커밋과 무관, M2-1126-N 브랜치 체크 시 동일하게 존재
```

기존 실패 3건 (`P-2a`, `P-2c`, `P-3a`) 은 `feat/M2-1126-N` 에서도 동일하게 존재하는 pre-existing 실패.
이번 M2-1126-O 변경으로 새로 발생한 실패 없음.

## 커밋
```
e2135eef0 fix(ci-watch): M2-1126-O — W114 항등식 테스트 → 픽스처 실측 · isMarkerJob repo 전달
```
