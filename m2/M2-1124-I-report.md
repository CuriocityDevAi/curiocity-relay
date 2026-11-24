COMPLETE · PR #19 https://github.com/CuriocityDevAi/curiocity-relay/pull/19

## 구현 요약

- `CI_WATCH_VERSION = '1.3'` 상수 추가 (import 직후 · 파일 상단 주석에 버전 업 규칙 명시)
- 화면 맨 윗줄 타이틀: `Runner/CI Monitoring v1.3 (YYYYMMDD)` 형식
- 날짜 = `git log -1 --format=%cd --date=format-local:%Y%m%d -- scripts/ci-watch.mjs` (WIB TZ) · git 실패 시 파일 mtime
- origin/main 버전 체크 (5분 캐시 · `git show origin/main:scripts/ci-watch.mjs` · fetch 금지): 더 높으면 ⚠ 경고
- 내용이 같은 버전이지만 diff 있으면 `⚠ 최신 내용 다름` 경고
- 디스크 파일 vs 기동 시 고정 해시 비교: 갱신 감지 시 `⚠ 파일 갱신됨 — 재시작 필요`

## 화면 맨 윗줄 캡처

**정상 (최신 버전 실행 중)**
```
Runner/CI Monitoring v1.3 (20261124)
```

**최신 아님 (origin/main 에 v1.4 있음)**
```
Runner/CI Monitoring v1.3 (20261124)  ⚠ 최신 v1.4 있음 — Ctrl+C 후 재시작
```

**파일 갱신됨 (디스크 파일이 실행 중 코드와 다름)**
```
Runner/CI Monitoring v1.3 (20261124)  ⚠ 파일 갱신됨 — 재시작 필요
```

## 기술 메모

- H 브랜치(`feat/M2-1124-H-ci-watch-keys`) 위에 `feat/M2-1124-I-ci-watch-version` 쌓음
- `node --check` 통과 · 수정 파일: `scripts/ci-watch.mjs` 단독
- `homedir` import 는 H에서 이미 있었으나 미사용 — 기존 코드 그대로 유지 (본 티켓 범위 외)
