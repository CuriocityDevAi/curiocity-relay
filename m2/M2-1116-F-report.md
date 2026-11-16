# M2-1116-F 리포트

기존 경로 없음 · PR # 없음(기존 브랜치 커밋) · 응답 필드: id · register_id · snapshot_state · pre_entry · polled_at · server_now · paid_at · link_open_until · customer_phone(마스킹) · 로컬 검증: tsc 0 errors ✅

---

## 조사 결과

### Fork #149 계약
- 파일: `feat/m3-1116-d:lib/loyalty-snapshot.ts` · `api/hooks/pos-loyalty.ts`
- 경로: `GET /admin/pos/registers/:register_id/snapshot`
- 응답: `{ snapshot: OrderSnapshot | null }`
- OrderSnapshot 필드: `id · register_id · snapshot_state · pre_entry · polled_at · server_now · paid_at · link_open_until`
- 폴링 주기: 10초

### 기존 서버 경로 비교
`GET /admin/pos/loyalty/sessions/snapshots/active?register_id=<id>` 존재하나 불일치:
1. 경로 패턴: query param vs. path param
2. `customer_phone` 미마스킹 (서버 → 클라이언트에 원본 번호 노출)
3. fork(M3 소유) 수정 불가 → 기존 경로 재사용 불가

### 구현 내용
**신설 경로:** `GET /admin/pos/registers/:id/snapshot`

파일:
- `apps/commerce-core/src/api/admin/pos/registers/[id]/snapshot/route.ts`
  - admin JWT 인증(Medusa /admin/* 자동 보호)
  - `register_session` 모듈 `getActiveSnapshotForRegister(id, now)` 재사용
  - `snapshotToDTO` → `customer_phone` 마스킹 후 반환
  - snapshot 없으면 `{ snapshot: null }` 200
- `apps/commerce-core/integration-tests/loyalty/register-snapshot.spec.ts`
  - 케이스 3: ① 없는 register_id → null ② 활성 스냅샷+번호 마스킹 ③ 인증 없음 → 401
- `docs/feature-map.yaml` — `pos-register-snapshot` 항목 추가

### 로컬 검증
- `tsc --noEmit` → **0 errors** ✅
- 커밋: `8deb188` (storeport-m1 `feat/m1-1116-e-customer-loyalty-detail`)
- push: ✅
