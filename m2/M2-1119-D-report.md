storeport PR #389 · 서버 skip→expired O · 손님 화면 PATCH O · 연결된 건 무시 O · it O · 앱 재빌드 필요 O

## 작업 내용

### 서버 (commerce-core)
- `service.ts`: `skipSnapshot(id)` 메서드 추가 — expired/pre_entry/customer_phone 체크 후 `snapshot_state='expired'` + `link_open_until=now` 세팅
- `api/customer-display/snapshots/[id]/route.ts`: `PatchBody.skipped?: boolean` 추가 — ownership check 통과 후, 기존 expired 409 체크 전에 처리 (fire-and-forget 보호)

### 손님 화면 (customer-display)
- `src/lib/snapshot-api.ts` (신규): `skipSnapshotOnServer(id, token, baseUrl)` — PATCH fire-and-forget 헬퍼
- `app/index.tsx`: `handleSkip` useCallback 추가 — PATCH 1회 후 `KEYPAD_SKIP` 디스패치
  - KeypadScreen `onCancel` → `handleSkip`
  - KeypadAfterScreen `onSkip` / `onTimeout` → `handleSkip`

### 테스트
- `integration-tests/loyalty/cd-snapshot-skip.spec.ts` (신규): skip→expired, pre_entry 무시, customer_phone 무시 3케이스
- `src/lib/__tests__/skip-patch.test.ts` (신규): PATCH 1회 전송, 실패 무시 2케이스
- 전체 vitest: 197 passed | commerce-core unit: 539 passed

### feature-map.yaml
- `customer-display-snapshot`: `cd-snapshot-skip.spec.ts` 등록
- `cd-keypad`: `snapshot-api.ts`, `skip-patch.test.ts` 등록

## 앱 재빌드 필요
`apps/customer-display/app/index.tsx` 변경으로 Expo Web 재빌드 필요.
`scripts/build-customer-display-web.sh` 실행 후 commerce-core 재배포.
