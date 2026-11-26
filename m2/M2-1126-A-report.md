COMPLETE — PR #43 https://github.com/CuriocityDevAi/curiocity-relay/pull/43

## M2-1126-A — ci-watch v1.6 기계 3칸 레이아웃

### 판정: COMPLETE

### PR
https://github.com/CuriocityDevAi/curiocity-relay/pull/43  
브랜치: `feat/M2-1126-A-ci-watch-machines` → `main`  
커밋: `053bc020e` (feat), `f9497c070` (fix)

---

### 구현 완료 항목 (§확정 1~7)

| 항목 | 구현 | 비고 |
|------|------|------|
| §1 CI 큐 3칸 └ 항상 표시 | ✅ | `storeport-heavy/light`, `fork-heavy/light` 4풀 × 3칸 |
| §2 기계 판별 `classifyMachine` | ✅ | `ci-box-*-imac`→iMAC, `curiocity-mac-*`/`Youngkyus-*`→MBP, 미지→`unknown`경고 |
| §3 오늘 처리 줄 | ✅ | MAC N건 avgXmin · 클라우드 N건 avgXmin $X.XX (MBP/iMAC 통합, todayStats 한계) |
| §4 허브 큐 칩 `[ID N분]` + └ 실행중만 | ✅ | rawUnclaimed에서 ageMin 추출 |
| §5 경보 인라인/맨아래 주의 | ✅ | 줄 속 → 빨강 인라인; 무소속 → 주의 구역 |
| §6 차분 갱신 · 스피너 120ms | ✅ | `renderDiff` export, `startSpinnerTimer` 120ms 독립 |
| §7 폭 < 100 클라우드 칸 생략 권장안 | ✅ | `+N클라우드` 헤더 표기, 2칸(MBP+iMAC)만 표시 |

---

### 변경 파일

- `scripts/ci-watch.mjs` — v1.5 → **v1.6**; `renderLayout`+`renderDiff`+spinnerTimer 연결; hubPending `{id,ageMin}[]` 전달
- `scripts/watch/ci-watch-render.mjs` — `classifyMachine`, `buildMachineState`, `renderLayout`, `renderDiff`, `spinnerChar` 추가 export; 기존 `renderCompact` 유지
- `scripts/test/ci-watch-machines.test.mjs` — **신규** 21개 테스트 (M-1~M-7)
- `docs/ci-watch.md` — v1.6 기계 칸 레이아웃·분류 규칙·폭 조절·버전 이력 추가

---

### 테스트 결과

```
ci-watch-machines.test.mjs  21/21 pass
ci-watch-k.test.mjs         15/15 pass
ci-watch-s.test.mjs         pass
ci-watch-t.test.mjs         pass
CI_WATCH_ONCE=1 (import smoke)  [ci-watch:once] imports ok
```

### 자기 검증 스냅샷

**폭 120 (fake: storeport-heavy MBP 실행중·fork-heavy iMAC offline)**
```
─ CI 큐 (SH 2 · SL 0 · FH 0 · FL 0) ──────────  MBP M1     iMAC M1    클라우드
  storeport-heavy [M0-1125-M 3분][M0-1125-N 13분]
    └                                           ⠹M2-1126- 5분  쉼         쉼
  storeport-light   —
    └                                           쉼           쉼           쉼
  fork-heavy        —
    └                                           쉼           OFF          쉼
  fork-light        —
    └                                           OFF          쉼           쉼
  오늘 처리: MAC 16건 avg3.3분 · 클라우드 2건 avg8분 $0.15
```

**폭 90 narrow mode (cloud 칸 생략)**
```
─ CI 큐 (SH 2 · SL 0 · FH 0 · FL 0 +2클라우드) ─────  MBP M1    iMAC M1
  storeport-heavy [M0-1125-M 3분][M0-1125-N 13분]
    └                                               ⠹M2-1126- 5분  쉼
```

**M-7 (변경 없는 줄 재갱신 없음)**: spinnerFrame 고정 시 동일 데이터 2회 렌더 → 동일 줄 수·내용 확인 ✅  
실 30초 무변경 어설션: CI 환경상 미실행 — **미검증 명시**

---

### 미지 러너 경고 (REQ 2)
fake data에 `unknown-runner-xyz` 포함 시 CI 섹션 하단에 `⚠ 미분류 러너: unknown-runner-xyz` 빨강 출력 — M-5 테스트 통과 ✅

### 이연 순증감
기존 이연: 없음 → 이 PR: 없음 (신규 기능)

---

### Kyu 실기 확인 항목 (PR 본문 동일)
- `~/.hub-runner/bin/ci-watch.sh` 화면에서 기계 3칸(MBP M1 · iMAC M1 · 클라우드)이 CI 큐 `└` 행에 보이고 아래쪽 글씨가 흔들리지 않음
- 허브 큐 칩 `[ID N분]` 형식 확인
- 폭 100 미만에서 클라우드 칸 생략 · `+N클라우드` 헤더 표기 확인
