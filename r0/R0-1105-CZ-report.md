# R0-1105-CZ Report — storeport #233 + pos-fork #115 리뷰
# M1-1105-BJ · Xendit Admin Payment integrations

원장 대사: decision-qris-20261112 ③④

---

## 판정 요약

| PR | 판정 | 사유 |
|----|------|------|
| storeport #233 | **REQUEST_CHANGES** | REQ 3: `resolveXenditCreds` 중복·결제 경로 미연결 (치명) |
| pos-fork #115 | **COMMENT** | 스크린샷 외 E2E + 리팩토링 포함 — 제목·범위 불일치 (닫기 불요) |

---

## storeport #233 검증

### REQ 1 — 비밀 노출 0 ✅ PASS

| 항목 | 결과 |
|------|------|
| GET 응답 평문 노출 | ✅ `buildPublicView` → `maskValue` (••••abcd) 만 반환 |
| 에러 메시지 평문 | ✅ 503: `configuration_error` type message만, 키 없음 |
| PUT 인증 | ✅ Medusa admin middleware (`/admin/`) 보호 |
| 빈 필드 = 유지 | ✅ `trim()` 빈 → 기존 encrypted_secret_key 유지 |
| clear = 삭제 | ✅ `{ clear: true }` → xendit 키 제거 후 env fallback |

### REQ 2 — COOKIE_SECRET 위험 ⚠️ MINOR

| 항목 | 결과 |
|------|------|
| 복호화 실패 시 서버 죽음 여부 | ✅ try/catch + env fallback — 서버 살아있음 |
| UI "재입력 필요" 표시 | ✅ `source: "env"` → "Using server default" 배지 |
| 복호화 실패 로깅 | ❌ catch 블록이 완전 silent — `console.warn` 없음 → 운영 관측 불가 |
| 별도 env 권고 (`POS_SECRETS_KEY`) | 권고: COOKIE_SECRET 재사용은 세션 키와 암호화 키가 동일 — COOKIE_SECRET 변경 시 모든 저장 자격증명 복호화 실패. 단순 fallback은 처리되나 운영 위험 존재. 별도 `POS_SECRETS_KEY` 지원(없으면 COOKIE_SECRET fallback) 구조 권고 |

### REQ 3 — resolveXenditCreds 중복·결제 경로 미연결 🔴 CHANGES REQUIRED

**이중 구현 발견:**

| | `payment_xendit/lib/config.ts` (#228 · main) | `pos_settings/lib/xendit-creds.ts` (이번 PR) |
|--|----------------------------------------------|----------------------------------------------|
| 함수 시그니처 | `resolveXenditCreds(posXenditSettings, env)` — **동기** | `resolveXenditCreds(svc)` — **비동기 async** |
| 저장 필드명 | `settings.xendit.api_key_ref` (평문) | `settings.xendit.encrypted_secret_key` (AES-256-GCM) |
| webhook 필드 | `webhook_token_ref` | `encrypted_webhook_token` |
| 사용처 | QRIS tenders · webhook · refund 경로 | Admin GET/PUT `/admin/pos/settings/xendit` |

**결과:** Admin UI에서 저장한 AES 암호화 자격증명(`encrypted_secret_key`)을 결제 경로(`payment_xendit`)가 읽지 못함 (`api_key_ref` 필드 없음 → `source: "none"` → 결제 400). **Admin UI에서 설정해도 실제 QRIS 결제에 반영 안 됨.**

**필요 조치:**
1. `payment_xendit/lib/config.ts`의 `resolveXenditCreds`를 새 `xendit-creds.ts`의 async 버전으로 교체하거나
2. 새 `xendit-creds.ts`의 저장 필드명을 `api_key_ref` 호환 구조로 맞추고 암호화 래핑

### REQ 4 — Admin 화면 ✅ PASS

| 항목 | 결과 |
|------|------|
| 문구 영어 | ✅ "Payment integrations", "Save Xendit settings", "Clear (use server default)" |
| Test/Live 배지 | ✅ orange(Test) / blue(Live) · `xnd_development_` / `xnd_production_` 판별 |
| QR 유효시간 1~60 | ✅ PUT 서버 검증 + UI onSaveXendit 클라이언트 검증 |
| 자동 재발행 없음 | ✅ |

### REQ 6 — CI·main 충돌

CI check runs: GitHub Integration 403으로 직접 확인 불가. `mergeable_state: "unknown"` — PR 생성 직후 미계산 상태. main 충돌 여부는 Kyu 직접 확인 필요.

---

## pos-fork #115 검증

### REQ 5 — 스크린샷 스크립트뿐인지 🟡 COMMENT

PR 타이틀: "test(e2e): M1-1105-BJ Xendit Admin 화면 Playwright 목업 스크린샷"

**실제 변경 범위:**

| 파일 | 성격 | 앱 코드 변경 |
|------|------|-------------|
| `scripts/m1-1105-bj-playwright.mjs` | Xendit 목업 스크린샷 스크립트 | ❌ |
| `docs/M1-1105-BJ-xendit-settings.png` | 스크린샷 결과물 | ❌ |
| `e2e/flows/01-cash-sale-receipt.spec.ts` | Playwright E2E (현금 판매 플로우) | ❌ (테스트만) |
| `e2e/flows/02-split-cash-card.spec.ts` | Playwright E2E (split Cash→Card) | ❌ (테스트만) |
| `e2e/helpers/api-mocks.ts` | E2E fixture 인터셉터 | ❌ |
| `e2e/fixtures/*.json` | E2E mock fixture 파일들 | ❌ |
| `lib/order-totals.ts` | orders/[orderId].tsx에서 로직 추출 | ✅ 리팩토링 |
| `lib/split-tender.ts` | split-tender 화면에서 헬퍼 추출 | ✅ 리팩토링 |
| `app/checkout/split-tender/[draftOrderId].tsx` | buildSplitBody 제거 → lib 사용 | ✅ 리팩토링 |
| `app/orders/[orderId].tsx` | deriveGrandTotal/Outstanding 사용 | ✅ 리팩토링 |
| `.github/workflows/ci.yml` | `flow-tests` 잡 추가 | ✅ |
| `package-lock.json` | `@playwright/test`, `vite`, `serve` 추가 | ✅ |

**판단:**
- Xendit 목업 스크린샷 스크립트 단독이라는 보고서 설명과 실제 범위 불일치
- E2E 테스트·인프라 + 앱 로직 추출 리팩토링은 가치있는 변경 → **닫기 불필요**
- 앱 코드 리팩토링(lib 추출)은 기능 변경 없음, 클린업
- PR 제목·범위 명세가 실제와 다름 → 코멘트로 지적

---

## 착지

```
cp /tmp/R0-1105-CZ-report.md ~/projects/curiocity-relay/r0/ && \
cd ~/projects/curiocity-relay && \
git add r0/R0-1105-CZ-report.md && \
git commit -m "r0: R0-1105-CZ" && \
git pull --rebase --autostash origin main && \
git push && \
node scripts/claim.mjs R0-1105-CZ done "storeport#233 REQUEST_CHANGES(resolveXenditCreds 중복·결제경로 미연결) · pos-fork#115 COMMENT(스크린샷 외 E2E+리팩토링 포함·범위 불일치)"
```
