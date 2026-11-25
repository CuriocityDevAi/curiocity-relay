PASS · #35 head sha: 02451d15e30390dca68c8bdeaf812da65c911717

## 작업 요약

- T 커밋 (`02451d15e`): `feat/M2-1125-T` 미커밋 변경사항 커밋 완료
- Q 브랜치 fast-forward: `ea158bcc2` → `02451d15e` (Q→S→T 선형)
- push: `git push origin feat/M2-1125-Q --force-with-lease` 성공
- base 충돌 없음: `origin/feat/M2-1125-I-ci-watch-layout` 대비 3커밋(Q·S·T) 선형 ahead

## #35 커밋 목록

```
02451d15e feat(ci-watch): M2-1125-T — 비동기 수집 (스피너 멈춤 해소) · sha 변경 재수집
c686e5073 fix(ci-watch): M2-1125-S — 스피너·릴레이CI·리포접두어·주의사유·프롬프트ID·머지후CI 6건 수정
ea158bcc2 perf(ci-watch): M2-1125-Q — 부팅 가속 (63s→<1s) · git 배치 읽기 · 날짜 필터 · 비동기 fetch
```

## 테스트 로그 꼬리 (node --test scripts/test/*.test.mjs)

```
1..331
# tests 331
# suites 0
# pass 330
# fail 1
# cancelled 0
# skipped 0
# todo 0
# duration_ms 20588.121458
```

**실패 1건 상세**: S-3 (ci-watch-s.test.mjs:73) — 라이브 데이터 의존 테스트. 현재 주의 섹션에 "러너 OFF" 사유만 있고 시간 패턴(`\d+분` 등) 없음. S 브랜치 원본(`c686e5073`)에서도 동일하게 실패 — **사전 실패(pre-existing)**. M2-1125-U 작업 범위 외.

## T 신규 테스트 (5/5 pass)

```
ok 1 - T-sha-1: buildExtendedViewAsync — dataOrigin.builtAt 필드 존재   (490ms)
ok 2 - T-sha-2: renderV2 — builtAt 기반 경과 시간 "Ns 전" 출력           (1ms)
ok 3 - T-sha-3: renderV2 — builtAt 없이 ageSec 로 폴백                  (0.3ms)
ok 4 - T-async-1: buildExtendedViewAsync — allJson 오버라이드            (254ms)
ok 5 - T-async-2: buildExtendedViewAsync — skipGh=true 완료             (326ms)
# pass 5  fail 0
```

## S 변경 6건 / T 변경 2건 요약

**S 6건**:
1. `scheduleNext` skipFetch:true + `maybeGitFetchAsync` 분리 → 스피너 1차 완화
2. `NO_CI_REPOS` curiocity-relay → ci_pending 건너뜀
3. `getRepoAbbr`/`toPrQueueItem` queuedPrs 구조 변환
4. `renderCaution` c.reason 인라인 표시
5. `renderCiPool` sp#/fk#/rl# 접두어 + 프롬프트ID 칩
6. `renderCiPool` isMerged → [머지 후 실행] 회색

**T 2건**:
1. `buildExtendedViewAsync` + `collectViewAsync` + `tickFastAsync` — 이벤트 루프 비차단 (스피너 p95 122ms · 99.9%)
2. `dataOrigin.builtAt` — sha 변경 재수집·재렌더 (머리줄 "Ns 전" = 데이터 수집 시각)
