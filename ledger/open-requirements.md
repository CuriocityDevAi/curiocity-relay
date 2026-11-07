# CurioCity 열린 요구 원장 (오케 유지 · Kyu 원문 기준)

갱신: 2026-11-07 07:10 · 규칙: 새 요구 = 여기 먼저 등재(Kyu 원문 그대로 · 오케 번역은 괄호) · 소유 허브 필수 · 착지·실기 통과 시 ✅ · 이 파일이 챗보다 우선
**발부 규약(09-16)**: 모든 프롬프트 작성 직전 이 파일을 읽고, 프롬프트 첫 줄 아래 `원장 대사:` 한 줄에 포함 항목을 적는다. 없으면 발부 금지. Kyu가 같은 요구를 두 번 말하면 🔴 · 다음 발부에 무조건 포함. 터미널 "별건/이연"은 Kyu 원문과 대조해 명시 요구면 거부. 주 1회 "한 번도 발부 안 된 요구" 표를 Kyu에게 보고.
**갱신 규약(11-06 Kyu 지적)**: 오케는 Kyu 결정·착지가 생길 때마다(최소 하루 1회) 이 파일과 `ledger/work-queue.md` 를 갱신한다. 오케 세션 컨텍스트는 요약으로 잘릴 수 있으므로 **이 파일이 기억의 정본**이다.

