# ci-box — CI 전용 기계 설치 가이드

아이맥(M1 16GB) 또는 맥미니(M5 Pro 48/64GB)를 CI 전용 기계로 세팅하는 스크립트 모음.
스크립트를 다시 돌리면 이미 완료된 항목은 건너뜀(idempotent).

> **M2-1126-S (2026-11-26) — 넘김 폐지 (zero-cloud)**
> 모든 CI 는 아이맥 러너(ci-box 4종)로만 돈다. 이전의 "Mac 바쁠 때 ubuntu-latest 로 하루 5건 넘김"
> 분기는 폐기. 근거: `ledger/decision-ci-zero-cloud-20261126.md` — Kyu 결정.
> GitHub Settings → Billing → Actions 지출 한도를 **$0** 으로 내려두면 실수로 생긴 cloud 잡은
> 과금 대신 실패로 즉시 드러남 (안전망). iMac heartbeat 끊김은 ci-watch 가 상단 빨간 경고로 알림.

## 설치 항목

| 항목 | 버전 | 출처 |
|------|------|------|
| Homebrew | 최신 | 공식 |
| Node.js (nvm) | 20.19.6 | `actions-runner/.env` NVM_BIN 경로 |
| pnpm | 9.15.0 | `.github/actions/heavy-steps/action.yml` |
| PostgreSQL | 16 | `.github/workflows/ci.yml` / `heavy-steps` |
| Playwright (Chromium) | 최신 | npx playwright install |
| OrbStack (Docker) | 최신 | docker-build-pr 로컬 실행용 |
| gh CLI | 최신 | GitHub API 호출 |
| Tailscale | 최신 | 원격 접속 VPN |

## GitHub Actions 러너 등록

4개 러너를 등록합니다. 워크플로 파일 수정 없이 맥북 러너와 병행 운영합니다.

| 러너 이름 | 저장소 | 라벨 |
|-----------|--------|------|
| `ci-box-storeport-heavy-<호스트>` | storeport | `curiocity-mac` |
| `ci-box-storeport-light-<호스트>` | storeport | `curiocity-mac-light` |
| `ci-box-fork-heavy-<호스트>` | agilo-medusa-pos-fork | `curiocity-mac-fork` |
| `ci-box-fork-light-<호스트>` | agilo-medusa-pos-fork | `curiocity-mac-fork-light` |

### 토큰 얻는 방법

각 저장소에서 별도로 발급해야 합니다 (토큰은 한 번만 사용 가능).

**storeport 토큰**:
1. https://github.com/CuriocityDevAi/storeport 열기
2. Settings → Actions → Runners → New self-hosted runner
3. macOS 선택 → `Configure` 화면에 나오는 `--token` 값 복사

**agilo-medusa-pos-fork 토큰**:
1. https://github.com/CuriocityDevAi/agilo-medusa-pos-fork 열기
2. 위와 동일

## 아이맥에서 실행할 명령 (복붙용)

### 사전 확인 (dry-run)

```bash
bash ~/projects/curiocity-relay/scripts/ci-box/setup.sh --dry-run
```

### 실제 설치

```bash
bash ~/projects/curiocity-relay/scripts/ci-box/setup.sh
```

스크립트가 sudo 비밀번호와 GitHub 등록 토큰을 터미널에서 직접 묻습니다.

### SSH 허용 (원격 접속)

System Settings → General → Sharing → Remote Login 켜기

맥북에서 접속:
```bash
ssh <사용자명>@<아이맥 Tailscale 주소>
```

## 이관 절차

### 1단계: 병행 운영 (1~2일)

아이맥에서 `setup.sh` 실행 후:

1. GitHub Settings → Actions → Runners 에서 4개 ci-box 러너 `idle` 상태 확인
2. relay `status/runners/all.json` `ci_runners` 에 ci-box 러너 자동 반영 확인
   (hub-runner 가 GitHub API 를 직접 읽으므로 별도 설정 불필요)
3. CI PR 1~2개를 통해 ci-box 러너가 job 을 정상 처리하는지 확인

### 2단계: 맥북 러너 중지 (Kyu 판단)

안정 확인 후 맥북에서 실행:

```bash
launchctl unload -w ~/Library/LaunchAgents/actions.runner.CuriocityDevAi-storeport.Youngkyus-MacBook-Pro-M1.plist
launchctl unload -w ~/Library/LaunchAgents/actions.runner.CuriocityDevAi-storeport.curiocity-mac-light.plist
launchctl unload -w ~/Library/LaunchAgents/actions.runner.CuriocityDevAi-agilo-medusa-pos-fork.curiocity-mac-fork.plist
launchctl unload -w ~/Library/LaunchAgents/actions.runner.CuriocityDevAi-agilo-medusa-pos-fork.curiocity-mac-fork-light.plist
```

### 맥미니로 이관 시

맥미니에서 동일하게 `setup.sh` 실행. 러너 이름에 `<호스트>` 가 포함되므로
동일 스크립트로 별도 러너가 등록됩니다. 아이맥 러너를 먼저 중지하고 맥미니 러너를 확인하면 됩니다.

## 파일 구조

```
scripts/ci-box/
  setup.sh        — 메인 설치 스크립트 (여기를 실행)
  lib/
    install.sh    — 도구 설치 함수
    runner.sh     — 러너 등록/launchd 함수
  README.md       — 이 파일
```
