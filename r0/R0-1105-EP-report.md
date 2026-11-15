# R0-1105-EP 리뷰 보고서

**판정**: #139 CHANGES · #259 APPROVE(△ 1개)

---

## REQ 1 — EM CHANGES 항목 해소표

### EM CHANGES 3 blocking 항목

| # | 항목(EM 판정) | 반영 | 위치 |
|---|---|---|---|
| ① | `status` 충돌 수정 (blocking) | ✓ | #259 §1-1: `snapshot_state: "active"\|"paid"\|"expired"` 별도 필드 · `status: "idle"\|"checkout"\|"completed"` 불변 유지 · §1-2 1:1 매핑표 |
| ② | 상태 머신 결제 실패/취소·연결 끊김 경로 추가 (blocking) | ✓ | #139 §2: 규칙 G(결제 실패→Cart 유지) · 규칙 H(폴링 오류 3회→경고 오버레이) · 규칙 I(POS 재시작·expired·pre_entry 초기화) |
| ③ | rnw iframe CSP · 네이티브 모듈 처리 방안 (risky) | ✓ | #139 §6-2: same-origin 서빙 채택 + 위험 3개(CSP·네이티브 모듈·버전 동기화) 대응안 표 + A0 라운드 신설 |

### 나머지 EM 항목

| 항목 | 반영 | 위치 |
|---|---|---|
| `receipt` 필드 소멸 | ✓ | #259 §1-1 `receipt` 복원 · §1-3 출처 표 |
| R3 ↔ link-phone 중복 적립 위험 | ✓ | #259 §3-1 `linkCustomerToOrder` 멱등 · §4 `needs_post_payment_earn` → 멱등 차단 |
| `link_window_closed` ↔ `link_open_until` 동기화 | ✓ | #259 §3-3 `link_open_until` 단일 가드 통일 |
| CD-1 복합 표기 추적 어려움 | ✓ | #139 §1 주석 "CD-1 5개 + CD-12·P-1 2개 추가 = 7개" |
| CD-6 원장 미확정 상태 | ✓ | decision-customer-display-20261115.md CD-6 "확정(Kyu 07:52 '완벽한듯! 구현시작하자')" |
| POS 재시작 `pending_display` 미처리 | ✓ | #139 §2 규칙 I: TTL 10분 자동 expired · 새 세션 즉시 expired |
| 10초 경계 타이머 기준 모호 | ✓ | #139 §2 말미 "타이머 기준 — 서버 시각(`server_now`)" 명시 |
| `pre_entry` 초기화 타이밍 | ✓ | #139 §2 규칙 I: 새 스냅샷 생성 시점에 서버에서 false 초기화 |
| 서버 계약 storeport 이관 권장 | ✓ | #259 신규 `customer-display-server-contract.md` |
| A1이 rnw 빌드 없이 착수 불가 | ✓ | #139 §8 A0 라운드 신설(G1 완료 후) |
| S1 분리 권장(S1a·S1b) | ✓ | #259 §5 · #139 §8 S1a·S1b 분리 |
| G1 45분 초과 가능 | ✓ | #139 §8 G1 "45분 초과 시 G1a·G1b 분할" 대안 명시 |

---

## REQ 2 — #259 서버 계약 ↔ #258 실제 코드 필드명·에러코드 대조

| 항목 | #258 구현 | #259 계획서 | 판정 |
|---|---|---|---|
| 엔드포인트 | `POST /admin/pos/orders/:id/customer` | 동일 | ✓ |
| `needs_post_payment_earn` | 응답 플래그(완료 주문·P-3 창 열린 경우) | §4에 언급 "멱등으로 중복 적립 차단" | ✓ |
| 409 에러코드 | `link_window_closed` | `throw new LinkWindowClosedError(); // 409 link_window_closed` | ✓ |
| `register_session_id` 창 판정 | `listOrders({ metadata: { register_session_id } }, { take:2, DESC })` → "더 최근 주문 존재" | §3-3: S1b에서 `link_open_until != null && <= now` 대체 예정("R3 경로 리팩터" S1b 범위) | △ |

**△ register_session_id 불일치 상세**: #258 현행 코드는 `register_session_id` 기반 판정. #259 §3-3은 `link_open_until` 단일 가드로 대체 계획이고 S1b "src/api/admin/pos/orders/[id]/customer/route.ts 수정"이 명시됨 → 계획 수준 OK. 단 **S1b 완료 전에 #258이 먼저 머지되면 두 가드 로직 불일치 임시 공존** → "S1b 착수 전 R3 머지 금지" 또는 순서 명시 권장(현재 계획서에 없음).

---

## REQ 3 — `linkCustomerToOrder` 단일화 + R4 경계

