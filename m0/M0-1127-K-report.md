PASS · PR #69 · HEAD e1774d04f · `node --test scripts/test/*.test.mjs` 557 pass / 0 fail · 실제 머리 `ci-watch v1.26 (2026-11-27)  2026-11-27T08:03:00.230Z  ●진행 2  ■주의 0  ✔오늘 0  runner v8.3.2  heartbeat 1분전` (진행 중 섹션 제목 `(2)` · 본문 2줄)

# M0-1127-K — ci-watch 머리 진행/주의/오늘 출처 일치 보존 테스트 (v1.26)

- **PR**: https://github.com/CuriocityDevAi/curiocity-relay/pull/69
- **브랜치**: `fix/M0-1127-K-ciwatch-progress-count`
- **HEAD**: `e1774d04fdd3c368e880684bfd15c94be24cd3a6` (origin/main `fdb03b2f9` 위)
- **변경 파일**: `scripts/ci-watch.mjs` (+2 / −2 · 버전 1.26 + 이력) · `scripts/test/ci-watch-w126.test.mjs` (신규 · +200)

## 뿌리

M0-1127-I v1.25 머리 `●진행 74  ■주의 2  ✔오늘 328` — 같은 시각 CW-PROG 섹션에는 4~5줄 뿐 (허브 큐 칸 m1·m2·r0 + 대기). Kyu 11-19 원칙 "잘못된 정보 주느니 없앰".

## 조사 (REQ 1) — 각 숫자의 출처 (파일:줄)

| 머리 | 섹션 | 출처 변수 | 파일:줄 |
|---|---|---|---|
| `●진행 N` | `─ 진행 중 (N) ─` + 본문 N줄 | `pipelinePrompts.length` = `buildExtendedView().inProgress.length` | `ci-watch-render.mjs:797, 814, 990, 993` |
| `■주의 N` | `─ 주의 (N) ─` + 본문 N줄 | `allAlerts.length` = `runnerAlerts.concat(ciAlerts)` | `ci-watch-render.mjs:792, 811, 1140, 1142` |
| `✔오늘 N` | `─ 오늘 완료 N` | `todayStats['mac-heavy']+['mac-light']+['cloud']` jobs 합 | `ci-watch-render.mjs:800~808, 816, 1026` |

### 74 가 어디서 왔는가

- 옛 claim? **아님** — `pipelinePrompts` = `buildExtendedView().inProgress` 은 날짜 코드 필터 (`inRecentCodes`, 오늘+어제만) + 2시간 리뷰 창 + 20분 리포트 창을 통과한 카드만 포함.
- CI 잡 수? **아님** — `runState.heavy.inProgress` 는 머리 N 계산에 들어가지 않음 (v1.18 M0-1127-A 에서 pipelinePrompts 로 전환).
- 중복? **아님** — `byId` Map 으로 ID 당 카드 1건 보장 (`pipeline-view.mjs:66`).
- **정체**: 9단계 파이프라인 중 `queue` 아닌 모든 활성 카드 (hub · report · pr · ci_pending · ci_running · ci_result · review · merge). 2시간 내 r0 리뷰 + 20분 내 리포트 + 오늘자 hub current/claim 이 전부 누적되면 수십 건 가능.

`git diff 52002166c..HEAD -- scripts/watch/ci-watch-render.mjs scripts/watch/collect-view.mjs` = **0 줄** — v1.22 → v1.25 간 렌더/수집 로직 변경 없음. 74 는 데이터 상태 효과 (당시 활성 리뷰/리포트/PR 다수).

## REQ 2 — 셋 다 대응 섹션과 같은 출처

이미 코드가 그렇게 돼 있음. 이번에 **보존 테스트로 못박음** (코드 변경 없음).

## REQ 3 — 테스트 (`scripts/test/ci-watch-w126.test.mjs`)

| 테스트 | 요지 | 상태 |
|---|---|---|
| F126-prog-source | 4-card 픽스처 → 머리 `●진행 4` · 섹션 `(4)` · 본문 4줄 | pass |
| F126-prog-isolation | runState CI 잡 10개 넣어도 머리는 `pipelinePrompts.length=2` | pass |
| F126-alert-source | `runnerAlerts`+`ciAlerts` 가 머리·섹션 공통 출처 | pass |
| F126-today-source | `todayStats` 세 풀 jobs 합이 머리·섹션 공통 출처 (12+34+7=53) | pass |
| F126-meta-prog | **검증의 검증** — 머리를 `runState` 로 되돌리는 시뮬레이션에서 숫자 어긋남 | pass |

### 검증의 검증 실측

`ci-watch-render.mjs:798` 를 아래로 임시 회귀시킨 뒤 재실행:

```js
// 회귀 패치:
const totalInProgress = (runState?.heavy?.inProgress?.length || 0)
                      + (runState?.light?.inProgress?.length || 0);
```

결과: `pass 2 / fail 3` — prog-source · prog-isolation · meta-prog 가 명시적으로 빨강 (actual 10 vs expected 2/4). 원복 후 다시 `pass 5 / fail 0`.

### 전체 테스트

`node --test scripts/test/*.test.mjs` = **557 pass · 0 fail · 0 skip · 21.3 s** (552 baseline + 5 신규).

## REQ 4 — Mac 실제 머리 + 진행 중 섹션 줄 수

현재 저부하 상태 라이브 데이터 (`buildExtendedView` + `renderLayout` 실측):

```
HEAD: ci-watch v1.26 (2026-11-27)  2026-11-27T08:03:00.230Z  ●진행 2  ■주의 0  ✔오늘 0  runner v8.3.2  heartbeat 1분전
진행 중 제목: ─ 진행 중 (2) ─...
진행 중 본문 줄 수: 2
pipelinePrompts.length: 2
```

세 숫자 (머리 N · 섹션 N · 본문 N) 전부 2 로 일치. 2 는 현재 `M0-1127-K` (m0 hub 작업 중) + `M3-1127-K` (m3 ci_pending) 2건. v1.25 당시 74 를 재현할 수는 없음 (데이터 상태가 달라졌음) — 하지만 보존 테스트가 이후 어떤 소스 변경도 잡아냄.

## 명세 (충돌 없음)

`specs/screens/ci-watch.md`:
- CW-HEAD (15줄): "●진행 N = 진행 중인 프롬프트 수 **(CW-PROG 줄 수와 같음)**" — 기존 스펙 그대로.
- CW-PROG (19줄): "프롬프트 한 건 = 한 줄" — 기존 스펙 그대로.

이번 변경은 그 스펙의 불변식을 테스트로 못박음.

## 가벼운 길 (MP-017)

화면 요소·돈·서버 계약 무관 · **2 파일** (1 수정 + 1 신설 테스트) · 25분 상한 내 완료.
