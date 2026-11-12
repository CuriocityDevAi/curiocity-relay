# 결정 — 결제수단 버튼 아이콘 · QRIS 테스트 결제 버튼 (Kyu 11-12 23:55 · 11-13 00:09 WIB)

출처: handoff-20261113.md §6 (원장 미작성분을 결정 파일로 옮김 · 11-13 오케 작업자)

## D1. 결제수단 선택 버튼 아이콘 (Kyu 11-12 23:55 WIB · 원문)
> "Payment 할때 Cash Card QRIS 옵션 고르는 버튼에도 Text 오른쪽에 아이콘을 넣어주었으면해."

- 처리: M3-1105-BN → fork [#118](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/118) 머지 (+ M3-1105-BO playwright 타임아웃 수정 포함)
- 확정 모양: Cash / Card / QRIS 글자 오른쪽에 아이콘 · 선택 상태 = 흰색 아이콘 · 버튼 크기 불변 · 나눠 결제(Pay in parts) 화면도 동일
- 상태: **실기 필요(K2)** — iPad 결제 화면에서 확인

## D2. Xendit 에 Payment Request 기록이 없음 → 테스트 결제 버튼 (Kyu 11-13 00:09 WIB · 원문)
> "xendit 에서는, Payment Requests 된 레코드가 없어"

- 오케 해석: QR 만 띄우고 실제 결제(시뮬레이션)를 한 적이 없어 Xendit 대시보드에 결제 요청 기록이 안 생김. 대시보드에서 pr_id 를 복사해 시뮬레이션하는 방식은 실제로 불가였음(M0-1105-BJ 런북 · storeport #235 docs 머지).
- 처리: QR 화면 하단 "Simulate payment (test)" 버튼(테스트 모드에서만)
  - 앱: M0-1105-BK → fork [#119](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/119) 머지
  - 서버: M0-1105-BK + M0-1105-BL(세션 조회 키 버그 — 항상 404 → pr_id 기반 수정 · 단위 10/10) → storeport [#236](https://github.com/CuriocityDevAi/storeport/pull/236) · R0-1105-DF/DG APPROVE · **#233(Xendit 키 저장 화면) 의존 → Kyu "머지해" 대기(K1)**
- 상태: K1 → 오케가 #233 → #236 순서 머지 → Railway 배포 2~3분 뒤 K3 실기(QRIS 테스트 결제)