- **단일화** ✓: R3(`POST /orders/:id/customer`)과 손님 앱(`POST /snapshots/:id/link-phone`) 모두 `linkCustomerToOrder(order_id, phone_e164, source)` 1개 함수
- **멱등** ✓: `order_id + phone_e164` 쌍 중복 차단 · `link_open_until` 경과 시 거부(#259 §3-2)
- **R4 경계** ✓: `linkCustomerToOrder` → `triggerEarnHook` → R4 멱등 호출. R4는 R3 완료 후 착수(§4 명시). 겹침 없음
- **△ `needs_post_payment_earn` 플래그 용도 미명시**: 플래그를 받은 POS 앱이 별도 적립 로직을 추가하면 R4 중복 호출 가능성. 멱등으로 실제 중복 적립은 없으나 "UI 힌트 전용 · 별도 적립 트리거 금지"를 계획서 §4에 명시해야 POS 개발자 혼동 방지. APPROVE 조건으로 명시 권장.

---

## REQ 4 — 이슬람력 예시 날짜 → **CHANGES**

#139 §5-2 현재 표:

| 이벤트 | 2026 예상(참고) |
|---|---|
| Ramadan 시작 | 2026-02-18 |
| Lebaran | 2026-03-20 |
| Maulid Nabi | 2026-09-10 |

오늘 2026-11-15 기준 세 날짜 모두 이미 경과. **미수정**.

2027 예상 날짜(이슬람력 1448H 기준):

| 이벤트 | 2027 예상 |
|---|---|
| Ramadan 시작 | 2027-02-07 |
| Lebaran (Idul Fitri) | 2027-03-09 |
| Maulid Nabi | 2027-08-29 |

→ 열 헤더 "2026 예상(참고)" → "2027 예상(참고)" + 날짜 3개 갱신 필요. **CHANGES.**

---

## REQ 5 — 라운드 표 크기·파일 겹침·의존 순서

| 라운드 | 크기 | 파일 겹침 | 의존 순서 | 비고 |
|---|---|---|---|---|
| S1a | △ 타이트(45분) | — | ✓ 없음 | 필드 7개 신규 · EM 반영 |
| S1b | △ 타이트(45분) | — | ✓ S1a·R3 후 | "R3 경로 리팩터" 포함 · S1b가 R3에 역방향 의존 |
| S2 | ✓ | — | ✓ S1a 후 | |
| G1 | △ 타이트 | — | ✓ S1a 후 | G1a/G1b 분할 대안 명시 ✓ |
| G2 | ✓ | G1과 같은 디렉터리 순차 | ✓ G1 후 | |
| G3 | ✓ | — | ✓ G2 후 | |
| **A0** | ✓ | — | ✓ G1 후 | 신설 — rnw 빌드 파이프라인 선행 ✓ |
| A1 | ✓ | — | ✓ A0 후 | |
| A2 | ✓ | — | ✓ A1·S2 후 | |
| POS | ✓ | `apps/pos/` — G1~G3 `apps/customer-display/`와 별도 | ✓ G1·S1a 후 | |

---

## REQ 6 — `apps/customer-display/` 경로 권장안 → **CHANGES**

현재 fork(CuriocityDevAi/agilo-medusa-pos-fork)는 **단일 Expo 앱 루트 구조**(`apps/` 없음 · `app/`·`components/` 등이 루트에 위치). #139 §8에서 G1~G3 "건드릴 파일" = `apps/customer-display/screens/` 신규, POS = `apps/pos/screens/checkout/`으로 암묵적 모노레포 구조를 가정하나 설계서 어디에도 아래 항목이 미명시:

1. 모노레포 전환 계획(언제·도구·현행 루트 구조 이전 방법)
2. 별도 레포 운용(손님 앱 별도 Git 레포)
3. 단일 루트 유지(경로 수정 — `apps/customer-display/` → 루트 직접)

**CHANGES 항목**: §8(또는 §9) 에 "손님 앱 레포 위치" 결정 명시 필요 — G1·A0 착수 전 결정 없으면 파일 경로가 구현마다 달라질 위험.

---

## 판정 요약

| PR | 판정 | 사유 |
|---|---|---|
| fork #139 | **CHANGES** | ① §5-2 이슬람력 날짜 2026 → 2027 미갱신 ② §8 `apps/customer-display/` 경로 — 모노레포 전환 vs 별도 레포 권장안 미명시 |
| storeport #259 | **APPROVE** | EM CHANGES 전 항목 반영 · #258 필드명/에러코드 일치(register_session_id△ S1b 로드맵 명시) · linkCustomerToOrder 단일화 + 멱등 + R4 경계 명확 · △: `needs_post_payment_earn` 플래그 POS 앱 소비 방식 §4에 추가 권장 |
