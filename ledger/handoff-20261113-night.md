# handoff 2026-11-13 새벽 (Kyu 2시간 위임 00:14~02:10 WIB)

직전 = handoff-20261112.md · **open-requirements.md 병합은 다음 세션 첫 일(미완)**

## 머지
- storeport #235 QRIS 시뮬레이션 런북(docs) · #237 환불·반품 통합 테스트(M2-BC)
- fork #118 결제수단 버튼 아이콘(M3-BN/BO · Kyu 11-12 23:55) · #119 QR 화면 "Simulate payment (test)" 버튼(M0-BK/BL) · #120 void/refund 노출 테스트(M2-BC) · #121 master lint 오류 0(M1-BM) · (#117 M3-BM 은 허브가 직접 머지)

## 대기 (Kyu)
- **storeport #233** Xendit 키 설정 화면(R0-DE 통과 · 돈/설정 → Kyu 머지 결정)
- **storeport #236** qris-simulate 서버(R0-DG 통과 · #233 의존) — 이게 머지돼야 iPad 버튼(#119)이 보임
- 실기: 결제수단 버튼 아이콘(지금) · QRIS 테스트 결제(#233·#236 머지 후)
- 결정: 다음 큰 덩어리(오케 추천 = EAS 새 빌드 + BT-58D 프린터·서랍) · 외부 신청 3건(Xendit Verify Your Business · Meta WA 번호 · MTI EDC API)

## 새로 생긴 일
- fork master vitest `void-refund-nav-bc` 2 fail (M1-BM 보고 · #120 머지 후 #118/#119 와 겹침 추정) → 다음 세션 M2 수정 발부
- fork lint warnings 46(react-hooks 규칙 · 동작 변경 없이 못 없앰 · eslint-disable 금지로 유지)
- 대시보드 Transactions 에 PENDING v3 payment request 는 안 보임(런북 §0 기록)

## 사고 · 교훈
- 오케가 M2-1105-BA(기존 스크롤 진단)를 같은 ID 로 덮어씀 → 원복 · 새 일은 BC. **ID 발급 전 queue 폴더 확인 필수.**
- M3 허브가 #117 을 직접 머지 → 이후 프롬프트에 "머지는 오케 몸" 명시.
- M0-BJ 런북이 대시보드에서 pr_id 복사 가능하다고 적음(실제 불가) → 버튼 방식으로 전환.
- R0-DF 가 "주의"로 낮춰 적은 #236 세션 조회 키 버그는 실제로 항상 404 였음 → 리뷰 "주의" 항목도 오케가 판독할 것.
- fork 체크 API 는 Claude GitHub 앱 권한 403 → mergeable_state + 허브 리포트로 판정(권한 추가 시 Checks: read 필요).
