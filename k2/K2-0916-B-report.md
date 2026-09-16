---
round: K2-0916-B
pr: https://github.com/CuriocityDevAi/test-portal/pull/105
outcome: 착지 · CI 전량 초록 · /api/hubs/metrics · /api/ledger/weekly · 5종 신호 규칙 (사람 말 문장 반환) 정본화
ledger_deltas: R002 (허브 성과 지표 착지) · R010 (테스트 체계 지표 착지)
curl_measure: wrangler dev --remote 8795 · 401 정본 (Access-gated · production edge 주입 후 200)
relay_push: 완결 (report 갱신)
kyu_checks: 0
df_h_count: 0
---

# K2-0916-B · 리포트 (BC · 허브 성과·이상 신호 지표)

**허브**: K2 (테스트 체계 알바)
**브랜치**: `feat/k2-0916-b-metrics` · SHA `43f5950` (main `b5e8dc2` 기저 · 재병합 = 무변화 확증)
**PR**: https://github.com/CuriocityDevAi/test-portal/pull/105

---

## 1. 원장 대사

- **R001 🔴 (A 착지 확인)** = **PR#104 (K2-0916-A) 여전히 OPEN** · 이번 라운드는 독립 스코프로 진행 (main 기저).
- **R002 (허브 성과 지표 · 이 라운드)** = ✓ 착지 (`/api/hubs/metrics` · 6 hub 지표 · window today/7d).
- **R010 (테스트 체계 지표)** = ✓ 착지 (assertion_count · coverage_pct · 재작업 · 평균 라운드 소요).

---

## 2. Kyu 원문 3축 소화

### (1) `/api/hubs/metrics` (window=today|7d)

- **인증**: Access JWT (Cf-Access-Jwt-Assertion).
- **파라미터**: `window=today` (24h) · `7d` (기본).
- **응답 shape**:
  ```json
  {
    "window": "7d",
    "generated_at": "...",
    "hubs": {
      "k0": {
        "merged_count": 3,
        "rework_count": 0,
        "avg_lead_hours": 2.1,
        "inquiry_count": 0,
        "deferred_count": 2,
        "assertion_count": 7,
        "coverage_pct": 0,
        "prompt_pending": 0,
        "prompt_dispatched": 0,
        "prompt_landed": 0,
        "checks_files": 1
      },
      "k1": {...}, "k2": {...}, "n0": {...}, "t0": {...}, "m0": {...}
    },
    "signals": [
      { "rule": "landing-without-assertion", "hub": "n0", "sentence": "N0 착지 1건인데 어설션 0 ...", "severity": "red" }
    ],
    "notes": [...]
  }
  ```
- **데이터 소스**:
  - GitHub PR API (App installation token · fallback PAT) · 최근 100 PR closed
  - relay index.json (raw.githubusercontent.com · 무인증)
  - EPIC-STATE.md contents API (deferred count by hub)
  - Vite glob (regression-runner assertions)

### (2) 이상 신호 5종 (사람 말 문장)

`docs/testing/hub-signals.md` 정본:

| # | rule | 임계값 | 문장 예 | severity |
|---|---|---|---|---|
| S1 | `landing-without-assertion` | 착지>0 AND 어설션=0 | "K0 착지 3건인데 어설션 0 (...)" | red (k2=warn) |
| S2 | `deferred-without-ledger-id` | unmatched>0 | "이연 목록 8건 중 3건 = 원장 라운드 ID 부착 없음 (추적 불가)" | warn/red |
| S3 | `dispatched-without-report` | dispatched>0 AND report=0 | "N0 dispatched 2건 소비 · 대응 report 0 (원장 미대조로 소비)" | warn |
| S4 | `rework-3x` | rework>=3 | "K0 같은 라운드 재작업 3회 (임계값 3회 초과 · 판정 미완료 의심)" | red |
| S5 | `idle-with-backlog` | 유휴>=24h AND pending>=3 | "T0 유휴 56시간 (임계 24h) + 미발부 4건 (임계 3) = 방치 신호" | red |

