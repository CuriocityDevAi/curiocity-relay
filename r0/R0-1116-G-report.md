# R0-1116-G 리포트

**#290 CHANGES_REQUESTED · #294 APPROVE · M2-F PR(#293 8deb188) APPROVE · 로컬 검증**

---

## #290 — CHANGES_REQUESTED

**통합 테스트 2건 실패** (`TEST_TYPE=integration:pos`):
```
✓ PUT /settings/draft: draft only, live unchanged, version unchanged
✗ POST /settings/apply: promote draft, bump version, set previous
✗ POST /settings/revert: swap live ↔ previous, bump version
✓ GET /settings/preview?view=draft&as_of merges active event
✓ legacy PUT /settings: draft+apply compat (bumps version)
```

**근본 원인**: `service.ts` `applyDraft` 에서 `const prevLive = row.settings` 가 엔티티 프로퍼티와 **동일 객체 참조** → MikroORM 변경 감지 실패 → `settings_previous` DB 저장 안 됨 → revert 불가. `settings` / `settings_draft` / `live_version` 는 정상 저장.

마이그레이션 `Migration20261116120000` 은 테스트 DB에서 정상 실행 확인.

**필수 수정 2곳**:
```ts
// applyDraft (~line 258)
const prevLive = { ...(row.settings as Record<string, unknown>) };

// revertToPrevious (~line 282)
const current = { ...(row.settings as Record<string, unknown>) };
```

나머지 REQ 체크:
- typecheck: `tsc --noEmit` → 0 errors ✅
- unit: 32 passed ✅
- 마이그레이션: `add column if not exists` → 기존 데이터 보존 · 클래스명 충돌 없음 ✅
- no-draft apply 버전 +1 (safe, PR 본문 명시) ✅
- 결제 중 적용 보류: `useLiveDisplayConfig` `inPayment` 플래그 ✅
- 기존 PUT 호환: `patchDraft + applyDraft` ✅
- display-config device-token 인증: DEVICE_REGISTER_ID_KEY 미들웨어 ✅
- preview `as_of` DATE_RE 검증 ✅
- feature-map 1002/1002 ✅

---

## #294 — APPROVE

- 운영·비밀 접근 없음: Vite 하니스 page.route() mock, 실 서버/DB/env 불필요 ✅
- 제품 src 변경 없음: `e2e/`, `scripts/`, `docs/` 추가만 ✅
- 다른 허브 재사용: `bash scripts/admin-smoke.sh` 한 명령 ✅
- Screen 1 2pass / Screen 2 1skip(M0-1116-B 미머지 명시) / Screen 3 2pass ✅
- page.route() 순서 버그 수정 포함 ✅

---

## M2-1116-F (PR #293 커밋 8deb188) — APPROVE

`GET /admin/pos/registers/:id/snapshot`:
- 인증: `/admin/*` Medusa 자동 JWT 보호 ✅
- 번호 가림: `maskPhoneE164(dto.customer_phone)` spread override ✅
- fork #149 계약 필드: `id · register_id · snapshot_state · pre_entry · polled_at · server_now · paid_at · link_open_until` 전부 일치 ✅
- 통합 테스트 3/3 pass (null / 마스킹 / 401) ✅
- typecheck 0 errors ✅
