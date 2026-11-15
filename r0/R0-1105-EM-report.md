# R0-1105-EM 리뷰 보고서 — fork #139 customer-display-plan.md

**판정**: **CHANGES** — `status` 필드 충돌 + 상태 머신 결제 실패/끊김 경로 미정의 + rnw iframe CSP·네이티브 모듈 위험 미평가

---

## REQ 1 — CD-1~14 · P-1~4 원장 대사 판정

| # | 원장 의미 | 반영 절 | 판정 | 비고 |
|---|---|---|---|---|
| CD-1 | 화면 구성 5개(대기·결제중·번호입력·동의·완료) | §1 | △ | §1 표 헤더 "화면 7개 (CD-1·CD-3·CD-11)" 복합표기. 원장 CD-1 텍스트 "5개"인데 설계서 7개. 추가된 2개(KeypadAfter·Receipt)는 CD-12/P-1에서 별도 확정됐으므로 의미는 맞음. 단 §1 표 헤더에 "CD-12·P-1 추가 반영" 주석 없어 추적 어려움 |
| CD-2 | 컬러 테마 20종 · Butter Cream 기본 | §4-2 | ✓ | |
| CD-3 | 대기 화면 왼쪽 매장 이미지 · 미업로드 시 v1 기본형 | §1 Main · §6-1 | ✓ | |
| CD-4 | 영어 기본 · 지구본 → EN/ID/KO/JA/ZH | §7 | ✓ | |
| CD-5 | 매장명 · 세금이름/세율(0%면 숨김) · 적립률 | §7 | ✓ | |
| CD-6 | 이벤트 테마 7종 · 예약 기간 적용 · 장식 애니메이션 | §4-3 | △ | 원장 CD-6 상태 칸이 "디자인 v5 Kyu 판정 대기"로 남아 있음. flow 원장 07:52 "구현시작하자"가 v7 채택으로 해석 가능하나, 원장 CD-6 항목 자체가 "확정"으로 갱신 안 됨. 설계서는 확정된 것처럼 작성 |
| CD-7 | Admin 이벤트별 From~To 달력 · 달력 보기 | §5-1 · §6-1 | ✓ | |
| CD-8 | Admin Simulate 팝업 — 시안처럼 체험 | §6-2 | ✓ | |
| CD-9 | 손님 iPad 테마 버튼 없음 | §6-2 말미 | ✓ | |
| CD-10 | 이슬람력 자동 채움(기본값 · 매장 조정) | §5-2 | ✓ | |
| CD-11 | 번호 입력 버튼 가운데 정렬 | §1 Cart 행 | ✓ | |
| CD-12 | 결제 완료 → 영수증 애니메이션(Receipt 화면) | §2 규칙 A·B · §1 Receipt 행 | ✓ | |
| CD-13 | 번호 미리 입력→6→5 / 미입력→6→3' | §2 규칙 A·B | ✓ | |
| CD-14 | 입력 중 결제 → 끊지 않음 · 10초 초과 시 6 생략 | §2 규칙 C | ✓ | |
| P-1 | KeypadAfter "건너뛰기" + 30초 무입력 → idle | §1 KeypadAfter 행 · §2 규칙 B | ✓ | |
| P-2 | 다음 주문 보류(현재 흐름 완료까지) | §2 규칙 E | ✓ | |
| P-3 | 결제 후 번호 → 직전 주문 적립 · 다음 주문 Cart 전환 전까지 | §2 규칙 F · §3-2 | ✓ | |
| P-4 | Done 3~5초 뒤 대기 복귀 | §2 규칙 D | ✓ | |

---

## REQ 2 — 상태 머신(규칙 A~F) 빈틈

### 결제 실패/취소 경로 — ✗ 미정의
상태 다이어그램 `checkout(2) ──결제 완료──► receipt(6)` 만 있고 결제 실패/취소 시 경로가 없음. POS에서 결제 실패 이벤트 수신 시 Cart(2) 유지인지 Main(1) 복귀인지 미명시. 구현 시 임의 처리 위험.

### 손님 앱 연결 끊김 — ✗ 미정의
§2 어디에도 폴링 실패/오프라인 처리가 없음. storeport `loyalty-phase1-plan §2-2`에 "오류 3회 연속 → 경고 UI"가 명시돼 있는데 customer-display-plan에 그 내용이 이관되지 않음. POS측에서 연결 끊긴 iPad를 어떻게 감지하는지도 미정의.

### POS 재시작 시 `pending_display` 처리 — △ 불분명
규칙 E에서 "다음 장바구니 스냅샷은 `status = pending_display`로 대기"라고 했으나, POS가 재시작되면 이 pending 스냅샷이 어떻게 처리되는지(자동 클리어 vs 복원 vs 타임아웃) 미정의.

