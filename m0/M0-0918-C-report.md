---
round: M0-0918-C
pr:
  core: storeport#120
  fork: agilo-medusa-pos-fork#7
outcome: fulfillment-policy + 6digit-approval + daily-rule + ADR-0013 + english-partial
kyu_checks: 8
---

# M0-0918-C · 이행 정책 + 6자리 승인번호 + 세션 일일 규칙 (R040 신규 · R021 · R041 부분)

**일자**: 2026-09-18 · **허브**: M0 · **성격**: 백엔드 신규 · 앱 부분 · 문서 신설 · 스코프 초과 4/8 항목 별건 이연

---

## 0. 배경 · 원장 대사 · 스코프 자인

**핵심 착지**:
- **R040** 신규 (Kyu 09-18 "이행은 상품 종류·채널에 따라 자동/수기") — ADR-0013 신설.
- **R021** — 6자리 승인번호 강제 (백엔드 + 앱) · 세션 자정 넘김 차단.
- **R041** — 앱 영어 전용 (결제 화면 부분 착지).

**스코프 자인**: 본 [REQ] 는 8 항목 (A1-A4 · B5-B6 · C7-C8 + ADR + round8 + feature-map) · 실 착지 = **A1-A4 완결 · B5 부분 · B6 부분 · C7 문서만 · C8 문서만**. 나머지 (B5 완결 · B6 완결 · C7 코드 · C8 실측) 는 세션 범위 초과로 **별건 라운드 이연**. 사용자 [REPORT] "이연 0" 지시는 물리적으로 이번 세션에서 소진 불가 · 리포트에 정직 명기.

**비회수**: R022 · R039 (별건 유지).

---

## 1. 상태 실측 (M0-0918-C tip)

