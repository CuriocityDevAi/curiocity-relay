#297 · #151 CHANGES · APPROVE · 빠지는 검사 있음

## storeport #297 — CHANGES

### [BLOCKER] pos-integration: commerce_core 필터 src/** 누락

`changes-filter`의 `commerce_core:` 패턴에 `apps/commerce-core/src/**` 미포함.
`src/lib/loyalty/**` · tenders · refund 소스만 변경 PR → `commerce_core=false` → pos-integration SKIP.

수정 방향: `commerce_core:` 필터에 추가
```yaml
- 'apps/commerce-core/src/lib/loyalty/**'
- 'apps/commerce-core/src/modules/pos/**'
```

### 비블로커

| 항목 | 결과 |
|---|---|
| draft→ready 재실행 | ✅ ready_for_review 타입 추가 |
| main push 전체 실행 | ✅ push 트리거 paths 제한 없음 (pos-integration은 blocker 동일 원인으로 src/ 변경 시 skip) |
| concurrency main push 취소 | pre-existing — group key ci-refs/heads/main 동일, 미변경 |
| ci-summary 코멘트 유지 | ✅ ci-summary.yml ⏭ 포함 upsert |
| skip 필수 체크 처리 | ci-gate 미존재 — pos-integration 필수 체크 등록 시 skip=머지 영구 차단 위험 |

---

## agilo-medusa-pos-fork #151 — APPROVE

| 항목 | 결과 |
|---|---|
| assertions/flow-tests/playwright draft skip | ✅ if: !draft |
| draft→ready 재실행 | ✅ ready_for_review 타입 추가 |
| master push 전체 실행 | ✅ paths-ignore는 pull_request 트리거에만 적용 |
| lint concurrency | ✅ cancel-in-progress: true (lint는 hard gate 아님, 허용) |
