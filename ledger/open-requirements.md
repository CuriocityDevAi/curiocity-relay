# CurioCity 열린 요구 원장 (오케 유지 · Kyu 원문 기준)

갱신: 2026-11-07 11:55 · 규칙: 새 요구 = 여기 먼저 등재(Kyu 원문 그대로 · 오케 번역은 괄호) · 소유 허브 필수 · 착지·실기 통과 시 ✅ · 이 파일이 챗보다 우선
**발부 규약(09-16)**: 모든 프롬프트 작성 직전 이 파일을 읽고, 프롬프트 첫 줄 아래 `원장 대사:` 한 줄에 포함 항목을 적는다. 없으면 발부 금지. Kyu가 같은 요구를 두 번 말하면 🔴 · 다음 발부에 무조건 포함. 터미널 "별건/이연"은 Kyu 원문과 대조해 명시 요구면 거부. 주 1회 "한 번도 발부 안 된 요구" 표를 Kyu에게 보고.
**갱신 규약(11-06 Kyu 지적)**: 오케는 Kyu 결정·착지가 생길 때마다(최소 하루 1회) 이 파일과 `ledger/work-queue.md` 를 갱신한다. 오케 세션 컨텍스트는 요약으로 잘릴 수 있으므로 **이 파일이 기억의 정본**이다.

