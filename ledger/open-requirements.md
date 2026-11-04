# CurioCity 열린 요구 원장 (오케 유지 · Kyu 원문 기준)

갱신: 2026-11-04 13:35 · 규칙: 새 요구 = 여기 먼저 등재(Kyu 원문 그대로 · 오케 번역은 괄호) · 소유 허브 필수 · 착지·실기 통과 시 ✅ · 이 파일이 챗보다 우선
**발부 규약(09-16)**: 모든 프롬프트 작성 직전 이 파일을 읽고, 프롬프트 첫 줄 아래 `원장 대사:` 한 줄에 포함 항목을 적는다. 없으면 발부 금지. Kyu가 같은 요구를 두 번 말하면 🔴 · 다음 발부에 무조건 포함. 터미널 "별건/이연"은 Kyu 원문과 대조해 명시 요구면 거부. 주 1회 "한 번도 발부 안 된 요구" 표를 Kyu에게 보고.

## 🔴 재언급 요구 (Kyu 3회 · 09-16)
- [ ] **"테스트 케이스들을 모았다가, 나중에 자동 테스트한다"** — Kyu 원문. (오케 번역: Kyu가 ✓✗ 찍은 실기 항목 중 기계 판정 가능한 것은 어설션으로 전환되어 축적 → 스케줄(PR마다·야간)로 자동 실행 → 다음 라운드부터 사람은 소리·감각 항목만.) 소유 = K2 · 발부 = K2-0916-A(09-16) · 상태 = 구현 중. 누락 원인 = 07-28~09-14 소유 허브 부재 + 오케가 "REQ↔테스트 매핑"으로 번역하며 원래 기능(축적→자동 실행) 탈락.

## 전 제품 공통 (11-04 Kyu)
- [ ] **Sentry 전 제품 확장** — Kyu "응 등재해줘" (오케 설명에 동의: 서버→앱→웹(GrowNest·Todoboss) 순 · 웹은 Session Replay 로 오류 직전 화면 녹화 · 오류/크래시는 Sentry 가 대신, "보기에 틀린 것"(레이아웃·틀린 결과)은 여전히 사람 눈 또는 스크린샷 비교 테스트). 오케 자인: 관측성(기계가 먼저 보고)을 포털(사람 판정 수집)보다 먼저 깔았어야 했음.
- [ ] **[REPORT] 상시 조항 추가 (11-04)**: 앱 PR 은 로직 어설션만으로 착지 불가 — Expo 웹 실기동(Playwright: 로그인 화면 도달 · console.error 0) 필수. 근거 = M0-1103-D 회귀(기동 크래시)를 어설션이 못 잡음.

## 머지·실기 규칙 (Kyu 확정 2026-09-14)
- **test-portal**: 머지 조건 = 터미널 자기 검증 통과 + CI 초록. Kyu 판정 없음. 오케가 리포트 검토 후 GitHub에서 직접 머지(auto-selfcheck-merge 워크플로 가동 중). Kyu 실기 = 오케가 부르는 마일스톤 때만.
- **Todoboss · StorePort · GrowNest(제품)**: Kyu 판정 필요 유지.
- 사람 판정 최소 원칙: 백엔드/문서/테스트만 변경 = 사람 0건 · 화면 변경 중 숫자·문구로 검증 가능 = 기계 · 새 상호작용·소리·디자인 = 사람 · 돈 규칙 = 기계+샘플 1건.
- **포털 가치 정본(Kyu 09-16)**: 포털 고유 가치 = ① 네 맥과 붙은 자동화(발부 [투입]·환경 열기). 허브 상태판은 cmux가 대체 → 더 다듬지 않음. GitHub가 잘하는 것(알림·PR 목록·이력·checks)은 흉내내지 말고 링크. "조금 더 가보자" — 마일스톤 1 결과로 A(포털) vs B(GitHub+PR 프리뷰 환경) 판단.
- **(10-12 Kyu) test-portal 동결** · 모니터링 = claude-code-kanban + 오케(relay status/hubs.json) · 포털은 "열기 + ✓✗ 한 페이지"로 축소(포털 미니 3라운드 · M0 A·B 뒤). K1 종료.
- **(11-03 Kyu) 오류 수집 방식**: Sentry 도입 OK. 예약 점검이 아니라 "Kyu가 테스트 중 문제 나면 한마디 신호 → 오케가 Sentry 조회 → 진단 → 프롬프트". 예약 점검은 매장 실사용 뒤.

## test-portal (K0 · 동결)

