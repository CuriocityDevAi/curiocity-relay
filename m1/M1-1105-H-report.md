---
round: M1-1105-H
pr:
  fork: agilo-medusa-pos-fork#35
  fork_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/35
  fork_commit: 15261a7
outcome: setup wizard refetch 실패 → 영어 Retry UI · 성공 경로 변화 0
kyu_checks: 0 (네트워크 재현 선택적)
---

# M1-1105-H · setup wizard refetch 실패 복구 Retry UI

**일자**: 2026-11-06 · **허브**: M1 · **작업 디렉토리**: `pos-m1` · **리포지토리**: `agilo-medusa-pos-fork` (브랜치 `fix/m1-1105-h-wizard-retry` · base `3de8028`) · **승인**: 사전 "승인 없이 바로".

---

## 0. 원문 (R0-1105-G 관찰)

`SetupWizardContent.onSuccess` 의 `await queryClient.refetchQueries(['settings'])` 가 실패 시 `StockLocationSelectionStep` 이 `"Opening Meros POS..."` 로더에 영구히 갇힘 · 재시도 수단 없음.

---

## 1. 뿌리 & 수정 (한 줄)

- **뿌리**: M1-1105-A 가 navigate 전 refetch 완료를 보장했지만 그 자체가 네트워크/서버 에러로 실패할 경우 `onSuccess` 가 예외만 던지고 UI 상태가 "Opening..." 로더에 멈춤 · 사용자 복구 경로 없음.
- **수정**: `onSuccess` 내 refetch 를 `try/catch` 로 감싸고 영어 Toast + `refetchError` state 세팅 → `StockLocationSelectionStep` 이 "Opening..." 대신 **Retry 버튼** 렌더 → 탭 시 `retryOpenStore()` 로 재시도. 성공 경로 코드 흐름은 변화 **0**.

---

## 2. 산출물

| 파일 | 변경 | 비고 |
|------|------|------|
| `components/setup-wizard/SetupWizardContent.tsx` | 수정 | Toast import · `refetchError` state · `finishAndNavigate()` useCallback (try/catch · throwOnError + 데이터 완전성 재검증) · `retryOpenStore()` useCallback · prop 2개 자식에 전달 · 기존 `handleStockLocationAutoComplete` 바디 변화 0 |
| `components/setup-wizard/StockLocationSelectionStep.tsx` | 수정 | `refetchError`/`onRetryOpenStore` prop 수신 · `retryPending` state · Retry 분기 조기 return · 기존 자동 선택 effect 및 가드 완전 유지 |
| `scripts/m1-1105-h-assertions.mjs` | 신규 | +2 pair (코드 shape 16 + state 머신 모의 11 = 27/27) |
| `scripts/m1-1105-h-playwright.mjs` | 신규 | `_harness.mjs` 공용 · 500 → Retry → 200 복구 시나리오 9/9 |
| `scripts/m1-1105-a-assertions.mjs` · `scripts/m1-1104-b-assertions.mjs` | 매처 2건 승계 수정 | `|| retryPending` 포함 · 로직 변경 0 (M1-1105-C 와 동형 "로직 변경 0" 패턴) |

### `finishAndNavigate` 핵심

```ts
const finishAndNavigate = React.useCallback(async () => {
  try {
    await queryClient.refetchQueries({ queryKey: ['settings'] }, { throwOnError: true });
    const data = queryClient.getQueryData(['settings']);
    if (!data || !data.sales_channel || !data.region || !data.stock_location) {
      // useSettings 는 각 retrieve 실패를 내부 .catch 로 삼키므로
      // refetchQueries 자체는 reject 하지 않는다 → 완전성 체크 필수.
      throw new Error('Store settings missing after refetch');
    }
    router.replace('/(tabs)/products');
    return true;
  } catch (err) {
    Toast.show({ type: 'error', text1: "Couldn't load store settings", text2: 'Tap Retry to continue.' });
    setRefetchError(err instanceof Error ? err : new Error(String(err)));
    return false;
  }
}, [queryClient]);
```

### Retry UI (step)

```ts
if (!!onAutoSelect && refetchError && !retryPending) {
  return (
    <View className="flex-1 p-5">
      <View className="mb-auto mt-auto gap-4">
        <Text className="text-center text-lg">Couldn&apos;t load store settings</Text>
        <Text className="text-center text-ink-subtle">
          Your store is saved. Tap Retry to open Meros POS.
        </Text>
        <Button testID="setup-wizard-retry-open-store" onPress={...}>Retry</Button>
      </View>
    </View>
  );
}
```

