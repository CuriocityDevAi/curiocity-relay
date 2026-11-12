# M3-1105-BC Report — ViewShot 없는 옛 dev client 안전 대체

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `lib/receipt-share.ts` | `isViewShotAvailable()` 추가 · `captureAndShareReceipt` 시그니처 `receiptNo→receipt` · 모듈 없으면 텍스트 Share + toast |
| `app/orders/[orderId].tsx` | `viewShotEnabled` 체크 → ViewShot 조건부 렌더 · `captureAndShareReceipt` 인자 갱신 |
| `__tests__/receipt-share-fallback.test.ts` | 신규 · Vitest 2케이스 (있음/없음) |

## 분기 로직

```
isViewShotAvailable() = !!NativeModules.RNViewShot

있음 → ViewShot 렌더 O → capture() → Sharing.shareAsync(PNG)
없음 → ViewShot 렌더 X → Share.share(텍스트) + showToast.info('Image share needs app update')
```

## 테스트 결과

```
vitest run __tests__/receipt-share-fallback.test.ts
  ✓ ViewShot 모듈 있음: PNG 캡처 후 shareAsync 호출
  ✓ ViewShot 모듈 없음: 텍스트 Share + "Image share needs app update" 토스트

Tests  2 passed (2)

vitest run (전체)
Tests  46 passed (46)
```

## 실행 환경 검증

- iOS 시뮬레이터 / 실 iPad: 네이티브 모듈 의존이므로 미검증 (EAS 재빌드 환경 없음)
- Vitest 단위 테스트로 두 분기 로직 검증 완료

## PR #108

- 같은 브랜치 `feat/m3-1105-ba-refund-receipt-share` 에 commit `23f3a97` push
- PR 본문 "Kyu 확인 항목" 에 "옛 빌드에서 Share = 텍스트 + 토스트" 항목 추가
