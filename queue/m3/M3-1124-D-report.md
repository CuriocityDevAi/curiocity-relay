M3-1124-D-report
DONE · PR #249 (fix/M3-1124-D-sell-scroll) · 원인 추정: FlashList estimatedItemSize 미설정 → iOS Yoga 콘텐츠 높이 0 계산 → 스크롤 비활성화 · 네이티브 재현: 불가(expo run:ios 환경 미비) · 웹 e2e 9/9 통과

## 원인 분석

| 항목 | 내용 |
|------|------|
| 주 원인(추정) | `FlashList`에 `estimatedItemSize` 미설정 → iOS 네이티브에서 콘텐츠 높이 0 계산 → 스크롤 비활성화 |
| 복합 원인 | 세로 모드에서 `CartBottomBar`(≈56px)가 마지막 행을 가려 하단 상품 접근 불가 |
| #245 헤더 제거 영향 | `SellTopBar` 최상단 배치 후 `FlashList` 부모 높이 체인이 명시되지 않아 Yoga가 `flex:1` 미전파 |
| 웹 재현 여부 | Playwright e2e 에서 미재현 (R0-1124-A 판정과 일치) — `ScrollIntoViewIfNeeded` 로 대체 검증 |

## 수정 내용 (D1 — `app/(tabs)/sell.tsx`)

| 변경 | 효과 |
|------|------|
| `estimatedItemSize={220}` 추가 | FlashList 가 콘텐츠 높이를 올바르게 계산 → 스크롤 활성화 |
| `<View style={{ flex: 1 }}>` 래퍼 추가 | Yoga 높이 체인 명시적 보장 (iOS 레이아웃) |
| `contentContainerStyle={{ paddingBottom: 72 }}` | CartBottomBar 가림 방지 (56px + 여유) |
| `testID="sell-product-list"` 추가 | e2e 선택자용 |

## e2e 가드 (D2 — `e2e/flows/M3-1124-D-sell-scroll.spec.ts`)

9케이스 (3 항목 × 3 뷰포트: 390·820·1180) — **9/9 통과**

| 항목 | 내용 |
|------|------|
| ① 스크롤 도달 | 맨 아래 상품(prod_12) 스크롤 후 뷰포트 내 bounding box 확인 |
| ② 가림 없음 | 세로 모드 마지막 카드가 CartBottomBar 아래 감춰지지 않음 (paddingBottom 72px 효과) |
| ③ 클릭 차단 없음 | 마지막 카드 탭 → product-details 이동 (인터랙션 차단 없음) |

## 네이티브 재현 여부

- **불가**: `expo run:ios` 환경 미비. 원인은 코드 분석 + FlashList 공식 문서(estimatedItemSize 필수 명기) 기반 **추정**.
- iPad 실기 검증은 PR 본문 Kyu 항목으로 위임.

## PR 링크

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/249
