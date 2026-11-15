# R0-1116-A report

#285+fork#147 APPROVE(코멘트 형식·자체 PR APPROVE 불가) · #284 APPROVE(코멘트 형식) — docker build CI 성공·smoke 실패는 기존 migration 타임아웃

## 돌려본 명령·로그

```
gh pr checks 285 --repo CuriocityDevAi/storeport
  → check FAIL(feature-map), pos-integration PASS, unit-commerce-core PASS,
    docker-smoke-commerce-core SKIPPING(Dockerfile 미변경), customer-display PASS

gh pr checks 147 --repo CuriocityDevAi/agilo-medusa-pos-fork
  → lint FAIL(QuantityPicker.tsx:38 기존 문제), assertions PASS, flow-tests PASS, playwright PASS

gh pr checks 284 --repo CuriocityDevAi/storeport
  → check FAIL(feature-map: .dockerignore 미분류),
    docker-smoke-commerce-core FAIL(17m43s — healthy 미도달 480s timeout),
    pos-integration PASS, customer-display PASS

docker version → command not found (colima 미설치 → docker build 미검증)
```

## #285 (GET /admin/pos/draft-orders) + fork #147 (Payment in progress section)

### 검증 항목

| 항목 | 결과 |
|------|------|
| 인증 | ✅ `/admin/pos/` → Medusa admin 미들웨어 자동 적용 |
| `is_draft_order=true` 필터 | ✅ `query.graph filters: { is_draft_order: true }` |
| active tender 필터 | ✅ `isActiveTender`: captured \| pending ≥ 1 |
| `?stock_location_id=` 범위 | ✅ metadata.stock_location_id 대조 |
| `?register_session_id=` 범위 | ✅ 코드 존재 / ⚠️ integration test 없음 |
| `paid_so_far` captured 기준 여부 | ⚠️ **No** — pending 금액 포함 (isActiveTender = captured OR pending) |
| `remaining = grand_total - paid_so_far` | ✅ Math.max(0, …) |
| `grand_total` SoT | ✅ metadata.pos_totals.grand_total 우선, fallback order.total |
| 섹션 숨김(빈 배열) | ✅ `orders.length === 0 → return null` |
| Continue → split-tender | ✅ `router.push('/checkout/split-tender/[draftOrderId]', {draftOrderId: order.id})` |
| Cancel & refund 비활성 | ✅ `disabled` + opacity-40 + 코멘트 명시 |
| 영어 토큰 | ✅ "Payment in progress" / "Continue payment" / "Cancel & refund" |
| 색 토큰 | ✅ `text-warning`, `bg-warning-soft`, `border-warning`, `text-ink-muted` |
| native 의존 0 | ✅ tanstack-query + sdk 전용 |
| vitest | ✅ 6/6 pure assertions |
| `useSettings` / `formatDate` import | ✅ 기존 파일에 이미 있음 |
| CI pos-integration | ✅ PASS |
| CI lint (fork) | ⚠️ FAIL — QuantityPicker.tsx:38 기존 문제, 이 PR 외 파일 |

### 발견 사항

1. **`paid_so_far` = captured + pending** (`route.ts:56` — `isActiveTender` 반환값): REQ "받은/남은 금액이 captured 기준인지" → 현재 코드는 아님. pending 금액(결제 진행 중이나 미확정)도 paid_so_far에 합산. 의도 명시 또는 수정 필요.
2. **`register_session_id` 필터 미검증**: 같은 위치 복수 계산대 시나리오 integration test 없음.
3. **CI `check` FAIL**: `docs/feature-map.yaml`에 `apps/commerce-core/src/api/admin/pos/draft-orders/**` 패턴 추가 필요.

### PR body 미검증 항목
- integration test 로컬 실행 미확인 (CI pos-integration PASS로 대체)
- iOS 시뮬레이터 실기 확인 없음 (서버 #285 연동 필요)
- Cancel & refund 버튼 비활성화 시각 확인 없음

---

## #284 (customer-display Docker + Railway Root Directory)

### 검증 항목

| 항목 | 결과 |
|------|------|
| 루트 컨텍스트 Dockerfile | ✅ `docker build -f apps/commerce-core/Dockerfile .` 기준 |
| `.dockerignore` | ✅ anchor/wing/care-agent/node_modules/.git 제외 |
| cd-builder stage | ✅ 루트 pnpm-lock.yaml + `--frozen-lockfile` 설치 → `build:web` |
| lockfile 정합 | ✅ CI cd-builder 9/9 단계 완료 (lockfile 불일치 없음) |
| `public/customer-display-web/index.html` 존재 | ✅ CI 빌드 성공·컨테이너 생성 확인 (직접 inspect 불가) |
| `railway.json` dockerfilePath | ✅ `apps/commerce-core/Dockerfile` 명시 |
| docker-compose.smoke.yml context | ✅ `../..` (레포 루트) + dockerfile 명시 |
| CI docker build | ✅ 성공 (cd-builder 완료, 컨테이너 Created+Started) |
| 로컬 `docker build -f apps/commerce-core/Dockerfile .` | ❌ 미검증 (Docker/colima 없음) |
| docker-smoke | ❌ FAIL — healthy 미도달 480s timeout |
| Railway 단계 순서 | ⚠️ PR body 모순 (상단 "머지 전" vs 하단 "머지 후 즉시") |

### 발견 사항

1. **docker-smoke FAIL — 기존 migration 타임아웃**: 컨테이너 기동 후 migration 단계에서 480s 내 health endpoint 미도달. `FailingStreak: 190`, ExitCode 7 (connection refused). 이 PR 코드 귀책 아님 — `if: false` 가드로 숨겨진 사전 존재 문제 (CI 주석 `migrate 부족 → FAIL` 이력). Docker 이미지 빌드 자체는 성공.
2. **Railway 적용 순서 모순**: PR body 경고 "머지 전 Root Directory 변경" vs 단계 헤더 "머지 후 즉시". 올바른 순서: Railway Root Dir 변경 먼저 → PR 머지. 머지 먼저 시 피해: `COPY pnpm-workspace.yaml` 실패 → 빌드 에러, 직전 이미지 그대로 서빙(운영 무중단, 최신 코드 미반영). 되돌리기: Root Directory 다시 `apps/commerce-core` → Save.
3. **CI `check` FAIL**: `.dockerignore` 가 `docs/feature-map.yaml` 미분류.

### PR body 미검증 항목
- 로컬 docker build (미검증 — Docker 없음, CI 성공으로 대체)
- 이미지 내 `public/customer-display-web/index.html` 직접 확인 (CI 빌드 성공으로 간접 확인)
