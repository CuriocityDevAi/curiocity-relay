# M1-1105-CB 완료 리포트

**결과**: fork #139 추가 커밋(docs/m1-1105-ca · 07efe3b) + storeport 신규 PR #259(docs/m1-1105-cb-cd-server-contract)

---

## R0-EM 항목별 반영표

### fork PR #139 (`customer-display-plan.md`) 반영

| REQ | 항목 | 판정 | 반영 내용 |
|---|---|---|---|
| REQ 1 (blocking) | `status` 충돌 | ✓ | §3 → storeport 이관. `snapshot_state` 별도 필드·1:1 매핑표는 server-contract §1-2 에 |
| REQ 2 | `receipt` 필드 복원 | ✓ | server-contract §1-1 복원 · §1-3 출처 표. fork §3 → 참조 링크 |
| REQ 3 (blocking) | 상태 머신 빈틈 | ✓ | §2 다이어그램에 규칙 G(결제 실패/취소)·규칙 H(폴링 오류 3회 경고 UI)·규칙 I(POS 재시작·pre_entry 초기화) 추가. 타이머 기준=서버 시각 노트 추가 |
| REQ 4 | 번호 연결 단일화 | ✓ | server-contract §3 에 `linkCustomerToOrder` 공유 함수·멱등·link_window_closed 통일. fork §3 → 참조 링크 |
| REQ 5 (non-blocking) | rnw Simulate 위험 | ✓ | §6-2에 CSP frame-src 대응 표·native 모듈 stub 전략·빌드 버전 동기화 추가. A0 라운드 신설 |
| REQ 6 | 라운드 재분할 | ✓ | §8-1: S1→S1a/S1b 분할, A0 신설, G1 45분 초과 시 G1a/G1b 분할 명시 |
| REQ 7 | CD-1 표기 | ✓ | §1 표 헤더 위에 "CD-1 5개 + CD-12·P-1 로 2개 추가 = 7개" 주석 추가 |
| REQ 8 | 서버 계약 storeport 이관 | ✓ | §3 전체 → storeport. fork §3: 참조 링크 1줄 |

### storeport PR #259 (`customer-display-server-contract.md` 신규) 반영

| REQ | 항목 | 위치 |
|---|---|---|
| REQ 1 | `status` 유지 · `snapshot_state` 신설 · 1:1 매핑표 | §1-1 · §1-2 |
| REQ 2 | `receipt` 필드 복원 · 출처 표 | §1-1 · §1-3 |
| REQ 4 | `linkCustomerToOrder` 단일화 · 멱등 · link_window_closed 통일 | §3 |
| REQ 6 | S1a/S1b/S2 라운드 명세 | §5 |
| REQ 8 | 서버 계약 전문 이관 | 문서 전체 |

### storeport `loyalty-phase1-plan.md` §3-2

| 변경 | 내용 |
|---|---|
| v2 참조 한 줄 추가 | `> **v2 확장** → customer-display-server-contract.md 참조 (M1-1105-CB)` |
