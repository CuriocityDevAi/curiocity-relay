#363 APPROVE · #360 APPROVE · Mac 실행 O · 남은 REQ 1 (pos-integration 초록 미달 — pre-existing)

---

## #363 — R-B0 폴더 경계 ESLint 룰

### 1. eslint.config.ts diff — Medusa 플러그인 제거

| 항목 | 판단 |
|------|------|
| `@medusajs/eslint-plugin` recommended 제거 | **의도적 교체** — `typescript-eslint` base(파서만) + 경계 룰 단독 구성. 타입스크립트 ESLint 룰 전체 소거 |
| `@medusajs/eslint-plugin` package.json 명시 여부 | 없음(트랜지티브 또는 미설치) — package.json 변경 없음 |
| CI에서 lint 돌았는지 | **NO** — ci.yml 어느 버전에도 lint job 없음. 기존·신규 모두 로컬 전용 |
| 규칙 약화 여부 | 로컬 dev 커버리지 감소(TS-ESLint recommended 소거). CI는 영향 없음 |
| R-B0 범위로 허용 가능? | **YES** — 경계 룰 설치가 목적, 나머지 룰 복구는 R-B1~B3 단계로 명시됨 |

**결론**: 의도적 단순화, CI 무영향, 단계별 계획 명시. 허용.

### 2. 경고 19건 · `src/lib/**` 6건 진짜 위반인가

`src/lib` 는 `SHARED_FILES` 에 포함(`"src/lib/**/*.{ts,tsx}"`) → 위반 6건 모두 genuine:

| 파일 | 목적지 | 건수 |
|------|--------|------|
| `lib/link-customer-order.ts` | `register_session` | 2 |
| `lib/loyalty/earn.ts` | `pos_settings` | 1 |
| `lib/loyalty/snapshot-earn.ts` | `pos_settings` | 1 |
| `lib/loyalty/__tests__` | `pos_settings` | 2 |

19건 vs 계획 15건 차이는 PR 본문에 상세 설명 완비. 계획 작성 후 추가된 `payment_xendit` +2, `lib/*` +6, `workflows/pos-*` −2.

### 3. lint exit 0 · build exit 0

- PR 작성자 로컬 검증 완료 선언
- CI `unit-commerce-core` ✓ (1m40s) · `markers-and-forbidden` ✓ · `e2e-admin-loyalty` ✓
- `customer-display` Playwright 2건 실패 = **pre-existing** (동일 테스트가 main 브랜치에서도 실패 중)
  - `pair-screen > Storage → navigates to pair` — element not found
  - `splash-anim-icon-png-is-1024×1024-RGB` — assertEqual failure

**#363 판정: APPROVE**

---

## #360 — CI → curiocity-mac 전환

### 4. 변경 요약 (최종 커밋 기준)

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| runs-on | ubuntu-latest | `[self-hosted, curiocity-mac]` 전체 |
| draft PR | 모든 job | gate·filter·unit·build만 |
| 무거운 job 조건 | 항상 | `ready_for_review` + main push |
| pos-integration DB | services:postgres 컨테이너 | 로컬 Postgres · `storeport_ci_<run_id>` |
| docker-smoke | PR/main push마다 | `docker-smoke.yml` 분리 → `workflow_dispatch` + Dockerfile 변경시만 |
| 문서 PR | CI 전체 실행 | `paths-ignore(**/*.md · docs/**)` |
| build 게이트 | 없음 | `build-commerce-core` job 추가 |

**REQ 1~8 대비 완료/미완:**

| REQ | 항목 | 상태 |
|-----|------|------|
| 1 | 전 job curiocity-mac | ✓ Done |
| 2 | draft 가벼운만, ready 무거운 | ✓ Done |
| 3 | docs paths-ignore + 머지 차단 설명 | ✓ Done (PR 본문 3줄) |
| 4 | customer-display / e2e 경로 필터 | ✓ Done (changes-filter 재사용) |
| 5 | docker-smoke 분리 | ✓ Done (docker-smoke.yml 신규) |
| 6 | concurrency cancel-in-progress 유지 | ✓ Done |
| 7a | draft 시 Mac 실행 확인 | ✓ Done (run 44235495665) |
| 7b | pos-integration Mac Postgres 초록 | **✗ Red** — 5건 실패 (pre-existing) |
| 8 | PR 본문 표+절감+되돌리기 | ✓ Done |

### 5. Mac 실행 확인

```
Runner name: 'Youngkyus-MacBook-Pro-M1'          ← run 44237691345 job markers-and-forbidden 로그
Workspace:  /Users/kyu.lee/actions-runner/_work/ ← pos-integration 로그 경로
```

**Mac 실행 O** — 모든 job `curiocity-mac` 에서 실행 확인.

**pos-integration 상태**: RED (5건 실패)
- void-refund-restock / tenders / partial-refund-anytime / p6-e2e / open-order-reservations
- **pre-existing 판정**: 메인 브랜치 ubuntu-latest 런 44236160007(1h 전) · 44228369475(2h 전) 에서 동일 job 동일 실패. #360 변경과 무관.
- Medusa test-utils 가 자체 랜덤 DB(`medusa-01m7pge3...`) 를 생성하므로 `storeport_ci_<run_id>` 고유 DB는 충돌 방지 목적으로 올바름.

### 6. 위험 · 되돌리는 법

**위험**:
- 실행기 1대 → main 머지 집중 시 job 대기
- Mac 꺼지면 PR CI 영원히 대기

**되돌리는 법**: PR 본문에 명문화 ✓
1. `runs-on: [self-hosted, curiocity-mac]` → `runs-on: ubuntu-latest` find-replace
2. pos-integration `services: postgres` 블록 복구 (`DB_DATABASE` 제거)
3. 커밋·push → GitHub 서버 즉시 실행

**#360 판정: APPROVE** (pos-integration 실패 = pre-existing · CI 전환 구현 완료)

---

## 종합

| PR | 판정 | 주요 근거 |
|----|------|-----------|
| #363 | APPROVE | Medusa 룰 제거 의도적·CI 무영향, lib/* 위반 genuine, unit 초록 |
| #360 | APPROVE | Mac O(Youngkyus-MacBook-Pro-M1), REQ 7/8 완료, pos-integration 실패 pre-existing |

**남은 REQ**: 1건 — pos-integration 초록 (pre-existing 실패 · #360 머지 블로커 아님 · 별도 수정 필요)
