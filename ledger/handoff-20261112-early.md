# 오케 인수인계 — 2026-11-12 새벽 (11-11 20:30 ~ 02:51 · 자율 4시간 포함)

다음 오케 세션이 가장 먼저 읽을 것. 직전 판 = handoff-20261111.md · 자율 규칙 = decision-autonomy-20261111.md.

## (a) 머지됨
- storeport: #215 Void 출고 있을 때(4234b26) · #214 환불 안전장치·남은 금액 재환불 서버(18bae3a) · #216 PIN 매장 기준 통일 + resolveStoreId + CI unit(1f391e6 · Kyu 머지해) · #217 P6 E2E Admin PIN 기준(cce5e9d)
- fork: #90 PIN DigitsInput(86bf9f7 · #87~89 흡수) · #93 나눠 결제 영수증(e774e7e) · #92 Cart FlashList 4번째 줄(cbb6264) · #95 iPad PIN 작은 숫자 팝업·숨은 입력 1개·BuildBadge(675f769) · #97 앱 CI 초록·어설션 계약 이름 교정(3b476f7) · #91 남은 금액 다시 환불 버튼(785313b)
- 닫음: fork #94 · #96 (PIN fixture 계약 칸 이름 되돌림 = 계약 역행)

## (b) ⏳ Kyu 결정 대기 (상태판 Kyu 할 일 K-1112-void-merge)
- **storeport #219 → #218 "머지해"** (둘 다 R0 APPROVE · 돈·재고)
  - #219(M0-1105-AQ): ⚠️ **운영에서 Hand over 때 재고가 실제로 안 빠지고 있었음**(reservation 만 해제) → reservation 기준 정확히 1회 차감 + polyfill 출고 item 에 inventory_item_id 채움.
  - #218(M2-1105-AP): 레거시 출고(inventory_item_id null) Void 안전망 — 22:39 운영 Void "required_quantity" 오류 해결.
- 머지 뒤: iPad Void 실기 · 재고 1 줄고/늘는지 · **과거 재고 수동 정정**(Admin → Inventory → 품목 → In stock 을 실제 개수로).

## (c) 실기 필요 (머지됨 · Kyu iPad)
- Void(현금·건넨 주문) — #219·#218 뒤
- 나눠 결제 + 영수증 두 줄(#93) · Cart 4~6개(#92) · 빌드 표시 회색 글씨 위치(#91 에 포함 · 시트 제목 줄 오른쪽)
- 실기 통과: PIN 4756 통과(#216 · 22:37) · iPad 작은 숫자 팝업·1→2→3→4(#95 · 22:43)

## (d) 다음 할 일 큐
- 같은 품목·옵션 두 줄(수량 합치기) — 이연(Kyu 요구 시)
- 러너: all.json 버전 칸 v7.0 표기 버그 · Mac 잠금 시 bg 모드 23분 지연(장치 사건)
- 영수증 renderer/Fulfill 시트 등 기존 큐 유지

## (e) 운영 교훈 (프롬프트 상시 조항에 반영할 것)
- **테스트 기대값·fixture 를 실패에 맞춰 바꾸지 말 것** (M1 #94/#96 이 PIN 계약 칸 이름을 옛 이름으로 되돌려 초록 만듦).
- **증거는 브랜치에 커밋 + `git ls-tree` 출력 첨부**(M3 가 "스샷 올림" 보고 후 미커밋 2회).
- **CI 대기·Monitor 금지 · 40분 미완 착지**(M1-AX 60분 timeout).
- 허브가 러너 폴더(curiocity-relay 루트 scripts/)에 쓰면 러너가 설치 대기로 blocked → v7.0 때 발생.
- 테스트 시드가 운영 데이터 모양(variant↔inventory 링크·reservation)과 달라 버그 2건(PIN 매장 기준 · 재고 차감)을 못 잡음 → p6-e2e(Admin PIN API) · #82 · b-AQ 로 보강.
- 러너 v7.1 설치는 돌던 허브 세션을 안 끊음(22:00 확인).
- 오케 오추정 1회: 21:14 PIN 실패를 "5회 잠금"으로 추정 → 실제는 서버 매장 기준 불일치(M1 진단).

## (f) 현재 버전
- 러너 v7.1(pid 87014 · 21:57 설치) · 러너 로그 폴더 이 세션에 연결됨(~/.hub-runner)
