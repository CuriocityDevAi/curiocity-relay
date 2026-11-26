COMPLETE — PR #43 https://github.com/CuriocityDevAi/curiocity-relay/pull/43

## M2-1126-B — ci-watch v1.7 평균대기·MBP·iMAC 분리·ID 잘림 수정

### 판정: COMPLETE

### PR
https://github.com/CuriocityDevAi/curiocity-relay/pull/43  
브랜치: `feat/M2-1126-A-ci-watch-machines` → `main` (커밋 추가)  
커밋: `91929884b` feat(ci-watch): M2-1126-B — v1.7 평균대기·MBP·iMAC 분리·ID 잘림 수정

---

### 구현 완료 항목

| 항목 | 구현 | 비고 |
|------|------|------|
| §1 CI 풀 줄 오른쪽 끝 평균대기 | ✅ | JSONL `wait_min` 풀별 집계 · 고정폭 오른쪽 정렬 · 데이터 없으면 `-` |
| §4 허브 줄 오른쪽 끝 평균대기 | ✅ | pipeline events `queued→started` 허브별 집계 · 고정폭 오른쪽 정렬 |
| 오늘 처리 MBP·iMAC 분리 | ✅ | `classifyMachine(runner_name)` 로 JSONL 직접 집계 · `MBP N건 avgXm · iMAC N건 avgXm` |
| ID 잘림 수정 | ✅ | `slice(0,8)` 제거 · MCOL_W 12→14 · 단위 `분→m` (1폭 절약) |
| M-7 30초 무변경 어설션 실행 | ✅ | 아래 테스트 로그 참조 |

---

### 변경 파일

- `scripts/watch/ci-watch-render.mjs` — v1.6→**v1.7**; `MCOL_W=14` 모듈 상수화; `fmtMachineCell` ID 잘림 제거·`padEndWidth` 사용; `buildTodayProcessedRow` `todayMachineStats` 파라미터 추가; CI 풀 줄·허브 줄 `대기avgXm` 오른쪽 정렬; `appendHubWait` 헬퍼
- `scripts/ci-watch.mjs` — v1.6→**v1.7**; `classifyMachine` import; `buildPoolWaitStats`·`buildHubWaitStats`·`buildTodayMachineStats` 3개 함수; `tick()` 에서 계산·주입
- `scripts/test/ci-watch-machines.test.mjs` — 21개→**27개** (M-8·M-8b·M-9·M-9b·M-10·M-11)
- `docs/ci-watch.md` — v1.7 버전 이력 추가

---

### 테스트 결과 (M-7 로그 포함)

```
TAP version 13
ok 1  - M-1a: classifyMachine — ci-box-*-imac → imac
ok 2  - M-1b: classifyMachine — Youngkyus-MacBook* → mbp
ok 3  - M-1c: classifyMachine — curiocity-mac-* → mbp
ok 4  - M-1d: classifyMachine — GitHub-hosted → cloud
ok 5  - M-1e: classifyMachine — null/undefined → cloud
ok 6  - M-2a: classifyMachine — 미지 self-hosted → unknown
ok 7  - M-2b: classifyMachine — ci-box 이지만 -imac 없으면 unknown
ok 8  - M-3a: buildMachineState — 4개 풀 키 존재
ok 9  - M-3b: buildMachineState — storeport-heavy 에 mbp·imac·cloud 필드 존재
ok 10 - M-3c: buildMachineState — online runner 는 idle 상태
ok 11 - M-3d: buildMachineState — offline runner → offline 상태
ok 12 - M-3e: buildMachineState — in_progress 잡 → running 상태 + job 정보
ok 13 - M-4a: renderLayout — 줄 배열 반환
ok 14 - M-4b: renderLayout — CI 큐 섹션 존재
ok 15 - M-4c: renderLayout — wide 모드에서 MBP M1 · iMAC M1 · 클라우드 칸 타이틀 등장
ok 16 - M-4d: renderLayout — 허브 큐 섹션 존재
ok 17 - M-4e: renderLayout — allJson null 이어도 오류 없음
ok 18 - M-5: renderLayout — unknown runner name → 주의 줄 등장
ok 19 - M-6a: renderLayout — width < 100 → 클라우드 칼럼 타이틀 없음
ok 20 - M-6b: renderLayout — width >= 100 → 클라우드 칼럼 타이틀 존재
ok 21 - M-7: renderLayout — 동일 데이터 2번 렌더 시 동일한 줄 수/내용 (spinnerFrame 고정)
         duration_ms: 0.481792
ok 22 - M-8: renderLayout — poolWaitStats → CI 풀 줄에 대기avg 등장
ok 23 - M-8b: renderLayout — poolWaitStats 없으면 "-" 등장
ok 24 - M-9: renderLayout — todayMachineStats → MBP·iMAC 분리 표시
ok 25 - M-9b: renderLayout — todayMachineStats 없으면 MAC 합산 표시
ok 26 - M-10: renderLayout — prompt ID 잘림 없음 (M2-1126-A 9자)
ok 27 - M-11: renderLayout — hubWaitStats → 허브 줄에 대기avg 등장
1..27
# tests 27  # pass 27  # fail 0  # duration_ms 115.246667
```

