---
round: M0-0918-A
pr:
  integration: storeport#118
  docs: storeport#119
outcome: pos-core-stack-integration + docs-consolidation + pr-cleanup
kyu_checks: 8
---

# M0-0918-A · POS 코어 스택 통합 + 문서 합본 + 옛 PR 정리 (R021 · R026 · R015)

**일자**: 2026-09-18 · **허브**: M0 · **성격**: 미머지 스택 rebase 통합 + 옛 PR 정리 · 코드 + 문서 합본

---

## 0. 배경 · 원장 대사

- **R021** (K1~K8 실기 · K2 개점 not found = 서버에 register_session 미배포) 회수 착지.
- **R026** (미머지 PR 병합 순서 · M0-B 계획) 회수 착지.
- **R015** (리포 CI · Railway 트리거) M0-0917-C 로 착지 · 본 라운드에서 재확인.

**선행**: PR #116 (M0-0917-C build fix + railway.json) 이 이미 병합 (`fa503a4`) → main 최신.

---

## 1. 열린 PR 정리표 (17 건 close · 2 건 new)

### 1.1 통합 (feat) 승계 후 닫음

| PR | 브랜치 | 라운드 | 종류 | 액션 |
|----|--------|--------|------|------|
| #59 | feat/m0-0729-ak-register-session-module | M0-0729-AK | 코드 (AK 백엔드) | ✓ Close · **#118 승계** |
| #68 | feat/m0-0729-an-payment-method-fallback | M0-0729-AN | 코드 (AN 폴백) | ✓ Close · **#118 승계** |
| #70 | feat/m0-0729-ao-pos-payment | M0-0729-AO | 코드 (AO pos-complete) | ✓ Close · **#118 승계** |
| #61 | docs/m0-0729-al-round2 | M0-0729-AL | 문서 | ✓ Close · **#118 승계** (docs 함께 통합) |
| #65 | docs/m0-0729-am-login-fix | M0-0729-AM | 문서 | ✓ Close · **#118 승계** |
| #69 | docs/m0-0729-an-checkout-attribution | M0-0729-AN | 문서 | ✓ Close · **#118 승계** |
| #71 | docs/m0-0729-ao-pos-payment | M0-0729-AO | 문서 | ✓ Close · **#118 승계** |

### 1.2 문서 합본 (docs) 승계 후 닫음

| PR | 브랜치 | 라운드 | 종류 | 액션 |
|----|--------|--------|------|------|
| #104 | docs/m0-0909-a-reactivation | M0-0909-A | 문서 (round6 · §9 STALE) | ✓ Close · **#119 승계** |
| #111 | docs/m0-0915-a-sdk57 | M0-0915-A | 문서 (round7 · §10 SDK 57) | ✓ Close · **#119 승계** |
| #114 | docs/m0-feature-map-l1 | M0-0917-A | 문서 (feature-map v2) | ✓ Close · **#119 승계** |

### 1.3 대체됨 (superseded · 별건)

| PR | 브랜치 | 라운드 | 종류 | 액션 |
|----|--------|--------|------|------|
| #52 | docs/m0-0729-ad-round16-ledger | M0-0729-AD | 문서 (P1a-2 round2) | ✓ Close · 대체됨 (anchor deprecated) |
| #53 | docs/m0-0729-ae-round17-ledger | M0-0729-AE | 문서 (P1a-2 round3) | ✓ Close · 대체됨 |
| #54 | docs/m0-0729-af-round18-ledger | M0-0729-AF | 문서 (P1a-2 round4) | ✓ Close · 대체됨 |
| #55 | docs/m0-0729-ag-round19-saga-closure | M0-0729-AG | 문서 (P1a-2 round5) | ✓ Close · 대체됨 |
| #56 | docs/m0-0729-ah-round20-cleanup | M0-0729-AH | 문서 (P1a-2 round6) | ✓ Close · 대체됨 |
| #57 | docs/m0-0729-ai-round21-gapmap | M0-0729-AI | 문서 (P1a-2 round7) | ✓ Close · 대체됨 |
| #58 | docs/m0-0729-aj-round22-register-report-design | M0-0729-AJ | 문서 (설계) | ✓ Close · AJ 설계는 AL~AO 로 이어짐 |
| #86 | docs/m0-0824-a-agentspay-adr | M0-0824-A | 문서 (Proposed 초안) | ✓ Close · #87 (Accepted) 이 merged 됨 |

### 1.4 남은 open PR (본 라운드 산출)

| PR | 브랜치 | 라운드 | 종류 | 상태 |
|----|--------|--------|------|------|
| **#118** | feat/m0-0918-a-pos-core-stack | **M0-0918-A** | **통합 (코드+문서)** | **OPEN · Kyu 도장 대기** |
| **#119** | docs/m0-0918-a-docs-consolidation | **M0-0918-A** | **문서 합본** | **OPEN · Kyu 도장 대기** |

