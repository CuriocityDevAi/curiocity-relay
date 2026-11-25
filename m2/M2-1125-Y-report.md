PASS

## git log origin/main..HEAD

```
76601414c fix(ci-watch): M2-1125-W — --once sha @(unknown) 수정 · readLocalOriginSha 추가
342f44a2f feat(ci-watch): M2-1125-T — 비동기 수집 (스피너 멈춤 해소) · sha 변경 재수집
5098db7ab fix(ci-watch): M2-1125-S — 스피너·릴레이CI·리포접두어·주의사유·프롬프트ID·머지후CI 6건 수정
16d50a915 perf(ci-watch): M2-1125-Q — 부팅 가속 (63s→<1s) · git 배치 읽기 · 날짜 필터 · 비동기 fetch
```

## 테스트

```
# tests 332
# suites 0
# pass 332
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 20848.78325
```

## --once 실출력 머리 2줄

```
ci-watch  11/25/2026 19:33:17  ●진행 5  ■주의 0  ✔오늘 117  runner v8.3.2   CI ▲▲●●
data origin/main @0c403ef · 0s 전
```

## GitHub mergeable

PR #35 `feat/M2-1125-Q` → headRefOid: `76601414c1c86c25365921c80baa0c41ecd96af3`
mergeStateStatus: **CLEAN** · mergeable: **MERGEABLE**

## 작업 요약

- 원인: PR #34 (`feat/M2-1125-I-ci-watch-layout`) squash 머지 후 #35 브랜치에 원본 커밋(I~O) 잔존
- 조치: `~/projects/curiocity-relay-wts/M2-1125-Y` 워크트리에서 origin/main 위로 Q·S·T·W 4커밋 cherry-pick
  - `ea158bcc2` → `16d50a915` (Q)
  - `c686e5073` → `5098db7ab` (S)
  - `02451d15e` → `342f44a2f` (T)
  - `f362eb208` → `76601414c` (W)
- push: `git push origin HEAD:refs/heads/feat/M2-1125-Q --force-with-lease` 성공
- 충돌 없음 (cherry-pick clean)
