# M0-1105-BC — QRIS(Xendit) 서버 1차: 생성 · webhook · 상태 조회 · 재발행

**owner**: Opus · claude-code
**date**: 2026-11-12
**branch**: `feat/m0-1105-bc-qris-xendit-server`
**PR**: https://github.com/CuriocityDevAi/storeport/pull/228
**CI run**: https://github.com/CuriocityDevAi/storeport/actions/runs/43193428098 · ci · **success** · 3m40s · jobs all green (markers-and-forbidden · unit-commerce-core · changes-filter · pos-integration)
**원장 대사**: decision-qris-20261112 (Kyu 16:26 "전부 추천대로") · 계획서 `storeport docs/epics/pos-qris-xendit.md` (#227) §J-c

---

## 1. Kyu 대시보드 등록 정보

### 1.1 webhook URL (운영 — **코드/문서에서 확인한 Railway 호스트 추측**)

```
https://commerce-core-production.up.railway.app/hooks/payment/xendit
```

- 근거: 계획서 §4.4 · §10 · `curl https://commerce-core-production.up.railway.app/health`
- **추측 표시**: 운영 도메인이 바뀌었을 가능성 (Railway 쪽 Project 이름 변경 등). Kyu 가 Railway Dashboard → Settings → Networking 에서 실제 호스트명 한 번 재확인 권장. 이후 Xendit Dashboard 등록.

### 1.2 등록할 이벤트 이름 (Xendit Dashboard · Settings → Developers → Callbacks)

| # | 이벤트 | 용도 |
|---|--------|------|
| 1 | **Payment Request paid** (`payment_request.paid` · 또는 신 `payment.succeeded`) | QRIS 결제 완료 → 서버가 capture + 영수증 + draft→order |
| 2 | **Payment Request expired** (`payment_request.expired` · 또는 신 `payment.expired`) | QR 만료 → 세션 상태만 갱신 (멱등) |
| 3 | **Refund succeeded** (`refund.succeeded`) | **J-d 라운드** · 이번 범위 밖 (등록은 미리 해두어도 무방 · 서버는 unknown payment_request_id 로 200 ignored) |

- 모두 **Test URL** 칸에 위 1.1 URL 입력 · Save.
- Webhook verification token → **Copy** 버튼 → Railway env 로.

### 1.3 Env 이름 (Railway Variables)

| 이름 | 역할 | 비고 |
|------|------|------|
| `XENDIT_API_KEY` | Money-In WRITE secret key | **권장** (코드 1차 참조) |
| `XENDIT_SECRET_KEY` | 동일 secret key | fallback (현재 Railway 에 투입된 이름) · 코드가 `XENDIT_API_KEY` 없으면 자동 사용 — rename 안 해도 작동 · 그래도 계획서 §10 네이밍 정합 위해 rename 권장 |
| `XENDIT_WEBHOOK_TOKEN` | Dashboard 의 webhook verification token | **신규 등록 필수**. 없으면 모든 webhook 500 (`xendit webhook token not configured`) |

보안: 이 3 값은 **코드/로그/PR/영수증/세션 데이터 어디에도 노출 없음** (whitelist + timing-safe 비교 + 에러 메시지 sanitize).

---

## 2. 구현 요약 (10 파일 · 1543 insert · 33 delete)

| 파일 | 역할 |
|------|------|
| `apps/commerce-core/src/modules/payment_xendit/lib/config.ts` | `resolveXenditCreds(posXenditSettings, env)` — `pos_settings.xendit` (M1-J-e 자리) > `XENDIT_API_KEY` > `XENDIT_SECRET_KEY` > 미설정 |
| `apps/commerce-core/src/modules/payment_xendit/lib/xendit-client.ts` | fetch 기반 `/v3/payment_requests` + 조회. 응답 whitelist (5 필드) · raw metadata/apiKey 유출 0 |
| `apps/commerce-core/src/modules/payment_xendit/lib/webhook.ts` | timing-safe 토큰 비교 · event → kind (paid/expired/failed/unknown) · dedup key |
| `apps/commerce-core/src/modules/payment_xendit/services/xendit-qris-provider.ts` | `initiatePayment` 실 호출 · 15분 만료 · reference_id 포맷 · 미설정 시 400 |
| `apps/commerce-core/src/api/hooks/payment/xendit/route.ts` | **POST /hooks/payment/xendit** — 401 (토큰) · 400 (금액) · 200 멱등 · paid → capture + 영수증 + draft→order |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/qris-status/route.ts` | **GET** · DB 우선 · pending 시 원격 보정 |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/qris-regenerate/route.ts` | **POST** · 옛 세션 EXPIRED 표기 + 새 payment_request (Kyu 결정 ②) |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` | QRIS short-circuit — initiate 뒤 authorize/capture/receipt/convert 보류 · 응답에 qr_string·expires_at·payment_request_id |
| `apps/commerce-core/src/modules/payment_xendit/__tests__/qris-xendit.unit.spec.ts` | 7 요구 시나리오 · 16 테스트 모두 PASS |
| `docs/feature-map.yaml` | payment-providers 엔트리에 webhook 경로 등록 · summary 갱신 |

### 2.1 Medusa webhook 경로 점검 결과

- Medusa v2 기본 핸들러는 `/hooks/payment/[provider]/route.js` (provider = provider_id 문자열) 로 존재하나 **x-callback-token → 401 반환 요건을 수용 못 함** (default 는 success 로 200, 실패로 400 만). 따라서 계획서 §4.3 의 커스텀 경로 `/hooks/payment/xendit` 를 그대로 신설 — provider_id 명시 생략 · Xendit Dashboard URL 간결.

---

## 3. 테스트

### 3.1 Unit (CI unit-commerce-core · success · 64 pass)

```
$ pnpm test
Test Suites: 7 passed, 7 total
Tests:       64 passed, 64 total  (xendit 16 신규 · 기존 48 무회귀)
Time:        2.53 s
```

7 요구 시나리오 1:1 매핑:
- #1 생성 (`createPaymentRequest` · payload · whitelist) · #2 webhook paid · #3 중복 dedup · #4 토큰 불일치 · #5 만료 · #6 금액 불일치 · #7 키 없음 → enabled=false.

### 3.2 Integration (CI pos-integration · success · 3m40s)

- 기존 `tenders.spec.ts` + `p6-e2e.spec.ts` + `void-refund-restock.spec.ts` 전부 pass (QRIS short-circuit 이 cash·edc 경로를 침범하지 않음 확인).
- 실 Xendit API 호출 없이 unit 레벨에서 전 로직 커버 — CI 경유 실 API 호출 금지 (지시 ⛔ 준수).

### 3.3 Typecheck

- `pnpm typecheck` · 0 error.

---

## 4. 이연 (J-d 이후)

- refund (`POST /v3/refunds` · 7일 window · 발급사별 partial 가드 · Gopay=full only)
- cancel (`PaymentRequest.cancel` · expired 전만)
- Admin 매장 설정 UI (`/admin/settings/pos` Payment integrations) — M1-J-e
- 앱 전체화면 QR + 10s 폴링 + Share QR + Regenerate 버튼 — M3-J-f
- 이연 순증감: **+0** (본 라운드는 J-c 범위 정확히 수행 · 신규 이연 없음)

---

## 5. 착지 명령

```
cp /tmp/M0-1105-BC-report.md ~/projects/curiocity-relay/m0/ && cd ~/projects/curiocity-relay && git add m0/M0-1105-BC-report.md && git commit -m "m0: M0-1105-BC" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M0-1105-BC done "QRIS(Xendit) 서버 1차 · PR #228 · CI pos-integration success · env XENDIT_API_KEY/XENDIT_WEBHOOK_TOKEN 등록 + Xendit Dashboard callback URL=https://commerce-core-production.up.railway.app/hooks/payment/xendit (추측) 필요"
```
