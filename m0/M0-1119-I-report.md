relay PR #7 · v7.4 기반 O · 본체 무영향(백그라운드·마감) O · 스코프·pull O · 분류 O · 기록 범위 O · suspect_done 기록만 O · 테스트 143/143

# M0-1119-I — relay PR #7 재작업 리포트

## 수행 결과

- **브랜치**: `feat/M0-1119-G-ci-health` (origin/main 으로 rebase 후 force-with-lease push).
- **PR**: https://github.com/CuriocityDevAi/curiocity-relay/pull/7 (title · body 전면 갱신, 머지는 Kyu 몫).
- **최신 commit**: `808a8ccec feat(m0): M0-1119-I v7.5 — CI 상태·기록 on v7.4 + 러너 본체 무영향`.

## 파일 지도

- 새: `scripts/hub-runner-v7.5.mjs` (v7.4 복사 + 추가-only diff — header · RUNNER_VERSION · RUNNER_SCOPE_PREFIXES · writeHeartbeat · pushHeartbeatIfDue · tick/fireCi), `scripts/lib/ci-background.mjs` (동시 1개 · 30s 마감 fire-and-forget), `scripts/lib/ci-suspect.mjs` (기록-only 판정).
- 재작성: `scripts/lib/ci-health.mjs` (job.labels+runner_name 분류 · completed-run 범위 · WIB per-job 라우팅 · storeport+fork · --paginate 제거 · cloud_cost_est_usd), `scripts/lib/ci-history.mjs` (tz 버그 수정 · 비용 상수 1곳 · "estimate" 명시).
- 갱신: `scripts/hub-runner-install.sh` (TARGET=`hub-runner-v7.5.mjs`, FALLBACK=`v7.4`) · `docs/hub-runner.md` · `scripts/test/ci-health.test.mjs` (21 tests).
- 되돌림: `scripts/hub-runner.mjs` = origin/main (옛 -p 러너 손대지 않음) · `scripts/hub-runner-v7.6.mjs` 삭제.

## CHANGES 대응

| # | 문제 | 수정 |
|---|------|-----|
| ① | 옛 `-p` 러너 수정 → 설치 시 v7.x 소실 | hub-runner.mjs 원복 · v7.5 = v7.4 + 추가-only |
| ② | status/ci 가 scope 밖 → safePull halt + non-ff push 로 허브 멈춤 | RUNNER_SCOPE_PREFIXES 에 `status/ci/` 추가 · heartbeat 커밋/diff 체크에 포함 · I-1/I-7 테스트 |
| ③ | suspect_done 자동 입력(tmux/busy/blocked/프롬프트 오탐) | 기록-only · {since,id} 만 · 15분 임계 · I-6/6b 테스트 |
| ④ | gh 직렬 호출로 heartbeat 멈춤 · 분류/범위/날짜/비용 정확성 | 백그라운드 분리(동시1·30s 마감) · job.labels+runner_name · completed-run 모든 job · wait=created→started · WIB per-job · --paginate 제거 · storeport+fork · cloud_cost_est_usd + 상수 1곳 |

## 테스트

`node --test scripts/test/*.test.mjs` → **143/143 pass** (ci-health.test.mjs 21/21 포함).

## 실기 (`node scripts/lib/ci-health.mjs --once`)

이 맥 1회 실행 결과:
- `repos_scanned`: `CuriocityDevAi/storeport` · `repos_failed`: `KyuuuLee/storeport` 404 (silent drop).
- 러너 이름 식별: `Youngkyus-MacBook-Pro-M1` → mac-heavy · `curiocity-mac-light` → mac-light (job.runner_name 기반 분류 OK).
- `runners`: heavy_online=1, heavy_busy=1, light_online=1.
- `jsonl_added=28` → `status/ci/2026-11-19.jsonl` 커밋 포함.
- `today.mac-heavy.jobs=6 · mac-light.jobs=24 · cloud.jobs=5 · cloud_cost_est_usd=\$0.008 (추정, GitHub Linux 2-core default · 무료분 미반영)`.
- Alerts: `queue_wait 78m (#389)`, `runner_idle 7 queued`.

## 머지 후 Kyu 1줄 (러너 재설치)

```
cd ~/projects/curiocity-relay && git pull && bash scripts/hub-runner-uninstall.sh && TARGET=hub-runner-v7.5.mjs FALLBACK=hub-runner-v7.4.mjs bash scripts/hub-runner-install.sh && tail -n 20 ~/.hub-runner/launchd.err.log
```

(현 세션은 launchd 조작·러너 재설치 **금지** — Kyu 1회 실행.)
