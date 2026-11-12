# R0-1105-CG Report

**판정: APPROVE**

## 검증 표

| REQ | 항목 | 파일:줄 | 결과 |
|-----|------|---------|------|
| 1-① | master 체크 | `scripts/dev-refresh.sh:9–13` | ✅ 비-master 브랜치 → Korean 에러 + `git checkout master` 힌트 → exit 1 |
| 1-① | dirty tree 체크 | `scripts/dev-refresh.sh:15–20` | ✅ `git diff + git diff --cached` 모두 체크, stash/reset 자동 실행 없음 |
| 1-② | `--ff-only` | `scripts/dev-refresh.sh:25` | ✅ `git pull --ff-only` |
| 1-④ | 커밋 번호 출력 | `scripts/dev-refresh.sh:28` | ✅ `git rev-parse --short HEAD` 출력 |
| 2 | 변경 감지 (pull 전후 hash 비교) | `scripts/dev-refresh.sh:22–23, 29–30, 32–34` | ✅ `git rev-parse HEAD:package.json` / `HEAD:package-lock.json` |
| 2 | npm install 실패 시 멈춤 | `scripts/dev-refresh.sh:2` | ✅ `set -euo pipefail` → npm 실패 즉시 exit |
| 3 | Metro 명령 (dev-client) | `scripts/dev-refresh.sh:51, 54` | ✅ `npx expo start --dev-client [--clear]` — `--dev-client` = "Using development build" 출력 |
| 3 | 캐시 초기화 조건 | `scripts/dev-refresh.sh:49–55` | ✅ package 변경 시에만 `--clear`, 없으면 생략 |
| 3 | macOS bash 3.2 호환 | 전체 | ✅ bash 4+ 문법 없음 (`[[ ]]`, `set -euo pipefail`, `$()` 모두 bash 3.1+) |
| 3 | 사용법 `#` 주석 없음 | `README.md:88` | ✅ `cd ~/projects/agilo-fork-test && bash scripts/dev-refresh.sh` — `#` 없음 |
| 3 | heredoc 백틱 함정 | 전체 | ✅ heredoc 없음 |
| 4 | 3-케이스 재현 로그 | 아래 | ✅ |

## 재현 로그 (`/tmp/cg-test/local` — 로컬 git 환경)

**Case 1 — package.json 변경 → npm install 실행**
```
--- git pull --ff-only ---
Updating 575c039..87a0173  package.json 1 file changed
최신 커밋: 87a0173
--- package.json / package-lock.json 변경 감지 → npm install ---
added 29 packages, and audited 30 packages in 1s
--- dry-run: Metro 시작 건너뜀 ---
EXIT_CODE: 0
```
→ PASS

**Case 2 — README 만 변경 → npm install 건너뜀**
```
--- git pull --ff-only ---
Updating c27d708..575c039  README.md 1 file changed
최신 커밋: 575c039
--- 패키지 변경 없음, npm install 건너뜀 ---
--- dry-run: Metro 시작 건너뜀 ---
EXIT_CODE: 0
```
→ PASS

**Case 3 — 더러운 작업 트리 → 멈춤**
```
ERROR: 저장되지 않은 변경이 있습니다. 먼저 커밋하거나 stash 하세요.
 M README.md
EXIT_CODE: 1
```
→ PASS

## Kyu 사용법 1줄 확인

README.md 및 PR body 모두 동일:
```
cd ~/projects/agilo-fork-test && bash scripts/dev-refresh.sh
```
`#` 주석 없음 — zsh 복붙 직접 사용 가능. ✅

## 이연 순증감

0

## 착지 명령

cp /tmp/R0-1105-CG-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-CG-report.md && git commit -m "r0: R0-1105-CG" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-CG done "APPROVE — 안전 체크·package 감지·Metro --dev-client 모두 정확, bash 3.2 호환 (#104)"
