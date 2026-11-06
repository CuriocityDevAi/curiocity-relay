# CurioCity 열린 요구 원장 (오케 유지 · Kyu 원문 기준)

갱신: 2026-11-06 13:00 · 규칙: 새 요구 = 여기 먼저 등재(Kyu 원문 그대로 · 오케 번역은 괄호) · 소유 허브 필수 · 착지·실기 통과 시 ✅ · 이 파일이 챗보다 우선
**발부 규약(09-16)**: 모든 프롬프트 작성 직전 이 파일을 읽고, 프롬프트 첫 줄 아래 `원장 대사:` 한 줄에 포함 항목을 적는다. 없으면 발부 금지. Kyu가 같은 요구를 두 번 말하면 🔴 · 다음 발부에 무조건 포함. 터미널 "별건/이연"은 Kyu 원문과 대조해 명시 요구면 거부. 주 1회 "한 번도 발부 안 된 요구" 표를 Kyu에게 보고.
**갱신 규약(11-06 Kyu 지적)**: 오케는 Kyu 결정·착지가 생길 때마다(최소 하루 1회) 이 파일과 `ledger/work-queue.md` 를 갱신한다. 오케 세션 컨텍스트는 요약으로 잘릴 수 있으므로 **이 파일이 기억의 정본**이다. 11-04~06 갱신 누락 자인.

