#42 CHANGES

검토 대상: PR #42 `feat/M1-1126-C-ci-box-heartbeat` · 참조 `m1/M1-1126-C-report.md`  
검토자: R0-1126-D (Sonnet) · 2026-11-26

---

## CHANGES 요약

| # | 항목 | 판정 | 심각도 |
|---|------|------|--------|
| 1 | 설치 경로 함정 — tarball 폴더에서 git pull 실패 | **CHANGES** | Critical |
| 2 | push rebase `--depth=5` 얕은 fetch | **CHANGES** | Minor |
| 3 | gh credential.helper 전역 설정 오염 여부 | PASS | — |
| 4 | macOS 26 호환 (vm_stat · pmset · networkQuality 캐시) | PASS | — |
| 5 | dry-run + 단위 테스트 실행 | PASS (맥북 실행 확인) | — |

---

## 1. 설치 경로 함정 — CHANGES (Critical)

**문제**: 설치 명령 2번이 tarball 폴더에서 실패한다.

```bash
# 현재 설치 명령 (PR 본문 / M1-1126-C-report.md)
if [ -d ~/projects/curiocity-relay ]; then
  git -C ~/projects/curiocity-relay pull --ff-only   # ← FAIL
else
  git clone ...
fi
```

아이맥의 `~/projects/curiocity-relay`는 11-25에 tarball로 풀어 둔 폴더(`.git` 없음).  
`-d ~/projects/curiocity-relay` 조건이 참 → `git pull --ff-only` 실행 → **fatal: not a git repository** 오류로 종료.

이후 `bash ~/projects/curiocity-relay/scripts/ci-box/install-health.sh` 도 실패:  
tarball은 11-25 snapshot이므로 `scripts/ci-box/` 디렉토리 자체가 없을 가능성 높음(PR이 11-26 생성).

**`health.sh` 코드 자체는 무관**: `RELAY_CLONE_DIR="${CI_BOX_RELAY_DIR:-$HOME/.ci-box-relay}"` 로 별도 clone을 사용하므로 `~/projects/curiocity-relay`를 건드리지 않는다.

**권장 수정 (설치 명령)**:
```bash
# .git 존재 여부로 분기
if [ -d ~/projects/curiocity-relay/.git ]; then
  git -C ~/projects/curiocity-relay pull --ff-only
elif [ -d ~/projects/curiocity-relay ]; then
  # tarball 폴더 존재 → 별도 경로에 clone
  git clone --depth=1 https://github.com/CuriocityDevAi/curiocity-relay.git \
      ~/projects/curiocity-relay-heartbeat
  RELAY_SCRIPTS=~/projects/curiocity-relay-heartbeat
else
  git clone --depth=1 https://github.com/CuriocityDevAi/curiocity-relay.git \
      ~/projects/curiocity-relay
  RELAY_SCRIPTS=~/projects/curiocity-relay
fi
bash "${RELAY_SCRIPTS:-~/projects/curiocity-relay}/scripts/ci-box/install-health.sh"
```

또는 더 단순하게: 설치 명령에서 `~/projects/curiocity-relay-heartbeat`를 별도 clone 경로로 고정 사용.  
기존 tarball 폴더(`~/projects/curiocity-relay`) · ci-box 파일은 무변경 유지.

---

## 2. push rebase `--depth=5` — CHANGES (Minor)

**문제**: rebase 재시도 경로에서 `--depth=5`가 너무 얕다.

```bash
# health.sh push_to_relay()
git -C "$RELAY_CLONE_DIR" fetch --depth=5 origin main   # ← shallow
if ! git -C "$RELAY_CLONE_DIR" rebase origin/main; then ...
```

초기 clone이 `--depth=1`인 상태에서 `fetch --depth=5`로 rebase를 시도하면,  
이미 5개 이상의 커밋이 쌓여 있을 경우 shallow graft 충돌로 rebase가 실패할 수 있다.  
5분 주기로 여러 머신/맥북 러너가 push하면 5커밋 이내 보장이 어렵다.

**권장 수정**:
```bash
git -C "$RELAY_CLONE_DIR" fetch origin main   # depth 제거
```

단, 최종 실패는 `return 0`(non-fatal)이므로 다음 tick에서 `reset --hard origin/main`으로 자동 복구됨 → 치명적이지 않음.