---

## 3. 검증 (전원 pass)

### TypeScript
```
$ npx tsc --noEmit   → exit 1 (잔존 global.css TS2882 · master 동일 · pre-existing)
```
신규 에러 **0**.

### 어설션 (+2 pair · 상시 ⓒⓓ)
```
$ node scripts/m1-1105-h-assertions.mjs   → 27/27 passed · 0 failed
  (코드 shape 16 + state 머신 모의 11)
$ node scripts/m1-1105-a-assertions.mjs   → 33/33 passed · 0 failed  (|| retryPending 승계)
$ node scripts/m1-1104-a-assertions.mjs   → 44/44 passed · 0 failed
$ node scripts/m1-1104-b-assertions.mjs   → 26/26 passed · 0 failed  (|| retryPending 승계)
$ node scripts/m1-1105-a-repro.mjs        →  5/5 passed · 0 failed
```

### Playwright (상시 ⓐ · `_harness.mjs` 공용)
```
$ rm -rf dist && npx expo export -p web --output-dir dist   → single-output 번들
$ node scripts/m1-1105-h-playwright.mjs    →  9/9 passed · 0 failed
  (1) refetch 500 → "Couldn't load store settings" 노출
  (2) Retry 버튼 (testID setup-wizard-retry-open-store) 노출
  (3) 현 URL 아직 /products 아님 (navigate 억제됨)
  (4) Retry 성공 → /products 도달
  (5) 상품 그리드 렌더 (≥1 카드)
  (6-8) sales-channels/regions/stock-locations retrieve 2회+ (fail→retry)
  (9) "Maximum update depth exceeded" 0건

$ node scripts/m1-1105-b-playwright.mjs    →  6/6 passed · 0 failed
```

---

## 4. Kyu 아이패드 실기 (선택적 · 네트워크 재현)

- [ ] 네트워크 끊김 시 재조회 실패 → 흰 화면 갇힘 없이 "Couldn't load store settings" + Retry 노출
- [ ] 네트워크 복구 → Retry 1회 탭 → 상품 화면 진입
- [ ] (대조) 정상 네트워크: 기존 Cash 결제·setup wizard 자동 선택 플로 변화 0

---

## 5. 규약 정합

| 규약 | 정합 |
|------|------|
| 허용 주인 파일 (SetupWizardContent · StockLocationSelectionStep) | ✓ |
| 영어 UI | ✓ ("Couldn't load store settings" · "Tap Retry to continue." · "Your store is saved. Tap Retry to open Meros POS." · "Retry") |
| 성공 경로 변화 0 | ✓ (refetch 성공 시 `router.replace('/(tabs)/products')` 동일 경로) |
| M1 어설션 +2 pair (코드 shape + state 머신) | ✓ (`scripts/m1-1105-h-assertions.mjs` 27건) |
| `_harness.mjs` 공용 · refetch 500 → Retry → 성공 1건 | ✓ (`scripts/m1-1105-h-playwright.mjs` 9건) |
| 승계 수정 외 로직 변경 0 | ✓ (prior assertions: `|| retryPending` 승계) |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (R0-1105-G 관찰 — setup wizard "Opening..." 영구 갇힘) |
| 보강 | +2 (상시 ⓐ Retry 시나리오 하네스 · 상시 ⓒⓓ Retry state 머신 어설션) |
| 미완 (Kyu 도장) | 선택 (네트워크 재현 환경 전제) |
| **총 순증감** | **+1 해소 · +2 보강** |

---

## 7. 다음 게이트

1. **PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/35 — 머지 가능 (네이티브 성공 경로 변화 0).
2. 열린 M1 PRs: #23 (M1-1105-A wizard loop fix · 아직 열림) · #29 (M1-1105-G rebase · M3 소유).
3. 후속 라운드: 다른 M1 큐 소진 (R0 관찰 추가 시 반영).

---

*M1-1105-H · 2026-11-06 · setup wizard refetch 실패 Retry UI · fork PR #35 · 어설션 27/27 + Playwright 9/9 + M1 회귀 108/108 + repro 5/5 + E2E 6/6 전원 pass · 성공 경로 변화 0*
