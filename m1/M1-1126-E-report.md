# M1-1126-E 리포트

판정: **PASS** · PR #42 커밋 추가 완료  
PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/42

---

## 작업 요약

R0-1126-D CHANGES 2건 반영.

### CHANGE 1 (Critical) — heartbeat 전용 clone 경로 고정

**문제**: 기존 설치 명령이 `~/projects/curiocity-relay`의 `.git` 여부를 확인하지 않고 `git pull --ff-only` 실행 → tarball 폴더에서 `fatal: not a git repository` 오류.

**수정 내용**:
- `docs/ci-box-heartbeat.md`에 `## 설치` 섹션 추가
- PR #42 본문 "Kyu 설치 명령" 섹션 갱신
- 설치 대상 경로를 `~/projects/curiocity-relay-heartbeat`로 고정 (신규 전용 clone 경로)
- 기존 tarball `~/projects/curiocity-relay` 무변경

**새 설치 명령 로직**:
```
[ -d ~/projects/curiocity-relay-heartbeat/.git ] → pull
아니면 → git clone --depth=1 ... ~/projects/curiocity-relay-heartbeat
```

`install-health.sh`는 `SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"` 기반으로 동작 — 하드코딩 경로 없음 ✓

### CHANGE 2 (Minor) — push rebase fetch depth 제거

**수정**: `scripts/ci-box/health.sh` line 323
```diff
-        git -C "$RELAY_CLONE_DIR" fetch --depth=5 origin main 2>/dev/null || break
+        git -C "$RELAY_CLONE_DIR" fetch origin main 2>/dev/null || break
```

초기 최신화 fetch (`--depth=1`, line 286)는 유지.

### CHANGE 3 — 설치 명령 인라인 `#` 주석 제거

PR 본문·docs 모두 `#` 주석 없는 단일 블록으로 갱신. 각 줄 독립 붙여넣기 가능.

---

## 커밋

```
fix(ci-box): M1-1126-E — R0-1126-D CHANGES 반영 (heartbeat clone 경로 고정 · fetch depth 제거)
7d5a227a9  feat/M1-1126-C-ci-box-heartbeat
```

---

## 자기 검증

| 항목 | 방법 | 결과 |
|------|------|------|
| tarball 폴더 존재 시 분기 | 임시 HOME에 `.git` 없는 tarball 폴더 생성 후 조건식 dry-run | clone 경로로 정상 분기 ✓ |
| 기존 heartbeat clone 존재 시 분기 | `.git` 더미 디렉토리 생성 후 조건식 dry-run | pull 경로로 정상 분기 ✓ |
| health.sh fetch depth 확인 | grep으로 depth 플래그 확인 | rebase retry fetch에 depth 없음 ✓ |
| install-health.sh 하드코딩 경로 | grep curiocity-relay | 하드코딩 없음 ✓ |
| 아이맥 실기기 launchd 설치 | SSH 불가 (태스크 조건: 아이맥 SSH 금지) | **미검증** |
| push 단위 테스트 (실제 Git 레포) | 실제 git 레포 생성 필요 | **미실행** (dry-run 로직 검증으로 대체) |

---

## Kyu 설치 명령 (아이맥 SSH 후 한 줄씩)

```bash
ssh KyuLee@100.82.115.70
[ -d ~/projects/curiocity-relay-heartbeat/.git ] && git -C ~/projects/curiocity-relay-heartbeat pull --ff-only || git clone --depth=1 https://github.com/CuriocityDevAi/curiocity-relay.git ~/projects/curiocity-relay-heartbeat
gh auth status || gh auth login
bash ~/projects/curiocity-relay-heartbeat/scripts/ci-box/install-health.sh
bash ~/projects/curiocity-relay-heartbeat/scripts/ci-box/health.sh --dry-run
bash ~/projects/curiocity-relay-heartbeat/scripts/ci-box/install-health.sh --status
```

---

## 이연 순증감

이연 없음 (신규 없음 · 해소 없음).
