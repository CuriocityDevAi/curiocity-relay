---
round: K2-0916-A
pr: https://github.com/CuriocityDevAi/test-portal/pull/104
outcome: 착지 · CI 전량 초록 · Kyu 원문 "모았다가 자동 테스트" 규약 부트스트랩
coverage_current: 0
relay_push: 완결 (README + report)
kyu_checks: 0
df_h_count: 0
---

# K2-0916-A · 리포트 (auto-from-checks · Kyu 실기 → 자동 회귀 전환)

**허브**: K2 (테스트 체계 알바)
**브랜치**: `feat/k2-0916-a-auto-from-checks` · main `b5e8dc2` 기저 · 재병합 = 무변화 확증
**PR**: https://github.com/CuriocityDevAi/test-portal/pull/104
**CYCLE**: v1.2 § ①·②·④ (직접 실행 · § ③ 심문 skip · Kyu 지시 명료)

---

## 1. Kyu 원문 소화 요약

> **"모았다가 자동 테스트"** (Kyu K2-0916-A)

**5축 착지**:

| 요구 | 착지 |
|---|---|
| ① checks 스키마 확장 | auto (machine\|human) + assertion_id + req_id (relay README 편입) |
| ② 전환 파이프라인 | 3중 매핑 (checks.assertion_id ↔ CASE_META.id ↔ req_id) + coverage 계산 |
| ③ 기존 축적분 소급 | classify-checks 도구 · 7 파일 · 67 items 분류표 (§ 3) |
| ④ 포털 소비 계약 | /api/runs.latest_by_check_id map (K0 다음 라운드 소비) |
| ⑤ auto-from-checks.md | 규약 정본 + 사람 항목 영원히 사람 (소리·감각·디자인) |

---

## 2. 신설/갱신 파일

### 2.1 K2 신설
- `src/lib/server/runs/check-classifier.ts` — HUMAN/MACHINE 키워드 규칙 · classifyCheck() + computeCoverage()
- `tools/regression-runner/bin/classify-checks` — relay checks/*.md 소급 분류 도구 (table/JSON)
- `docs/testing/auto-from-checks.md` — 규약 정본 (전 허브 적용 · 강제화 로드맵)

### 2.2 K2 갱신
- `tools/regression-runner/bin/seed-catalog-tmp` — `--relay-root` 옵션 · coverage 필드 편입 (JSON)
- `src/lib/case-run-store.ts` — `latestRunByCaseId(db, repo, pr?)` export
- `src/routes/api/runs/+server.ts` — 응답 `latest_by_check_id: Record<check_id, {verdict,reason,at,run_id}>` 편입
- `docs/testing/runs-api.md` — latest_by_check_id 계약 문서
- `docs/SPEC.md` — § 24.14 (auto-from-checks) + § 24.15 (착지 스냅샷)
- `docs/state/k2.md` · `docs/tracking/k2.md` (K80~K83)

### 2.3 Relay README 확장 (별건 push · commit `2cff74f`)
- checks 규약 표에 `auto` · `assertion_id` · `req_id` 필드 편입 + 예시 · 강제화 로드맵

---

## 3. 소급 분류표 (K2-0916-A 시점 · classify-checks 실측)

**입력**: `~/projects/curiocity-relay/checks/**/*.md` (7 파일)

```
 hub  │ round             │ total │ machine │ human │ auto_pct │ coverage
──────┼───────────────────┼───────┼─────────┼───────┼──────────┼──────────
 k0   │ K0-0914-AU        │    12 │       8 │     4 │      0 % │    0 %
 k0   │ K0-0914-AV        │     7 │       2 │     5 │      0 % │    0 %
 k0   │ MILESTONE-1       │    13 │       7 │     6 │      0 % │    0 %
 k1   │ K1-0914-A         │    11 │       9 │     2 │      0 % │    0 %
 m0   │ M0-0909-A         │     8 │       5 │     3 │      0 % │    0 %
 m0   │ M0-0915-A         │     9 │       6 │     3 │      0 % │    0 %
 t0   │ T0-0911-B         │     7 │       1 │     6 │      0 % │    0 %
──────┼───────────────────┼───────┼─────────┼───────┼──────────┼──────────
 총   │ 7 파일            │    67 │      38 │    29 │      0 % │    0 %
