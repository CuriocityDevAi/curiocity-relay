#333 워드마크 실제 높이 16dp = POS 동일

## 계산

### POS (MerosLogo kind="wordmark", feat/M3-1117-M-splash-size-font)
- viewBox: 312×90, height: 28dp
- transform: `translate(10,74) scale(0.074,-0.074)`
- 글리프 전체 높이: 712 units (cap 700 + descent 12)
- 캔버스 높이: 712 × 0.074 = 52.69 cu
- 렌더 높이: 52.69 × (28/90) = **16.39dp**

### 손님 화면 (MerosWordmark)
- viewBox: 3920×712 (712 = 글리프 전체 높이)
- transform: `translate(0,700) scale(1,-1)` → 1:1 scale
- height param = 렌더 높이 dp (그대로)

### 조정
- POS 렌더 높이 16.39dp → 정수 16dp
- `SplashAnimation.tsx:129` height: 26 → **16**
- 오차: |16 − 16.39| / 16.39 = 2.4%

## 변경
- `apps/customer-display/src/components/SplashAnimation.tsx`: height 26→16
- `src/components/__tests__/splash-wordmark.test.ts`: height=26 케이스 → height=16 케이스 + POS 렌더 높이 오차 ≤5% 검증

## 결과
- 테스트: 144/144 pass
- tsc: 신규 error 0
