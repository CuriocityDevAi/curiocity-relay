PASS · PR #68 · HEAD cc0b4ee61 · `node --test scripts/test/*.test.mjs` 552 pass / 0 fail · `--once` 머리줄 = `ci-watch v1.25 (20261127)  11/27/2026 14:15:00  ●진행 74  ■주의 2  ✔오늘 328  runner v8.3.2  heartbeat 9분전`

# M0-1127-I — ci-watch 본체 readAllJson 두 위치 폴백 재사용 (v1.25)

- **PR**: https://github.com/CuriocityDevAi/curiocity-relay/pull/68
- **브랜치**: `fix/M0-1127-I-ciwatch-alljson-main`
- **HEAD**: `cc0b4ee612c29167ef93dd321f9a990714e09ff9`
- **베이스**: `origin/main` (rebase 완료)
- **변경 파일**: `scripts/ci-watch.mjs` (+12 / -7) · `scripts/test/ci-watch-w125.test.mjs` (신규 · +141)

## 구멍

- `scripts/ci-watch.mjs:199` 구 `PATHS.allJson` = 새 위치 (`~/.hub-runner/status-wt/all.json`) 만
- `scripts/ci-watch.mjs:557` 구 `readAllJson()` = 그 경로만 `existsSync + readFileSync`
- 러너 v8.3.2 self-update 보류 (허브 계속 바쁨) → 새 위치 파일 없음 → null → 머리 `runner/heartbeat ?` · 허브 큐 current 전부 `—` · `git: ?` · CI 큐 OFF

## 변경

- `PATHS.allJson` 분해 → `runnersAll` + `runnersAllLegacy` (두 경로)
- `readAllJson(pathsOverride?)` 를 `sources-local.readAllJson({ runnersAll, runnersAllLegacy })` 재사용 (복사 금지 · 최신 `at` 선택 로직 공유)
- `CI_WATCH_VERSION` 1.24 → 1.25 · 버전 이력에 M0-1127-I 추가

### REQ 1 grep (호출부 1곳)

```
scripts/ci-watch.mjs:1570  const allJson = readAllJson();
```

### REQ 2 같은 종류 구멍 점검

`status-wt` 를 가리키는 다른 폴백 없는 경로 **없음**. `mem-log.ndjson` 은 hub-runner v8.3.x 가 쓰기만 하고 ci-watch / scripts/watch/ / scripts/lib/ 에서는 읽지 않음 (`grep -rn "mem-log" scripts/ci-watch.mjs scripts/watch/ scripts/lib/` = 버전 이력 comment 1건뿐).

## 테스트

### 신규 (REQ 3) — `scripts/test/ci-watch-w125.test.mjs`

- `F125-ci-watch-legacy-only`: 새 위치 없음 + 옛 위치만 → `readAllJson()` 가 null 아님 · `runner='v8.2.0'` · 허브 `m0.current='M0-1127-I'` · `_source='repo'`
- `F125-verify-no-fallback` (검증의 검증): 폴백 제거 시 null → 머리 `runner ?` 유발을 명시적으로 로그
- `F125-render-head`: `renderLayout()` 결과 머리줄에 `runner v8.2.0` 포함 · `runner ?` 미포함 검증

`node --test scripts/test/ci-watch-w125.test.mjs` = **3 pass / 0 fail**.

### 전체

`node --test scripts/test/*.test.mjs` = **552 pass / 0 fail · 0 skip · duration 20.7s**.

## REQ 4 — Mac `--once` 결과 (ANSI strip)

`--once` 는 import 스모크 테스트 (`[ci-watch:once] imports ok`). 실제 렌더는 짧게 켰다 끈 결과 (처음 22줄):

```
ci-watch v1.25 (20261127)  11/27/2026 14:15:00  ●진행 74  ■주의 2  ✔오늘 328  runner v8.3.2  heartbeat 9분전    ⚠ 최
─ 허브 큐 (m0 1 · m1 0 · m2 0 · m3 1 · r0 1) ──────────────────────────── 평균대기─────────
  m0  —  [M0-1127-I 4분]                                                                3.5m
  m1  M1-1127-G  44분                                                                   1.4m
    └ ⠋ M1-1127-G  작업 중
  m2  M2-1127-J  20분                                                                   7s
    └ ⠋ M2-1127-J  작업 중
  m3  —  [M3-1127-I 4분]                                                                2.3m
  r0  R0-1127-K  20분  [R0-1127-L 4분]                                                  7s
    └ ⠋ R0-1127-K  작업 중
  git: ahead=0 behind=1
─ CI 큐 (SH 0 · SL 0 · FH 0 · FL 0) ────────────────────────────────────────────────────────
  풀                대기         MBP M1          iMAC M1         클라우드          평균대기
  storeport-heavy   —            OFF             쉼(11)          —                 38s
  storeport-light   —            OFF             ⠋#475·check …  —                 20s
  fork-heavy        —            OFF             쉼(80)          —                 1.9m
  fork-light        —            OFF             쉼(81)          —                 -
```

**복구 확인**:

| 칸 | 이전 (v1.24 스크린샷) | 지금 (v1.25) |
|---|---|---|
| 머리 runner | `?` | `v8.3.2` |
| 머리 heartbeat | `?` | `9분전` |
| 허브 큐 current | 전부 `—` | `M1-1127-G` · `M2-1127-J` · `R0-1127-K` |
| `git:` | `?` | `ahead=0 behind=1` |
| CI 큐 iMAC | OFF | 값 표현 (`쉼(11)` · `⠋#475·check …` · `쉼(80)` · `쉼(81)`) |

## 명세 (충돌 없음)

`specs/screens/ci-watch.md` CW-HEAD · CW-HUBQ · CW-CIQ — 스펙은 "값 표현" 을 요구. 이번 변경은 데이터원 폴백 추가 (렌더 코드는 그대로).

## 가벼운 길 (MP-017)

화면 요소 · 돈 · 서버 계약 무관 · 1 수정 + 1 신설 테스트.
