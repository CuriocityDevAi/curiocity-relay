COMPLETE · feat/M2-1124-C-ci-watch-summary · PR 미생성(코드 리뷰 대기)

## M2-1124-C — ci-watch 오늘 누적 + 마지막 완료 CI

### 판정
COMPLETE — `node --check` 통과 · 실 all.json 렌더 확인

### 변경 파일
- `scripts/ci-watch.mjs` (+110 줄): 데이터 수집 로직
- `scripts/watch/ci-watch-render.mjs` (+82 줄): 렌더 섹션 추가

### 구현 내용

**1. 오늘 누적 (WIB)**
`allJson.ci.data.today` 에서 직접 읽음. mac-heavy · mac-light · cloud(경로포함) 3행 + cloud 한도 행.
- cloud.jobs (경로 판정용 마커잡 포함) vs cloud_today (한도 카운트) 라벨 구분 표시

**2. 마지막 완료 CI**
JSONL 우선(`status/ci/<date>.jsonl`) → 없으면 `gh run list` 폴백(2분 캐시).
- 리포별 최신 완료 비마커 잡 기준
- 완료 시각(WIB HH:MM) · 몇 분 전 · ✅/❌/취소 · 워크플로명 · PR# 표시
- 15분 초과 → 노랑, 30분 초과 → 빨강

**3. 경보**
- CI 멈춤 의심: 활성 잡 있는데 마지막 완료 30분+ → ⚠ red alert
- 큐 대기 30분+: ⚠ red alert
- playwright 건너뜀: `⏭ heavy 미실행(선행 실패)` gray 안내 (경보 카운트 제외)

### 화면 출력 캡처 (실 all.json + 고정 테스트 lastCiByRepo)

```
● 정상  2026-11-24 12:03:20 WIB
───────────────────────────────────────────────────────────────────────────────────────────────────
  m0  idle
  m1  idle
  m2  M2-1124-C  11분
  m3  M3-1124-C  21분
  r0  idle
  heartbeat 11분전  v7.8 pid=75067  git: ahead=0 behind=0
───────────────────────────────────────────────────────────────────────────────────────────────────
  storeport-heavy  Youngkyus-MacBook-Pro-M1 ●BUSY  —
  storeport-light  curiocity-mac-light      ●OK    storeport:#415 check 0분
  fork-heavy       curiocity-mac-fork       ●OK    —
  fork-light       curiocity-mac-fork-light ●OK    —
───────────────────────────────────────────────────────────────────────────────────────────────────
  storeport-heavy      0건
  fork-heavy           0건
  storeport-light      0건
  fork-light           0건
───────────────────────────────────────────────────────────────────────────────────────────────────
  cloud 오늘  0/5건  총 1.9분  잔여: 5
───────────────────────────────────────────────────────────────────────────────────────────────────
  오늘 누적 (WIB)
  mac-heavy        32잡  대기0.8분  실행1.2분  성공90.6%
  mac-light         3잡  대기0.0분  실행0.3분  성공100.0%
  cloud(경로포함)  18잡  실행0.1분  성공72.2%
  cloud 한도        0/5건  $0.10  잔여 5
───────────────────────────────────────────────────────────────────────────────────────────────────
  마지막 완료 CI
  storeport   11:50 WIB  (15분 전)  ✅  feature-map-check  PR#415
  fork        11:56 WIB  (8분 전)   ✅  ci-summary
───────────────────────────────────────────────────────────────────────────────────────────────────
  경보 없음
───────────────────────────────────────────────────────────────────────────────────────────────────
  갱신 30초 | Ctrl+C 종료  --full: 전체 목록
```

### 자기 검증
- `node --check scripts/ci-watch.mjs` → OK
- `node --check scripts/watch/ci-watch-render.mjs` → OK
- 오늘 누적 표 (mac-heavy 32잡/mac-light 3잡/cloud 18잡) 정상 출력
- 마지막 완료 CI: storeport 11:50 WIB (feature-map-check PR#415) · fork 11:56 WIB (ci-summary) 정상 출력

### 브랜치
`feat/M2-1124-C-ci-watch-summary` (relay-M2-1124-C worktree)
코드 리뷰 후 PR 생성 → main 머지 대기