## 🔴 재언급 요구 (Kyu 3회 · 09-16)
- [x] **"테스트 케이스들을 모았다가, 나중에 자동 테스트한다"** — 11-07 사실상 완료: fork CI · storeport pos-integration · 어설션 PR 동봉 · R0 재실행. 남은 것 = 어설션 노후화 관리(M3-1105-I 첫 사례 · #44).

## 방법론 (Kyu 승인 11-04 · 11-05~07 추가 ⑧~⑭)
- **① R0 리뷰 허브** — 상시. 체크리스트 v1 = ⑴ 깨끗한 환경 실기동 ⑵ 직전 Kyu 실기 ✗ 재현 ⑶ master clean merge ⑷ 지시 밖 변경 ⑸ 놓친 엣지 ⑹ 서버 계약 field-by-field 대조. **결함(11-07): R0 리포트가 relay 에 push 되지 않음(r0/ 디렉터리 없음 · GitHub 리뷰만) — R0-1105-P 에서 push 지시.**
- **② 파일 주인 명시** · **③ 계획 게이트**(11-07 M1-1105-L P5 첫 적용 · 서버 신규 0 발견) · **⑤ kyu-gate 폐기** · **⑥ 4허브 worktree** — 유지.
- **④ claude-code-action 자동 리뷰** — 조용할 때 제안(큐 #13).
- **⑦ relay 감시** — 5분 · 30분 무응답 자동 꺼짐 · "감시 켜/꺼".
- **⑧ 프롬프트 목적 2~3줄 + 작업 큐 표** — 정본 `ledger/work-queue.md`.
- **⑨ chore/docs PR(src 0) 은 오케 직접 머지** — #28 #41 #42 #44.
- **⑩ 진단은 만든 허브가 아닌 허브에**.
- **⑪ R1 리뷰 허브** — 미발동.
- **⑫ 상시 [REPORT] 조항** — ⓐ Playwright 하네스 ⓑ frozen-lockfile ⓒ 승인 없이 커밋·push·PR ⓓ 영어 전용 · 색 토큰 어설션.
- **⑬ (11-06) 쌓인 PR 은 하나로 합쳐 머지** (내용 동일하면 순차 squash 통과 — #31→#36).
- **⑭ (11-06) 앱 Playwright mock 은 서버 실응답 fixture 로** — M0 가 fixture JSON 첨부 → M3 복사(#194 리포트 §4 첫 사례).

## Kyu 결정 정본 (11-04~07 · 결제·UI)
- (11-04) 반올림: 현금 Pembulatan 줄 없음. (11-06) % 계산 소수점은 반올림(round).
- (11-04) 세금 라벨 Admin 설정 · 기본 숨김. 승인번호 6자리+카드 끝4자리 필수. 영수증 WA 공유 먼저. 분할 결제 P6. PG = Xendit. Pre-order 선결제 기본 100% · DP% Admin 설정.
- (11-04) **MEROS 앱 UI 전부 영어**.
- (11-04) 재고 차감 = 거래 종류별 "전달/출고" 이벤트만(createOrderFulfillmentWorkflow 단일 지점). (11-07 #194) preorder 는 paid_full + hand_over 에서 1회.
- **(11-07) 팔레트 = D1** — 무채색 기본 · 유채색은 강조만. 값: surface #FFFFFF · surface-muted #F2F2F0 · ink #0E1B18 · ink-muted #6F6F6F · ink-subtle #B5B5B5 · ink-disabled #C8C8C8 · line #E3E3E3 · accent(로고 O 점만) #E8A33D/#FBE4B6 · success #0E1B18/#EDEDEB · warning #9B6D1F/#FBF1DC(재고 부족) · danger #C62828/#FBE3E3(품절·오류). 적용 = M3-1105-J.
- **(11-07) P5 교대 — Kyu "전부 추천대로"**: ① Open shift 시트 취소 불가(로그아웃만) ② 하루 복수 교대 = 세션 close→open 순차 · 각각 Z 리포트(1 session = 1 shift) ③ tenders 에 cashier_user_id·register_session_id 자동 포함(수동 선택 없음 · 1인 1기기) ④ Settings "Close shift" 행 = Reset 바로 위 · 세션 열려 있을 때만 ⑤ 영수증 캐셔 표기 = first_name, 없으면 이메일 @ 앞부분. 서버 신규 0(M1-1105-L 실측). 코딩 = M1 α(Open shift 시트+_layout 가드) → β(Settings 행 · M2 파일) → M3(ReceiptCard 캐셔).
- (11-05) 품절 상품 탭 → 상세 열림 + 회색 "Sold out" (a).
- (11-05) Admin 비밀번호 `SoopsokDemo2026!` 개발 중 유지. **(11-07) Admin 탭 제목 "Meros Admin" — Kyu 실기 ✓ (11:47)**.
- (11-05) 외부 신청 3건: Apple(결제 완료 · Pending) · Xendit KYC(미착수) · 은행 QRIS/EDC(미착수).
- (11-06) Checkout "Complete order" 회색 = 버그 아님.

## StorePort / Meros (M0~M3 · 최우선)

### 착지 ✅ (11-04 ~ 11-07 11:55)
- storeport main **946d31c (배포 ✓ api/admin · M2-1105-J)**: #182 #183 #184 #187 #191 #192 #193. **#194 preorder 잔금(통합 12/12) R0-1105-P 리뷰 대기.**
- fork master **26b6b78 · CI green**: #22 #23 #24 #25 #26 #27 #28 #30 #32 #34 #35 #38 #41 #42 #29 #31 #36 #33 **#44(스테일 어설션 갱신)**. #37 #39 #40 close.
- 계획서: M1-1105-L P5 교대(서버·앱 교대 기능 기존 존재 · 신규 3 화면 · 서버 0).

### Kyu 실기 대기
- iPad 현금 결제 → 성공 화면·영수증 → Orders Paid 칩 → 상세 결제 내역+영수증 카드 · Cheese Bread(품절) 탭 → 상세 열림 · (선택) 시뮬 `npm run sim:run`.

### 진행 중 (11-07 11:50 발부)
- R0-1105-P storeport #194 리뷰(+O 리포트 push) · M3-1105-J 팔레트 D1 · M0-1105-M Delivery 단계 서버(#194 머지 뒤 착수) · M1-1105-M tenders cashier/session 자동 포함 · M2-1105-K Maestro 현금 플로 템플릿
- R0-1105-O 전 리포 감사 — Kyu "아직 진행 중"

### 다음 (우선순위)
- [ ] P5 코딩 α(M1 · Open shift 시트 + _layout 가드) — M1-1105-M 뒤 발부 · β(Settings Close shift · M2) · M3 ReceiptCard 캐셔 표기
- [ ] P3 거래 종류 + Pre-order DP/잔금 + Delivery 단계 화면(보드 7·9·10) — M3 · #194 + M0-M 머지 뒤
- [ ] P4 카드 결과 시트(EDC 수동) + QRIS v1 — M3
- [ ] R0-O 감사 결과 → raw hex·비영어·계약 잔재 수정 라운드(M3/M1)
- [ ] J-c Xendit — Kyu test key 선행 · EAS/프린터 — Apple 승인 선행 · Sentry `pos-app`(Kyu)
- [ ] 소소: images.* 좁히기 · hubs.json 스캔 · claude-code-action 제안 · R1 · Node 22 · Admin Receipt configuration(Kyu 결정) · preorder pickup_at 입력 UI 위치(Kyu 결정) · stubs 주석
- [ ] M0-1104-K 다중 매장 RBAC — 요구 시 · 유령 예약 C안 Kyu 결정 대기

### 로드맵 (10-12 합의 · 유지)
- [ ] 싱가포르 리전 + Redis · RMA·픽업 예약·보류 · 고객·등급·크레딧·WA·Scan · Meta WhatsApp(K11)
- [ ] Kyu 결정 보류: Metabase 선행 · 이연 16(AgentsPay) 봉인 · 오프라인은 매장 투입 뒤

## 전 제품 공통
- [ ] Sentry 전 제품 확장: 서버 ✅ · 앱 코드 ✅(DSN 은 EAS secret) · 웹 재개 시.
- 이름 원칙(11-04): StorePort = 플랫폼 · Meros = 커머스 브랜드.

## 머지·실기 규칙 (09-14 · 11-07 반영)
- 제품 PR: R0 APPROVE 뒤 오케 squash 머지 → Railway 자동 배포(서버 · /health.version 으로 확인) / Kyu 테스트 클론 `git pull --ff-only` + `npx expo start --tunnel -c`(앱).
- chore/docs(src 0) · rebase-only PR: R0 생략 · 오케 직접 머지(⑨).
- 쌓인 PR ⑬ · fixture ⑭.

## test-portal (K0 · 동결) · Todoboss (T0) · GrowNest (N0 동면)
- 변동 없음.