## 🔴 재언급 요구 (Kyu 3회 · 09-16)
- [ ] **"테스트 케이스들을 모았다가, 나중에 자동 테스트한다"** — Kyu 원문. (오케 번역: 실기 항목 중 기계 판정 가능한 것은 어설션으로 축적 → PR마다 자동 실행.) 소유 = 각 허브 상시 ⓐ + K2 · 상태 = **사실상 작동 중** — 11-05~06 모든 앱 PR 이 Playwright 하네스(m1-1105-b 기본 하네스 · 로그인→상품까지)와 어설션을 동봉하고 R0 가 재실행. 남은 것 = CI 에 편입(fork 는 미편입 · storeport 는 pos-integration job #184).

## 방법론 (Kyu 승인 11-04 · 11-05~06 추가 ⑧~⑫)
- **① R0 리뷰 허브** — 시범 3 PR(R0-1104-A/B · R0-1105-A) 전부 APPROVE + 실 엣지 발견 → **11-05 상시 채택**. 체크리스트 v1 = ⑴ 깨끗한 환경 실기동(서버 PR 은 `.medusa/server` 산출물 기동 BOOT OK + /health 200 · package.json 변경 시 격리 frozen-lockfile) ⑵ 직전 Kyu 실기 ✗ 재현 ⑶ master clean merge(`git merge-tree`) · 충돌이면 REQUEST_CHANGES "rebase" ⑷ 지시 밖 변경 ⑸ 놓친 엣지. 11-05~06 실적: #182·#22·#23·#24·#25·#26·#27·#30·#183·#184·#185·#187·#188 리뷰 · 충돌 2건(#23·#29) 선제 발견 · #185 빌드 실패·Math 불일치 발견. GitHub 제약으로 self-authored PR 엔 COMMENT 이벤트로 "R0 APPROVE/REQUEST CHANGES" 표기.
- **② 파일 주인 명시** · **③ 계획 게이트** · **⑤ kyu-gate 폐기** · **⑥ 4허브 worktree** — 유지.
- **④ claude-code-action 자동 리뷰** — Kyu 11-05 "라운드 끝나고 조용할 때 제안해줘" → 오케 제안 대기(큐 #9).
- **⑦ relay 감시** — **11-06 Kyu: 3분 → 5분**. 30분 무응답 자동 꺼짐 · "감시 켜/꺼". 결함: `status/hubs.json` 허브 목록 고정(미해결).
- **⑧ (11-05 Kyu) 프롬프트 목적 2~3줄 + 작업 큐 표** — 모든 발부문 아래 쉬운 말 목적 · 매 응답 말미 현황판 + 작업 큐. 정본 = `ledger/work-queue.md`.
- **⑨ (11-05 오케 제안 · Kyu 미반대) chore/docs PR(src 변경 0) 은 R0 생략 · 오케가 검증 로그 확인 후 직접 머지** — 첫 적용 fork #28(BLE dead dep). Kyu 반대 시 되돌림.
- **⑩ (11-05) 진단은 만든 허브가 아닌 허브에** — M2-1105-A(재고 · M0/M3 코드) · M1-1105-D(checkout · M3 코드) · M2-1105-E(React #418 · M0 코드). 코딩 금지 · 뿌리 1줄 + file:line + 수정 주인.
- **⑪ (11-06 오케 제안) R1 리뷰 허브** — 리뷰 큐 3건 이상 쌓이면 유휴 허브(M2 등)를 두 번째 리뷰어로. 아직 미발동.
- **⑫ 상시 [REPORT] 조항** — ⓐ Expo 웹 Playwright(이제 로그인 뒤 화면까지 · `scripts/m1-1105-b-playwright.mjs` 기본 하네스 · `docs/testing/web-e2e.md`) ⓑ package.json 변경 시 격리 frozen-lockfile ⓒ 승인 없이 커밋·push·PR · 기술 선택은 권장안 + PR 3줄 ⓓ **(11-05 신설) 영어 전용 — app/** · components/** 코드 문자열 한글 0건 어설션(`scripts/m3-1105-c-english-assertions.mjs`)** · 색 토큰만(`m3-1105-a-color-assertions.mjs` 35/35).

## Kyu 결정 정본 (11-04~06 · 결제·UI)
- (11-04) 반올림: **현금 Pembulatan(100/500 단위 올림·내림) 줄 없음**. **(11-06 명확화) % 계산(선금 DP·할인)의 소수점은 반올림(round)** — "프로모션 몇 % 같은 게 있으면 반올림 해야지". M0-1105-C/E 가 floor 로 잘못 해석 → M0-1105-F(#189)로 복원.
- (11-04) 세금 라벨(PBJT/PPN): Admin 설정 · 기본 숨김. 승인번호(6자리)+카드 끝4자리 필수. 영수증은 WA 공유 먼저, 인쇄는 프린터 뒤. 분할 결제 P6. PG = Xendit. Pre-order 선결제 기본 100% · DP% Admin 설정.
- (11-04) **MEROS 앱 UI 전부 영어** (인니어 라벨 치환표 ADDENDUM §2).
- (11-04) 재고 차감 = 거래 종류별 "전달/출고" 이벤트(takeaway Hand over · preorder 제작→픽업 · delivery 출고). 영수증 나왔다고 차감 안 함.
- (11-04) 색: 촌스러움 → 토큰 정리 먼저(✅ #22) → 팔레트 한 번에 교체(흑백 + 앰버 · 파랑 제거 · Pickup/Close · 설정 톱니(= Expo Go 버튼이라 우리 것 아님)).
- (11-05) **품절 상품 탭 → 상세 열림 + 회색 "Sold out" 버튼 (a)** — 토스트 방식(M3-1104-A) 폐기. 상세 시트에 재고 수량 표시(보드 11).
- (11-05) Admin 비밀번호 `SoopsokDemo2026!` 개발 중 유지. Admin 제목 "Welcome to Meros Admin Page".
- (11-05) 외부 신청 3건 Kyu 착수: **Apple Developer(개인 · 결제 완료 · Pending 48h)** · Xendit KYC(미착수) · 은행 QRIS/EDC(미착수).
- (11-06) Checkout "Complete order" 회색 = 버그 아님(활성 토큰 #282828 이 어둡게 보임 · Card/QRIS 는 승인번호 전 비활성이 설계) → 팔레트 라운드에서 활성 버튼 진하게(M3-1105-E).

## StorePort / Meros (M0~M3 · 최우선)

### 착지 ✅ (11-04 밤 ~ 11-06)
- storeport: #175/#176 Sentry · #177 G 계획 · #178→#179 Admin 리브랜딩+favicon 핫픽스 · #180 J 계획 · #181 J-a 결제 골격 · **#182 Admin 로고 다크·중앙·제목(11-05 · Kyu 실기 ✓ 라이트·다크)** · **#183 J-b 결제 API(tenders/fulfill/receipt/settings · 11-05)**
- fork: #15 앱 Sentry · #16 품절 카드 · #17 Shop URL 제거 · #18 EAS prep · #19 BT-58D 프린터 · #20 M3-B 계획 · #21 매장 자동 선택 · **#22 색 토큰 14(보이는 변화 0) · #23 wizard 무한루프 fix(Kyu ✓) · #24 재고 `+` 1자 fix(Kyu ✓ 재고 숫자·품절 배지) · #25 웹 SecureStore 폴백+기본 E2E 하네스 · #26 Settings Printer 행+BLE 플러그인 교체 · #27 상세 시트 재고 줄+Add to cart 가드(Kyu ✓ "Low stock · 1 left") · #28 BLE dead dep 정리 · #30 장바구니 썸네일 fields(Kyu ✓)**
- 디자인: 결제 흐름 캔버스 11 보드 + 보드 11(상세 재고) Kyu 승인("승인. 한번 가보자") · 연구 docs/research/pos-payment-flows/{global,indonesia,spec-v0,ADDENDUM-1104}
- 진단(코드 0): M2-1105-A 재고 뿌리(`+` 접두사) · M1-1105-D checkout 버튼·썸네일 · M2-1105-E React #418(M0-1104-A fragment · iPad 영향 0)

### 리뷰·머지 대기 (11-06 13:00)
- storeport 결제 스택(순서대로 머지): **#184 통합 테스트 인프라(R0 APPROVE · 3/6 베이스라인) → #185 결함 3 fix(R0 APPROVE · 빌드 실패 의심은 #188 tsconfig 로 해소) → #187 Admin POS Settings 페이지(R0-1105-J 리뷰 중) → #188 설정→결제·영수증 연결 + tsconfig 테스트 제외(R0-J) → #189 % 반올림 복원 + authorize 실패 cleanup(리뷰 대기)**
- fork: **#29 품절 상세 진입 (a) + 영어화 + 한글 0 어설션** — 충돌 → M1-1105-G rebase 중 · **#31 P2 현금 결제 화면(텐더·영수증 애니·Hand over)** — 리뷰 대기 · ⚠️ 서버 계약 대조 필요(앱 `GET /admin/pos/orders/:id/receipts/:rid` vs 서버 `GET /admin/pos/receipts/:id` · provider id `pp_edc_manual`/`pp_qris_xendit` vs 서버 `pp_edc_manual_default`/`pp_xendit_qris_default`)

### 진행 중 (11-06)
- M2-1105-F: web.output single + 하네스 공통화(_harness.mjs) + #418 필터 전부 제거
- M3-1105-E: ink-disabled 토큰 · 활성 버튼 진하게 · 품절→재고 qty 1 · 하네스 정리

### 다음 (우선순위)
- [ ] P3 거래 종류(Takeaway/Pre-order/Delivery) + Pre-order DP + fulfillment 단계 — #31 리뷰 뒤 M3
- [ ] P4 카드 결과 시트(EDC 수동 · 승인번호+last4) + QRIS v1 — M3 · 서버 provider 는 J-a/J-b 완료
- [ ] P5 교대/정산(register_session.expected_by_method) — M3/M0
- [ ] 주문 상세·전달(Serahkan)·Pre-order 픽업 잔금(보드 6·9·10) — M3
- [ ] 팔레트 교체(흑백+앰버 · 파랑 제거) — 토큰 2파일 값만 · M3 · Kyu 승인 1회
- [ ] J-c Xendit SDK + webhook — **Kyu Xendit test key 선행**(1Password)
- [ ] EAS dev build → 프린터 BT-58D 실기 — **Apple 승인 선행**
- [ ] Sentry `pos-app` 프로젝트(Kyu) · Sentry uptime 모니터 /health 정리(저우선 · 돈 안 나감)
- [ ] 소소: wizard refetch 실패 재시도 버튼(R0-G) · `+items.product.images.*` → url 로 좁히기(R0-I) · hubs.json 디렉터리 스캔 · claude-code-action 제안 · R1 검토 · Node 22 업그레이드(Kyu Mac · Expo tunnel)
- [ ] M0-1104-K 다중 매장 RBAC — "2+ 매장 계정" 요구 시
- [ ] (11-03) 유령 예약 C안 Kyu 결정 대기

### 로드맵 (10-12 합의 · 유지)
- [ ] M0-1012-B 싱가포르 리전 + Redis · B: RMA·픽업 예약·보류 · C: 고객·등급·크레딧·WA·Scan · 외부 신청 Meta WhatsApp(K11)
- [ ] Kyu 결정 보류: Metabase 선행 · 이연 16(AgentsPay) 봉인 · 오프라인은 매장 투입 뒤

## 전 제품 공통
- [ ] Sentry 전 제품 확장: 서버 ✅ · 앱 코드 ✅(#15 · DSN 은 EAS secret · `pos-app` 프로젝트 Kyu 생성 대기) · 웹(GrowNest·Todoboss) 재개 시.
- 이름 원칙(11-04): StorePort = 플랫폼 · Meros = 커머스 브랜드 · 인프라 프로젝트명 = 배포 서비스명 · naming-check 예외 `src/admin/**`.

## 머지·실기 규칙 (09-14 · 11-04~05 반영)
- 제품 PR: R0 APPROVE 뒤 오케 직접 머지(squash) → Railway 자동 배포(서버) / Kyu 테스트 클론 pull + Expo 재시작(앱) → Kyu 실기는 머지 뒤 몰아서.
- chore/docs(src 0) PR: R0 생략 · 오케 직접 머지(⑨).
- 사람 판정 최소 원칙 · 포털 동결 · Sentry 조회 방식(11-03) — 유지.

## test-portal (K0 · 동결) · Todoboss (T0) · GrowNest (N0 동면)
- 변동 없음(11-04 본문 유지): kyu-gate 코드 삭제 · hubs.json 스캔 · 포털 미니 · T0-0915-A Kyu 실기 대기 · N0 재개 시 HANDOFF 먼저.