### 1.5 범위 밖 (건드리지 않음)

| PR | 이유 |
|----|------|
| #37 | 범위 밖 (M0-0729-U · CLAUDE 규약) · 별건 판정 |
| #34 | 범위 밖 (CORS · env) · 별건 |
| #29, #26, #25, #24, #23 | 범위 밖 (P1a-1 초기 문서) · 별건 |

---

## 2. 통합 브랜치 (#118) 상세

### 2.1 병합 순서 · 충돌 해소

1. `git checkout -b feat/m0-0918-a-pos-core-stack` off main (`fa503a4`)
2. `git merge origin/docs/m0-0729-ao-pos-payment` — 터미널 문서 브랜치 (AK 코드 + AL/AM 문서 + AN/AO 문서 일괄)
   - **충돌 1**: `apps/commerce-core/src/scripts/seed-soopsok.ts` — M0-0917-C 정본 유지 (HEAD `listStockLocations({})`)
3. `git merge origin/feat/m0-0729-ao-pos-payment` — AO 코드 delta (pos-complete + by_payment_method)
   - **충돌 0**
4. `git merge origin/docs/m0-0729-am-login-fix` — AL round2 · AM round3 문서
   - **충돌 0**

### 2.2 통합 후 상태

- 원 PR 승계: 7건 (#59 · #61 · #65 · #68 · #69 · #70 · #71)
- 새 파일: register_session module · 8 route files · migration · P1a-3 rounds 1~5 · handoff
- 커밋 20 commits ahead of main (merge commits 3 + individual commits 17)

### 2.3 검증

| 항목 | 결과 |
|------|------|
| `pnpm install --frozen-lockfile` | Lockfile up to date · Done in 3.4s |
| `pnpm --filter commerce-core build` | Backend 3.27s · Frontend 16.78s · **PASS** |
| `pnpm -r typecheck` (commerce-core, event-contracts, care-agent) | 0 error |
| `pnpm -r typecheck` (wing) | pre-existing React 19.2 drift · main 도 동일 · 별건 |
| `pnpm -r test` | event-contracts 21/21 · commerce-core no tests · wing/care-agent no tests |

### 2.4 register_session 라우트 파일 실측 (8 종)

| 엔드포인트 | 파일 | HTTP |
|------------|------|------|
| 목록·개점 | `apps/commerce-core/src/api/admin/register-sessions/route.ts` | GET · POST |
| 세션 상세 | `.../[id]/route.ts` | GET |
| cash-movements (수금·adjustment·sale) | `.../[id]/cash-movements/route.ts` | POST |
| 마감 | `.../[id]/close/route.ts` | POST |
| **pos-complete** (원자 결제 정본) | `.../[id]/pos-complete/route.ts` | POST |
| X Report | `.../[id]/x-report/route.ts` | GET |
| Z Report | `.../[id]/z-report/route.ts` | GET |
| Z Report Text (WA 복사) | `.../[id]/z-report/text/route.ts` | GET |

`by_payment_method` 로직: `_helpers.ts:148~176` (POS metadata 우선 · payment provider fallback).

---

## 3. Railway 배포 후 curl 실측 5건 (병합 후 Kyu 도장 계획)

**전제**: PR #118 병합 → Railway 자동 배포 SUCCESS → `curl -s https://storeport-production.up.railway.app/health` = `{"ok":true, "db":{"ok":true}}`.

```bash
BASE=https://storeport-production.up.railway.app
COOKIE="Cookie: connect.sid=<Kyu 세션 쿠키>"

# 1) 개점
curl -s -X POST "$BASE/admin/register-sessions" -H "$COOKIE" -H "Content-Type: application/json" \
  -d '{"stock_location_id":"<sl>","opening_float":500000,"sales_channel_id":"<sc>"}'
# 기대: 200 · register_session {id, status:"open", opening_float:500000}

# 2) 수금
curl -s -X POST "$BASE/admin/register-sessions/<sess_id>/cash-movements" -H "$COOKIE" -H "Content-Type: application/json" \
  -d '{"type":"pickup","amount":100000,"recipient":"아내"}'
# 기대: 200 · cash_movement {type:"pickup", amount:100000, recipient:"아내"}

# 3) pos-complete (AO 정본)
curl -s -X POST "$BASE/admin/register-sessions/<sess_id>/pos-complete" -H "$COOKIE" -H "Content-Type: application/json" \
  -d '{"order_id":"<order_id>","payment_method":"card","invoice_number":"TEST-CARD-001"}'
# 기대: 200 · {ok:true, payment_method:"card", payment_collection_id, fulfillment_created:true, invoice_number:"TEST-CARD-001"}

# 4) 마감
curl -s -X POST "$BASE/admin/register-sessions/<sess_id>/close" -H "$COOKIE" -H "Content-Type: application/json" \
  -d '{"counted_cash":400000,"note":"차액 · 실사 차이"}'
# 기대: 200 · register_session {status:"closed", counted_cash, difference, note, z_snapshot}

# 5) Z Report 텍스트
curl -s "$BASE/admin/register-sessions/<sess_id>/z-report/text?store_name=Soopsok" -H "$COOKIE"
# 기대: 200 · text/plain · "Soopsok Z Report..." (현금·카드·QRIS 3 라인 + 건수)
```

**로컬 curl 실측 (별건)**: Postgres + admin 시딩 + JWT 발행이 필요해 본 세션에서는 생략. `docker compose -f apps/commerce-core/docker-compose.smoke.yml` 으로 로컬 감지 가능 (별건). 본 라운드 자기 검증은 build/typecheck/routes 파일 실측으로 대체.

**Kyu 도장 필요**: 위 5건 200 확진 후 PR #118 병합 판정.

---

## 4. 문서 합본 (#119) 상세

### 4.1 승계 3 PR

- **#104** (M0-0909-A) → `docs/plans/P1a-3-register-report-round6.md` · `requirements-tracking §9`
- **#111** (M0-0915-A) → `docs/plans/P1a-3-register-report-round7.md` · `requirements-tracking §10`
- **#114** (M0-0917-A) → `docs/feature-map.yaml` v2 (3단계) · `scripts/feature-map-check.mjs` v2 · `CLAUDE.md §10.4`

### 4.2 충돌 해소

- `external-refs/*/README.md` 4건: `git checkout --ours` (main 의 `last_rebase=2026-09-16` 유지)
- `requirements-tracking.md` §9: 양쪽 살리기 → §9 = AL/AN/AO 이월 · §10 = M0-0915-A SDK 57 (번호 이동)
- `seed-soopsok.ts`: M0-0917-C 정본 유지

### 4.3 본 라운드 delta (feature-map)

- `railway.json` (M0-0917-C 신설) 을 `infra.workspace-root` files 에 편입 → unmatched 0 유지

### 4.4 검증

```
Feature-map v2 · round=M0-0917-A · project=storeport
  L3 areas=7  L2 processes=44 (children=3)  L1 total=9
  leaf status: live=27 planned=22 deprecated=1
  scanned: 659 files → matched=659 unmatched=0 (0.0%)
```

---

## 5. K1~K8 실기 (kyu_checks 8)

fork PR #6 (SDK 57 + SVG fix) 병합 + **storeport PR #118 병합** 후 · Kyu 폰 Expo Go SDK 57 로 K1~K8 재실기.

이번 라운드의 핵심 회귀 = **K2 개점** (이전 라운드에 서버 not found 로 막혔음). PR #118 병합 후 `POST /admin/register-sessions` 활성화 → K2 개점 통과 예상.

`checks/m0/M0-0918-A.md` 참조 (본 리포트와 동일 커밋).

---

## 6. 규약 정합 점검

| 규약 | 정합 |
|------|------|
| 커밋 메시지 `!` 미사용 | ✓ (통합·문서 커밋 전량) |
| PR 본문 `processes:` 필드 | ✓ (#118 · #119) |
| `processes:` id 는 L1/L2 자격 형식 | ✓ (`<area>.<process>` or `<area>.<process>.<child>`) |
| relay push (main) | ✓ |
| kyu_checks: 8 (K1~K8) | ✓ |
| 옛 PR 닫기 1줄 코멘트 | ✓ (17건 close · 승계 표기 명시) |

---

## 7. 이연 순증감

| 카테고리 | 수 | 근거 |
|---------|----|------|
| **해소** | **+3** | R021 (K2 개점 서버 배포 착지 준비) + R026 (미머지 PR 정리 착지) + feature-map railway.json 편입 |
| **부분 해소** | **+2** | R015 (M0-0917-C railway watch 유지) · fork PR #6 SVG fix (M0-0917-C) |
| **닫음** | **17** | 옛 open PR 정리 |
| **신설 open** | **2** | #118 (통합) · #119 (문서 합본) |
| **총 순증감** | **-3** (병합 후 -5) | 본 라운드 착지 기준 |

---

## 8. 다음 게이트

1. **PR #118 병합** → Railway 자동 배포 SUCCESS → curl 5 확진 → R021·R026 완결 판정
2. **PR #119 병합** → docs 원장 최신 상태 확정
3. **Kyu 폰 K1~K8 재실기** (fork PR #6 병합 후) → K2 개점 통과 확진 → 실기 완주 판정
4. **Wing typecheck drift** (React 19.2) → 별건 fix 라운드
5. **P1a-2 series 별건** (#52-#57 close 됨) → anchor deprecated · 재개 계획 없음
6. **AgentsPay §8 16건 STALE** → 착수 금지 규약 유지 (별건 판정)

---

*M0-0918-A · 2026-09-18 · 통합 브랜치 · 문서 합본 · 17 PR close · storeport PR #118 + PR #119 · kyu_checks 8 · 이연 순증감 -3 (병합 후 -5)*