### 착지 ✅ (09-14~16)
- ✅ AW 홈 v3 상단 탭 · 진행 띠 · ok/ng 렌더 · AV 결함 7 · 판정 완료 PR 제외 · 허브 파생
- ✅ K1 환경 열기 v2(PR 소스 자동 준비·깨끗한 Chrome·autologin·SSE) · auto-merge 워크플로(test-portal 사람 판정 불요) · gate 연결 · 데몬 전용 clone · 허브 status watcher · 심문 자동 알림 · Expo 환경 열기
- ✅ K2 CI 초록 복원 · test_runs 이력 · /api/gate · seed-reset 계약 · docs/testing 4문서 · 야간 알림 · REQ↔테스트 매핑 · flaky · required registry 파생
- ✅ K0 gate/runs/SSE 소비 · 멀티 허브 · 공용 문서 허브별 분리 · 허브 실상태 소비 · 다기기 이어 찍기 · AQ 이월 완결 · 마일스톤 checks 초안
- ✅ 원장 파일 신설 · relay checks/ 규약(오케 push) · 게이트 뚫림 닫힘(야간 cron 1회 실측만 남음)

### 결함 기록 (동결 중 · 포털 미니 때 처리)
- [ ] (11-02) kyu-gate: 포크 레포(agilo-medusa-pos-fork) check-run POST 404 → auto-merge 스킵 (워크플로 토큰 checks:write 부재 추정) · 오케 수동 머지로 대체 중
- [ ] (11-02) 포털 PR 목록에 storeport #151 미표시 (index 배치 빈 목록)

### 다음 라운드 (포털 미니 · 우선순위 순)
- [ ] K0: "열기 + ✓✗ 한 페이지" 축소 · 상세 "기계가 이미 확인한 N건" 실데이터 · 사람 항목만 펼침
- [ ] K0: 저장→배치 즉시 반영 · 이력/PR 목록은 GitHub 링크로 대체
- [ ] K0: SPEC.md 허브별 절 파일 분리(docs/spec/<hub>.md)
- [ ] 각 리포 허브(N0/T0/M0): 리포별 CI · docs/testing.md · 시드 고정
- [ ] 알림 정본: 푸시 = OS 기본음+진동 · 포털 열림 시 띵 1회 · 설정 on/off · 기계 빨강은 사람 부르지 않음
- [ ] B안 스파이크(결정 시): Railway PR 환경 / EAS Update + Playwright/Maestro

