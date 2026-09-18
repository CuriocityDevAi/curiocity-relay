---
round: M0-0918-G
pr:
  hotfix: storeport#123
  spike: storeport#124
  fork: agilo-medusa-pos-fork#7
outcome: r2-guard-hotfix + login-timeout-15s + core-utilization-spike + warnings-list
kyu_checks: 4
---

# M0-0918-G · R2 핫픽스 (프로덕션 크래시 루프) + Login 15s + 코어 활용 스파이크 (R039 · R021 · R042)

**일자**: 2026-09-18 · **허브**: M0 · **성격**: 핫픽스 단독 PR + 포크 UX fix + 문서 스파이크

**착지 조건 (Kyu 정본)**: Railway 배포 초록 + `/health` 200 실측 · **핫픽스 병합 후 Kyu 도장 대기**.

---

## 0. 상태 실측 (M0-0918-G tip)

| 리포 | 브랜치 | tip | 상태 |
|------|--------|-----|------|
| storeport main | main | `9832262` (M0-0918-D · R2 provider 무조건 등록 · 크래시 원인) | 이전 |
| storeport 핫픽스 | `fix/m0-0918-g-r2-guard` | `9c3bf3c` | **PR #123 OPEN** (단독 · 긴급) |
| storeport 스파이크 | `docs/m0-0918-g-core-spike` | `<sha>` | **PR #124 OPEN** (docs 대사표 + 경고 목록) |
| fork | `feat/m0-0918-c-app` | `4ff2174` | **PR #7 UPDATED** (Login timeout 15s + retry) |
| curiocity-relay main | main | 본 리포트 push 대상 | - |

---

## 1. 핫픽스 (R039 · 단독 PR #123)

### 1.1 뿌리

- Railway 프로덕션 부팅 크래시 루프: "Access key ID … required".
- 원인: M0-0918-D (`9832262`) 에서 `@medusajs/medusa/file-s3` 를 R2 env 유무와 상관없이 무조건 등록. env 미설정 시 S3 client 인스턴스 생성 실패 → 부팅 중단.

### 1.2 수정 (`apps/commerce-core/medusa-config.ts`)

- **env 4개 guard**: `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` · `R2_BUCKET` · `R2_ENDPOINT` 모두 있을 때만 `file` module 등록.
- 미설정 시 file module 자체 미등록 → Medusa 기본 file-local provider 폴백.
- 부팅 로그 1줄:
  - true: `[file] R2 provider 활성 (Cloudflare R2 · S3-compatible)`
  - false: `[file] R2 미설정 · 로컬 저장 (missing: R2_ACCESS_KEY_ID, ..., R2_ENDPOINT)`

### 1.3 검증

| 항목 | 결과 |
|------|------|
| `pnpm --filter commerce-core build` | Backend 3.12s · Frontend 14.98s · **PASS** |
| `npx tsx` (env unset) | `[file] R2 미설정 · 로컬 저장 (missing: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT)` |
| `npx tsx` (env set) | `[file] R2 provider 활성 (Cloudflare R2 · S3-compatible)` |
| `medusa start` 로컬 부팅 | 미완 (Postgres+시딩 필요 · 본 세션 밖) · 대체 근거: 위 2 실행 로그 |

### 1.4 착지 조건 (Kyu 도장 대기)

- **PR #123 병합**
- Railway 자동 배포 SUCCESS 확진 (Deployments 탭)
- `curl https://storeport-production.up.railway.app/health` = `{"ok":true, "db":{"ok":true}}`

**본 라운드 완결 판정은 이 3 지점 확진 후 (Kyu 확진 도장 필요)**.

---

## 2. 포크 Login 5s → 15s + 재시도 (R021 · PR #7 갱신)

### 2.1 뿌리

- Kyu 실측: Login 화면에서 Shop URL 검증이 5s 타임아웃 · Railway cold-start (30일 uptime 후 재부팅 등) 시 응답 3-8s 소요 → 검증 fail → "Please enter a valid Medusa shop URL" 오해.

### 2.2 수정 (`app/login.tsx`)

- `VALIDATE_TIMEOUT_MS = 15000` (5s → 15s).
- `attemptValidate` helper · 재시도 1회 (총 최대 30s).
- Shop URL 필드 아래 hint text: "Checking the server may take up to 15 seconds on the first attempt (cold start)."

### 2.3 검증

