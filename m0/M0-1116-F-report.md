# M0-1116-F — #290 R0 CHANGES 반영 보고

수정 위치: `apps/commerce-core/src/modules/customer_display_settings/service.ts` applyDraft · revertToPrevious · 통합 5/5 · 스레드 resolve.

## 반영

### 1) JSON 컬럼 별칭 해제 (service.ts)

- `applyDraft`:
  - `prevLive = row.settings` → `{ ...(row.settings as ...) }` (얕은 복사)
  - `draft = row.settings_draft` → `{ ...draftRaw }` (null 경우 null 유지)
- `revertToPrevious`:
  - `current = row.settings` → `{ ...(row.settings as ...) }`
  - `previous = row.settings_previous` → `{ ...previousRaw }`
- 같은 모듈 내 다른 JSON 컬럼 대입 (`patchSettings` / `patchDraft` / 이벤트 CRUD) 은 이미 spread/filter/map 으로 새 객체를 생성해 대입하므로 수정 불필요 (audit 결과 = clean).

### 2) 통합 테스트 자가 시드 (customer-display-settings-draft-apply.spec.ts)

`@medusajs/test-utils` 의 `medusa-test-runner.js` `beforeEach()` 가 템플릿 DB 를 매 테스트 전에 restore 하므로 "테스트 1 이 세팅한 draft 가 테스트 2 로 이어진다"는 암묵 가정이 무너진다 (디버그 로그로 확인: 테스트 2 의 `getOrCreate` 가 `existing.count=0` 으로 새 row 를 만들어 `settings_draft=null`, 즉 apply 가 no-op 브랜치 진입).

→ `apply` · `revert` 테스트가 자기 선행 상태(PUT /draft · apply) 를 직접 호출하도록 교정. 테스트 1 · 4 · 5 는 이미 자가 시드.

## 검증

```
TEST_TYPE=integration:pos NODE_OPTIONS=--experimental-vm-modules npx jest \
  --silent=false --runInBand --forceExit \
  --testPathPattern='customer-display-settings-draft-apply\.spec'
```

```
PASS integration-tests/pos/customer-display-settings-draft-apply.spec.ts (14.784 s)
  M0-1116-C draft/apply/revert/preview
    ✓ PUT /settings/draft: draft only, live unchanged, version unchanged (675 ms)
    ✓ POST /settings/apply: promote draft, bump version, set previous (500 ms)
    ✓ POST /settings/revert: swap live ↔ previous, bump version (736 ms)
    ✓ GET /settings/preview?view=draft&as_of merges active event (564 ms)
    ✓ legacy PUT /settings: draft+apply compat (bumps version) (435 ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

## 착지

- 커밋: `8145605` on `m0/M0-1116-C-settings-draft-apply` → push 완료 (7a3a752..8145605).
- 리뷰 스레드 `PRRT_kwDOTe-UYs63vftG` (line 258 지적) resolve 완료.

## 메모 (진단 보강)

R0 보고서의 뿌리 진단(=MikroORM 참조 식별 실패로 `settings_previous` 미저장)은 로컬에서 `--runInBand` 로 디버그 로깅을 넣어 보니 **직접적 원인은 아니었다** — `applyDraft` 가 호출될 때마다 updRes · listXxx 재조회 모두 `settings_previous` 를 정상 반환했다. 실제 통합 테스트 실패는 `test-utils` 템플릿 복원으로 테스트 간 상태가 초기화되는 구조. 다만 별칭 복사 교정은 R0 지적대로 운영 상 안전성 (공유 참조로 인한 암묵적 후속 mutation 방지) 을 확보하므로 그대로 반영.
