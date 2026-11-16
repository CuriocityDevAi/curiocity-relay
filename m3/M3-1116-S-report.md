① _layout.tsx useEffect router.replace 가 Expo Router 네비게이터 초기화 전에 실행되는 경쟁 조건 → index.tsx 선언적 Redirect 로 교체 · ② 짝짓기 계산대 단위 전환(customer_display_device 신설 · 마이그레이션) · storeport PR #317 · fork 후속 불필요 · Kyu 재짝짓기 불필요(마이그레이션 자동 이관)

## ① 원인 상세

`_layout.tsx` 의 `useEffect(() => { router.replace("/pair") }, [liveToken])` 는 Expo Router v4 의
Slot 이 처음 마운트될 때 네비게이터가 아직 초기화되지 않은 타이밍에 실행된다. `router.replace` 는
navigator ref 가 준비된 뒤에야 동작하므로 첫 렌더에서는 무시된다.

**수정**: `_layout.tsx` 의 useEffect 제거. `index.tsx` 의 `LiveIndexRoute` 에서 모든 훅 완료 후
`if (deviceToken === null) return <Redirect href="/pair" />` 선언적 처리. 네비게이터가
index route 를 렌더할 시점에는 이미 준비되어 있다.

## ② 짝짓기 계산대 단위 전환

**변경 범위 (storeport-kyu)**

| 파일 | 변경 내용 |
|------|-----------|
| `register_session/models/customer-display-device.ts` | 신설: `stock_location_id` UNIQUE, `device_token_hash` |
| `register_session/migrations/Migration20261116000001.ts` | `customer_display_device` 테이블 생성 + 기존 token 이관 + `register_session.device_token_hash` 컬럼 삭제 |
| `register_session/service.ts` | `consumePairCode` → device table upsert; `verifyDeviceToken` → `stock_location_id` 반환; `revokeDeviceToken(stock_location_id)`; `getDeviceStatus(stock_location_id)`; `getActiveSnapshotByStockLocation` 신설 |
| `api/middlewares.ts` | `verifyDeviceToken` 결과로 `stock_location_id` 주입 |
| `api/customer-display/snapshots/active/route.ts` | `getActiveSnapshotByStockLocation` 호출; config_version 조회 단순화 |
| `api/customer-display/snapshots/[id]/route.ts` | 소유권 검증: `snapshot.register_session_id` → session 조회 후 `stock_location_id` 비교 |
| `api/customer-display/snapshots/[id]/link-phone/route.ts` | 동일 |
| `api/customer-display/display-config/route.ts` | session 조회 불필요 — middleware 주입값 직접 사용 |
| `api/admin/pos/loyalty/sessions/[register_id]/revoke/route.ts` | `revokeDeviceToken(session.stock_location_id)` |
| `api/admin/pos/loyalty/sessions/[register_id]/status/route.ts` | session 조회 → `getDeviceStatus(stock_location_id)` |
| `api/customer-display/pair/route.ts` | 응답에 `stock_location_id` 추가 |

**테스트 추가**
- `pairing.unit.spec.ts` 전면 재작성 (12 tests · customer_display_device 스토어 모킹 · 세션 교체 후 token 유효 시나리오)
- `customer-display-link-phone.spec.ts` test 3 — 같은 session이 아닌 **다른 stock_location** 으로 403 · test 3b 신설 — 세션 교체 후 동일 stock_location 의 새 snapshot 에 기존 token으로 200
- `e2e/pair-screen.spec.ts` — 시크릿 컨텍스트 `/` 접근 → `/pair` redirect 테스트 추가

## fork #157 관계

`GET /admin/pos/registers/:id/snapshot` 뱃지 경로는 `register_session_id` 를 직접 받아
`getActiveSnapshotForRegister` 호출 — customer display token 경로와 완전히 분리.
이번 변경의 영향 없음. **fork 후속 불필요**.

## 배포 / 운영 주의

- 마이그레이션 자동 실행 시 기존 `register_session.device_token_hash` 는 `customer_display_device`
  테이블로 이관됨 (`DISTINCT ON stock_location_id ORDER BY created_at DESC`).
- Kyu iPad 의 localStorage token 은 이관 후에도 `verifyDeviceToken` 에서 그대로 조회됨.
- **재짝짓기 1회 불필요**.