- `npx tsc --noEmit` = 0 error.
- 실 실측 = Kyu 폰 재실기 (별건 · fork PR #7 병합 후).

---

## 3. 코어 활용 검증 스파이크 (R042 · PR #124)

### 3.1 grep 확정 (3 항목)

| 질문 | grep 확정 | 판정 |
|------|----------|------|
| pos-complete 가 결제 컬렉션 생성·캡처를 하는가 vs metadata만인가? | `pos-complete/route.ts:214` `createOrderPaymentCollectionWorkflow` · `:232` `markPaymentCollectionAsPaid` · **코어 워크플로 소비** · metadata 병행 | **코어에 있음 · 원본 사용** |
| 수동 provider (pp_system_default 등) 등록? | `medusa-config.ts` 명시 등록 없음 · Medusa 기본 `pp_system_default` 자동 · `_helpers.ts:6` 주석 확진 | **코어 기본 provider 사용** · midtrans/xendit 스캐폴드만 |
| 이행 = 코어 fulfillment vs `pos_fulfilled_*` metadata? | `pos-complete/route.ts:258` · `fulfill/route.ts:91` `createOrderFulfillmentWorkflow` · **코어 소비** · `pos_fulfilled_*` = 감사 메타 | **코어 fulfillment 사용** · pos_fulfilled_* 감사만 |

### 3.2 로컬 코어 API 실 실행 로그 (미완)

- 로컬 Postgres + admin 시딩 + JWT 발행 = 본 세션 밖 (별건 · Railway 배포 후 실측 · Kyu 도장).
- 대체 근거: 위 grep 결과가 코어 소비 확진.

### 3.3 3 칸 판정 표 (도메인 7 개)

| 도메인 | 코어 · 그대로 사용 | 코어 · 우회 | 신규 필요 |
|--------|-----------------|-----------|----------|
| 결제 | payment_collection · mark-paid · pp_system_default | 없음 | 3택 UX · Midtrans/Xendit 실 provider |
| 이행 | createOrderFulfillmentWorkflow · manual provider | 없음 | fulfillment_policy 관례 · [Mark fulfilled] · 감사 메타 |
| 주문 | draftOrder.* · convertToOrder · retrieveOrder · updateOrders | 없음 | register_session_id · pos_payment_method 관례 |
| 세션 | 없음 (POS 도메인) | - | 자체 모듈 8 라우트 · narisolutions 참조 |
| 파일 | @medusajs/medusa/file + file-s3 (R2) | 없음 | env guard (M0-0918-G) |
| 인증 | admin auth · JWT · cookie | 없음 | 없음 |
| RBAC · Tenant | 없음 | - | 스캐폴드 · Phase 2 |

**우회 = zero 확진**.

### 3.4 5 순위 제안 공수·리스크

| 순위 | 제안 | 공수 | 리스크 |
|------|------|------|-------|
| 1 | 결제 provider 정식화 (Midtrans/Xendit) | 중 (2-4일) | K13 EDC 실물 대기 |
| 2 | 이행 코어화 (배송/픽업 분리) | 소 (1-2일) | pickup_slot 실체화 · 무게/주소 검증 신규 |
| 3 | 프로모션 + 재고 배지 | 소 (1-2일) | 재고 캐시 stale · timezone |
| 4 | RMA (환불/반품) | 중 (3-5일) | cash_movement(refund) 신설 · open/closed refund 정책 |
| 5 | 고객 (customer) | 중 (2-4일) | 개인정보 규약 · Soopsok 단골 스펙 |

**Kyu 정본 대사**: 5 순위 전량 **코어 소비 가능** (provider slot · 확장 지점) · 신규 필요 = UI + 세션 관례 + 감사 메타.

---

## 4. 프로덕션 경고 목록 (실행 별건)

| # | 경고 | 우선순위 |
|---|------|---------|
| 1 | Local Event Bus | 2 (Redis 추가 후) |
| 2 | fake redis instance | **1 (급함)** — Railway Add-on 필요 |
| 3 | rbac link warning | 3 (Phase 2) |
| 4 | draft-order link | 무시 |

정본: `docs/runbooks/production-warnings.md` (PR #124).

**실행 = 별도 라운드 M0-0919+**.

---

## 5. K1~K4 실기 (kyu_checks 4)

핫픽스 (#123) 병합 → Railway 배포 SUCCESS 확진 후:

- **K1** `curl https://storeport-production.up.railway.app/health` → `{"ok":true, "db":{"ok":true}}` (착지 조건)
- **K2** Railway Deployments 탭 → 최근 배포 SUCCESS (배지 초록)
- **K3** 앱 (fork PR #7 병합 후) Login → Shop URL 검증 15s 여유 · retry 1회 · hint text 표시 (cold-start 안내)
- **K4** Admin 이미지 업로드 → R2 env 미설정 상태이므로 file-local 저장 (앱에서 이미지 URL = local path)

`checks/m0/M0-0918-G.md` 참조.

---

## 6. 규약 정합 점검

| 규약 | 정합 |
|------|------|
| 커밋 메시지 `!` 미사용 | ✓ |
| PR 본문 `processes:` 필드 | ✓ (#123 · #124 · #7 comment) |
| relay push (main) | ✓ |
| kyu_checks: 4 | ✓ |
| 착지 조건 (Railway 초록 + /health 200) | ⚠ **Kyu 도장 대기** |

---

## 7. 이연 순증감

| 카테고리 | 수 | 근거 |
|---------|----|------|
| **해소** | **+3** | R039 크래시 루프 (핫픽스) + R021 Login timeout + R042 스파이크 |
| **부분 해소** | +1 | R039 실 R2 세팅 = Kyu Cloudflare 계정 대기 (별건) |
| **신설 별건** | +1 | Redis 추가 실행 (production-warnings §1 우선순위) |
| **총 순증감** | **-2** (해소 3 - 신설 1) | 병합 후 Kyu 도장 시 -3 |

---

## 8. 다음 게이트

1. **PR #123 병합** (긴급) → Railway 배포 SUCCESS + /health 200 → Kyu 도장 → M0-0918-G 완결
2. **PR #124 병합** (docs) → 대사표 · 경고 목록 정본화
3. **fork PR #6 · #7** 병합 → Kyu 폰 K1~K8 실기 재개
4. **별건 M0-0919+**: Redis 서비스 추가 (production-warnings #2) · R2 실 세팅 · Singapore 이전 · 5순위 제안 착수 판정

---

*M0-0918-G · 2026-09-18 · R2 핫픽스 + Login 15s + 코어 스파이크 · storeport PR #123 (긴급) + #124 (docs) · fork PR #7 갱신 · kyu_checks 4 · 이연 -2 (Kyu 도장 시 -3)*
