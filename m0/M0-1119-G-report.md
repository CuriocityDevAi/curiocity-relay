relay PR #7 · ci 블록 O · alerts 4종 O · 단위 테스트 5/5 · 실제 1회 실행 O(heavy queued 5 · oldest 56m)

## PR

https://github.com/CuriocityDevAi/curiocity-relay/pull/7

브랜치: `feat/M0-1119-G-ci-health`

## 작업 내역

- `scripts/lib/ci-health.mjs` 신설
  - `gh api` (execFile, 20초 타임아웃) 로 storeport queued/in_progress runs 조회
  - heavy(curiocity-mac/self-hosted) / light(ubuntu) 분류
  - alerts 4종: queue_wait(>15분) · long_job(>30분) · runner_idle(대기있고 in_progress 0, >=10분) · light_wait(>10분)
  - 실패 시 `{ error: "..." }` 반환 — throw 없음, 러너 동작 영향 없음
  - `--once` 플래그로 CLI 1회 실행 가능
- `scripts/hub-runner.mjs` 수정 (v7.5)
  - `writeHeartbeat` async 로 변경
  - heartbeat 커밋 타이밍에만 `fetchCiHealth()` 호출 → `ci` 블록 all.json 에 포함
  - 30초 폴링 루프엔 포함 없음 (API 한도 준수)
- `scripts/hub-runner-v7.5.mjs` 버전 사본
- `scripts/test/ci-health.test.mjs` 단위 테스트 5종 (node --test)

## 단위 테스트

5/5 pass (node --test scripts/test/ci-health.test.mjs)

1. 정상 — 대기 없음, 알림 없음
2. heavy 대기 60분 → queue_wait alert
3. job 50분 실행 → long_job alert
4. 대기 있지만 in_progress 0 · 20분 → runner_idle + queue_wait alert
5. API 실패 → { error } 반환, 예외 없음

## 실제 1회 실행 결과

`node scripts/lib/ci-health.mjs --once` (2026-11-19T06:13:53Z)

```json
{
  "at": "2026-11-19T06:13:53.504Z",
  "heavy": {
    "queued": 5,
    "oldest_queued_min": 56,
    "oldest_queued_pr": "#389",
    "in_progress": [
      {
        "pr": "#384",
        "job": "pos-integration",
        "step": "Run POS integration tests",
        "running_min": 6
      }
    ]
  },
  "light": {
    "queued": 0,
    "oldest_queued_min": null
  },
  "runners": {
    "heavy_online": 2,
    "heavy_busy": 1,
    "light_online": 0
  },
  "cloud_today": 0,
  "alerts": [
    {
      "type": "queue_wait",
      "detail": "oldest heavy queued 56m (#389)"
    }
  ]
}
```

## 러너 재설치 명령 (Kyu 실행)

```
launchctl unload ~/Library/LaunchAgents/com.curiocity.hub-runner.plist && launchctl load ~/Library/LaunchAgents/com.curiocity.hub-runner.plist
```

## 착지 명령 (Kyu 최종 실행)

```
cp /tmp/M0-1119-G-report.md ~/projects/curiocity-relay/m0/ && cd ~/projects/curiocity-relay && git add m0/M0-1119-G-report.md && git commit -m "m0: M0-1119-G" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M0-1119-G done "ci health heartbeat"
```