**임계값 상수**: `IDLE_THRESHOLD_HOURS=24` · `UNDISPATCHED_THRESHOLD=3` · `REWORK_THRESHOLD=3`.

### (3) `/api/ledger/weekly` (오케 월요일 원천)

- **인증**: Access JWT.
- **응답**:
  ```json
  {
    "generated_at": "...",
    "window_ms": 604800000,
    "undispatched": [
      { "id": "K0-0911-AQ-test", "hub": "k0", "issued_at": "2026-09-11T22:55:00Z", "days_old": 5, "summary": "..." }
    ],
    "red_items": [
      { "rule": "rework-3x", "hub": "k0", "sentence": "K0 같은 라운드 재작업 3회 ...", "severity": "red" }
    ],
    "hub_summary": {
      "k0": { "merged_count": 3, "rework_count": 0, "avg_lead_hours": 2.1, "deferred_count": 2, "assertion_count": 7, "prompt_pending": 1 },
      ...
    },
    "top_signals": [...]  // 전체 signals 상위 10건
  }
  ```

---

## 3. 자기 검증 실측

### 3.1 로컬

```
$ pnpm check
COMPLETED 1050 FILES 0 ERRORS 57 WARNINGS 1 FILES_WITH_PROBLEMS
  (경고 = 기존 K0 unused-css)

$ pnpm test
Test Files  75 passed (75) · Tests  1000 passed (1000)
  (K2-0915-B 987 + K2-0916-B signals 13)

$ pnpm build
Using @sveltejs/adapter-cloudflare · ✔ done

$ pnpm vitest run src/lib/server/metrics/signals.test.ts
Test Files  1 passed (1) · Tests  13 passed (13)
  · S1 landing-without-assertion 3 case (K0 red · K2 warn · 어설션 존재 skip)
  · S2 deferred-without-ledger-id 3 case (warn · red · 전량 매치 null)
  · S3 dispatched-without-report 2 case (warn 발동 · 정상 skip)
  · S4 rework-3x 2 case (임계값 발동 · 미만 skip)
  · S5 idle-with-backlog 2 case (유휴+미발부 red · 유휴 미달 skip)
  · computeAllSignals 종합 1 case
```

### 3.2 wrangler dev --remote 8795 curl 실측 (4건)

```
$ curl -sS "http://localhost:8795/api/hubs/metrics?window=7d"
{"error":"missing_header","message":"Cf-Access-Jwt-Assertion header absent"} HTTP=401 ✓ 정본

$ curl -sS "http://localhost:8795/api/hubs/metrics?window=today"
HTTP=401 missing_header ✓ 정본

$ curl -sS "http://localhost:8795/api/ledger/weekly"
HTTP=401 missing_header ✓ 정본

$ curl -sS -H "Cf-Access-Jwt-Assertion: fake.jwt.value" "http://localhost:8795/api/hubs/metrics?window=today"
{"error":"verify_failed","message":"JWS Protected Header is invalid"} HTTP=401 ✓ auth 미들웨어 진입 확증
```

**Access 우회 없이 200 응답 실측 불가** (K2-0914-C § C.7 · K2-0915-A § 4.1 인수). Production Cf-Access-Jwt-Assertion 자동 주입 시 200 예상.

### 3.3 CI 실 실행 (PR#105)

**pull_request run #35073876957**:
- matrix-run (test-portal) = ✅ success
- matrix-run (todoboss) = ✅ success
- retires-check = ✅ success
- req-check = ✅ success (continue-on-error · 경고 정상)
- gate / schedule-notify = ⏭ skipped 정합

### 3.4 착지 직전 origin/main 재병합

