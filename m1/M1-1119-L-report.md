#394 · busy 실측 true X(미검증) · 클라우드 pos-int 실제 초록 X(미검증) · skipped 제외 O · runner-watch O · force_cloud 한도 O

## 커밋

- storeport `ci/M2-1119-J-one-heavy` 047926d
- agilo-medusa-pos-fork `ci/M2-1119-J-one-heavy` 2da9385 (동일 브랜치 · 양쪽 적용)

## 수정 내역

### REQ 1 — D busy: 라벨 기반 판정 ✅

**근본 원인 2가지:**

1. `gh api --jq --arg h "..." --arg l "..."` 문법 오류: `gh api --jq` 는 `--arg` 를 jq 에 전달하지 않음 → jq 필터 내 `$h` / `$l` 변수 미인식 → 항상 0 반환
2. `.runner_name | test($h; "i")` 로 runner 이름 필터: 실제 runner_name 은 `Youngkyus-MacBook-Pro-M1` (호스트명) · `curiocity-mac` 은 라벨 → 불일치 → 항상 false

**수정:** `jq --arg` 파이프로 변경 + `.labels // [] | index($h) != null` 라벨 기반 필터 적용.
route-heavy.sh `_runner_busy()` fallback · runner-watch.yml busy fallback 양쪽 동일 적용.

### REQ 2 — C2: skipped 제외 ✅

**근본 원인:** `heavy-cloud` job 은 heavy-mac 실행 시 `conclusion=skipped` 로 완료. 기존 코드는 `status == "completed"` 를 모두 카운트 → skipped job 도 quota 1건으로 집계.

**수정:** `select(.status != "completed" or .conclusion != "skipped")` 필터 추가.
route-heavy.sh `_cloud_today()` · runner-watch.yml 클라우드 카운트 양쪽 동일 적용.

### REQ 3 — runner-watch: heavy-mac 이름 ✅

**근본 원인:** stall 감지 jq 에서 `.name == "heavy"` → 실제 job 이름은 `heavy-mac` → 감지 0.

**수정:** `.name == "heavy-mac"` 으로 변경.

### REQ 4 — force_cloud: 한도 준수 ✅

**근본 원인:** `force_cloud=true` 시 quota 체크 없이 즉시 `ubuntu-latest` 출력.

**수정:** `_cloud_today()` + `_extra_quota()` 호출 → `FORCE_TODAY >= FORCE_QUOTA` 이면 self-hosted fallback.

### REQ 6 — --test 단위 확인 ✅ 12/12

```
=== route-heavy.sh 단위 확인 ===
  ✅ idle runner → self-hosted
  ✅ draft PR → self-hosted
  ✅ busy + used=0/5 → ubuntu
  ✅ busy + used=5 quota 5 → self-hosted
  ✅ busy + used=5 extra=5 → ubuntu
  ✅ busy + used=7 extra=5 quota=10 → ubuntu
  ✅ busy + used=10 extra=5 quota=10 exceeded → self-hosted
  ✅ API fail → self-hosted fallback
  ✅ main push → self-hosted
  ✅ force_cloud + used=0 → ubuntu
  ✅ force_cloud + quota_exceeded → self-hosted  ← 신규 추가
  ✅ extra non-integer → self-hosted

결과: 12 통과 / 12 전체
```

## REQ 5 실측 — 미검증

맥 heavy 러너가 다른 PR 의 heavy-mac 을 돌리는 동안 이 PR 에 빈 커밋 push → `runner_busy=true` 로그 · `heavy-cloud` 실행 여부는 **현재 세션에서 실측 불가** (다른 PR 에서 heavy-mac 이 실행 중인 타이밍 없음).

클라우드 pos-integration 초록 여부도 **미검증**.

## 파일 변경 요약

| 파일 | 변경 |
|------|------|
| `.github/scripts/route-heavy.sh` | D busy fallback(pipe+label) · C2 skipped 제외 · force_cloud quota · --test +1케이스 |
| `.github/workflows/runner-watch.yml` | D busy fallback(pipe+label) · stall `heavy` → `heavy-mac` |
