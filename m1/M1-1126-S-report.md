PASS 0639443f8

## 작업 요약

브랜치: `docs/M1-1126-R-domain-specs` (relay#57)
커밋: `0639443f8`

### REQ 1 — specs/domain/order-number.md §2.2 경고 + INDEX 꼬리
- §2.2 첫 줄에 `⚠ Kyu 확인 대기` 블록 추가:
  - 11-23 17:06 Kyu 원문: "이렇게 하자." — 매일 레지스터 오픈 때 #1부터 (`ledger/decision-cd-parallel-20261123.md:72`)
  - 11-26 22:13 Kyu 원문: "Square 처럼 1부터 99까지만 …" (`ledger/decision-kyu-4q-20261126.md:6`)
  - 현재 구현(storeport#465, 머지됨) = 매장별 이어감 명기
- "날짜와 무관하게 이어감"을 단정 표현에서 "초기화 타이밍 ← ⚠ 확인 대기"로 변경
- specs/INDEX.md 짧은 번호 행 요약 셀에 동일 경고 꼬리 추가

### REQ 2 — 23:07 결정 반영 (POS-SUCC-PHONEENTRY)
- `ledger/decision-success-single-phone-button-20261126.md` 를 branch에 추가 (main→branch 반입)
- pos-payment-flow.md `POS-SUCC-PHONEENTRY` 행 갱신:
  - 위치: `~~상단 칩~~ 삭제됨 (V4-7 → 11-26 23:07 Kyu)`
  - 승인된 모습: Phone entry 칩 삭제 · 오른쪽 위 상태 칸이 대신 · Order 상세 Phone entry는 유지
  - 출처: `ledger/decision-success-single-phone-button-20261126.md:3`
  - 일치 여부: **불일치** — #276 에 칩 존재 · M3 다음 라운드 적용
- 보존 테스트 2곳 갱신 (인라인 + 목록 테이블)

### 보존 요소 확인
- ledger/decision-* 원문 불변 (꼬리표 없음 — 이번 작업 범위 아님)
- #57의 나머지 콘텐츠 전부 보존
