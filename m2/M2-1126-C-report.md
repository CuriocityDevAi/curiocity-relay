# M2-1126-C 완료

**판정: COMPLETE**  
**PR**: https://github.com/CuriocityDevAi/curiocity-relay/pull/45  
**브랜치**: `feat/M2-1126-C-ci-watch-table`  
**커밋**: `548bb36b4`  

---

## 구현 요약

### 🔴 고장 수정

**1. 잔상 (§6)**
- `truncateAnsiWidth(s, maxCols)` 추가 (`text-width.mjs`) — EAW 기준 ANSI 포함 줄 절단
- `renderDiff` 개선: 각 줄 `truncateAnsiWidth`로 절단 후 렌더 → 줄바꿈 차단
- 마지막 줄 뒤 `\x1b[J` 추가 → `[claim] ...` 등 로그 잔상 화면에서 제거
- SIGWINCH 핸들러 추가: `_prevLines = []` → 창 크기 변경 시 전체 1회 재그림
- 헤더 `ci-watch` 중복 제거: `tick()`의 `titlePrefix` 외부 삽입 제거 → `renderLayout` 이 `version+heartbeat` 1회 출력

**2. 거짓 OFF (§5)**
- `buildMachineState`: `ci.data.partial === true` 또는 `repos_failed` 해당 repo → `partial: true` 플래그
- `fmtMachineCell`: `status=offline && partial=true` → `?` 회색 (`OFF` 빨강 금지)

**맥북 fork 러너 실측 (gh api)**:
```
CuriocityDevAi/agilo-medusa-pos-fork 러너 조회:
  ci-box-fork-heavy-imac: online
  ci-box-fork-light-imac: online
  curiocity-mac-fork: online
  curiocity-mac-fork-light: online
```
현재 fork 러너 모두 online. 사건 당시(10:07)는 `ci.data.partial=true` 로 stale 데이터에서 offline 오표시.

**3. 러너 로그 잔상 (§6)**: `\x1b[J` 로 처리.

### 🟡 레이아웃

**4. CI 구역 한 줄 표 (§1)**
- 열: `풀(16) | 대기(22) | MBP M1(14) | iMAC M1(14) | 클라우드(16) | 평균대기(8)`
- 열 제목 행 1회 (섹션 헤더 아래)
- 대기 칩 최대 2개 + `+N`
- 실행 칸: `⠹ID Tm` / `쉼` / `OFF` or `?`
- 단위 `s`/`m` (`fmtDuration` 함수)
- `대기avg` 접두어 제거

**5. 허브 큐 평균대기 (§4)**
- 허브 섹션 헤더에 `평균대기` 열 제목 추가
- `appendHubWait`: `대기avg2.5m` → `2.5m` (접두어 제거, s/m 단위)

---

## 자기 검증 (실행 로그 첨부)

### ① 폭 80/100/140 렌더 — 어떤 줄도 폭 초과 없음

```
✓ 폭80 — 21줄 · 모두 폭 이내
✓ 폭100 — 21줄 · 모두 폭 이내
✓ 폭140 — 21줄 · 모두 폭 이내
```

### 폭 140 실 렌더 스냅샷 (ANSI 제거)

```
ci-watch v1.8 (20261126)  2026/11/26 10:30:00  ●진행 1  ■주의 0  ✔오늘 35  runner v8.3.2  heartbeat 0분전
─ 주의 (0) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
─ 허브 큐 (m0 0 · m1 0 · m2 1 · m3 0 · r0 0) ────────────────────────────────────────────────────────────────────────────────────── 평균대기
  m0  —                                                                                                                                    -
  m1  —                                                                                                                                    -
  m2  M2-1126-C  7분  [M2-1126-D 1분]                                                                                                    18s
    └ ⠹ M2-1126-C  작업 중
  m3  —                                                                                                                                    -
  r0  —                                                                                                                                    -
  git: ahead=0 behind=0
─ CI 큐 (SH 1 · SL 0 · FH 0 · FL 0) ───────────────────────────────────────────────────────────────────────────────────────────────────────
  풀                대기                    MBP M1          iMAC M1         클라우드          평균대기
  storeport-heavy   [M2-1126-D 3m]          쉼              ⠹M2-1126-C 7m   —                 2.5m
  storeport-light   —                       쉼              쉼              —                 -
  fork-heavy        —                       쉼              쉼              —                 -
  fork-light        —                       쉼              쉼              —                 -
  오늘 처리: MBP 35건·2m · iMAC 1건·36s · 클라우드 2건·8m
─ 진행 중 (1) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  ⠹ M2-1126-C      7m
─ 오늘 완료 35 (r 갱신 · q 종료) ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  cloud 잡 오늘  2건  잔여 3
  다음 갱신 28초 | r 지금 갱신 · q 종료  --full: 전체 목록
```

### ③ partial=true fixture → OFF 대신 `?`

```
✓ partial=true → ? 표시 (OFF 금지) 확인
```

### ④ 열 정렬: 제목 x 좌표 = 값 x 좌표

```
✓ 열 정렬: MBP 제목 x=41 · 데이터 "쉼"
```

### 테스트 전체

```
node --test scripts/test/ci-watch-*.test.mjs
# tests 170
# pass 170
# fail 0
```

---

## PR 본문 확인 항목 (Kyu 실기)

> `~/.hub-runner/bin/ci-watch.mjs` 실행 — 잔상 없음 · CI 한 줄 표 · fork 가 거짓 OFF 아님

---

## 이연 순증감

없음
