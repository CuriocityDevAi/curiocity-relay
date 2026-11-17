PR #183 · 크기 1.5배 · 영수증 카드 토큰 통일 · 타이밍 변경 0

## 변경 요약
- SlipMergeAnim.tsx 단일 파일 수정
- 슬립 크기: 72×100 → 108×152 (약 1.5×)
- borderRadius 6→12 · borderWidth 1.5→1 (ReceiptCard/PaymentSlipCard 와 동일)
- 하드코딩 hex (#fff · #f3f4f6 · #d1d5db · #9ca3af · #374151) 전면 제거 → TOKEN_SURFACE / TOKEN_LINE / TOKEN_INK
- 그림자: shadowRadius 8 · shadowOpacity 0.1 · elevation 3
- 플레이스홀더: "SLIP\n1" 텍스트 → "PAYMENT N of 2" 헤더 + hairline 선 (ReceiptCard 선 스타일)
- 깊이감: scale1 1.0→0.96 (SLIDE_MS 동안) — slip1이 slip2 아래로 들어가는 느낌
- SLIDE_MS=420 · FADE_MS=300 · TOTAL_MS=740 불변 (diff 타이밍 상수 변경 0)
- 색 어설션 37/37 통과 · tsc 신규 오류 0
