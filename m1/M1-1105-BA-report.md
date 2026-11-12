# M1-1105-BA report — 러너 v7.2 (수동 투입 · 러너 자기 수정 라운드)

**PR**: https://github.com/CuriocityDevAi/curiocity-relay/pull/1
**브랜치**: `m1/BA-runner-v7.2`
**커밋**: `9d831ac feat(m1-1105-ba): hub-runner v7.2 — 버전 상수화 · plist App Nap 면제 · relay inbox(선택)`
**작업 clone**: `/tmp/relay-BA` (러너 폴더 `~/projects/curiocity-relay/scripts/` 는 건드리지 않음 · 지침 준수)
**모델**: Sonnet · 수동 투입

## 항목 0~6 표

| # | 요구 | 상태 | 파일:줄 (v7.2 기준) | 비고 |
|---|---|---|---|---|
| 0 | `claim.mjs M1-1105-BA started "manual"` | ✓ | — | 03:08:36Z · lock contention 으로 push 는 다음 러너 틱에서 재시도 |
| 1 | 착지 감지 5초(로컬) | ✓(상속) | `scripts/lib/land-detect.mjs:55-112` (5000ms poll) · `scripts/hub-runner-v7.2.mjs:1621-1639` (래퍼) | v7.1 에서 이미 구현 · v7.2 변경 없음. 테스트 실측 ≤7s |
| 2 | 재시작 복구 done 덮어쓰기 금지 | ✓(상속) | `scripts/lib/recovery.mjs:14-22` · `scripts/hub-runner-v7.2.mjs:1872-1920` | v7.1 에서 이미 구현. 복구는 `started + 빈 pane` 만 · pane=claude 면 skip-claude · state=done/cancelled/blocked 면 skip-state |
| 3 | all.json 버전 표기 | ✓ | `scripts/hub-runner-v7.2.mjs:55` (`const RUNNER_VERSION = 'v7.2'`) + 30여 참조 | 소스에 박혀있던 `'v7.0'` · `'v7.1'` · `runner-v7.1` · `hub-runner-v7.1` 전부 상수 참조로 치환 |
| 4 | 잠금 23분 지연 진단·고침 | ✓ (plist 고침안) · 재현 불가(잠금 실기 필요) | `scripts/hub-runner-install.sh:98-115` (`ProcessType=Interactive` · `LowPriorityIO=false` · `LegacyTimers=true`) | 원인: launchd 가 bg Service 취급 → App Nap + timer coalescing. 대안 `caffeinate -i` 는 폐기(plist 선언이 단순·신뢰성↑). 잠금 실기 필요 |
| 5 | relay inbox 코멘트 알림(선택) | ✓ 플래그 꺼짐 기본 | `scripts/hub-runner-v7.2.mjs:60-62` (env) · `:715-731` (`postInboxIfEnabled`) · `:712` (`runClaim` hook) | `RELAY_INBOX=1 && RELAY_INBOX_ISSUE=<N>` 일 때만 작동. done/blocked/cancelled 후 gh issue comment |
| 6 | 테스트·설치 명령 | ✓ 88/88 pass | 신규 `scripts/test/hub-runner-version.test.mjs` | 설치 명령 아래 |

## before / after 감지 시간

| 지표 | v7.0 (전전) | v7.1·v7.2 (현재) |
|---|---|---|
| 리포트 파일 로컬 감지 | origin fetch 30s 주기 의존 (최악 30s+) | **로컬 5s poll** (단위 테스트 실측: 리포트 생성 → 감지 ≤7s · 1회 poll 안) |
| claim done 로컬 감지 | 같음 | **≤3s** (단위 테스트) |
| 네트워크 호출 | 매 tick fetch | **0** (origin fetch 는 4회당 1회 보조만) |

M1-1105-AZ 09:36 landing — 관측 러너는 아직 v7.1 설치 이전일 가능성(러너 로그가 "runner-v7.0" 이 섞여있던 이유). 설치 후 재측정은 inbox 알림이 붙으면 PR 코멘트에서 즉시 비교 가능.

## 설치 명령 (허브 전부 idle 때 Kyu 가 직접 · 러너 교체는 오케가 Kyu 에게 안내)

```bash
cd ~/projects/curiocity-relay
git pull
bash scripts/hub-runner-install.sh      # TARGET 기본 = hub-runner-v7.2.mjs · FALLBACK = v7.1
```

inbox 켜기 (선택 · 이슈 번호가 정해지면):
```bash
launchctl setenv RELAY_INBOX 1
launchctl setenv RELAY_INBOX_ISSUE <N>
launchctl setenv RELAY_INBOX_REPO CuriocityDevAi/curiocity-relay
bash scripts/hub-runner-install.sh       # bootout + bootstrap 재적용
```

## 허브 돌고 있을 때 교체 안전성

- **신규 파일만 추가** (v7.1 그대로 둠) · install.sh 변경도 **설치 시에만** 효과. 러너는 메모리에 v7.1 코드를 쥔 채 계속 돎 → push 자체는 러너 동작에 0 영향.
- install.sh 는 `launchctl bootout` → **stale lock 삭제** → `bootstrap` → `verify_loaded(10s)` → 실패 시 **FALLBACK(v7.1) 자동 롤백**. 교체 중 어떤 이유로 실패해도 v7.1 로 즉시 복귀.
- 교체 타이밍 권장: `--status` 상 5 허브 전부 `idle` 때. 재시작 시 `recoverStuckStartedClaims` 가 started claim 을 보존(덮지 않음, v7.1 로직 상속).

## 이연 순증감

- **이연 완료 → +1 (M1-1105-BA)** · 러너 v7.2 수정 완료 · 설치는 Kyu 가 직접.
- 사건 원장 반영: `#d` (버전 표기 + 잠금 지연 23분) 는 코드 레벨 고침 완료 · 실기 검증은 Kyu 실기 뒤. `#8`·`#6` 는 v7.1 에서 이미 닫혔음을 v7.2 테스트로 재확인(88/88 pass).

## 위 착지 명령 (지침 그대로)

```bash
cp /tmp/M1-1105-BA-report.md ~/projects/curiocity-relay/m1/
cd ~/projects/curiocity-relay
git add m1/M1-1105-BA-report.md
git commit -m "m1: M1-1105-BA"
git pull --rebase --autostash origin main
git push
node scripts/claim.mjs M1-1105-BA done "러너 v7.2 PR#1 · 버전 상수화 · plist App Nap 면제 · inbox 선택 · 88/88 pass"
```
