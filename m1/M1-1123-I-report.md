M1-1123-I 완료 · 판정: 통과

## 커밋

| 해시 | 내용 |
|------|------|
| 19743932b | feat(watch): runner-alerts 경보 판정 모듈 · runner-panel showErrTail 옵션 · 단위 테스트 20종 |
| b908f003b | feat(ci-watch): 러너+CI 통합 감시 화면 · 러너 경보 · Mac 알림 · 미투입 감지 |
| 4822ae707 | docs(hub-runner): 감시 화면 절 추가 (띄우는 명령 · 빨간 줄 뜻 · 알림) |

## 실행 화면 캡처 (텍스트)

```
CI·러너 감시 대시보드  2026/11/23 20:20:xx WIB
─────────────────────────────────────────────────
■ 1. 러너 칸
=== 러너 칸 ===  heartbeat 0분 전  runner=v7.7  pid=52163
  m0  idle  마지막활동=?
  m1  M1-1123-I (8분 경과)  마지막활동=?
  m2  idle  마지막활동=?
  m3  M3-1123-H (4분 경과)  마지막활동=?
  r0  idle  마지막활동=1분 전

  git: ahead=0 behind=0

  CI 러너:
    ●OK  curiocity-mac-light
    ●OK  Youngkyus-MacBook-Pro-M1
    ●BUSY  curiocity-mac-fork
─────────────────────────────────────────────────
■ 2. 러너 이상 경보
  이상 없음
─────────────────────────────────────────────────
■ 3. CI 칸
  러너 (GitHub API)
  curiocity-mac (heavy)  온라인  잡: -
  curiocity-mac-light (light)  온라인  잡: -

  대기열
  heavy (N건) / light (N건)

  클라우드 사용 (오늘)
  완료 N/5
─────────────────────────────────────────────────
■ 4. 로그 꼬리 (err_tail · 마지막 5줄)
  [hub-runner-v7.7:git 2026-11-23T13:19:31.447Z] 자동 복구 중단 · 사람/허브 파일 혼입 · files=docs/hub-runner.md
  [hub-runner-v7.7:gh-watchdog 2026-11-23T13:19:31.448Z] [gh-runner-watchdog] skip restart: data-partial
  [hub-runner-v7.7:git 2026-11-23T13:20:06.226Z] 러너 폴더 침범 감지 · files=m2/M2-1123-C-report.md
  [hub-runner-v7.7:git 2026-11-23T13:20:06.226Z] blocked: runner-folder change pending Kyu install
  [hub-runner-v7.7:gh-watchdog 2026-11-23T13:20:06.982Z] [gh-runner-watchdog] skip restart: data-partial

  갱신 30초  |  Ctrl+C 종료
```

## 단위 테스트 (runner-alerts.test.mjs)

20 passed · 0 failed — 6종 시나리오: 정상·needs_human·ahead지속·반복오류·heartbeat지연·미투입

## Kyu 실행 명령

```
node ~/projects/curiocity-relay/scripts/ci-watch.mjs
```
