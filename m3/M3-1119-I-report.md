#388 실패 원인 PR(stale pin-audit spec) · 수정 O · 새 CI 진행 · #385 feature-map O · 새 CI 진행

## #388 — M1-1119-B lib 경계 정리

### 실패 원인: PR(stale pin-audit spec) — 브랜치 고유 코드 탓
- **spec**: `integration-tests/pos/pin-audit.spec.ts`
- **실패 테스트**: `cash 환불 성공 시 pin_audit_log 1건 (feature:refund, outcome:success)`
- **원인**: 브랜치의 `createAndPayOrder`가 `pos-complete` 엔드포인트를 사용해 결제를 처리했으나, `pos-complete`는 `pp_system_default` provider를 사용해 refund route의 `providerToMethod("cash")` 매칭에 실패. main 버전(`0c8dcb5`)은 `/tenders` + `provider_id: "pp_cash_default"` 로 수정 완료.
- **조치**: `git rebase origin/main` → main의 수정된 spec 반영. `_shared/manager-pin.ts`, `_shared/xendit-refund.ts` 등 실제 로직 파일은 변경 없음.

### 새 CI (run 44472036252)
- check: ✅ pass
- changes-filter: ✅ pass
- markers-and-forbidden: ✅ pass
- build-commerce-core: ✅ pass (1m59s)
- unit-commerce-core: ⏳ in progress (24min+ — 20분 한계로 pending 보고)
- pos-integration: ⏳ pending (unit 의존)

---

## #385 — M2-1118-V R-B3 fulfillment 공용 유틸 lib 승격

### 실패 원인: PR(미분류 파일)
- **미분류 파일**:
  - `apps/commerce-core/src/lib/fulfillment-cancel.ts` → `pos-void-refund` 프로세스
  - `apps/commerce-core/src/lib/fulfillment-polyfill-items.ts` → `pos-tenders-fulfill` 프로세스
- **조치**: `docs/feature-map.yaml`에 두 파일 추가 후 로컬 `feature-map-check.mjs` 실행 → `unmatched=0 exit=0` 확인

### 새 CI (run 44471970931)
- check: ✅ pass
- changes-filter: ✅ pass
- markers-and-forbidden: ✅ pass
- build-commerce-core: ✅ pass (2m12s)
- unit-commerce-core: ⏳ in progress (24min+ — 20분 한계로 pending 보고)
- pos-integration: ⏸️ skipping (변경 범위 외)