---

## 3. gh credential.helper 전역 설정 오염 — PASS

```bash
git -C "$RELAY_CLONE_DIR" config credential.helper \
    "!/opt/homebrew/bin/gh auth git-credential" 2>/dev/null || true
```

`--global` 플래그 없이 `git -C $RELAY_CLONE_DIR config` → `$RELAY_CLONE_DIR/.git/config` LOCAL 설정만 수정.  
아이맥 전역 `~/.gitconfig` 미변경 ✓.  
`gh` 경로 `/opt/homebrew/bin/gh`는 M1 Homebrew 표준 경로 ✓.  
실패 시 `|| true` → non-fatal ✓.

---

## 4. macOS 26 호환 + networkQuality 캐시 — PASS

| 항목 | 확인 방법 | 결과 |
|------|-----------|------|
| `vm_stat` | 코드 검토 (페이지 카운트 계산) | ✓ macOS 26 지원 |
| `pmset -g therm` | 코드 검토 (CPU_Speed_Limit 파싱) | ✓ |
| `networkQuality -s -c` | 코드 검토 · macOS 12+ 지원 여부 | ✓ macOS 26 포함 |
| `/opt/homebrew` PATH | launchd plist EnvironmentVariables 확인 | ✓ 명시 설정 |
| `pg_isready` 경로 | `command -v` 체크 후 PATH 탐색 | ✓ hardcode 없음 |
| networkQuality 1시간 캐시 | Python 로직 검토: `_ts` 저장 · `age < 3600` 판정 | ✓ 정상 동작 |

캐시 로직 상세:
```python
# 캐시 저장: _ts = Unix timestamp
printf '{"dl_mbps":..., "_ts":%d}' "$now_epoch" > "$NETSPEED_CACHE"
# 캐시 읽기: age < 3600 → hit
age = now - int(d.get('_ts', 0))
if age < 3600: ...  # cached=True, _ts 제거 후 반환
```
로직 올바름. 아이맥 실기기 테스트는 미실행(원격 리뷰 범위 초과).

---

## 5. dry-run + 단위 테스트 — PASS

| 항목 | 실행 환경 | 결과 |
|------|-----------|------|
| `bash health.sh --dry-run` | 맥북 (동일 macOS 계열) | JSON 출력 정상 · 모든 수집 항목 확인 ✓ |
| judge_health 단위 테스트 9/9 | 맥북 | ok/warn/bad · 경계값 포함 전부 통과 ✓ |

dry-run JSON 출력 (M1-1126-C-report.md 발췌):
```json
{
  "ts": "2026-11-26T02:19:11Z",
  "runners": {"listener_count": 0, "worker_count": 0},
  "health": "bad",
  "reasons": ["memory_free_8pct_lt_15", "runners_0_lt_4"]
}
```
맥북 환경(러너 없음, 메모리 8%) 반영 → bad 판정 정상.  
아이맥 실기기 dry-run은 미검증(SSH 접근 불가).

---

## 맥북 러너 safe-push/main-guard 충돌 가능성

아이맥 heartbeat은 `~/.ci-box-relay` clone에서 `origin main`으로 직접 push함.  
맥북 러너 `~/projects/curiocity-relay`는 별도 체크아웃 → 경로 충돌 없음.  
단, 맥북 러너가 push 전 fetch 시 `status/ci-box/imac.json` 커밋을 scope 밖 변경으로 경고할 수 있음.  
코드상 push 충돌 시 rebase 3회 재시도 · 최종 실패 non-fatal → 맥북 러너 작업 차단 없음.  
1개 파일만 commit(`STATUS_PATH` = `status/ci-box/imac.json`) ✓.

---

## 결론

**스크립트 코드(`health.sh`, `install-health.sh`, plist)는 정상** — APPROVE 가능 품질.  
단, **설치 명령(PR 본문 · M1-1126-C-report.md)**의 tarball 경로 처리 버그(Issue 1)가  
아이맥 실제 설치를 막으므로 CHANGES.

수정 필요:
1. 설치 명령 2번: `[ -d ~/projects/curiocity-relay ]` → `[ -d ~/projects/curiocity-relay/.git ]` 분기 (또는 별도 clone 경로 고정)
2. rebase fetch: `--depth=5` 제거 권장 (non-fatal이므로 필수는 아님)
