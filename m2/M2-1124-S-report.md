GREEN

## M2-1124-S — PR #421 CI 재트리거 결과

**원인 (1줄)**: `d94eb52`(2026-11-24T14:36:53Z push)에 대한 `pull_request synchronize` 이벤트가 GitHub Actions에 전달되지 않음 — paths-ignore 비해당·워크플로 active·PR OPEN 상태·취소 run 0건 모두 확인, GitHub webhook 미배달이 원인.

**재트리거 방법**: `workflow_dispatch` (force_cloud=false · self-hosted curiocity-mac 배차)

```
gh workflow run ci \
  --repo CuriocityDevAi/storeport \
  --ref fix/M0-1124-I-order-number-assign
```

**Run ID**: 45427561725

---

## 잡별 최종 결과

| 잡 | 결과 |
|---|---|
| markers-and-forbidden | ✅ success |
| changes-filter | ✅ success |
| route | ✅ success |
| heavy-mac | ✅ success |
| heavy-cloud | ⏭ skipped (route → mac 선택) |

---

## order-number-receipt.spec 결과

```
PASS integration-tests/pos/order-number-receipt.spec.ts (10.721 s)
  M0-1124-I · POS 주문 완료 → custom_display_id → receipt snapshot
    ✓ ①② metadata.stock_location_id 있는 주문은 custom_display_id 자동 발급 + receipt snapshot 에 포함 (863 ms)
    ✓ ③ 이미 custom_display_id=null 로 만들어진 주문은 소급 부여되지 않음 (642 ms)
    ✓ ④ M0-1124-K · metadata 없이 생성 + 닉네임 설정됨 → null (fallback 4 제거) (398 ms)
```

전체: unit 54 suites 602 tests pass · pos-integration 전 spec pass · 신규 fail 0.
