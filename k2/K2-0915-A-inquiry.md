# K2-0915-A · 심문 (§ ③ 정본)

**허브**: K2 (테스트 체계 알바 · A/C 라운드 마감 후 확장)
**브랜치**: `feat/k2-0915-a` (origin/main `8735e37` 기저 · 신 커밋 0)
**CYCLE**: v1.2 § ② 큐/EPIC/스펙 게시 + § ③ 심문 · 즉시 구현 금지

---

## § ② 큐 · EPIC · 스펙 실측

### 1. 큐
- inbox 8 · active 0 · await-kyu 1 (P2.2-0 Access · 관행 잔존).
- K2-0915-A = dispatch 밖 · Kyu 직접 발부.

### 2. EPIC-STATE Active
- **K1-0915-C (gate 통합)** · **K2-0914-A/C (테스트 체계 v1 부트스트랩·마감)** · K1-0915-A · K0-0914-AU/AV/AW/AR + 디자인 · P2 SUBMIT · K33.
- K2-0915-A = 기존 K2 정본 확장 (schedule 회수 + REQ 매핑 + flaky + required 파생).

### 3. 스펙 인용
- **SPEC § 24.3 (Gate 판정)**: "required check = 초판 kyu-gate + matrix-run(test-portal·todoboss) · **registry 확장 = 별건**" — 이번 라운드 소화 대상.
- **SPEC § 24.7 (CI 트리거)**: schedule cron `0 15 * * *` UTC · workflow_dispatch auto-cron 대체 확증 (Kyu C1 (가) 정합).
- **SPEC § 6.2** (test-checklist YAML 필수 필드 = id/device/title/pass/fail): `req:` 필드 신설 = 확장.
- **docs/testing/README.md § 3** (retires 규약): `retires-check` job pull_request 전용 · **`req-check` = "옆" 별도 job** = 신설.
- **docs/testing/shared-docs-policy.md** (K1-0915-C 초안): 공용 문서 분산 정책 · K2가 requirements-tracking "테스트" 칸 신설 시 이 정책 촉진 대상.

### 4. K2-0915-A 뿌리 (audit O7 인수)
- audit O7 (K1-0914-A F): 야간 실패 알림 부재 · K48/K49 secrets 미편입.
- K2-0914-A 착지 시점 = "야간 schedule 초록 대체 확증" (workflow_dispatch mode=auto-cron) 완결 · **실 schedule cron 회수 = 다음 라운드 (K2-0915-A)**.

---

## § ③ 심문 (블로킹 6 + 반론 2 + 역제안 2)

### (a) 확인 질문 (블로킹 · 답 필수)

#### Q-a1. schedule cron 회수 실측 = "1회" 정의

Kyu 원문 = "실 schedule cron(0 15 UTC) 회수 실측 1회". 3안:

- **(가) 대기** — 다음 KST 자정 (오늘 밤) 실제 schedule fire → gh run list 회수 → 리포트 인용. 라운드 착지 지연 (수 시간).
- **(나) 대체 실측** — workflow_dispatch mode=auto-cron 을 schedule 동치로 인정 (C 라운드 정합) + 다음 라운드에서 실 schedule 이력 회수.
- **(다) cron 임시 앞당김** — regression.yml cron 을 라운드 착지 前 5분으로 임시 조정 → 실행 확증 → 원상 복구 (2 PR).

**K2 권고: (가) 대기**. 사유: Kyu 문언 "실 schedule cron" 명시 · 대체 실측 = C 라운드 이미 완결 · 이번엔 실 fire 회수가 목표. 오늘 자정까지 대기 후 push report append.

#### Q-a2. 야간 실패 시 relay push 호출 = 인증 정본

Kyu 원문 = "야간 실패 시 relay push 알림(K1 notify 경로 호출만)". `/api/push/notify` = Bearer `PUSH_WEBHOOK_TOKEN` (K1 소유 secret). 3안:

- **(가) K1 secret 재사용** — GitHub secret `PUSH_WEBHOOK_TOKEN` 신설 (Workers secret 값과 동일) → regression.yml 안 curl. 값 = K1 이 관리.
- **(나) 신 secret 요청** — K2 전용 `REG_PUSH_TOKEN` 신설 · K1 notify 는 두 토큰 모두 accept. K1 편집 (K2 스코프 밖).
- **(다) relay 경유** — relay build-index Action 트리거만 하고 실제 알림은 relay Action 안 curl. K2 는 dispatch만.

