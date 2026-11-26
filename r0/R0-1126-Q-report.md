#452 APPROVE

## 체크 결과

### 1. `deriveCustomerFlow` 계약 준수 (REQ-1)

```typescript
// lifecycle.ts:300-305
const phoneExposed =
  state === "entering"
    ? (snapshot.phone_partial ?? phone)
    : state === "first_visit" || state === "confirming"
      ? phone
      : null;
```

- ✅ **entering 에서만 `phone_partial` 우선**: `state === "entering" ? (snapshot.phone_partial ?? phone)` — submit_phone 전 customer_phone=null 이어도 phone_partial 흘림
- ✅ **first_visit/confirming 불변**: entering 분기 밖에서 기존 `phone` 그대로
- ✅ **confirmed 마스킹 유지**: confirmed → `phoneExposed=null` → `phone_masked` 경로 유지 (변경 없음)
- ✅ **skipped 불변**: null 반환 (변경 없음)
- `phone_partial ?? phone` — phone_partial=null 이면 phone(=null) fallback → customer_flow.phone=null. 계약서 v1.3 의도와 일치.

### 2. 통합 테스트 직접 실행 (REQ-2)

명령: `bash scripts/it.sh cd-phone-partial` (worktree: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1126-D-wt/apps/commerce-core`)

```
PASS integration-tests/loyalty/cd-phone-partial.spec.ts (12.813 s)
  ✓ PATCH phone_partial '0812' → GET active · customer_flow.phone==='0812' (1645 ms)
  ✓ PATCH phone_partial '' → GET active · customer_flow.phone==='' (POS 'Waiting for customer') (963 ms)
Tests:       2 passed, 2 total
```

commerce-core unit 전체: `TEST_TYPE=unit npx jest`

```
Test Suites: 75 passed, 75 total
Tests:       864 passed, 864 total
```

### 3. POS fork master (#270 머지됨) CustomerFlowChip 코드 대조 (REQ-3)

`components/customer-display/CustomerPhoneStatus.tsx` (commit b50b1be, PR #270):

```typescript
if (chipKind === 'typing') {
  // M3-1126-D POS-1·2 · entering/first_visit 동안 flow.phone 에 실시간 숫자가 들어옴.
  const partial = flow.phone ?? '';   // ← customer_flow.phone 직독
  return (
    <Text testID="cd-phone-status-typing-text">
      {partial.length > 0 ? `${partial}…` : 'Waiting for customer'}
    </Text>
    ...
  );
}
```

- ✅ **필드명 정확**: `flow.phone` — lifecycle.ts 가 내려주는 `customer_flow.phone` 올바르게 소비
- ✅ **빈 문자열 처리 정상**: `partial.length > 0` 조건 — `phone_partial=""` → "Waiting for customer"(POS-1), `"0812"` → `"0812…"` 표시(POS-2)
- 엔드-투-엔드 연결: `PATCH phone_partial "0812"` → `deriveCustomerFlow(entering) → phone="0812"` → `flow.phone="0812"` → 칩 `"0812…"` 완전 성립

### 4. R0-1126-L CD-1~5 유지 (REQ-4)

| 항목 | 확인 방법 | 결과 |
|------|----------|------|
| CD-1 first_visit 불변 | phone_partial 분기 밖 → phone 그대로 | ✅ |
| CD-2 confirming 불변 | unit "confirming 은 phone_partial 영향받지 않음" | ✅ |
| CD-3 confirmed 마스킹 | phoneExposed=null, phone_masked 경로 유지 | ✅ |
| CD-4 skipped null | null 반환 불변 | ✅ |
| CD-5 entering+phone_partial null → phone=null | 신규 unit 케이스 명시 커버 | ✅ |

---

**전항목 통과 · APPROVE**

PR 코멘트: github.com/CuriocityDevAi/storeport/pull/452 에 COMMENT 형식으로 제출 완료 (self-review 제한으로 APPROVE 이벤트 불가, COMMENT로 대체).