## Todoboss (T0 · M0 뒤)
- [ ] T0-0915-A 착지(PR#22/#23): orphan 필터 · "판정불가 4(출근 2·퇴근 2)" 표기 · [돌아가기] 필터 · 출근/퇴근 시각 직접 입력→재판정 — Kyu 실기 대기
- [ ] 이연: 파라미터화 · Finalize · Payslip · Work Rotation 편성
- [ ] Sentry + Session Replay (전 제품 확장 · M0 뒤)

## StorePort / Meros (M0 · 최우선 10-12)

### 브랜드 정본 (Kyu 확정 11-03)
- 제품명: **Meros POS**(아이패드/아이폰 앱) · **Meros Admin**(관리자 웹) · 손님 사이트는 추후 Meros Shop 또는 매장명. 문장 속 Meros · 워드마크만 MEROS. 오픈소스 고지는 Settings → About → Open source licenses 한 곳.
- 로고: **오케 시안 3A "Receipt"** (앰버 영수증 종이 + 잉크 M + Archivo Black "MEROS") 확정 · ✅ 적용(M0-1103-C #11 · 11-04 머지). 발전안 10종 폐기.
- 색 토큰: brand.ink #0E1B18 · brand.amber #E8A33D · brand.green #1C7C68 · brand.cream #F2F4F1 (constants/brand.ts + tailwind · 로고 외 raw hex 금지).
- 도메인(11-03 완료): **meros.id** (호스팅어 · Cloudflare DNS). `admin.meros.id` ✅ Admin 웹(CORS 반영·로그인 확인). `api.meros.id` ✅ 앱 API(/health OK). `images.storeport.app` = R2. storeport.app 유지. Railway Hobby 커스텀 도메인 한도(서비스당 2) 소진 — 추가 시 Pro.

### 착지 ✅
- ✅ Z 핫픽스 결제 합계 0 (#126) · M0-1012-A (포크 #8 · storeport #151 · 11-02): Z 뿌리 · 카트 초기화 · 띠 포맷 · 재고 배지 · 진단 로그
- ✅ R2 이미지 저장소 (11-02): images.storeport.app
- ✅ M0-1103-A (#9 · 11-03): 재고 배지 fail-open · 뿌리 = Medusa 2.17.2 /admin/products 가 inventory_quantity 미반환
- ✅ M0-1103-B (#10 · 11-03): 앱 리브랜딩 Meros POS · 로그인 기억(SecureStore · Recent 칩) · 재고 숫자 2차 조회 · admin 도메인 런북
- ✅ M0-1103-C (#11 · 11-04 · E 리베이스 뒤): 로고 3A path 6종 · 로그인/스플래시/아이콘/Z 머리글 적용 · 색 토큰 · 클로드코드 옛 할일 51건 정리
- ✅ M0-1103-D (#12 · 11-03): 옛 draft order ID 자가 복구 · "Cart was reset" 문구
- ✅ M0-1104-A (#13 · 11-04): D 회귀(기동 크래시 "User is not authenticated") 해소 · Expo 웹 실기동 Playwright 체크 상시화
- ✅ 아이패드 실기: 1 띠 포맷 ✓ (11-03)

### 진행 중
- [ ] **M0-1104-B** (착지 · 포크 #14 · 머지 대기): Expo SDK 57→58 (아이패드 Expo Go 58 강제 업데이트로 실기 차단) · expo-doctor 20/20 · 어설션 118 · Playwright pass
- [ ] **M0-1104-C** (11-04 투입 · 실행 중): Sentry 서버(commerce-core) 연결 · 에이전트 플러그인(org curiocity-devai · run code 4178d3e5b9) · SENTRY_DSN 환경변수 · 진단 로그 3지점 승격 · 오케 조회 토큰 런북
- [ ] 아이패드 실기 재개 (#14 머지 뒤): 기동·스플래시 로고 · 로그인 로고 · Recent 칩 · 재고 숫자 · 담기 · Card · 연속 · 할인 · 칩 · Z

### 신규 요구 (Kyu 원문 · 11-03~04)
- [ ] **(11-03) Admin 웹 리브랜딩**: "Welcome to Medusa 가 나오거든? Welcome to Meros 여야하잖아" · "되는지는 M0가 확인했으면해" — Medusa Admin 문구·탭 title "Meros Admin"·로고 3A·favicon · 가능 여부 M0 확진 후 storeport PR
- [ ] **(11-03) Shop URL 칸 제거**: api.meros.id 앱 내 고정 · 로그인은 이메일·비번만 · 서버 전환은 설정 고급 — Kyu "동의" · 로그인 기억은 이메일만
- [ ] **(11-03) 가게 선택**: 로그인 후 계정 소속 매장 목록에서 선택 — Kyu "동의" · 코어 sales channel/stock location 우선
- [ ] **(11-03/04) Sentry 앱(Expo) SDK**: SDK 58 머지 뒤 · Expo Go 에선 JS 오류만, EAS dev build 에서 완전체
- [ ] **(11-04) EAS dev build 앞당김**: Expo Go 강제 업데이트 사고 재발 방지 · 홈 아이콘 "Meros POS" · Apple 개발자 계정($99/yr · Kyu 결제) 선행 · 평소 테스트 흐름은 동일(expo start + QR)
- [ ] (11-03) 품절 카드 흐림 과함 → 25% · 배지만 강조 — D(소소)
- [ ] (11-03) 유령 예약 정리: Whole 5 · Slice 19 → M0 제안 C "Z 마감 시 open draft 자동 drop"(오케 동의) · Kyu 결정 대기 · 지금은 Admin Reservations 수동 삭제
- [ ] (11-03) 실패한 URL 저장·오류 미표시 → Shop URL 제거로 자연 해소

### 로드맵 (10-12 합의)
- [ ] M0-1012-B: 싱가포르 리전 이전(DB 포함) + Redis
- [ ] B: RMA(반품·환불·취소) · 픽업 예약 · 보류 주문
- [ ] C: 고객 · 등급 · 스토어 크레딧(R043) · WA · Scan
- [ ] D 소소: 영어 잔여 · 타이포 · 칩 · 완료 화면 · About 라이선스 UI · 품절 흐림
- [ ] A 잔여: 결제수단 공식 provider = Phase 2 Midtrans/Xendit 와 동시
- [ ] 하드웨어 라운드: EAS dev build(위로 앞당김) + Xantri BT-58D BT 인쇄 + 서랍 열기 · iOS BLE
- [ ] 외부 신청: Meta WhatsApp(K11) · Midtrans/Xendit 머천트(K13/K14)
- [ ] Kyu 결정 보류: Metabase 선행 · 이연 16(AgentsPay) 봉인 · 오프라인은 매장 투입 뒤

## GrowNest (N0 동면)
- 재개 시 docs/handoff/HANDOFF-2026-09-14-N0-HIBERNATION.md 먼저 · 미결 = 카운트업 스케일 일반 스핀 적용(현행 유지)
- [ ] Sentry + Session Replay (전 제품 확장 · 재개 시)