**K2 권고: (가) K1 secret 재사용**. K1 secret 값 = 이미 존재 (2026-09-14T09:33). GitHub secret 편입 = K2 직접 실행 가능 (gh secret set). K1 편집 = 0 · 파일 경계 정합. **회신 필요**: (가) OK · 아니면 (나)/(다).

#### Q-a3. `req:` 필드 문법 (test-checklist yaml)

3안:

- **(가) 단일 값** — `req: K90` (한 케이스 = 한 요구사항)
- **(나) 배열** — `req: [K90, K91]` (한 케이스 = 여러 요구사항 · N:M 매핑)
- **(다) 옵셔널 · 없어도 됨** — req 필드 없는 케이스 = req-check 경고 대상

**K2 권고: (나) 배열 + (다) 옵셔널**. 사유: 한 실기 케이스가 여러 요구 검증 (E2E 정합) · 초기엔 옵셔널로 도입 후 강제화. **회신 필요**: (가)/(나) 택 1 · 옵셔널 정합 OK.

#### Q-a4. `req_id` in CASE_META (regression-runner 어설션)

어설션 파일 `CASE_META` 안 새 필드:

```js
export const CASE_META = {
  id: 'ao4-pr-body-checklist',
  title: '...',
  req_id: ['K95'],  // 신설 · 옵셔널
  ...
};
```

- **(가) 필수** — 신규 어설션은 req_id 필수 · 러너 pre-flight 검증 강제 (blocked verdict [REG-CONTRACT])
- **(나) 옵셔널** — 없어도 됨 · req-check 경고 대상
- **(다) 옵셔널 · 하지만 CI 표시** — 어설션 catalog print JSON 에 항상 노출 (없으면 empty array)

**K2 권고: (다) 옵셔널 + JSON 노출**. 사유: 기존 어설션 회수 부담 없음 · req-check job 이 요구·어설션 양방향 검사. **회신 필요**: 정합 OK.

#### Q-a5. `req-check` job 위치 · 트리거

- **(가) 별도 job** (retires-check "옆") · pull_request 전용 · `continue-on-error: true` (fail 아님 · GitHub UI 노란 배지)
- **(나) matrix-run step 안** · runner 자체 report 확장 (별도 job 없음)
- **(다) 별건 workflow** (`.github/workflows/req-check.yml`) — 격리

**K2 권고: (가) 별도 job**. Kyu 원문 = "retires-check 옆" 명시. `continue-on-error: true` 로 경고만 (Kyu 원문 = "차단 아님"). **회신 필요**: 정합 OK.

#### Q-a6. flaky 판정 알고리즘

같은 sha 재실행 결과 불일치 정의:

- **(가) 최소 2회 실행 · status 다름 → flaky=true** (예: 1회 pass · 2회 fail)
- **(나) status 다름 OR fail_names 다름 → flaky=true** (더 엄격)
- **(다) N회 이상 실행 · status 분포 min/max 다름** (안정 판정)

**K2 권고: (가)** · 알고리즘 = POST /api/runs 시점에 동일 (repo, sha, suite) 이전 run 조회 → status 다르면 이번 run + 이전 run 모두 flaky=true UPDATE. 응답 flaky bool 포함. **저장 = test_runs 스키마 확장** (flaky INTEGER default 0 · migration 0007). **회신 필요**: (가) OK · 별도 저장 vs 조회 시 계산?

---

### (b) 충돌 · 중복 지적

#### B1. `config/projects.json` = 공용 파일 (K0/K1 편집 이력) · K2 스키마 추가 = 파일 경계 위배

**충돌**: K2 파일 경계 (`src/lib/server/runs/**` 등) 안 `config/**` 없음. 그러나 Kyu 요구 = "projects.json에서 파생 (K0와 스키마 합의)". K1-0915-A 가 최근 v4로 편집.

