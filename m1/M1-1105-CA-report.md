# M1-1105-CA 완료 리포트

draft PR #139 머지 대기 — `customer-display-plan.md` 10절 + `loyalty-phase1-plan.md` 스텁 작성 완료.

## 결과

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/139 (draft · docs-only · base master)
- 브랜치: `docs/m1-1105-ca`
- 커밋: `docs(loyalty): M1-1105-CA — 손님용 화면(고객 iPad) 설계서 · loyalty-phase1-plan 스텁`

## 생성 파일

| 파일 | 성격 |
|---|---|
| `docs/plans/customer-display-plan.md` | 신규 · 10절 설계서 |
| `docs/plans/loyalty-phase1-plan.md` | 신규 스텁 · §1-2·§3-2·§5 이관 안내 |

## 원장 대사 ✓

| 항목 | 반영 절 |
|---|---|
| CD-1 화면 7개 | §1 |
| CD-2 컬러 테마 20종 | §4-2 |
| CD-3 이미지/기본형 | §1 |
| CD-4 언어 지구본 | §7 |
| CD-5 매장별 설정 | §7 |
| CD-6 이벤트 테마 7종 | §4-3 |
| CD-7 Admin 달력 | §5·§6 |
| CD-8 Admin Simulate | §6-2 |
| CD-9 손님 iPad 버튼 없음 | §6 |
| CD-10 이슬람력 자동 채움 | §5-2 |
| CD-11 버튼 정렬 | §1 |
| CD-12 Receipt 애니메이션 | §2 |
| CD-13 흐름 분기 | §2 규칙 A·B |
| CD-14 입력 중 결제 | §2 규칙 C |
| P-1 건너뛰기·30초 | §1·§2 규칙 B |
| P-2 다음 주문 보류 | §2 규칙 E |
| P-3 결제 후 직전 주문 적립 | §2 규칙 F·§3 |
| P-4 Done→idle 3~5초 | §2 규칙 D |

## 주요 권장안 결정

| 항목 | 채택 | 이유 |
|---|---|---|
| Simulate 팝업 구현 방식 | rnw iframe (손님 앱 공유) | 렌더러 1개 유지 원칙 |
| 테마 데이터 위치 | 코드 상수 + DB에 key만 | 버전 충돌 방지 |
| 이슬람력 계산 | Intl 내장 → hijri-date fallback | 의존성 최소화 |
