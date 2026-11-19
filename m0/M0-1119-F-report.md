PR #395 · 키 우선순위 Admin · 매장별 키 X · live 판별 O · 웹훅 토큰 변경 위치 Admin+env · 막힘 8건

# M0-1119-F — QRIS 라이브 전환 준비 점검 리포트

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/395 (branch `docs/M0-1119-F-qris-live-ready` · 머지 금지 · 사용자 승인 후 T0 가 착지)
- **브랜치**: `docs/M0-1119-F-qris-live-ready` @ 842cdbc
- **워크트리**: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1119-F-wt`
- **코드 수정**: 없음 (문서만 · `docs/runbooks/qris-live-cutover.md` 1개 파일 추가)
- **범위 이탈**: 없음

## [REQ] 응답 요약

### Q1. 키 해석 경로

- **우선순위**: Admin (`pos_settings.settings.xendit` · AES-256-GCM) 우선 → Railway env 폴백.
  - 1차: Admin DB · `encrypted_secret_key` · `iv_sk` · `tag_sk`
  - 2차: env `XENDIT_API_KEY` (구) · `XENDIT_SECRET_KEY` (신) · `XENDIT_WEBHOOK_TOKEN`
  - 복호화 실패 시 콘솔 경고 `[xendit-creds] decryption failed — re-enter required in Admin` 후 env 로 폴백
- **매장별 키**: 불가능. 전역 1쌍만 (`pos_settings` 테이블에 1 row). 매장 2곳 동일 PT 라 1쌍으로 충분.
- **test / live 판별**: 키 prefix 자동 (`xnd_development_` → test · `xnd_production_` → live · `creds.ts` `detectMode()`).
- **Simulate 버튼**: `mode !== "test"` 일 때 서버가 `403 simulate_live_forbidden` (qris-simulate route). iPad 도 응답으로 자동 숨김.
- **근거 파일**:
  - `apps/commerce-core/src/modules/payment_xendit/lib/creds.ts` `resolveXenditCreds()` · `detectMode()`
  - `apps/commerce-core/src/api/admin/pos/orders/[id]/qris-simulate/route.ts`

### Q2. 웹훅

- **URL 등록 위치**: Xendit Dashboard → Settings → Developers → Callbacks (운영자 수동). URL = `https://api.meros.id/hooks/payment/xendit`. **Payments v3 (Payment Status)** · **Unified Refunds** 두 섹션 모두 등록 필요.
- **검증 토큰 변경 위치**: Admin ("Payment integrations" → Webhook Verification Token 입력란 · `PUT /admin/pos/settings/xendit` `body.webhook_token`) 또는 Railway env `XENDIT_WEBHOOK_TOKEN`. **둘 다 가능** (env-only 아님).
- **검증 로직**: `validateWebhookToken()` 에서 양쪽 sha256 → `crypto.timingSafeEqual`. 빈 토큰은 false.
- **계정 전환 안전성**: 전환 순간 Xendit 가 쏘는 미결제 webhook 은 **구 토큰**으로 서명돼 와 `401`. 서버가 late-paid alert 로 기록 · **자동 환불 금지** (R-decision-refund-failure). 지침: 영업 종료 후 · 마지막 결제 후 15분 경과 시점에 전환.

### Q3. 정산·금액

- **최소/최대**: 코드 하드 가드 없음 (Xendit API 가 거절). QRIS 최소 1,500 IDR (대시보드 정책).
- **정수 Rp**: `Math.round(amount)` 강제 (`xendit-client.ts`).
- **만료 15분**: 기본 15분 · Admin 에서 1–60분 정수로 조정. `qris-provider.ts`.
- **수수료**: 코드가 금액에 덧붙이지 않음. Xendit 정산 시 매장 계좌에서 차감 (매장 부담).

### Q4. 승인 당일 순서표

- 문서로 제공: `docs/runbooks/qris-live-cutover.md`
- 구조: 사전 확인 → §2 당일 순서 (키 복사 → Admin 저장 → 웹훅 등록 → 1,500 IDR 실결제 → 환불) → §3 막힘 분류 표 (8건) → §4 코드 수정 없이 진행 가능 확인.
- 각 단계마다 **정상 화면** / **비정상 화면** 설명 포함.
- 요청서의 "1,000 Rp" 는 Xendit QRIS 최소(1,500 IDR) 미만으로 실결제 실패하므로 **1,500 IDR 로 상향** 권고 (사유 명시).

## 막힘 분류 (8건)

| # | 막힘 | 상태 | 조치 |
|---|---|---|---|
| 1 | Admin 저장 시 `503 configuration_error` | **코어** | Railway env `COOKIE_SECRET` 설정 확인 또는 env 경로 우회 |
| 2 | test 키인데 Simulate 버튼 안 보임 | **코어** | prefix 재확인 |
| 3 | 매장별 다른 Xendit 계정 | **신규 필요** | 이번 요건에 불필요 |
| 4 | 라이브 feature flag | **없음** | prefix 자동 판별로 충분 |
| 5 | 전환 시점 미결제 QR webhook 유실 | **코어** | late-paid alert 자동 · 수동 환불 |
| 6 | 1,000 IDR 테스트 결제 불가 | **외부** | 1,500 IDR 로 상향 |
| 7 | Payments v3 + Unified Refunds 둘 다 등록 안 함 | **외부** | 둘 다 필수 |
| 8 | Railway "Success" 배지 오독 (옛 배포) | **운영** | `railway deployment list` 로 SUCCESS 시각 실측 |

## [REPORT] 제약 준수

- ⛔ Kyu 폴더(`~/projects/*`) 금지: **준수**. 작업은 `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1119-F-wt` 에서 수행. 착지 명령만 `~/projects/curiocity-relay/` 로 cp.
- ⛔ 운영 Railway·Xendit 대시보드 조작·키 열람: **준수**. 조사는 리포 내 코드/문서만.
- 코드 수정 금지: **준수** (`docs/runbooks/qris-live-cutover.md` 1개 신규).
- /loop 금지: **준수**.
- 40분 상한: **준수** (30분 내 완료).
- 커밋 규약 `docs(runbook): …` · `processes: [infra.docs-plans]`: **준수**.