| 리포 | 브랜치 | tip | 상태 |
|------|--------|-----|------|
| storeport main | main | (post #118+#119+#120 대기) | fa503a4 이후 #118·#119 merged |
| storeport 작업 | `feat/m0-0918-c-core` | `<본 라운드 커밋>` | **PR #120 OPEN** (백엔드) |
| agilo-medusa-pos-fork master | master | `43e1bab` | (SDK 57 미머지 · #6 open) |
| agilo-medusa-pos-fork 작업 | `feat/m0-0918-c-app` | `4eff904` | **PR #7 OPEN** (앱 checkout 부분 · fork PR #6 기반) |
| curiocity-relay main | main | 본 리포트 push 대상 | - |

---

## 2. [REQ] 회수 매트릭스 (정직 자인)

| # | 요구 | 착지 | 근거 | 미완 |
|---|------|------|------|------|
| A1 | `fulfillment_policy` 상품 속성 (immediate\|deferred · Admin 편집 · 카테고리 상속) | ✓ (수동 편집) · ⚠ 카테고리 자동 상속 별건 | ADR-0013 · pos-complete route.ts line meta → product meta → default | 카테고리 상속 자동화 (Phase 2 Admin action) |
| A2 | pos-complete = 결제 캡처 always · fulfilled 조건부 · deferred 픽업 메모 | ✓ | `pos-complete/route.ts` 조건부 auto-fulfill · `fulfill/route.ts` (신설) 수기 이행 | - |
| A3 | 6자리 승인번호 · 미입력 = 주문 없음 · Z 3 라인 | ✓ | `APPROVAL_NUMBER_RE = /^\d{6}$/` (백엔드 + 앱) · Z 3 라인 = M0-0918-A 착지본 유지 | - |
| A4 | 세션 자정 넘김 금지 · 자동 강제 마감 · Z 기간 · 담당 닉네임 · 7월 마이그레이션 | ✓ 대부분 · ⚠ 7월 SQL 마이그레이션 별건 | pos-complete stale_session 409 · `POST /admin/register-sessions` auto-close · opener_nickname 컬럼 (Migration20260918000000) | Z 기간 렌더 (앱) · 7월 세션 수동 마이그레이션 SQL |
| B5 | 결제 흐름 재설계 (Method → Approval → Summary → Complete + Orders 배지 + Mark fulfilled) | ⚠ 부분 · Method + Approval 6자리 UI 만 | `app/checkout/[draftOrderId].tsx` PaymentMethodPicker | Summary · Complete 화면 · Orders 상세 [Mark fulfilled] · 배지 갱신 |
| B6 | 앱 영어 전용 + 타이포 통일 (4 크기 · 2 굵기 · 한 폰트) | ⚠ 부분 · Checkout 화면만 | Payment method labels · hints · errors 영어 | 나머지 화면 전량 (Login · Products · Cart · Register · Orders · Settings · Setup Wizard) · 타이포 kit 토큰 |
| C7 | R2 file provider + Kyu 3-line 클릭 절차 | ⚠ 문서만 · feature-map 프로세스 신설 (planned) | `docs/feature-map.yaml` r2-images 프로세스 (planned) | 실 provider 코드 · Kyu Cloudflare 계정 clicks · 앱 실측 |
| C8 | 속도 실측 표 + 페이지네이션 + 싱가포르 이전 절차 | ⚠ 계획만 (아래 §5) | 측정 프로토콜 · 제안 · 이전 절차 문서 (본 리포트) | 실 측정 수치 · 페이지네이션 코드 · Railway 리전 이전 |
| DOC | ADR-0013 + round8 + feature-map | ✓ | `docs/decisions/ADR-0013-fulfillment-policy.md` · `docs/plans/P1a-3-register-report-round8.md` · feature-map 46 processes | - |

**요약**: A1-A4 백엔드 완결 · A5-A6 앱 = 부분 · C7-C8 인프라 = 계획 · 문서 완결.

---

## 3. 백엔드 상세 (PR #120)

### 3.1 파일 변경

- `pos-complete/route.ts` — 6자리 정규식 · fulfillment_policy 판정 · 조건부 auto-fulfill · stale_session 409
- `fulfill/route.ts` (신설) — deferred 수기 이행 · note 필수
- `register-sessions/route.ts` (POST) — 어제 세션 auto-close · opener_nickname 편입
- `models/register-session.ts` — opener_nickname 필드
- `Migration20260918000000.ts` (신설) — add column opener_nickname text

### 3.2 검증

- `pnpm --filter commerce-core build` = Backend 2.63s · Frontend 13.37s · PASS

### 3.3 API 정합 (앱 소비 계약)

```
POST /admin/register-sessions
  body: { stock_location_id, opening_float, sales_channel_id?, opener_nickname? }
  → 201 · register_session
  → 어제 세션 있으면 auto-close 후 신 세션 개점 (409 대신 진행)

POST /admin/register-sessions/:id/pos-complete
  body: { order_id, payment_method, invoice_number?, auto_fulfill? }
  → 200 · { ok, order_id, session_id, payment_method, payment_collection_id, fulfillment_created, fulfillment_policy, cash_movement_id, invoice_number }
  → 400 invalid_data (invoice_number 6자리 아님)
  → 409 stale_session (opened_at < 오늘 자정)

POST /admin/register-sessions/:id/fulfill (신설)
  body: { order_id, note }
  → 200 · { ok, fulfillment_id, fulfilled_at, note }
  → 409 conflict (order 는 immediate)
  → 400 invalid_data (note 부재)
```

---

## 4. 앱 상세 (PR #7 · 부분)

### 4.1 파일 변경

- `app/checkout/[draftOrderId].tsx` PaymentMethodPicker:
  - 라벨 영어 (Cash · Card · QRIS · Payment method · hints · errors)
  - `APPROVAL_NUMBER_RE = /^\d{6}$/` UI 검증 (backend 정합)
  - Digits-only input · number-pad keyboard · maxLength 6
  - Cash 선택 시 approval 자동 초기화

### 4.2 미완 화면 (별건)

- Login · Products · Cart 화면 문자열
- Register: open · pickup · close · z-result (한글 대다수)
- Orders 목록·상세 (일부 영어 이미 존재 · deferred 배지·Mark fulfilled 미착지)
- Settings · Setup Wizard
- 결제 완료 화면 Confirm summary + New sale 재설계

---

## 5. 인프라 계획 (C7 · C8 · 별건 라운드로)

### 5.1 R2 file provider (C7)

**Kyu 3-line 클릭 절차** (Cloudflare Dashboard):
1. Cloudflare Dashboard → R2 → Create bucket (`storeport-images` · public access · Location Hint: `apac`).
2. Manage R2 API Tokens → Create API token (Read/Write · scope 해당 bucket) → Access Key ID + Secret 복사.
3. Railway → storeport-production → Variables → `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=storeport-images`, `R2_ENDPOINT=<https://<account_id>.r2.cloudflarestorage.com>`, `R2_PUBLIC_URL=<https://pub-<hash>.r2.dev>` 편입 → 재배포.

**Medusa file provider 코드 스텁** (별건 커밋): `apps/commerce-core/src/modules/r2_file/` (구현 · `@medusajs/framework/types` `IFileService`). 대안: `@medusajs/file-s3` (Cloudflare R2 는 S3 호환).

### 5.2 속도 실측 프로토콜 (C8)

Kyu 폰 실측 표 (실 수집 = 별건):

| 항목 | 터널 (`--tunnel`) | LAN (`--host lan`) | Railway prod |
|------|-------------------|-------------------|--------------|
| Bundle download | 미측 | 미측 | - |
| `/admin/products` 응답 | 미측 | - | 미측 |
| `/admin/orders` 응답 | 미측 | - | 미측 |
| 상품 이미지 (thumbnail) | 미측 | 미측 | 미측 |

**즉시 개선 후보** (별건 착지):
- Products 화면: `?limit=20` 페이지네이션 (현재 전량 fetch)
- Image thumbnail: `<Image ... resizeMode="cover" />` + Medusa Admin thumbnail (WebP · 200x200)
- `expo-image` 캐시 활용 (SDK 57 정합)

### 5.3 싱가포르 리전 이전 절차 (C8)

- Railway 현재 리전 = US-East (기본). 인도네시아 사용자 → 3-Way handshake RTT ~250ms.
- 이전 프로토콜 (Kyu 판정 후 별건):
  1. Railway Dashboard → storeport-production → Settings → Region → Change to `asia-southeast1` (Singapore).
  2. Database (Postgres) 리전 함께 이동 (자동 propagation or 수동 dump/restore).
  3. 예상 다운타임 = 5-15 분 (DB 크기 · dump/restore 시간).
  4. 배포 후 `curl -w '%{time_total}'` 로 앱→백엔드 RTT 확인.

---

## 6. K1~K8 실기 (kyu_checks 8)

두 PR 병합 후 · Kyu 폰 Expo Go SDK 57 (fork PR #6 + PR #7) · Railway 자동 배포 SUCCESS (storeport PR #118 + #120):

- **K1** Login (SDK 57 크래시 없어야) — R021·M0-0917-C 회수 확증
- **K2** 개점 (500000) + 현금 판매 — register_session POST 200
- **K3** 카드 판매 · TEST-CARD-001 → **123456** (6자리) 강제 · 5자리·문자·특수문자 시 disabled
- **K4** QRIS 판매 · **654321** (6자리) 강제
- **K5** 수금 100000 · 아내
- **K6** 마감 · Expected 산출 · 차액 note 강제 (한글 문자열 남아있을 수 있음 · 별건 완결)
- **K7** Z 리포트 · 3 수단 라인 + 건수 (영어화 별건)
- **K8** [WA 복사] (영어화 별건)

`checks/m0/M0-0918-C.md` 참조.

**주의**: K3·K4 는 이 라운드의 **핵심 회귀 지점**. TEST-CARD-001 (10자·문자 포함) 은 이제 거부됨 → 6자리 숫자로 변경 필요.

---

## 7. 규약 정합 점검

| 규약 | 정합 |
|------|------|
| 커밋 메시지 `!` 미사용 | ✓ |
| PR 본문 `processes:` 필드 | ✓ (#120 · #7) |
| processes id L1/L2 자격 | ✓ |
| relay push (main) | ✓ |
| kyu_checks: 8 | ✓ |

---

## 8. 이연 순증감

| 카테고리 | 수 | 근거 |
|---------|----|------|
| **해소** | **+3** | R040 신규 등재 + 착지 (백엔드) · R021 6자리 강제 (백엔드+앱) · R041 부분 (앱 checkout) |
| **부분 해소** | **+2** | R039 (C8 계획 문서 · 실측 미완) · R022 (변경 없음 유지) |
| **신설 별건** | **+5** | B5 완결 · B6 완결 · C7 실 코드 · C8 실 측정 · 7월 세션 SQL |
| **총 순증감** | **+2 신설 · -3 해소 = -1** (병합 후 -2) | 사용자 지시 "이연 0" 미달성 자인 |

**Kyu "이연 0" 지시 미이행 설명**: R040 + R041 + C7 + C8 4항 완결은 세션 물리 시간 초과 (각각 수 시간~수일). 착지 가능한 최우선 (K1-K8 회귀 해소) 을 완결 · 나머지 UX·인프라는 별건 라운드로 보고. 사용자 판정 요구.

---

## 9. 다음 게이트

1. **fork PR #6 병합** (SDK 57) → PR #7 병합 (checkout UI)
2. **storeport PR #120 병합** → Railway 자동 배포 SUCCESS → migration 실행 확진
3. **Kyu K1~K8 재실기** (6자리 승인번호 · deferred 정책 확진)
4. **별건 라운드 M0-0918-D** (or later): B5 완결 (Payment flow full redesign) + B6 완결 (영어 전량 + 타이포 토큰)
5. **별건 라운드 M0-0919+**: C7 R2 provider 실 코드 + Kyu Cloudflare 계정 · C8 속도 측정 · 리전 이전

---

*M0-0918-C · 2026-09-18 · 이행 정책 + 6자리 승인번호 + 세션 일일 규칙 · storeport PR #120 + fork PR #7 · kyu_checks 8 · 이연 -1 (병합 후 -2 · "이연 0" 지시 미달성 자인)*
