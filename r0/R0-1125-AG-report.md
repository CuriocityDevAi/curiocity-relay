CHANGES — PR #35 `--once` sha `@(unknown)` (PR #34 APPROVE)

## 판정

| PR | 판정 | 사유 |
|----|------|------|
| #34 feat/M2-1125-I-ci-watch-layout | **APPROVE** | 레이아웃 정상, 이슈 없음 |
| #35 feat/M2-1125-Q (head `02451d15e`) | **CHANGES** | `--once` sha `@(unknown)` |

## 직접 실행 결과

### 1. `--once` (실행 시간 + sha)
- 실행 시간: **0.93s** ✅ (기준 ≤2s)
- 머리줄 sha: `@(unknown)` ❌ (origin/main = `0b243fc`)
  - 원인: `--once` → `skipFetch:true, skipGh:true` → `maybeGitFetch` 미호출 → `_fs.sha=null`
  - 위치: `ci-watch-v2.mjs:233` → `sources-git.mjs:30` (fetch 없이 sha 미읽음)

### 2. 인터랙티브 20초 script 캡처 (스피너 + └ 줄)
- 스피너 프레임: **438회** (10프레임 균등 42–45회, 첫 등장 ~0s)
- `└` 줄: **438회** 등장 (M0-1125-R·M1-1125-T·M3-1125-R 각 ~146회)
- sha 변화: `@(unknown)` → `@0b243fc` (약 2–3초 후, background fetch 후 갱신)
- 측정 (--measure=30): p95 125ms · pctWithin70to170ms 97.4% ✅

### 3. CI큐 `sp#번호 (프롬프트ID)` 형식
- `render-v2.mjs:310` 코드 검증: `${abbr}#${num} (${promptId})` ✅
- relay PR(rl#) CI큐 미노출: NO_CI_REPOS S-2 테스트 통과 ✅

### 4. 테스트
- **331/331 pass** ✅ (PR 작성 시 330/331에서 S-3 fix 후 개선)
- S-3 라이브 데이터 의존 → fixture 전환 불필요 (graceful skip + fix 안정적)

## CHANGES 근거 (PR #35)

`--once` 가 `skipFetch:true` 로 `git rev-parse origin/main` 을 읽지 않아 sha 미표시.  
수정 방향: `--once` 경로에 로컬 `git rev-parse origin/main` (~5ms) 추가.
