PLAN plans/cd-scenario-e2e-imac-20261126.md · 권장 환경 a · 라운드 6개

## 완료 항목

- 계획서 신규 작성: `plans/cd-scenario-e2e-imac-20261126.md`
- 커밋: `f60a06fbd` · relay main 직접 push 완료

## 계획서 요약

### 환경 권장: (a) 아이맥 로컬
commerce-core + Postgres(이미 설치) + POS web + CD web + Playwright 2브라우저.  
비용 없음·운영 오염 없음·허브 금지 조항 저촉 없음.  
(b) railway CLI 금지로 허브 자동화 불가, (c) 연속 주문 시나리오 불가.

### 시나리오 9개
Case 1 · 2-A · 2-B · 2-C(QRIS) · 연속(주문 A 건너뜀 → Next customer → 주문 B) · 새로고침/재연결 · Next customer 강행 · 확인 20초 타임아웃 · 나눠 결제.  
각 시나리오에 CD 화면·POS 칩 문구·Hand over 활성·적립 칩 판정 항목 명시.

### 발동 방식
storeport main / fork master 머지 후 자동 + nightly cron 1회.  
runner label `imac-e2e` 로 기존 4 러너와 큐 분리 (concurrency group).

### 결과 보고
`relay/logs/e2e-cd-pos/` JSON · `assets/e2e/cd-pos/` 스크린샷·영상·HTML 리포트.  
`status/ci-watch.md` 에 한 줄 표시.

### 라운드 6개 (총 230분 추정)
R1 하네스(M1) → R2 Case 1(M1/M0) → R3 Case 2-A/B(M0) → R4 연속+새로고침(M1) → R5 엣지(M0) → R6 CI 연결(R0/M1).  
Kyu 손: R1 테스트 DB 생성 · R6 runner label 등록 · R5 QRIS QR 버그 수정 후 활성화.

### 열린 질문 5개 (Kyu 결정 필요)
Q1 테스트 DB 방식 · Q2 양쪽 workflow 여부 · Q3 나눠 결제 지원 여부 · Q4 QRIS stub 선행 여부 · Q5 runner label 이름.