### 10초 경계 타이머 기준 — △ 약간 모호
규칙 C "결제 완료로부터 10초 이내" 중 타이머 시작점이 POS 이벤트 발화 시각인지 손님 앱 수신 시각인지 불분명. 네트워크 지연이 있으면 POS 기준 10초와 클라이언트 기준 10초가 다름. `post_pay_link_grace_sec` 파라미터 명시는 ✓.

### 같은 손님 연속 주문 시 `pre_entry` 초기화 — △
손님이 번호를 Cart(2)에서 미리 입력한 상태(`pre_entry=true`)로 Done(5) → idle(1)로 갔다가 다음 주문 Cart(2)로 전환될 때 `pre_entry` 플래그 초기화 타이밍이 명시되지 않음.

---

## REQ 3 — 스냅샷 계약 v2 ↔ loyalty-phase1-plan §3-2 · R3 충돌 여부

### `status` 필드 — ✗ 직접 충돌
storeport `loyalty-phase1-plan §3-2`의 현행 `OrderSnapshot`:
```ts
status: "idle" | "checkout" | "completed"  // 레지스터 세션 상태
```
customer-display-plan §3-1 v2 추가:
```ts
status: 'active' | 'paid' | 'expired'       // 스냅샷 수명 주기 상태
```
같은 `status` 키에 완전히 다른 값 집합이 정의됨. 이미 storeport R8(세션 서버)이 `"idle"|"checkout"|"completed"` 기준으로 구현될 경우 손님 앱 상태 머신(`idle(1)`, `checkout(2)`, `receipt(6)`)이 동작 안 함. `'active'|'paid'|'expired'`가 별도 필드 이름이어야 하거나, 기존 값 집합을 확장해야 함.

### `receipt` 필드 소멸 — ✗ 누락
storeport §3-2: `receipt?: { earned, new_balance, phone_masked, payment_method, qr_string }`  
v2 정의: `receipt` 필드 없음 → `paid_at`만 추가.  
Done(5) 화면에 표시되어야 하는 `earned`, `new_balance`, `payment_method`를 어디서 가져오는지 v2에 명시되지 않음.

