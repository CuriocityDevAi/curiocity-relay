# M3-1116-R 진단 리포트

원인 한 줄: **POS fork 뱃지가 stock_location_id로 snapshot 조회(세션 ID 불일치) + 재짝짓기 미완 → 손님 화면 snapshot 미전달** · PR fork #157 · Kyu 재짝짓기 필요

---

## 1. 운영 배포 확인 ✅

| 항목 | 결과 |
|------|------|
| `GET /health` version | `ffc2c14d` = storeport PR #314 (M3-1116-N) ✅ |
| `POST /admin/pos/orders/:id/checkout-snapshot` | 401 (인증 필요, 404 아님) → 라우트 존재 ✅ |
| `GET /customer-display/snapshots/active` | 401 (토큰 없음, 라우트 존재) ✅ |
| DB 기반 스냅샷·토큰 | `order_snapshot` 테이블, `device_token_hash` DB 저장 → 재배포 시 소실 없음 ✅ |

---

## 2. POS 앱 (fork #156) — startSnapshot skip 조건

**코드 위치**: `checkout/[draftOrderId].tsx`

```js
// 라인 73-81
const sessionId = openSession.data?.id;
if (!orderId || !sessionId) return;  // ← SKIP 조건 1
startSnapshot(orderId, sessionId);
```

**skip 조건**:
1. **open register session 없음** → `openSession.data?.id` = undefined → `if (!sessionId) return` → startSnapshot 미호출, 아무 표시 없음
2. **에러 삼킴** → `.catch(() => {})` → 서버 500/400 무시, 화면 반응 없음
3. ~~customer display 미연결 설정~~ → 코드 수준 guard 없음, 조건 아님

**뱃지 버그 (M3-1116-R 수정 대상)**:
- 라인 115: `const registerId = settings.data?.stock_location?.id;` ← stock_location_id
- `GET /admin/pos/registers/:stock_location_id/snapshot` → `order_snapshot.register_session_id = stock_location_id` 없음 → 항상 null
- `classifyCustomerDisplay(null)` = `hidden` → POS에서 연결 상태 표시 없음 (silent failure)

---

## 3. 손님 화면

**device token 흐름**:
- 미들웨어: `X-Device-Token` → `sha256Hash` → `register_session` 테이블 조회 → `register_session_id` 반환
- 토큰 DB 저장 → 재배포 후에도 유효 ✅

**root cause (snapshot 미전달)**:
손님 화면이 paired된 `register_session_id` ≠ POS 현재 open session ID인 경우:
- POS: `startSnapshot(orderId, openSession.data?.id)` → snapshot을 session B에 저장
- 손님 화면: device token → session A → `getActiveSnapshotForRegister(A)` → null
- 결과: 손님 화면 waiting 화면 그대로

**원인**: 배포 후 register session이 교체됐거나 첫 테스트 시 세션과 짝짓기가 불일치.

---

## 4. 수정 사항

### 완료: fork PR #157
- `checkout/[draftOrderId].tsx` 라인 115: `registerId = openSession.data?.id` (register_session_id)
- 뱃지가 올바른 세션의 snapshot을 조회 → 연결 상태 정확히 반영

### Kyu 재짝짓기 절차 (필요)
1. 현재 POS register session이 open인지 확인 (Settings → 개점 상태 확인)
2. POS **Settings 탭 → Customer Display → "New Pairing Code"** 탭
3. 발급된 6자리 코드 → `https://admin.meros.id/customer-display-web/` 에서 입력
4. 손님 화면 연결 확인 (초록 점)
5. POS Checkout 진입 → 품목/금액 표시 확인

---

## 5. 권장안 (REQ 5) — Checkout 화면 연결 상태 표시

현재 `CustomerDisplayStatus` 뱃지 로직:
- `snapshot = null` → hidden (짝짓기 여부 불명, 불편)

개선안: `GET /admin/pos/registers/:id/pairing-status` 엔드포인트 추가
- register_session의 `device_token_hash` 존재 여부 + 최근 `polled_at` → connected/not-paired/offline
- 현재 snapshot 폴링에 의존하지 않고 Checkout 진입 전에도 연결 상태 표시 가능

→ 별도 태스크로 처리 권장 (M3-1116-R 범위 초과).
