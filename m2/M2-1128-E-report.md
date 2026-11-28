PASS — PR #81 head `84130dfa5` · ci-watch-state 갱신 2회 확인 · 스샷 4장 · main 오염 0건

## 작업 범위

M2-1128-D REQ 2·3 완료. 코드 결함(gitRefresh main 고정 override) 발견·수정 후 같은 PR 커밋.

## 커밋 목록 (feat/M2-1128-D-ci-watch-web-redesign)

| SHA | 내용 |
|---|---|
| `7df33b596` | M2-1128-D 원본: 웹 화면 개편 + ci-watch-state 스냅샷 |
| `8250a16fa` | M2-1128-E 결함 수정: CI_WATCH_GIT_BRANCH env var + install.sh --branch 플래그 |
| `84130dfa5` | M2-1128-E docs: ci-watch.md 이력 갱신 |

## 아이맥 설치

```bash
# 이미 실행됨 (2026-11-28 05:28 UTC)
bash ~/projects/curiocity-relay-web/scripts/ci-watch-web/install.sh \
  --branch feat/M2-1128-D-ci-watch-web-redesign
# 추적 브랜치: feat/M2-1128-D-ci-watch-web-redesign
# PID: 24087 (안정 가동 중)
```

**머지 후 반드시 재설치** (`--branch` 없이 실행 → main 추적 복원):
```bash
bash ~/projects/curiocity-relay-web/scripts/ci-watch-web/install.sh
```

## 스냅샷 브랜치 갱신 확인

| 회차 | UTC 시각 | SHA |
|---|---|---|
| 1회 | 05:31:55 | `e35615f` |
| 2회 | 05:33:26 (~91초 후) | `22d954d` |
| 계속 갱신 중 | 05:40 기준 최신 | `f825bae` |

- ci-watch-state 브랜치: orphan 커밋 1개 force-push ✅
- main 오염: 0건 ✅

## Playwright 스크린샷 4장

| 화면 | 경로 |
|---|---|
| 데스크톱 1280px | `screenshots/desktop-1280.png` |
| 폰 390px 첫 화면 | `screenshots/phone-390-first.png` |
| 폰 허브 상세 (m0) | `screenshots/phone-hub-detail.png` |
| 폰 타임라인 상세 | `screenshots/phone-timeline-detail.png` |

스샷 경로 기준: `/Users/kyu.lee/.hub-runner/reports/m2/M2-1128-E/screenshots/`

## /api/state 진행 N vs relay claims 대조

| 항목 | 값 | 판정 |
|---|---|---|
| pipelinePrompts 진행 N | 0 | relay-web이 M2-1128-D 브랜치 체크아웃(stale pipeline data) |
| claimStartedCount | 52 | relay-web의 M2-1128-D 브랜치 claims 디렉토리(stale · 머지 전 한계) |
| 데이터 불일치 배지 | 표시됨 | ✅ 스펙 정합 — 불일치 시 경고 표시 목적 |
| allJson 활성 허브 | m2·m3·r0 | ✅ runner-status 기반 · 정확 |
| todayTimeline | m0·m1·m2·m3·r0 | ✅ 오늘 프롬프트 타임라인 정상 |

**근본 원인**: relay-web이 M2-1128-D 브랜치를 추적하므로 최신 runner 커밋(claims·pipeline 갱신)을 받지 못함. 머지 후 install.sh(main 추적)로 재설치 시 해소.

## 코드 결함 및 수정 (M2-1128-E · 같은 PR 커밋)

**발견된 결함**: `gitRefresh`가 하드코딩된 `origin/main`으로 reset → 서비스 시작 직후 M2-1128-D 브랜치 파일(ui.js·index.html·server.mjs)을 main 버전으로 덮어씀 → PR 브랜치 코드가 실제로 실행되지 않음.

**수정 내용**:
- `server.mjs`: `const GIT_BRANCH = process.env.CI_WATCH_GIT_BRANCH || 'main'` 추가, gitRefresh가 이 브랜치를 추적
- `com.curiocity.ci-watch-web.plist`: `CI_WATCH_GIT_BRANCH` env var 플레이스홀더 추가
- `install.sh`: `--branch <name>` 플래그 추가 (plist에 CI_WATCH_GIT_BRANCH 치환)

## Kyu 실기 확인 3줄

1. **데스크톱** `http://100.82.115.70:7700` 접속 → 허브 카드 5장(현재 m2·m3·r0 스피너 활성), 타임라인에 오늘 프롬프트 막대, CI 기계 3칸(오늘 MBP 78잡·iMac 93잡) 확인
2. **폰**(Chrome 390px) → 허브 카드 `m0` 탭 → "m0 상세" 화면(경과/상한·오늘 한 일 목록) 뜨면 정상; 위 ← 뒤로 탭 → 첫 화면 복귀
3. **폰 타임라인** 탭 → "오늘 프롬프트 시간순" 목록(시각·허브·ID·소요시간·✔/진행 중) 뜨면 정상

## 머지 전 주의

- 머지 금지 (R0 → 오케 머지)
- **머지 후 반드시**: `ssh imac 'bash ~/projects/curiocity-relay-web/scripts/ci-watch-web/install.sh'` → main 추적으로 복원

---
상시 조항 ⓒ — 40분 상한 준수 · 머지 금지(R0 → 오케) · /loop 미사용 · 예약 깨우기 금지