**해소 (K2 권고)**: 
- K2 = 스키마 **제안**만 (docs/testing/gate-contract.md § 확장 절 · 예시 편입 · `required_checks: string[]` 필드).
- 실제 config/projects.json 편집 = K0 라운드 발부 (또는 K2 최소 편집 · commit prefix `chore(config-schema)` · 사유 명시 · shared-docs-policy 준수).
- **회신 필요**: (가) K2 직접 편집 (fix 관행 · 최소 편집) · (나) K0 발부 대기 · (다) K2 문서만 · gate.ts 는 fallback 유지.

#### B2. `docs/requirements-tracking.md` "테스트" 칸 신설 = shared-docs-policy 저촉

**충돌**: K1-0915-C shared-docs-policy 초안 = requirements-tracking 을 hub 별로 분리 대상. K2가 칸 추가 = 정본 파일 편집.

**해소 (K2 권고)**: policy 초안 = 구현 未착지. 현행 관행 = 모든 허브가 편집 계속. K2 = 6번째 칸 "테스트" 추가 (test_run_id · assertion_id · req-check 결과). 향후 shared-docs 이관 시 편입.

**회신 필요**: 정합 OK · 편집 진행 or 다른 위치 (docs/testing/traceability.md 신설)?

---

### (c) 요구사항 자체 반론

#### C1. flaky 저장 = test_runs 확장 vs 조회 시 계산

**반론**: flaky = derived state (past runs 로부터). 저장 = 이력 정합 (이전 run flaky 재계산 필요 없음) but insert 복잡 (동일 sha 이전 조회 + 조건부 UPDATE). 조회 시 계산 = insert 간단 but GET 마다 SQL 무거워짐.

**K2 권고: 저장 (Q-a6 (가) 정합)** — POST 시점 판정 후 저장. 이유: /api/gate 도 소비 예정 (flaky sha 는 red 대신 unstable 유사) · GET 매번 계산 부담. **회신 필요**: 저장 정합 or 계산?

---

### (d) 역제안 (능동 게시)

#### D1. `req-check` 경고 = PR body 코멘트 자동 게시

**제안**: req-check job 결과 (매핑 없는 케이스 목록) = PR body 코멘트 (bot) 자동 게시. Kyu 판독 부담 감소.

**K2 권고**: (가) 편입 · (나) 다음 라운드 · (다) 불필요 (GitHub Actions 로그로 충분). 이번 라운드 = (다) MVP · continue-on-error 로그만.

**회신 필요**: (가)/(나)/(다).

#### D2. flaky 감지 시 자동 dispatch 태스크 발부

**제안**: flaky=true POST 시 relay push 알림 + ops/dispatch/inbox 안 태스크 파일 자동 생성 (K37 카탈로그 유사 · dispatch v1 정합).

**K2 권고**: (다) 이번 라운드 스코프 밖 · 다음 라운드 (P4 자동화 계층 정합) · 이번엔 flaky flag만.

**회신 필요**: 정합 OK.

---

## 요약 (블로킹 6 + 반론 1 + 역제안 2)

| # | 항목 | K2 권고 | Kyu 회신 |
|---|---|---|---|
| Q-a1 | schedule cron 회수 | (가) 대기 | (가/나/다) |
| Q-a2 | relay push 인증 | (가) K1 secret 재사용 | (가/나/다) |
| Q-a3 | req: 문법 | (나) 배열 + (다) 옵셔널 | 정합 |
| Q-a4 | CASE_META.req_id | (다) 옵셔널 + JSON 노출 | 정합 |
| Q-a5 | req-check job | (가) 별도 job · continue-on-error | 정합 |
| Q-a6 | flaky 알고리즘 | (가) status 다름 = flaky | (가/나/다) |
| B1 | projects.json 편집 | (가) K2 최소 편집 (chore prefix) | (가/나/다) |
| B2 | tracking "테스트" 칸 | 추가 진행 (shared-docs 정합 후속) | 정합 (Y/N) |
| C1 | flaky 저장 vs 계산 | 저장 | 정합 |
| D1 | req-check PR 코멘트 | (다) MVP · 로그만 | (가/나/다) |
| D2 | flaky 자동 dispatch | (다) 다음 라운드 | 정합 |

**K2 대기**. Kyu 회신 회수 후 즉시 구현.

*K2-0915-A · 심문 · 2026-09-15*