```

**해석**:
- **auto_pct = 0** = 규약 이전 파일 · `auto` 필드 부재 (분류기 fallback 소비)
- **coverage = 0** = machine 항목 38 개 중 `assertion_id` 지정된 것 = 0 개
- **분류 정합**: machine/human 비율 = 57%/43% · Kyu 원문 정합 (실기 항목 절반 이상 자동화 가능)

---

## 4. 각 허브 신설 어설션 발부 목록 (다음 라운드)

**미자동화 목록** (각 허브 라운드에서 어설션 신설 대상 · 예시 첫 3개):

### K0-0914-AU (8건 machine · assertion 부재)
- "홈 맨 위에 파란 테두리 카드 '지금 내 차례'가 있다" → DOM 확증 (`.blue-card` selector)
- "카드 맨 아래 큰 파란 버튼 [실기 시작 · …]이 하나 있다" → DOM + 텍스트
- "판정 버튼 세 개(성공·실패·보류)가 크고 [실패]를 누르면 사유가 자동으로 채워진다" → DOM + input value 상태

### K1-0914-A (9건 machine · assertion 부재)
- Web Push subscribe API 응답 shape
- expo tunnel URL 캡처 shape

### M0-0915-A (6건 machine · assertion 부재)
- Medusa POS 화면 signature (config/projects.json healthCheck 편입 정합)

**후속 라운드 = 각 허브 dispatch 발부 시 이 리포트 링크** (rich detail = `bin/classify-checks --format json` 소비).

---

## 5. K0 소비 계약 (다음 K0 라운드)

**`/api/runs.latest_by_check_id`** map (K2-0916-A 편입):

```json
{
  "repo": "test-portal",
  "pr_number": 104,
  "runs": [...],
  "latest_by_check_id": {
    "aw-1-home-blue-card": { "verdict": "pass", "at": "...", "run_id": "..." }
  }
}
```

**K0 소비 (다음 라운드)**:
- 상세 화면 케이스 목록 안 "기계가 이미 확인한 N건" **실데이터** 렌더 (기존 회색 폴백 대체)
- 카드 안 자동/사람 항목 카운트 표시 (예: "기계 8 · 사람 4")

---

## 6. 자기 검증 실측

### 6.1 로컬

```
$ pnpm check
COMPLETED 1045 FILES 0 ERRORS 57 WARNINGS 1 FILES_WITH_PROBLEMS
  (경고 = 기존 K0 unused-css)

$ pnpm test
Test Files  74 passed (74) · Tests  987 passed (987)

$ pnpm build
Using @sveltejs/adapter-cloudflare · ✔ done

$ ./tools/regression-runner/bin/classify-checks --relay-root ~/projects/curiocity-relay
(위 § 3 표)

$ ./tools/regression-runner/bin/seed-catalog-tmp --repo test-portal --print-json --relay-root ~/projects/curiocity-relay | jq '.coverage'
{
  "total": 67, "machine": 38, "human": 29,
  "auto_missing": 67, "assertion_present": 0, "coverage_pct": 0
}
```

### 6.2 CI 실 실행 (PR#104)

**pull_request run #35066392918**:
- matrix-run (test-portal) = ✅ success
- matrix-run (todoboss) = ✅ success
- retires-check = ✅ success
- req-check = ✅ success (continue-on-error · 경고 정상)
- gate = ⏭ skipped (check_run 전용)
- schedule-notify = ⏭ skipped (schedule 전용)

### 6.3 착지 직전 origin/main 재병합
- `git fetch origin` → main = `b5e8dc2` (변화 없음).
- rebase 불요 · PR 그대로 MERGEABLE.

---

## 7. 파일 경계 준수 (K0/K1 침범 0)

| 소유 | 파일 | K2 편집 |
|---|---|---|
| K2 | src/lib/server/runs/check-classifier.ts | ✓ 신설 |
| K2 | tools/regression-runner/bin/{classify-checks, seed-catalog-tmp} | ✓ |
| K2 | src/routes/api/runs/+server.ts | ✓ latest_by_check_id 편입 |
| K2 | src/lib/case-run-store.ts | ✓ latestRunByCaseId export (K2-0914-A 이래 K2 스코프) |
| K2 | docs/testing/{auto-from-checks,runs-api}.md · docs/state/k2.md · docs/tracking/k2.md | ✓ |
| 공유 append | docs/SPEC.md § 24.14~24.15 | ✓ |
| **relay 규약 예외** | curiocity-relay/README.md | ✓ (별건 push commit `2cff74f` · 규약 정본이 relay README) |
| K0 | src/routes/** 페이지 · src/lib/ui/** | ✗ 침범 0 |
| K1 | tools/kyu-bridge/** · .github/workflows/kyu-gate-auto-merge.yml · src/routes/api/push/** | ✗ 침범 0 |

---

## 8. 다음 라운드 인수인계

### 8.1 K2 다음 라운드
- **auto 필드 필수화** (K2-0916-B): 오케 checks 신설 시 auto 지정 강제.
- **assertion_id 어설션 필수** (K2-0917): machine 항목 어설션 부재 = CI 경고 (retires-check 유사).
- **coverage < 70% CI fail** (K2-0918+): 강제화 정본.
- **실 schedule cron 회수** (K2-0915-B 인수): 이번 라운드 KST 자정 실 fire 이력.

### 8.2 K0 회부
- `/api/runs.latest_by_check_id` 소비 (상세 화면 실데이터 · 회색 폴백 대체)
- checks 게시 시 `auto` + `assertion_id` 편입 관행 채택 (오케 협조)

### 8.3 K1 회부 (지속)
- `PUSH_WEBHOOK_TOKEN` GitHub secret 값 편입 (K2-0915-A 인수 잔여)
- Access bypass 정책 (프로덕션 curl 확증)

### 8.4 각 허브 (N0/T0/M0) 회부
- 자기 라운드 checks 갱신 시 `auto: machine` 항목 어설션 신설 (§ 4 목록 참고)
- 자기 리포 assertions/<repo>/**.mjs 안 CASE_META.req_id 편입

---

## 9. CYCLE v1.2 준수

- **§ ②** 큐/EPIC/SPEC 대조 = ✓ (심문 skip · Kyu 지시 명료 · § ③ 안 함)
- **§ ④** Kyu 요구 즉시 실행 = ✓ (5축 전량 소화)
- **§ ⑤** 결함 처리 루프 = 불요 (CI 전량 초록)
- **DF-H count** = 0

*K2-0916-A · 착지 · 2026-09-16*