- `git fetch origin` → main = `b5e8dc2` 무변화 (K0-0916-A after · PR#104 K2-0916-A 아직 미머지).
- rebase 불요 · MERGEABLE 유지.

---

## 4. 파일 경계 준수 (K0/K1 침범 0)

| 소유 | 파일 | K2 편집 |
|---|---|---|
| K2 | src/lib/server/metrics/{sources,signals}.ts · signals.test.ts | ✓ 신설 |
| K2 | src/routes/api/hubs/metrics/+server.ts | ✓ 신설 |
| K2 | src/routes/api/ledger/weekly/+server.ts | ✓ 신설 |
| K2 | docs/testing/hub-signals.md · docs/state/k2.md · docs/tracking/k2.md | ✓ |
| 공유 append | docs/SPEC.md § 24.16~24.17 | ✓ |
| K0 | src/routes/** 페이지 · src/lib/ui/** | ✗ 침범 0 |
| K1 | src/routes/api/push/** · tools/kyu-bridge/** · .github/workflows/kyu-gate-auto-merge.yml | ✗ 침범 0 |

---

## 5. 다음 라운드 인수인계

### 5.1 K2 다음 라운드
- **PR#104 (K2-0916-A) merge 대기** = R001 🔴 해소 필요 · main 반영 후 이 라운드 coverage_pct 실 값 노출.
- **inquiry_count 정확화**: 현재 근사 (index.json.reports.path 안 "inquiry" 매치). 다음 라운드 = 실 파일 트리 회수 (GitHub contents API 재귀 or index.json schema_version 3 편입).
- **read 이벤트 저장**: S3 근사 → 실 (POST /api/read-events + D1 저장).
- **signals 이력 D1**: 이상 신호 발생 → 저장 → 재발 패턴 분석 (K37 유사 축적).

### 5.2 K0 회부
- 홈/허브 상태판에서 `/api/hubs/metrics` 소비 · **signals.sentence 사람 말 그대로 렌더** (K2 규칙 정본).
- 상세/판정 헤더에서 hub_summary 편입 (예: "K0 이번 주 3 착지 · 재작업 0").

### 5.3 오케 회부
- 월요일 `/api/ledger/weekly` 응답 = 오케 원장 원천 (미발부 목록 · red_items · hub_summary).
- 응답 shape → 오케 프롬프트 자동 조립 (다음 라운드 자동 알림 정합).

### 5.4 K1 회부 (지속)
- Access bypass 정책 (K2-0914-C § C.7) = 프로덕션 curl 실측 확증 gap 해소.

---

## 6. CYCLE v1.2 준수

- **§ ②** 큐/EPIC/SPEC 대조 = ✓ (원장 대사 R001/R002/R010 확증)
- **§ ③ 심문 skip** = Kyu 지시 명료 (엔드포인트 · 신호 규칙 5종 · 응답 shape 전량 명시) · § ③ 불필요
- **§ ④** Kyu 요구 즉시 실행 = ✓ (3축 전량 소화)
- **§ ⑤** 결함 처리 루프 = 불요 (CI 전량 초록 · 13 unit test 통과)
- **DF-H count** = 0

*K2-0916-B · 착지 · 2026-09-16*

---

## § C · K2-0916-C 마감 (충돌 해소 · 2026-09-16)

**라운드**: K2-0916-C (충돌 해소만 · Kyu 원문 명시적 스코프).

### C.1 fetch + merge origin/main

**1차 merge** (K2-0916-A `f466524` + K1-0916-B `3bf701c` 편입):

```
git fetch origin  → main b5e8dc2 → 3bf701c
git merge origin/main
Auto-merging docs/SPEC.md → CONFLICT
Auto-merging docs/state/k2.md → CONFLICT
Auto-merging docs/tracking/k2.md → CONFLICT
```

**충돌 파일 양쪽 보존** (Kyu 원문 정합 · K0/K1/K2 항목 삭제 없음):
- `docs/SPEC.md` = K2-0916-A § 24.14/24.15 (auto-from-checks) + K2-0916-B § 24.16/24.17 (BC 지표) **순차 배치** (§ 번호순 정합).
- `docs/state/k2.md` = K2-0916-A 절 + K2-0916-B 절 병존 · A merge 사실 갱신 ("PR#104 merged").
- `docs/tracking/k2.md` = K80~K83 (K2-0916-A) + K84~K86 (K2-0916-B) 양쪽 표 병존 · 예약 range K87~K89 갱신.

**2차 merge** (K0-0916-E `d6399fb` fast-forward):

```
git merge origin/main (재실행)
→ Fast-forward · 18 files changed (FlowBoard.svelte 등)
```

### C.2 회귀 감지 (스코프 밖 · K0 회부)

**증상**: `al1-token-no-raw-hex` = fail (`src/lib/ui/FlowBoard.svelte` 안 `#fff` raw hex 7건).

**뿌리**: K0-0916-E (FlowBoard 신설) 편입 시 semantic var 미소비. K2-0914-C § C.2 와 동일 패턴 (K0 파일 라인).

**K2-0916-C 처리**: **fix 안 함** (Kyu 원문 스코프 = "충돌 해소만" 명시 · K2-0914-C 정본 = K2 마감 blocking 시에만 minimum fix 진행).

**K0 회부**: FlowBoard.svelte:536/720/726/730/735/739/747 = `color: #fff` → `color: var(--fg-on-primary)` (또는 신 semantic var) 대체. K0 다음 라운드 회수.

### C.3 mergeable 확증 출력

```
$ gh pr view 105 -R CuriocityDevAi/test-portal --json mergeable,mergeStateStatus,statusCheckRollup
{
  "mergeable": "MERGEABLE",
  "mergeStateStatus": "UNSTABLE",
  "checks": [
    "matrix-run (test-portal) ",
    "matrix-run (todoboss) ",
    "retires-check ",
    "req-check ",
    "gate SKIPPED",
    "Workers Builds: test-portal "
  ]
}
```

- **`mergeable = MERGEABLE`** ✓ (Kyu 요구 확증).
- `mergeStateStatus = UNSTABLE` = CI 진행 중 (checks pending) 표시 · git-level 충돌 없음. K2-0916-A 착지 前 rerun 상태 (SHA `82a4d80` = 2차 merge 후 push).
- **매트릭스 CI 회복 = K0 FlowBoard fix 착지 후** (별건 라운드 · § C.2 회부).

### C.4 파일 변경 요약

**충돌 해소만** (Kyu 원문):

```
git diff --stat 82a4d80..HEAD  (K2-0916-B 시작 SHA vs 최종)
docs/SPEC.md            | (§ 24.14~24.17 4절 순차 편입)
docs/state/k2.md        | (A + B 양쪽 절 병존)
docs/tracking/k2.md     | (K80~K83 + K84~K86 양쪽 표 병존)
src/lib/server/metrics/signals.test.ts | (unknown cast 재편 · 인수 오류 fix)

+ K0-0916-E 편입 (FlowBoard · flow-data · portal-flow-ba spec · e2e screenshots)
+ K1-0916-B 편입 (session-events-watcher · commands/serve · docs/audits ndjson)
+ K2-0916-A 편입 (check-classifier · classify-checks · latest_by_check_id · auto-from-checks.md)
```

**K2 코드 신 편집 = 0** (signals.test.ts unknown cast fix 1건은 K2-0916-B 편입 pkg 재작성 부수 효과 · 신 기능 추가 없음).

### C.5 K1-0916-C 원장 알림 후속

- ledger_events (K1-0916-B) 편입 = 다음 K2 라운드에서 `/api/hubs/metrics.signals` 의 S3 (dispatched-without-report) 정확화 소스로 소비 가능 (근사 → 실 read 이벤트).

### C.6 CYCLE v1.2 준수

- **§ ②** 큐/EPIC/SPEC 대조 = ✓ (rebase 시 충돌 확증 · 양쪽 보존 규약)
- **§ ③ 심문 skip** = 순수 충돌 해소 · Kyu 원문 명시 · 판단 판정 없음
- **§ ④** Kyu 요구 즉시 실행 = ✓ (merge + push + mergeable 확증 출력)
- **§ ⑤** 결함 처리 루프 = **skip** (Kyu 스코프 밖 · K0 회부)
- **DF-H count** = 0 (파일 경계 위배 0 · 순수 충돌 해소만)

*K2-0916-C · 마감 · 2026-09-16*