## 🔴 재언급 요구 (Kyu 3회 · 09-16)
- [x] **"테스트 케이스들을 모았다가, 나중에 자동 테스트한다"** — **11-07 사실상 완료**: fork CI(#34 · assertions+Playwright+lint) · storeport pos-integration(Node 22 · 실 DB 9/9) · 어설션 파일 PR 마다 동봉 · R0 재실행. 남은 것 = 어설션 노후화 관리(M3-1105-I 가 첫 사례).

## 방법론 (Kyu 승인 11-04 · 11-05~07 추가 ⑧~⑭)
- **① R0 리뷰 허브** — 상시. 체크리스트 v1 = ⑴ 깨끗한 환경 실기동 ⑵ 직전 Kyu 실기 ✗ 재현 ⑶ master clean merge(`git merge-tree`) ⑷ 지시 밖 변경 ⑸ 놓친 엣지 ⑹ **(11-06 추가) 서버 계약 field-by-field 대조**. 11-06~07 실적: R0-L 가 #31/#36 의 계약 불일치 5건(경로·응답·shape·provider id·receipt_id 미저장) 발견 → 전부 해소.
- **② 파일 주인 명시** · **③ 계획 게이트** · **⑤ kyu-gate 폐기** · **⑥ 4허브 worktree** — 유지.
- **④ claude-code-action 자동 리뷰** — 조용할 때 제안(큐 #13).
- **⑦ relay 감시** — 5분 · 30분 무응답 자동 꺼짐 · "감시 켜/꺼".
- **⑧ 프롬프트 목적 2~3줄 + 작업 큐 표** — 정본 `ledger/work-queue.md`.
- **⑨ chore/docs PR(src 0) 은 오케 직접 머지** — 적용 사례 #28 #41 #42.
- **⑩ 진단은 만든 허브가 아닌 허브에**.
- **⑪ R1 리뷰 허브** — 미발동.
- **⑫ 상시 [REPORT] 조항** — ⓐ Expo 웹 Playwright 하네스(`_harness.mjs`) ⓑ package.json 변경 시 격리 frozen-lockfile ⓒ 승인 없이 커밋·push·PR ⓓ 영어 전용 어설션 · 색 토큰 어설션(37/37).
- **⑬ (11-06) 쌓인(stacked) PR 은 하나로 합쳐 머지** — squash 가 스택을 깨뜨림(#185/#188/#189 → #191). 예외: 내용이 동일하면 순차 squash 도 통과(#31→#36 사례).
- **⑭ (11-06) 앱 Playwright mock 은 서버 실응답 fixture 로** — `fixtures/pos-*.json` (storeport 통합테스트 응답 복제 · `_source` 명시). 서버 응답 shape 변경 시 M0 가 fixture JSON 을 리포트에 첨부 → M3 복사.

## Kyu 결정 정본 (11-04~07 · 결제·UI)
- (11-04) 반올림: 현금 Pembulatan 줄 없음. (11-06) % 계산(DP·할인) 소수점은 반올림(round).
- (11-04) 세금 라벨(PBJT/PPN) Admin 설정 · 기본 숨김. 승인번호 6자리+카드 끝4자리 필수. 영수증 WA 공유 먼저. 분할 결제 P6. PG = Xendit. Pre-order 선결제 기본 100% · DP% Admin 설정.
- (11-04) **MEROS 앱 UI 전부 영어**.
- (11-04) 재고 차감 = 거래 종류별 "전달/출고" 이벤트만(createOrderFulfillmentWorkflow 단일 지점).
- **(11-07) 팔레트 = D1 — "원래 Medusa 처럼 무채색을 그대로 많이 쓰고, 확실히 강조할 것만 유채색"** (Kyu 원문 요지). A/B/C(#37 #39 #40 · 앰버·그린·갈색·빨강 4색 "알록달록") 폐기. D1 값: surface #FFFFFF · surface-muted #F2F2F0 · ink #0E1B18 · ink-muted #6F6F6F · ink-disabled #C8C8C8 · line #E3E3E3 · **주 버튼·선택 탭·Paid 칩 = 검정/회색** · accent(로고 O 점만) #E8A33D · success #0E1B18/#EDEDEB(무채) · warning #9B6D1F/#FBF1DC(재고 부족만) · danger #C62828/#FBE3E3(품절·오류만). 비교 페이지 = claude.ai/artifact/4aHfs8onZf84bWySRLMCNt.
- (11-05) 품절 상품 탭 → 상세 열림 + 회색 "Sold out" 버튼 (a) · 상세 시트 재고 수량(보드 11).
- (11-05) Admin 비밀번호 `SoopsokDemo2026!` 개발 중 유지. **(11-07) Admin 브라우저 탭 제목 "Meros Admin" 모든 화면**(#193).
- (11-05) 외부 신청 3건: Apple Developer(결제 완료 · Pending) · Xendit KYC(미착수) · 은행 QRIS/EDC(미착수).
- (11-06) Checkout "Complete order" 회색 = 버그 아님 · Card/QRIS 는 승인번호 전 비활성이 설계.

## StorePort / Meros (M0~M3 · 최우선)

### 착지 ✅ (11-04 ~ 11-07 07:00)
- storeport main **946d31c**: #182 Admin 로고 · #183 J-b 결제 API · #184 통합테스트 인프라 · #187 Admin POS Settings(Kyu ✓) · #191 결함 fix+설정 연결+반올림 복원 · #192 anchor tauri 정리 · **#193 order.metadata.receipt_id/no 저장 + 탭 제목 "Meros Admin"**. 통합 9/9 · unit 24/24 · CI green.
- fork master **c03c254**: #22 토큰 · #23 wizard loop · #24 재고 `+` · #25 웹 SecureStore+하네스 · #26 프린터 행 · #27 상세 재고 줄 · #28 BLE 정리 · #30 썸네일 · #32 web single · #34 fork CI · #35 wizard 재시도 · #38 lint · **#41 iOS 시뮬+Maestro · #42 prettier · #29 품절 상세 진입 · #31 P2 현금 결제 화면+영수증 카드(서버 계약 일치 · fixture) · #36 주문 목록 칩+상세(결제·영수증·Hand over) · #33 ink/ink-disabled**.
- 디자인: 결제 흐름 캔버스 11 보드 Kyu 승인 · 팔레트 비교 페이지(D1 결정).

### Kyu 실기 대기 (배포 확인 M2-1105-J 뒤 안내)
- Admin 탭 제목 "Meros Admin" · iPad 현금 결제 → 성공 화면·영수증 → 주문 상세 영수증 칸 · Cheese Bread(품절) 탭 → 상세 열림 · (선택) `npm run sim:run` + `sim:test:boot`.

### 진행 중 (11-07 07:00 발부)
- M0-1105-L Pre-order 잔금 수금 서버(계획서 §0 → 신규분만 · 통합테스트 3 · fixture JSON)
- M1-1105-L P5 교대 계획서(코딩 0 · 코어/우회/신규 대사표 · 화면·파일 주인 · 서버 의존)
- M2-1105-J 서버 배포 확인(읽기 전용)
- M3-1105-I fork master CI 빨강(스테일 어설션 m3-1104-a · m3-1105-d) + #37 #39 #40 close
- R0-1105-O fork 전 리포 감사(영어 · 토큰 · 비활성 · 서버 계약)

### 다음 (우선순위)
- [ ] **팔레트 D1 적용** — 토큰 2파일(`tailwind.config.js` · `constants/brand.ts`) 값만 · M3 · M3-1105-I 끝나면 발부 · R0-O 가 찾은 raw hex 잔재는 같은 라운드 또는 직후
- [ ] P3 거래 종류(Takeaway/Pre-order/Delivery) + Pre-order DP + 잔금(보드 7·9·10) — M3 · 서버 M0-1105-L 뒤
- [ ] P4 카드 결과 시트(EDC 수동) + QRIS v1 — M3 · 서버 준비됨(QRIS 실연동은 Xendit key)
- [ ] P5 교대/정산 — M1 계획서(M1-1105-L) → Kyu 화면 승인 → 코딩(M1 앱 · M0 서버)
- [ ] J-c Xendit SDK + webhook — Kyu Xendit test key 선행
- [ ] EAS dev build → 프린터 BT-58D 실기 — Apple 승인 선행
- [ ] Sentry `pos-app` 프로젝트(Kyu)
- [ ] 소소: `+items.product.images.*` → url 좁히기 · hubs.json 스캔 · claude-code-action 제안 · R1 · Node 22(Kyu Mac) · Admin "Receipt configuration" 서브페이지(세금 라벨·footer·logo_mode · Kyu 결정) · stubs 주석 리프레이즈
- [ ] M0-1104-K 다중 매장 RBAC — 요구 시 · (11-03) 유령 예약 C안 Kyu 결정 대기

### 로드맵 (10-12 합의 · 유지)
- [ ] 싱가포르 리전 + Redis · RMA·픽업 예약·보류 · 고객·등급·크레딧·WA·Scan · Meta WhatsApp(K11)
- [ ] Kyu 결정 보류: Metabase 선행 · 이연 16(AgentsPay) 봉인 · 오프라인은 매장 투입 뒤

## 전 제품 공통
- [ ] Sentry 전 제품 확장: 서버 ✅ · 앱 코드 ✅(DSN 은 EAS secret · `pos-app` 생성 대기) · 웹 재개 시.
- 이름 원칙(11-04): StorePort = 플랫폼 · Meros = 커머스 브랜드 · naming-check 예외 `src/admin/**`.

## 머지·실기 규칙 (09-14 · 11-07 반영)
- 제품 PR: R0 APPROVE 뒤 오케 직접 머지(squash) → Railway 자동 배포(서버) / Kyu 테스트 클론 `git pull` + Expo 재시작(앱) → Kyu 실기는 머지 뒤 몰아서.
- chore/docs(src 0) PR: R0 생략 · 오케 직접 머지(⑨). rebase 만 한 PR(로직 0 · R0 기승인)도 동일.
- 쌓인 PR ⑬ · fixture ⑭.

## test-portal (K0 · 동결) · Todoboss (T0) · GrowNest (N0 동면)
- 변동 없음.
