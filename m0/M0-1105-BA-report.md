# M0-1105-BA Report — POS QRIS Xendit 테스트 연동 계획서

**status**: DONE · 코드 변경 0 · docs PR open

## 산출

- storeport PR **#227** · <https://github.com/CuriocityDevAi/storeport/pull/227>
- 브랜치: `docs/m0-1105-ba-pos-qris-xendit-plan` (origin/main 기반)
- 커밋: `e6e8b78 docs(spec): M0-1105-BA · POS QRIS Xendit 테스트 연동 계획서`
- 신규 파일: `docs/epics/pos-qris-xendit.md` (단일 · docs-only 범위 확정)
- `processes: [commerce-core.payment-providers]`

## 계획서 요약 (10줄)

1. **API 확정**: Xendit `POST /v3/payment_requests` + `channel_code: "QRIS"` + `type: "PAY"` (구 `/qr_codes` 는 archive).
2. **SDK**: `xendit-node` v7 공식 (PaymentRequest · Refund 2개 서비스만). OSS medusa-payment-xendit 성숙본 없음 → 자체 provider (`payment_xendit` J-a 스켈레톤) 이어서 J-c 로 채움.
3. **흐름**: tenders 라우트 → `provider.initiatePayment` → Xendit API → `session.data` 화이트리스트 (qr_string · expires_at · payment_request_id) → 앱 전체화면 QR · 카운트다운.
4. **확인 경로 2개 병렬**: (a) Webhook `/hooks/payment/xendit` · `x-callback-token` static 검증 (b) 앱 "Check payment" 수동 + 폴링 10s. SSE 는 v2 이연.
5. **매장별 자격증명**: `pos_settings.xendit` subblock (암호화 저장 · api_key_ref · webhook_token_ref · callback_url · qr_expires_minutes · regenerate_on_expiry). env (`XENDIT_API_KEY`·`XENDIT_WEBHOOK_TOKEN`) = **매장 설정 비면 fallback**. Soopsok 테스트는 env fallback 로 시작.
6. **환불 사실 확인**: Xendit QRIS **공식 환불 지원** (POST `/v3/refunds` · 7일 window · 발급사별 partial 가변 — Gopay full-only). spec v0 §6 "QRIS 환불 불가" 가정 **정정 대상**.
7. **라운드 4개**: M0-J-c (서버 initiate+webhook+status, 45m) → M0-J-d (서버 refund+cancel+regen, 30m) → M1-J-e (Admin 설정 UI, 30m) → M3-J-f (앱 전체화면 QR + polling, 45m). PR 1개씩.
8. **멱등 키**: `reference_id = <orderId>:<tenderSeq>:<nonce>`.
9. **보안**: api_key/raw response 는 session.data 저장 금지 · provider options_ 또는 Payment.metadata 격리. Webhook 라우트에 per-IP rate-limit 권장.
10. **🚨 환경변수 이름 불일치 발견**: Railway 에는 `XENDIT_SECRET_KEY` 로 들어감, `medusa-config.ts` 는 `process.env.XENDIT_API_KEY` 를 읽음 → **J-c 착수 전 Rename 또는 duplicate 등록 필수**.

## Kyu 결정 필요 (4건)

1. **QR 유효시간** = 15분 권장 (서비스 호흡 + Xendit 최대 48h 중)
2. **만료 후 자동 재발행** = OFF 권장 (캐셔가 "다시" 눌러서 새 QR — 손님 혼동 방지)
3. **자격증명 입력 UI 위치** = `/admin/settings/pos` 안 "Payment integrations" 섹션
4. **Soopsok 테스트 자격증명** = env fallback 로 시작 · 라이브 전환 때 매장 설정으로 이관

## Kyu 대시보드 할 일 (단일 세션 10분)

1. `dashboard.xendit.co` 로그인 · 우상단 **Test Mode** ON 확인.
2. Settings → Developers → API Keys → Money-In WRITE 테스트 secret 이미 발급 확인.
3. Settings → Developers → **Callbacks** 이동.
4. 아래 3개 이벤트 각각 Test URL 에 `https://commerce-core-production.up.railway.app/hooks/payment/xendit` 입력 · Save:
   - Payment Request paid
   - Payment Request expired
   - Refund succeeded
5. 같은 페이지 상단 **"Webhook verification token"** → Copy.
6. Railway `commerce-core` → Variables → `XENDIT_WEBHOOK_TOKEN` 신규 등록 · 값 붙여넣기 · Deploy.
7. 같은 Variables 창에서 `XENDIT_SECRET_KEY` **→ `XENDIT_API_KEY` 로 Rename** (또는 같은 값으로 신규 추가 후 이전 키 삭제).
8. `curl -s https://commerce-core-production.up.railway.app/health | jq` 로 신 배포 로드 실측 확인 (CLAUDE.md §5 두 번째 주의사항).

## 후속 액션 (M0 외 track)

- **relay 측**: `meros-payment-flow-spec-v0.md` §6 자구 수정 PR ("QRIS 환불 불가" → "7일 내 API 로 가능 · 실패 시 현금 fallback + 매니저 PIN"). 본 PR 승인 뒤 별도로.
- **M0-J-c (다음)**: Kyu 결정 4건 + 대시보드 클릭 완료 이후 착수.
