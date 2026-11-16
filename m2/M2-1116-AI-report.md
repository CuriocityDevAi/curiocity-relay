# M2-1116-AI 판정: PR #108 (9598b5f) 누락 — orders 화면만 고쳐지고 success 화면 미적용. 재빌드 불필요(react-native-view-shot 6.1.1 이미 package.json).

## 회귀 원인

| 역할 | 커밋 | PR |
|------|------|----|
| 이미지 공유 도입 (orders 화면) | `9598b5f` feat(m3-1105-ba): Share PNG 캡처 | PR #108 |
| success 화면 최초 생성 (텍스트 공유) | `607bc37` feat(m3-1105-d/h): cash tender flow + success | PR #31 |

**덮은 커밋**: 없음(덮은 게 아님). PR #108이 `app/orders/[orderId].tsx`에만 ViewShot + `captureAndShareReceipt`를 추가하고 `app/checkout/success/[orderId].tsx`를 **누락**했음. success 화면은 초기 커밋 `607bc37`의 `Share.share({ message: text })` 텍스트 공유를 그대로 유지.

**원인 한 줄**: PR #108 이 orders 화면만 수정하고 success 화면 누락 — 덮은 것이 아니라 처음부터 고쳐지지 않았음.

## 재빌드 필요 여부

- `react-native-view-shot: 6.1.1` / `expo-sharing: ~58.0.23` 이미 `package.json` 존재
- 같은 dev client에서 orders 화면 Share가 이미지로 작동하면 **재빌드 불필요**
- 아직 dev client가 없다면 `eas build --profile development` — **Kyu 직접 실행**

## 복구 내용

- `app/checkout/success/[orderId].tsx`: `Share.share({ message: text })` → `captureAndShareReceipt(receiptViewShotRef, receipt)`
- `components/payment/SuccessReceiptAnim.tsx`: `viewShotRef` prop + lazy require ViewShot + ReceiptCard 조건부 래핑
- `__tests__/checkout-success-share.test.ts`: 이미지 URI 공유 단위 테스트 2 cases

## 테스트 결과

```
Test Files  34 passed (34)
Tests  386 passed | 6 expected fail | 2 todo (394)
```

새 테스트 `__tests__/checkout-success-share.test.ts` 2 cases:
- ViewShot 모듈 있음 → `shareAsync(PNG uri)` 호출, `Share.share` 텍스트 호출 없음 ✅
- ref.current null → 아무것도 공유하지 않음 ✅

## PR

PR #160: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/160
