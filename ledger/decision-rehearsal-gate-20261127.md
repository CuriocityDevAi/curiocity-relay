# 결정: 아이맥 통합 리허설 운영 3원칙 (Kyu 2026-11-27 16:39 "ㅇㅋ")
배경: 오케 16:2x 아이맥 실측 — 메모리 여유 52% · swap ≈0 · load15 10.2(8코어 · CPU 가 병목) · 무거운 CI 평균 대기 2분 · 디스크 86GB(임시 폴더 25GB 별건 → M2-1127-M). Correct→Welcome 버그를 리허설 case1b(fork#287)가 이미 빨강으로 잡았으나 관문이 아니어서 머지됨.
1. **한 번에 1개만** — 리허설은 무거운 CI 칸에서 순차 · 상시 서버 없음.
2. **멈춤 기준** — 무거운 CI 평균 대기 > 5분 또는 아이맥 swap > 1GB 이면 리허설 빈도 축소(오케 감시가 ci-watch·imac.json 으로 확인).
3. **관문 먼저** — 손님 화면·POS 번호 입력 흐름을 바꾸는 PR 은 리허설(case1·case1b…) 초록이어야 머지 · R4(시나리오 확대)는 그다음.
발부: M1-1127-I (M1 큐 · R2 다음).
- 20:52 Kyu "열쇠 넣음" — storeport Secrets `FORK_DISPATCH_TOKEN` 등록(fine-grained · fork 전용 · Contents RW 안내) → storeport 흐름 PR 도 리허설 자동 호출 가능 · 시크릿 설치 후에는 관문 엄격 적용(경고 → 차단).
- 21:17 Kyu "A" — 리허설 관문 예외 불허: storeport#480 은 리허설 환경(FlashList hidden) 수정(M1-1127-L) 뒤 리허설 초록 + heavy-mac 초록이어야 머지. 오케 단독 예외 금지.
