# M0-1116-N — storeport #313 pos-integration CI 수정

**#313 실패 원인 한 줄 · 로컬 해당 spec ✅/❌ · push 커밋**:
#313 이 loyalty-info 라우트 `earn_preview` 를 서버 계산으로 전환(TODO null → 실제 값)해 `customer-link.spec` 의 `expect(...earn_preview).toBeNull()` 이 깨짐 · 로컬 customer-link.spec 12/12 ✅ · push `b62de74` on `fix/m0-1116-m`.

---

## 실패 로그 (job 133218444220)

```
FAIL integration-tests/loyalty/customer-link.spec.ts (19.698 s)
  M3-1105-CF · customer-link R3
    ✕ GET loyalty-info: 연결 고객 → phone_masked + balance (263 ms)

  expect(received).toBeNull()
  Received: 0
    > 351 |         expect(res.data.earn_preview).toBeNull();
      at Object.toBeNull (integration-tests/loyalty/customer-link.spec.ts:351:39)
```

## 원인 (REQ 1)

- 테스트 세팅: 빈 draft order (items=[]) → subtotal=0 · discount=0.
- #313 전: loyalty-info 응답 `earn_preview: null` (TODO 플레이스홀더).
- #313 후 (`591c180`): `computeEarnPreviewForTotals({subtotal:0, discount:0}, settings)` → `0`.
- "#313 의 snapshot 응답에 loyalty.earn_preview 를 덮어쓴 것" 이 아니라 **loyalty-info 라우트** 의 TODO 를 채운 부분이 원인. 동일 변경 세트의 일부 (commit body 참조).

## 수정 (REQ 2)

의도된 동작 변경 (R0 APPROVE · #313 PR 본문 명시) → 테스트 기대만 갱신:

```diff
- expect(res.data.earn_preview).toBeNull();
+ // M0-1116-M · earn_preview 는 이제 서버 계산. 빈 draft order 는 subtotal=0 → 0.
+ expect(res.data.earn_preview).toBe(0);
```

- 라우트 코드 미수정. 적립 계산 로직(`earn.ts`·`receipt-preview.ts`) 미수정.
- 로컬 재현: `TEST_TYPE=integration:pos ... jest --testPathPattern='customer-link\.spec'` → **12/12 pass** (15.152 s).

## Push (REQ 3)

- Commit: `b62de74 test(loyalty): M0-1116-N — customer-link spec earn_preview 기대 갱신`
- Branch: `fix/m0-1116-m`
- Remote: `591c180..b62de74  fix/m0-1116-m -> fix/m0-1116-m`
- CI 대기 없이 즉시 리포트.

## 주의 (운영자용)

본 커밋은 R0 APPROVE 상태의 #313 테스트 기대 수정 1줄만 포함. 머지 순서는 R0-1116-X 가 지정한 "#313 먼저 머지 후 #314 rebase" 그대로 유효.