### R3(`needs_post_payment_earn`) ↔ `link-phone` 중복 위험 — △
storeport #258 `POST /orders/:id/customer` 응답에 `needs_post_payment_earn: true` 플래그가 있음(완료 주문에 P-3 창이 열린 경우). 이는 POS 점원이 결제 후 번호를 연결할 때 쓰이는 경로.  
customer-display-plan §3-2의 `POST /snapshots/:id/link-phone`은 손님 iPad에서 KeypadAfter(3')로 번호를 입력할 때 쓰이는 별도 경로.  
두 경로 모두 "결제 완료 후 번호 연결 → R4 적립 훅 트리거"를 하므로 같은 주문에 두 경로가 동시에 실행될 경우 중복 적립 가능성. 설계서에서 이 중복 방지 멱등 로직이 `link-phone`에 명시됐는지 불분명 (`order_id + phone 쌍으로 중복 차단`은 §3-3에 명시됐으나, `needs_post_payment_earn` 경로와의 충돌은 언급 없음).

### link_window_closed ↔ link_open_until 동기화 — △
R3 (#258) P-3 가드: "더 최근 주문 존재 → 409 `link_window_closed`"  
v2: `link_open_until: ISO8601 | null` → "null이면 열림"  
두 가드가 같은 개념을 다른 방식으로 구현함. 서버에서 `link_open_until` 세팅 시점과 R3의 `mostRecentId` 판단 시점이 일치해야 하는데 명시 없음.

---

## REQ 4 — Simulate = rnw iframe 위험 평가

§6-2에서 채택안을 비교표로 제시했으나 아래 세 위험을 평가하지 않음.

### Medusa Admin iframe CSP — ✗ 미평가
Medusa Admin(React SPA)의 `Content-Security-Policy: frame-src` 디렉티브. rnw 빌드 결과물을 별도 origin(`https://customer-display.example.com`)에서 호스팅할 경우 `frame-src` 허용 도메인 추가 필요. Admin 번들에 inline으로 embed할 경우 same-origin이지만 Admin 빌드 파이프라인 개편 필요. 양쪽 모두 비용 있음.

### 빌드 파이프라인 복잡도 — △ 언급됐으나 과소평가
"rnw 빌드 파이프라인 추가" 단점이 단 한 줄로 처리됨. 실제로는:  
- `expo export --platform web` 추가 → EAS Build 프로파일 변경 필요  
- Admin 배포 파이프라인에서 rnw static 번들을 흡수하거나 별도 CDN 호스팅 필요  
- 두 번들의 버전 동기화(손님 앱 업데이트 시 Admin도 재배포 필요) 운영 부담

### Expo 네이티브 모듈 web 미지원 — ✗ 미평가
손님 앱이 `expo-secure-store`(페어링 토큰 저장), `expo-haptics`, 혹은 카메라/바코드 모듈을 쓰는 경우 rnw 빌드 중단됨. Simulate 모드에서는 페어링 없이 mock 데이터를 쓰므로 SecureStore 직접 충돌은 없지만, 컴포넌트 파일에서 native 모듈 `import`만 해도 web 빌드 실패함. `Platform.OS === 'web'` 분기 또는 web 전용 stub 처리 방안을 설계서에 명시해야 함.

---

## REQ 5 — 문서 위치 판단

현재 위치: `CuriocityDevAi/agilo-medusa-pos-fork/docs/plans/customer-display-plan.md`

| 섹션 | 내용 성격 | 현재 위치 적합? | 권장 |
|---|---|---|---|
| §1~2 (화면·상태 머신) | UI 설계 | ✓ fork 레포 적합 | 현행 유지 |
| §3 (OrderSnapshot v2 · API 경로) | 서버 계약 | ✗ | storeport `docs/plans/`로 이관 또는 storeport `loyalty-phase1-plan §3-2`에 v2 개정 추가 |
| §4~7 (테마·Admin·매장설정) | UI+설정 설계 | ✓ fork 레포 적합 | 현행 유지 |
| §8 S1~S2 (서버 라운드) | 서버 작업 계획 | △ | storeport에 복사본 필요(서버 개발자가 fork 레포를 주시 안 함) |

**권장안**: §3과 §8 S1~S2를 storeport `docs/plans/customer-display-server-contract.md`로 분리 이관. fork 레포 §3에는 "→ storeport `docs/plans/customer-display-server-contract.md` 참조" 주석으로 대체.

---

## REQ 6 — 라운드 분할 타당성

| 라운드 | 크기 적정? | 파일 겹침? | 의존 순서? | 비고 |
|---|---|---|---|---|
| S1 (OrderSnapshot v2 + link-phone + 적립 훅 엔드) | △ 타이트 | — | ✓ | API 3개 신규 + 멱등 로직 → 45분 초과 가능. S1-a(스냅샷 v2) / S1-b(link-phone) 분리 권장 |
| S2 (테마 CRUD + 겹침 검증 + 이슬람력) | ✓ | — | ✓ S1 후 | |
| G1 (Main·Cart·Keypad + 토큰 렌더러 + 언어) | △ 타이트 | — | ✓ S1 계약 후 | 3화면 + 렌더러 엔진 → 45분 한계 |
| G2 (Receipt·KeypadAfter·Done + 상태 머신) | ✓ | G1과 동일 디렉터리 순차 | ✓ G1 후 | |
| G3 (이벤트 테마 렌더러 + 애니메이션) | ✓ | — | ✓ G2 후 | |
| A1 (Admin 설정 페이지 + Simulate iframe) | ✗ 위험 | — | △ G1(rnw 빌드) 의존 | rnw 빌드 파이프라인 없는 상태에서 G1 완료 후 바로 A1 착수 불가. rnw 빌드 설정 자체가 별도 준비 라운드 필요 |
| A2 (이벤트 달력) | ✓ | — | ✓ A1·S2 후 | |
| POS (뱃지 + 전환 트리거) | ✓ | `apps/pos/`만 — G1·G2의 `apps/customer-display/`와 별도 | ✓ G1·S1 후 | |

---

## 판정 요약

**CHANGES** — 아래 3개 수정 필요:

1. **`status` 충돌 수정** (blocking): v2의 `status: 'active'|'paid'|'expired'`는 기존 `"idle"|"checkout"|"completed"`와 같은 키 이름 사용 불가. 별도 필드(`snapshot_state: 'active'|'paid'|'expired'` 등) 사용 또는 기존 값 집합 확장으로 해소.

2. **상태 머신 결제 실패/취소 · 연결 끊김 경로 추가** (blocking): §2 다이어그램에 `checkout(2) ──결제 실패/취소──► checkout(2)` 경로 명시, 폴링 오류 처리(경고 UI 임계값) 이관.

3. **rnw iframe CSP · 네이티브 모듈 처리 방안 명시** (non-blocking but risky): §6-2에 CSP `frame-src` 대응 방안(inline embed vs 별도 origin)과 native-only 모듈 web stub 전략 추가. `receipt` 필드 소멸 처리(v2에서 `receipt` 유지 또는 필요 필드 명시적 이관).
