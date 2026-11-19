#389 · skipped_at O · paid 만료 안 함 O · 연결 200 O · 응답 포함 O · 테스트 O

## 변경 파일
- `order_snapshot/model.ts` — `skipped_at` nullable datetime 추가
- `migrations/Migration20261119000001.ts` — `skipped_at timestamptz null` DDL
- `service.ts` — `skipSnapshot`: paid → skipped_at 만 기록 / active → expired (기존)
- `lifecycle.ts` — `serializeSnapshot` 에 `skipped_at` 포함
- `src/types/customer-display.ts` — `OrderSnapshot.skipped_at?: string | null`
- `apps/customer-display/src/types/order-snapshot.ts` — 동일 필드 추가
- `integration-tests/loyalty/cd-snapshot-skip.spec.ts` — 테스트 5·6 추가 (a)(a-link)

## 테스트 결과
- unit 539 pass / 0 fail (pre-push hook)
- customer-display vitest 200 pass
- TypeScript 에러 0 (기존 expo-secure-store 1건 제외)

## PR
https://github.com/CuriocityDevAi/storeport/pull/389
