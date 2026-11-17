# M2-1117-H — 완료 보고

## 버그
`LiveSnapshotSource.getSnapshot()` 이 서버 응답 래퍼
`{ snapshot, server_now, config_version }` 을 unwrap 하지 않고
전체 오브젝트를 `OrderSnapshot` 으로 캐스팅.
→ `status`·`snapshot_state` = undefined → 상태 머신이 "main" (대기 화면) 고착.

## 수정 (apps/customer-display/src/mocks/snapshot-source.ts:73)
- `SnapshotApiResponse` 인터페이스 추가
- `"snapshot" in body` 체크 → 새 형식이면 `body.snapshot` 추출 + `config_version` 주입
- 구버전 서버 방어: `"snapshot"` 키 없으면 bare snapshot 그대로 반환

## 계약 테스트 (기존 테스트가 왜 못 잡았나)
기존 `live-connect.test.ts` 의 mock 이 `json: async () => snap` 으로
래퍼 없이 bare snapshot을 반환 → 클라이언트 버그가 보이지 않았음.

추가 케이스:
- unwraps server envelope and injects config_version ✅
- returns null when envelope.snapshot is null ✅
- falls back gracefully for old-style bare snapshot ✅

## Playwright E2E (e2e/snapshots.spec.ts)
서버 응답을 실제 모양(래퍼 포함)으로 route.fulfill() 목업:
- main → cart 전환 스샷: `screenshots/live-wrapped-checkout.png` ✅
- null snapshot → main 유지 ✅

## 재발 방지 제안
`packages/event-contracts` 에 `SnapshotApiResponse` 등록 →
서버·클라이언트 타입 공유로 컴파일 타임 차단.

## 결과
- vitest: 135/135 pass ✅
- Playwright: 14/14 pass ✅
- TypeScript: 에러 0 ✅
- Branch: fix/m2-1117-h-snapshot-unwrap (ea4eb20)

## 이연 순증감
없음 (신규 Deferred 추가 없음)