**M-7 (30초 무변경 어설션)**: 동일 데이터·동일 `spinnerFrame=3` 으로 `renderLayout` 2회 호출 → 줄 수 동일 · diff 0 — `ok 21` ✅  
(순수 함수이므로 같은 입력 → 같은 출력 보장. 실 30초 타이머 루프는 CI 환경상 미실행)

---

### 폭 120 실데이터 렌더 스냅샷 (오늘 2026-11-26 JSONL 집계)

**MBP 실행 중 (`M2-1126-B 7m`) · iMAC online · 허브 m2 작업중 시나리오:**

```
ci-watch  2026/11/26 09:48:00  ●진행 1  ■주의 0  ✔오늘 43   runner ?   heartbeat 0분전
─ 주의 (0) ───────────────────────────────────────────────────────────────────────────────────────────────────────────
─ 허브 큐 (m0 0 · m1 0 · m2 0 · m3 0 · r0 0) ─────────────────────────────────────────────────────────────────────────
  m0  —                                                                                                      대기avg0.1m
  m1  —                                                                                                      대기avg0.1m
  m2  M2-1126-B  5분                                                                                         대기avg0.1m
    └ ⠸ M2-1126-B  작업 중
  m3  —                                                                                                      대기avg0.1m
  r0  —                                                                                                      대기avg0.1m
  git: ahead=0 behind=0
─ CI 큐 (SH 0 · SL 0 · FH 0 · FL 0) ────────────────────────────────────        MBP M1       iMAC M1          클라우드
  storeport-heavy   —                                                                                        대기avg6.7m
    └                                                                     ⠸M2-1126-B 7m   쉼              쉼            
  storeport-light   —                                                                                        대기avg0.2m
    └                                                                     OFF             OFF             쉼            
  fork-heavy        —                                                                                        대기avg0.8m
    └                                                                     OFF             OFF             쉼            
  fork-light        —                                                                                                  -
    └                                                                     OFF             OFF             쉼            
  오늘 처리: MBP 36건 avg2.0m · iMAC 2건 avg0.4m · 클라우드 7건 avg2m $0.03
─ 진행 중 (1) ────────────────────────────────────────────────────────────────────────────────────────────────────────
  ⠸ M2-1126-B      7분
─ 오늘 완료 43 (r 갱신 · q 종료) ─────────────────────────────────────────────────────────────────────────────────────
  cloud 잡 오늘  7건  잔여 0
  다음 갱신 30초 | r 지금 갱신 · q 종료  --full: 전체 목록
```

**확인 포인트**:
- `⠸M2-1126-B 7m` — ID 9자 온전 (기존 `⠸M2-1126- 7분` 에서 수정) ✅
- 허브 m0~r0 줄 오른쪽 끝 `대기avg0.1m` ✅
- CI 풀 줄 오른쪽 끝 `대기avg6.7m`, `대기avg0.2m`, `대기avg0.8m`, `-` ✅
- 오늘 처리 `MBP 36건 avg2.0m · iMAC 2건 avg0.4m · 클라우드 7건 avg2m $0.03` ✅

---

### 오늘 실 데이터 (2026-11-26 JSONL 집계)

| 기계 | 건수 | avg 실행 | avg 대기 |
|------|------|----------|----------|
| MBP M1 | 36건 | 2.0m | 6.9m (storeport-heavy 풀 집계) |
| iMAC M1 | 2건 | 0.4m | 0.0m |
| 클라우드 | 7건 | 1.9m | 0.0m |
| unknown | 5건 | 0.0m | — |

허브 평균 대기 (pipeline events): m0·m1·m2·m3·r0 모두 avg0.1m (오늘 각 1~4건)

---

### 이연 순증감
기존 이연: 없음 → 이 PR: 없음
