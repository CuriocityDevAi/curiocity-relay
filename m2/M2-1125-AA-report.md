PASS

## M2-1125-AA — CHANGES 반영 (Homebrew PATH) + ci-watch relay PR 오표시 수정

### #36 브랜치 (`feat/M2-1125-Z-ci-box-setup`) 새 HEAD
`f9db552f2` — fix(ci-box): install_homebrew 신규 설치 후 현 세션 PATH 미반영 수정

### ci-watch PR
PR #37 — `fix/M2-1125-AA-ci-watch-relay-pr`
https://github.com/CuriocityDevAi/curiocity-relay/pull/37

---

## 작업 1: ci-box PATH 버그 수정

**파일**: `scripts/ci-box/lib/install.sh` → `feat/M2-1125-Z-ci-box-setup` 브랜치

**원인**: `install_homebrew()` 에서 Homebrew 설치 직후 현재 세션의 PATH 에 brew 가 없어
깨끗한 맥(아이맥) 첫 실행이 중단됨.

**수정**: 설치 후 `eval "$("${HOMEBREW_PREFIX}/bin/brew" shellenv)"` 추가.
DRY_RUN=1 시에는 `_dry` 로그 출력.

**유사 케이스**: `install_nvm_node()` 는 이미 `export NVM_DIR` + `. "$NVM_DIR/nvm.sh"` 처리 중 → 추가 조치 불필요.

**shellcheck**: 에러 없음 (SC1091 info 만 / `-x` 플래그로 재확인 클린).

**dry-run 로그** (brew 없는 PATH `env -i PATH=/usr/bin:/bin...`):
```
[ci-box] Installing Homebrew...
[DRY]   /bin/bash -c #!/bin/bash ...
[DRY]   eval "$(/opt/homebrew/bin/brew shellenv)"
[ci-box] ✓ Homebrew installed
[ci-box] - skip: nvm already installed
[DRY]   nvm install 20.19.6 && nvm alias default 20.19.6
...
```

---

## 작업 2: ci-watch relay PR 오표시 수정

**파일**: `scripts/watch/collect-view.mjs` → PR #37

**원인 (이중)**:

1. `step 2.1` URL 파싱 버그:
   ```js
   // 기존 (잘못됨) → 'pull' 반환
   pr.url.split('/').slice(-2)[0]
   // 수정 → 'curiocity-relay' 반환
   pr.url.split('/').slice(-3)[0]
   ```
   `NO_CI_REPOS.has('pull')` = false → relay PR 이 `ci_pending` 으로 남음.

2. `step 7.5b` NO_CI_REPOS 체크 미비:
   relay `ci_pending` 카드가 `storeport-heavy` 풀 pre-queue 에 추가
   → `SH 큐 정체 — 러너 재연결 필요` 오경보 발생.

**수정**:
- `step 2.1` (sync + async): `.slice(-3)[0]` 수정, `card.reason = 'CI 없음(리뷰 대기)'`
- `step 7.5b` (sync + async): `if (repo && NO_CI_REPOS.has(repo)) continue;` 추가

**검증**:
```
relay PR URL 파싱: 'curiocity-relay' ✓ (old: 'pull')
NO_CI_REPOS.has: true ✓
after step 2.1 → column: review / reason: CI 없음(리뷰 대기) ✓
```

**테스트**: 83/83 pass (`ci-watch-v2.test.mjs`) + 27/27 (`ci-watch-s/k/t`)

**ci-watch --once 출력** (현재 relay 상태):
```
주의 없음   ← SH 큐 정체 경고 사라짐
CI 큐 (SH 0 · SL 0 · FH 0 · FL 0)   ← relay PR storeport-heavy 미등록
```
