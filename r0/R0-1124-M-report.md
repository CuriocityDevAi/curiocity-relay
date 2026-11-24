APPROVE

## PR #22 M2-1124-M 리뷰 보고서

### 변경 파일 범위
- `scripts/ci-watch.mjs` — M2-1124-H+I+K 통합 · 버전 상수 · 키 핸들러 · 카운트다운 · 로컬 러너 우선
- `scripts/lib/local-ci.mjs` — 신규 추가 · 로컬 러너 로그 읽기 (읽기 전용)
- `scripts/watch/ci-watch-render.mjs` — cloud 라벨 2건 변경
- `scripts/test/ci-watch-k.test.mjs` — 테스트 문자열 1건 `cloud 오늘` → `cloud 잡 오늘` 반영

runner 관련 파일(`hub-runner-*.mjs`, `claim.mjs`) · `status/claims/` 변경 없음. 범위 OK.

### mergeable
- `MERGEABLE` — main 과 충돌 없음, clean.

### 실기동 검증

#### ① 헤더 라인
- `CI_WATCH_VERSION = '1.4'` (ci-watch.mjs:33)
- 타이틀 줄: `Runner/CI Monitoring v${CI_WATCH_VERSION} (${fileCommitDate})` (line 958)
- 실 기동 출력: `Runner/CI Monitoring v1.4 (20261124)` 확인 ✅

#### ② r 키 즉시 갱신 · q 종료 · Ctrl+C
- `process.stdin.isTTY` 가드 아래 `setRawMode(true)` 활성화
- `r`/`R` 키: `ghIgnoreCache = true` → `forceRefresh()` → GitHub 캐시 무시 즉시 갱신 (10초 쿨다운 `KEY_REFRESH_COOLDOWN_MS = 10_000`)
- `q`/`Q` 키 및 Ctrl+C(``): `cleanupTerminal()` → `process.exit(0)`
- `cleanupTerminal()`: countdownTimer·refreshTimer clearInterval/clearTimeout · `setRawMode(false)` · 커서 복원(`\x1b[?25h`) ✅

#### ③ 카운트다운 깜빡임 없음
- 화면 갱신(tick): `\x1b[2J\x1b[H` 전체 clear — 3초마다 1회
- 카운트다운(1초 interval): `\x1b[1A\r\x1b[2K` — 마지막 줄만 덮어쓰기 (전체 clear 없음)
- 실 기동 출력: `[1A[2K` 패턴으로 마지막 줄만 갱신 확인, 나머지 화면 깜빡임 없음 ✅

#### ④ 로컬 self-hosted 러너 정보 GitHub 호출 없이 표시
- `scripts/lib/local-ci.mjs`: `import` 목록에 `fetch`/`http`/`https`/`ghApi` 없음
- 사용 모듈: `node:fs`, `node:os`, `node:path` 만 — 파일 I/O 전용
- 러너 `_diag/Runner_*.log`, `_diag/Worker_*.log` 직접 파싱
- 실 기동: 로컬 러너 `BUSY` 상태(`storeport-heavy` 4분째) GitHub 호출 없이 표시 확인 ✅

#### ⑤ git 쓰기 0
- `grep` 결과: `git commit`, `git push`, `git checkout`, `git branch -D`, `git reset`, `writeFileSync`, `appendFileSync` — 해당 없음
- 파일 내 git 명령: `git log -1 --format=%cd` (커밋 날짜 읽기), `git show origin/main:...` (버전 확인 읽기) — 모두 읽기 전용 ✅

#### ⑥ stdin이 TTY 아닐 때 크래시 없음
- 키 핸들러 전체가 `if (process.stdin.isTTY) { ... }` 블록 안에만 존재
- TTY 아닐 때 `setRawMode` 미호출 → 에러 없음
- 실 기동 테스트 (`echo "" | node ci-watch.mjs`): 정상 실행 후 4초 뒤 `kill` → exit 0 확인 ✅

#### ⑦ cloud 라벨 두 줄 구분
- 1줄: `cloud 잡 오늘  N건(간단 판정 포함)  총 X분  잔여: N` (실행된 잡 카운트)
- 2줄: `클라우드 넘기기 한도  N/5  잔여 N` (오늘 통계 섹션, 조건부 표시)
- 두 줄이 별도 `lines.push(...)` 로 완전 분리 (ci-watch-render.mjs:229, 265)
- 실 기동 출력: `cloud 잡 오늘  3건(간단 판정 포함)` / `클라우드 넘기기 한도  1/5` 각각 확인 ✅

### 종합 판정

7가지 검증 항목 전부 통과, 변경 파일 범위 OK, `mergeable=MERGEABLE`.

**APPROVE**
