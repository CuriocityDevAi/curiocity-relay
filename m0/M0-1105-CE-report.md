# M0-1105-CE — 손님 화면 서버 S1a OrderSnapshot v2 · 리포트

**결과 한 줄**: PR #262 (draft) 올림 · OrderSnapshot v2 모델·수명 관리·GET/PATCH API·payment captured subscriber(결제 라우트 0 바이트)·단위 테스트 완성 · 계약 §1/§2/§5 S1a 전 항목 반영.

## PR

https://github.com/CuriocityDevAi/storeport/pull/262 (base `main`)
브랜치: `m0/M0-1105-CE-customer-display-s1a-snapshot-api`
워크트리: `~/curiocity-live/storeport-wts/M0-1105-CE-wt` (메인 `/Users/kyu.lee/projects/storeport` 는 타 세션 점유 상태)

## 계약 준수 표 (contract §1·§2·§5 S1a)

| 계약 조항 | 구현 파일 | 상태 |
|---|---|---|
| §1-1 OrderSnapshot v2 필드 전부 | `src/types/customer-display.ts` + `modules/register_session/models/order-snapshot.ts` | ✅ status · snapshot_state · paid_at · link_open_until · pre_entry · customer_phone · polled_at · receipt · items · 합계 전부 |
| §1-1 타입 공유 위치 | `apps/commerce-core/src/types/customer-display.ts` | ✅ 손님 앱(G1) 이 workspace path 로 import — packages 승격 여부는 PR 본문 Q1 참조 |
| §2 GET /snapshots/active | `api/admin/pos/loyalty/sessions/snapshots/active/route.ts` | ✅ register_id 쿼리 · server_now 포함 · polled_at 갱신 |
| §2 PATCH /snapshots/:id (typing) | `api/admin/pos/loyalty/sessions/snapshots/[id]/route.ts` | ✅ `{ typing: true }` → polled_at 갱신 |
| §2 PATCH /snapshots/:id (phone/pre_entry) | 동일 route | ✅ `{ phone, pre_entry: true }` · E.164 검증 |
| 주문 시작 → active (규칙 I: 기존 즉시 expired) | `service.startSnapshotForRegister` | ✅ 기존 비-expired 모두 즉시 expired · 새 스냅샷 pre_entry=false |
| 결제 완료 → paid(paid_at) | `service.markSnapshotPaid` | ✅ link_open_until = paid_at + 10분 |
| 보류 규칙 E | `lifecycle.evaluateLifecycle` | ✅ paid 는 link_open_until > now 동안 keep |
| TTL 10분 → expired | `SNAPSHOT_TTL_MS` + GET lazy 전환 | ✅ active & 10분 초과 시 expire |
| POS 결제 라우트 수정 금지 | `subscribers/order-snapshot-paid.ts` | ✅ order.updated · payment.captured 구독 · 결제 라우트 0 바이트 수정 (지시 §5 권장안 채택) |
| 테스트: 수명 전이·보류·TTL·새 세션·server_now·polled_at·마스킹 | `__tests__/order-snapshot.unit.spec.ts` | ✅ 7 describe · 20+ 케이스 |

## 자기 검증 (`gh pr checks 262 -R CuriocityDevAi/storeport`)

T+20s 스냅샷:
- `changes-filter` — **pass** (5s)
- `check` — **pass** (12s)
- `markers-and-forbidden` — **pass** (8s) · 네이밍 규약 · 결제 라우트 미수정 확인
- `unit-commerce-core` — pending
- `pos-integration` — pending
- `docker-smoke-{anchor,commerce-core,wing}` · `wrangler-check-care-agent` — skipping (해당 파일 없음)

`--watch` 결과는 (Opus 45분 상한 · 25분 리포트 데드라인) 리포트 이후에도 PR 코멘트로 추적 가능. 현재까지 하드 실패(red) 0.

## 기술 선택지 (PR 본문 3줄 요약 포함)

- **공유 타입 위치**: commerce-core `src/types/` (packages 승격은 S1b/G1 에서 결정) — pnpm-workspace · tsconfig references 수정 비용을 S1a 범위에서 제외.
- **결제 완료 훅**: Medusa subscriber (`order.updated`+`payment.captured` · payment_status=captured 가드 · 멱등). 결제 라우트 파일 0 바이트. 이벤트 유실 환경에 대비해 `service.markSnapshotPaidByOrder` 를 공개 메서드로 두어 S1a-2 로 1줄 훅 승격 가능.
- **수명 판정 pure helper 분리**: `lifecycle.ts` 로 테스트 비용 최소화(DB/Medusa boot 없이 수명/직렬화 검증).

## 금지·범위 밖 체크

- `src/api/admin/pos/orders/[id]/customer/**` **무수정** (#258 · S1b 소관)
- `tenders/route.ts` · `refund/**` · `return/**` · `void/**` · xendit 웹훅 **무수정**
- `src/lib/link-customer-order.ts` · `linkCustomerToOrder` · `POST /snapshots/:id/link-phone` **미착수** (S1b)
- Admin UI **무수정**
- 기존 register_session migration 파일 **무수정** (신규 Migration20261115100000 만 추가)
- PR 머지 **금지** (draft 유지)

## 계약 변경안: 없음

S1a 범위 전부 계약 그대로 구현 가능했음. G1(손님 앱) 병렬 구현의 응답 shape 는 `src/types/customer-display.ts` 기준으로 고정.

## 사고 보고 (세션 위생)

작업 중 메인 워크트리 `/Users/kyu.lee/projects/storeport` 가 다른 세션에 의해 `feat/m3-1105-ci-customer-display` 로 체크아웃 전환되어 untracked 파일이 날아갔다. 즉시 `~/curiocity-live/storeport-wts/M0-1105-CE-wt` 에 새 워크트리를 띄워 전체 작업을 메모리에서 재생성 · 커밋 · push. 메인 트리는 손대지 않음. CLAUDE.md §7 "타 세션이 작업 중 — 사용 금지" 재확인 사항.

## 다음 라운드 힌트

- S1a-2(선택): `tenders/route.ts` 후처리에 1줄 `svc.markSnapshotPaidByOrder({ order_id, paid_at, receipt })` 추가로 subscriber 지연 리스크 제거. 결제 라우트 수정 허용될 때만.
- S1b: `linkCustomerToOrder` 공유 함수 · `link_open_until` 단일 가드 · R3 리팩터.
