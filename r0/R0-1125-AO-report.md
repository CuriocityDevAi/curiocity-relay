#36 CHANGES · 큐정체 원인: relay build-index.yml에 pull_request 트리거 없어 CI 잡 미생성 → ci-watch 오표시

## 리뷰 판정

**CHANGES** (자기 PR 제한으로 GitHub에 COMMENT로 제출)

PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/36  
head: 4015bbab

---

## CHANGES 근거

### clean Mac 첫 실행 — Homebrew PATH 미반영 버그

`install_homebrew()`에서 Homebrew를 신규 설치한 직후, 공식 설치 스크립트는 `.zprofile` 등 셸 프로파일만 갱신하고 **현재 실행 중인 스크립트 세션의 PATH는 변경하지 않는다.**

결과: 아이맥(Homebrew 없음)에서 `bash setup.sh` 첫 실행 시 `install_homebrew()` 완료 후 호출되는 모든 `brew` 명령이 `command not found: brew`로 실패하고 `set -euo pipefail` 에 의해 스크립트 전체 중단.

영향 함수: `install_postgres`, `install_orbstack`, `install_gh_cli`, `install_tailscale`

최소 수정: `install_homebrew()` 내 `_ok "Homebrew installed"` 직전에 아래 추가:
```bash
eval "$("${HOMEBREW_PREFIX}/bin/brew" shellenv)"
```

---

## 통과 항목

| 항목 | 결과 |
|------|------|
| Node 20.19.6 | install.sh 일치 ✓ |
| pnpm 9.15.0 | storeport heavy-steps/action.yml `pnpm/action-setup@v4 version: 9.15.0` 일치 ✓ |
| PG16 / port 5432 / user+password=postgres | storeport ci.yml `postgres:16`, heavy-steps DB_PORT/DB_USERNAME/DB_PASSWORD 일치 ✓ |
| 러너 라벨 4종 | curiocity-mac·curiocity-mac-light(storeport ci.yml) · curiocity-mac-fork·curiocity-mac-fork-light(fork route-fork.sh MAC_RUNNER/MAC_LIGHT_RUNNER) 일치 ✓ |
| 등록 URL | storeport·agilo-medusa-pos-fork 각각 repo 단위 등록, 개인 계정 구조 적합 ✓ |
| 토큰 보안 | read -rs + unset, 파일/로그/git 미기록 ✓ |
| Idempotent | .runner 파일 체크 + launchctl list 체크 ✓ |
| sudo 단계 | pmset·systemsetup 모두 _run sudo → Kyu 직접 비밀번호 입력 ✓ |
| dry-run (clean Mac) | 모든 install 함수가 "미설치 → else → _run(DRY 출력)" 경로 보유 ✓ |

---

## 큐 정체 원인 및 처방

**원인**: relay 저장소 `build-index.yml`은 `pull_request` 트리거가 없고 `runs-on: ubuntu-latest`만 사용. PR #36 오픈 시 CI 잡 자체가 생성되지 않음에도 ci-watch가 "SH runner idle인데 queued"로 오탐.

- relay CI는 self-hosted runner를 전혀 사용하지 않음 (ubuntu-latest 전용)
- relay repo에 self-hosted runner 등록 자체가 없음
- 실제 큐 정체 아님

**처방**: ci-watch 오표시 수정 — relay repo PR을 SH 러너 큐 모니터링 대상에서 제외 (relay 워크플로 수정 불필요)
