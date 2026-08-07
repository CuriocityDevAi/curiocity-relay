# K0-0807-D · kyu-bridge v0.2 relay watcher 착지 (W-오케 몸통 1단계)

**허브**: K0 · test-portal
**일자**: 2026-08-07
**상태**: **완료** (PR #58 · Kyu 실기 대기)

---

## [실기] · Kyu 검증 항목 (배포 완료 후 · 최우선)

**test-portal 배포 확인** (Cloudflare Workers Builds · 1-3 분 · CLAUDE.md § 9.5):
- SHA `929cc85` main 반영 후 실기 진입

### 실기 A · 설치 갱신 (쉬운 말 · 한 번만)

```bash
# 1. 코드 pull
cd ~/projects/test-portal
git pull origin main

# 2. kyu-bridge 재설치 (기존 config 유지 · launchd 재로드 · v0.2 코드 진입)
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge install

# 3. watcher 상태 확인
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge watch-status
# → interval · last_check_at · known_reports · rate 사용량
```

### 실기 B · "다음 허브 게시 때 맥 알림 뜨는지" 확인 (핵심)

- **다른 허브 (T0 · N0 · M0) 가 relay 에 리포트 push** 하면 60s 이내:
  1. **Kyu 맥 우상단 알림 배너** = "T0 리포트 착지 · T0-0807-J-report.md" (예)
  2. **포털 홈 헤더 🔔 배지** = 숫자 증가 · 강조 색상

### 실기 C · 포털 홈 배지 확인

- https://test.curiocity.company → 홈 로드
- 헤더 우측 **🔔 배지** 확인 (unread 있으면 강조색 + 숫자)
- 클릭 → 목록 패널 (허브 · 파일명 · 시각 · GitHub blob 링크)
- 자동 mark-read → 배지 리셋

### 실기 D · CLI 확인

```bash
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge events
# → 최근 감지 리포트 목록 (seen_at · path · sha 짧)

node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge watch-status
# → 폴링 상태 · rate 사용량 (limit_remaining · reset_at)
```

### 실기 E · 조용한 폴백

- 브라우저 localStorage 에서 토큰 제거 (or `kyu-bridge uninstall`)
- 홈 리로드 → 배지 **비표시** 확인 (UX 안 죽음)

---

## 완료 요약

### PR #58 (feat/k0-0807-d-relay-watcher · `929cc85`)

- 14 파일 · 1276+ / 7-
- pnpm check 952 파일 0 err 0 warn
- pnpm test 438 pass (신설 29)
- pnpm build ✔

### D-1 · relay watcher

- **events-store.mjs**: ~/.kyu-bridge/watch-state.json 영속 · known_reports SHA · rate 사용량 · MAX_EVENTS 50 순환 buffer
- **watcher.mjs**: GitHub API `/commits/main` + `/git/trees/{sha}?recursive=1` · **ETag/If-None-Match → 304 rate limit 무과금** · 60s 기본 interval · 30-300s clamp
- 무인증 60 req/hr + 선택 GITHUB_TOKEN (5000/hr)
- 첫 실행 = baseline (알림 없음 · 기저선 저장)
- 신규 파일 or SHA 변경 시 감지 → events queue + notifier

### D-2 · 알림 2로

**macOS 알림**:
- `notifier.mjs` = osascript display notification "허브 리포트 착지 · 파일명"
- safeString sanitize · spawn 배열 인자 (shell injection 원천 차단)

**포털 배지**:
- `GET /events` (Bearer · unread/events 목록) + `POST /events/mark-read` (배지 리셋) + `GET /watch-status`
- `src/lib/kyu-bridge-client.ts` · events() · markEventsRead() · watchStatus() · tryFetchEvents (조용한 폴백)
- `src/routes/+page.svelte` 홈 헤더 🔔 배지 · has-unread 강조 · 30s 클라 갱신 · 목록 패널

### D-3 · CLI

- `kyu-bridge events` = 최근 감지 리포트 20건 인쇄
- `kyu-bridge watch-status` = 폴링 상태 · interval · last_check · rate 사용량 · known count

### 보안 불변 (Kyu 정본)

- 감시 = **read-only fetch 만** (GET commits/trees)
- **실행 화이트리스트 (start/stop/open) 무확장** (v0.3 = 별건 Kyu 사인)
- 127.0.0.1 바인딩 · Bearer 유지

---

## 감지→알림 실측 로그 (K0 직접 재현)

### 첫 실행 (curiocity-relay 실 폴링 · baseline)

```
$ node -e '...pollOnce()' (K0 실측)
첫 실행 (baseline): {
  "changed": true,
  "status": 200,
  "detected": 3,
  "baseline": true,
  "headSha": "83008dfe0534cf641e9d67cc6cfc7e0e8f56b99b"
}
known_reports: 3 (n0/t0/k0 각 report)
notifications: 0 (baseline = 0 예상)  ← 정본 (첫 실행 무알림)
rate.remaining: 58  ← GitHub API 60/hr · 2 req 사용 (commits + tree)
```

### 2회차 (fetch mock · dummy commit 시뮬)

```
[watcher] NEW k0/K0-0807-D-report.md sha=new_D_sh
2회차 결과: {
  "changed": true,
  "status": 200,
  "detected": 1,
  "baseline": false,
  "headSha": "new_head_D"
}
알림 발화 (신규 K0-0807-D):
  k0 K0-0807-D-report.md sha=new_D_sh
state.last_head_sha: new_head_D
```

---

## 이연 순증감

**implemented (K0-0807-D)**:
- kyu-bridge v0.2 · relay watcher · 감지 · macOS 알림 · 포털 배지 · CLI 2개
- 조용한 폴백 · rate limit 방어 · baseline 정본
- SPEC v1.25 편입

**신설 이연 (별건 라운드)**:
- **kyu-bridge v0.3** (프롬프트 자동 주입 · 오케 자동 호출) — **별건 Kyu 사인 필수**
- README /events /watch-status endpoint 스펙 편입 (문서 후속)
- kyu-bridge install 시 watcher 활성 안내 (README 편입)
- Mixed content Safari/Chrome 실측 결과 SPEC 편입 (K0-0807-A 잔존)

**병합 순서**:
- PR #58 (이 라운드) = Kyu 실기 A-E 회수 후 병합
- 이전 라운드 = 병합 완료 (main HEAD 25b6763)

---

## 다음 대기 (Kyu 회신 후)

1. **실기 A-E 회수** → PR #58 검토
2. **PR #58 병합** → auto-deploy → Kyu 재설치 (`kyu-bridge install`) → watcher 활성
3. **다음 허브 리포트 게시** = macOS 알림 · 배지 자동 발화 실측
4. **후속**: kyu-bridge v0.3 (Kyu 사인 대기) or 다른 라운드

---

*K0-0807-D · 2026-08-07 · v0.2 relay watcher · W-오케 몸통 1단계 착지 · pr-test-checklist-guide 형식 준수*
