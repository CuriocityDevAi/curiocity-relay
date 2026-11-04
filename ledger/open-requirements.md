# CurioCity 열린 요구 원장 (오케 유지 · Kyu 원문 기준)

갱신: 2026-11-04 16:50 · 규칙: 새 요구 = 여기 먼저 등재(Kyu 원문 그대로 · 오케 번역은 괄호) · 소유 허브 필수 · 착지·실기 통과 시 ✅ · 이 파일이 챗보다 우선
**발부 규약(09-16)**: 모든 프롬프트 작성 직전 이 파일을 읽고, 프롬프트 첫 줄 아래 `원장 대사:` 한 줄에 포함 항목을 적는다. 없으면 발부 금지. Kyu가 같은 요구를 두 번 말하면 🔴 · 다음 발부에 무조건 포함. 터미널 "별건/이연"은 Kyu 원문과 대조해 명시 요구면 거부. 주 1회 "한 번도 발부 안 된 요구" 표를 Kyu에게 보고.

## 🔴 재언급 요구 (Kyu 3회 · 09-16)
- [ ] **"테스트 케이스들을 모았다가, 나중에 자동 테스트한다"** — Kyu 원문. (오케 번역: Kyu가 ✓✗ 찍은 실기 항목 중 기계 판정 가능한 것은 어설션으로 전환되어 축적 → 스케줄(PR마다·야간)로 자동 실행 → 다음 라운드부터 사람은 소리·감각 항목만.) 소유 = K2 · 발부 = K2-0916-A(09-16) · 상태 = 구현 중. 누락 원인 = 07-28~09-14 소유 허브 부재 + 오케가 "REQ↔테스트 매핑"으로 번역하며 원래 기능(축적→자동 실행) 탈락.

## 방법론 추가 (Kyu 승인 11-04 · "응 방법론에 넣자. 동의해")
- **① R0 리뷰 허브 (시범 3 PR 뒤 측정으로 유지/폐기)**: 제품 PR마다 만든 허브가 아닌 별도 세션(R0)이 처음 보는 눈으로 코드를 읽고 깨끗한 환경에서 돌려본 뒤 **PR 코멘트**로 승인/수정 요청. 채널 = GitHub PR (허브 간 직접 통신 없음 · Kyu 는 R0 창에 프롬프트 1회 붙여넣기). 체크리스트 v1 = ⑴ 깨끗한 환경 실기동 (**package.json 변경 시 격리 `--frozen-lockfile` 포함**) ⑵ 직전 Kyu 실기 ✗ 재현 여부 ⑶ 다른 PR/파일과 충돌 ⑷ 지시 밖 변경 ⑸ 놓친 엣지 1~3. 측정 = R0가 잡은 결함 수 / Kyu 실기에서 터진 수 / 소요 시간 → 3 PR 뒤 판정. **시범 1호 = fork #16 (R0-1104-A · 11-04 발부)**. 근거 = 최근 PR 7개 중 3개(1103-B 재고 0 · 1103-D 기동 크래시 · 1104-E lock 누락)가 자기 검증 통과 후 배포/실기에서 터짐.
- **② 파일 주인 명시**: 발부문에 건드릴 파일 목록 필수 · "파일 하나 = 주인 하나" · 동시 라운드가 겹치면 순차. 근거 = 11-03~04 충돌 3건(#11/#12 · #175).
- **③ 계획 게이트**: 큰 라운드는 M0 가 계획(코어에 있음/우회/신규 대사표 · 파일 목록)만 먼저 → 오케 승인 → 코딩. 첫 적용 = M0-1104-G(11-04 · 승인 · 4 PR 분할).
- **④ (해야 할 일 · 지금 당장 아님 · Kyu "이왕이면 더 자동인 길로") 2단계 = Anthropic `claude-code-action`(GitHub Action용 Claude Code)을 storeport · agilo-medusa-pos-fork · todoboss · grownest 리포에 걸어 PR 열릴 때마다 사람 개입 없이 자동 리뷰 코멘트**. 선행: R0 시범으로 체크리스트 다듬기(2~3 PR) → 그 체크리스트를 Action 프롬프트로 이식. 설정 = workflow 파일 1개 + 시크릿 1개(Claude 구독 OAuth 토큰 또는 API 키 · Kyu 결정). 소유 = K0(인프라) 또는 각 리포 허브.
- **⑤ (11-04 Kyu 결정) kyu-gate 폐기** — Kyu 원문: "굳이 필요없더라구. 지금까지 내가 뭔가를 제대로 검증한적이 없고, 있어서 오히려 프로세스만 꼬여왔음." storeport 필수 체크에서 제거 완료(11-04). 머지 전 검증 = R0(→Action) · 사람 판정 = 배포 후 실기. 포털 미니 라운드에서 게이트 코드 삭제.
- **⑥ (11-04 Kyu) 4허브 동시 작업 — "총 4개 정도는 동시작업을 해야 속도가 날 것"**: M0 = storeport 서버/Admin · M1 = fork 로그인/매장 · M2 = fork 관측/빌드(package.json·_layout·eas.json 주인) · M3 = fork 화면 소소(products/카드). 같은 리포는 git worktree(`~/projects/pos-m1..m3`)로 분리. 오케는 서로 다른 허브 프롬프트를 한 응답에 동시 발부. 병목 경고 = Kyu 실기 적체 → 앱 실기는 하루 1회 몰아서.
- **⑦ (11-04 Kyu) relay 감시**: Kyu 가 이 창에서 작업 중일 때만 3분 간격 · 30분 무응답 자동 꺼짐 · "감시 켜/꺼". 감시 중엔 Kyu 가 결과를 붙여넣지 않아도 됨. 결함: `status/hubs.json` 이 허브 목록 고정(m1~m3 칸 없음 → M1 이 수기 등재) → relay 스크립트가 `<hub>/` 디렉터리를 스캔하도록 수정 필요(K0/M0 docs 라운드).
- 사람 몫 정본(11-04 Kyu): 테스트 · 판정 · 승인 (+취향·책임). 그 외는 AI. 오케의 Kyu Mac 파일 쓰기·앱 내 브라우저 클릭은 폴더·사이트별 Kyu 승인 범위 안에서만 · 코드 수정은 클로드코드 몫 · 돈·삭제·외부 발송은 매번 Kyu 직접.

## 전 제품 공통 (11-04 Kyu)
- [ ] **Sentry 전 제품 확장** — Kyu "응 등재해줘" (서버 ✅ 11-04 → 앱(M2-1104-A #15 · 리베이스 중) → 웹(GrowNest·Todoboss) 순 · 웹은 Session Replay). 오케 조회 경로 = Kyu Mac 앱 내 브라우저(로그인됨) 또는 허브 Sentry MCP · **읽기 토큰은 무인 자동화(Action) 때까지 보류**. Sentry 프로젝트: `commerce-core` ✅ · `pos-app`(Kyu 수동 생성 필요).
- [ ] **[REPORT] 상시 조항 (11-04)**:
  - ⓐ 앱 PR 은 로직 어설션만으로 착지 불가 — Expo 웹 실기동(Playwright: 로그인 화면 도달 · console.error 0) 필수 (근거 M0-1103-D 회귀).
  - ⓑ standalone lock 을 가진 앱(apps/commerce-core 등)의 package.json 변경 시 격리 디렉터리 `pnpm install --frozen-lockfile` exit 0 로그 + build PASS 로그 PR 본문 필수 (근거 M0-1104-E/F).
  - ⓒ **승인 게이트 제거 (11-04 Kyu "워크플로 개선해줘")**: 커밋·push·PR 발의는 **승인 없이 바로** 진행(되돌릴 수 있는 행위 · 머지만 사람 결정). 구현 중 기술 선택지(A/B/C)가 생기면 **멈추지 말고 권장안으로 진행**하고 PR 본문에 "선택지·채택·이유" 3줄 기록 — 멈춰도 되는 경우는 ⑴ 돈·삭제·외부 발송 ⑵ Kyu 원문과 정면 충돌 ⑶ 파일 주인 범위 밖 수정이 불가피할 때(그때는 범위 확장 요청 1줄). 근거 = 11-04 16:45 M0·M1·M2 세 창이 동시에 승인/선택 대기로 멈춤.
- [ ] 이름 원칙(11-04 Kyu 정정): StorePort = 플랫폼 전체(anchor·wing·careagent·todoboss 포함) · Meros = 커머스 묶음(anchor·wing·careagent) 브랜드 · 인프라/모니터링 프로젝트명은 **배포 서비스명 그대로**(Sentry `commerce-core` 등). naming-check 예외 = `apps/commerce-core/src/admin/**`(사용자 노출 브랜드 면 · M0-1104-H 결정 A).

## 머지·실기 규칙 (Kyu 확정 2026-09-14 · 11-04 kyu-gate 폐기 반영)
- **test-portal**: 머지 조건 = 터미널 자기 검증 통과 + CI 초록. Kyu 판정 없음. 오케가 리포트 검토 후 GitHub에서 직접 머지.
- **Todoboss · StorePort · GrowNest(제품)**: Kyu 판정 = 배포 후 실기 (머지 전 게이트 아님). 머지 = Kyu 한마디("N 머지") 또는 빌드 깨짐 핫픽스·R0 APPROVE 후 오케 직접.
- 사람 판정 최소 원칙: 백엔드/문서/테스트만 변경 = 사람 0건 · 화면 변경 중 숫자·문구로 검증 가능 = 기계 · 새 상호작용·소리·디자인 = 사람 · 돈 규칙 = 기계+샘플 1건.
- **포털 가치 정본(Kyu 09-16)**: 포털 고유 가치 = 네 맥과 붙은 자동화(발부 [투입]·환경 열기). 허브 상태판은 cmux가 대체. GitHub가 잘하는 것은 링크.
- **(10-12 Kyu) test-portal 동결** · 모니터링 = claude-code-kanban + 오케(relay) · 포털은 "열기 + ✓✗ 한 페이지"로 축소. K1 종료.
- **(11-03 Kyu) 오류 수집 방식**: Sentry 도입 OK. "Kyu가 테스트 중 문제 나면 한마디 신호 → 오케가 Sentry 조회 → 진단 → 프롬프트". 예약 점검은 매장 실사용 뒤.

## test-portal (K0 · 동결)

### 착지 ✅ (09-14~16)
- ✅ AW 홈 v3 · K1 환경 열기 v2 · K2 CI/test_runs/gate · K0 gate/runs/SSE · 원장 파일 신설 · 게이트 뚫림 닫힘

### 결함 기록 (동결 중 · 포털 미니 때 처리)
- [ ] (11-02·11-04) kyu-gate: 포크 레포 check-run 404 · storeport #175 체크 미게시 → **11-04 Kyu 결정으로 폐기** (필수 체크 제거 완료 · 코드 삭제는 포털 미니)
- [ ] (11-02) 포털 PR 목록에 storeport #151 미표시 (index 배치 빈 목록)
- [ ] (11-04) relay `status/hubs.json` 허브 목록 고정 → 디렉터리 스캔으로

### 다음 라운드 (포털 미니 · 우선순위 순)
- [ ] K0: "열기 + ✓✗ 한 페이지" 축소 · 사람 항목만 펼침 · kyu-gate 코드 삭제 · hubs.json 스캔
- [ ] K0: 저장→배치 즉시 반영 · 이력/PR 목록은 GitHub 링크로 대체
- [ ] K0/각 리포: `claude-code-action` 자동 리뷰 (방법론 ④) — R0 시범 뒤
- [ ] K0: SPEC.md 허브별 절 파일 분리
- [ ] 각 리포 허브(N0/T0/M0): 리포별 CI · docs/testing.md · 시드 고정
- [ ] 알림 정본: 푸시 = OS 기본음+진동 · 포털 열림 시 띵 1회 · 설정 on/off
- [ ] B안 스파이크(결정 시): Railway PR 환경 / EAS Update + Playwright/Maestro

## Todoboss (T0 · M0 뒤)
- [ ] T0-0915-A 착지(PR#22/#23): orphan 필터 · "판정불가 4" 표기 · [돌아가기] 필터 · 출근/퇴근 시각 직접 입력→재판정 — Kyu 실기 대기
- [ ] 이연: 파라미터화 · Finalize · Payslip · Work Rotation 편성
- [ ] Sentry + Session Replay (전 제품 확장 · M0 뒤)

## StorePort / Meros (M0~M3 · 최우선 10-12)

### 브랜드 정본 (Kyu 확정 11-03)
- 제품명: **Meros POS** · **Meros Admin** · 손님 사이트는 추후 Meros Shop 또는 매장명. 문장 속 Meros · 워드마크만 MEROS. 오픈소스 고지는 Settings → About 한 곳.
- 로고: 시안 3A "Receipt" 확정 · ✅ 적용(M0-1103-C #11). 색 토큰 brand.ink #0E1B18 · amber #E8A33D · green #1C7C68 · cream #F2F4F1.
- 도메인(11-03 완료): meros.id (호스팅어 · Cloudflare). `admin.meros.id` ✅ · `api.meros.id` ✅ · `images.storeport.app` = R2. Railway Hobby 커스텀 도메인 한도(서비스당 2) 소진.

### 착지 ✅
- ✅ Z 핫픽스 (#126) · M0-1012-A (포크 #8 · #151) · R2 (11-02)
- ✅ M0-1103-A (#9) 재고 fail-open · M0-1103-B (#10) 앱 리브랜딩·로그인 기억·재고 2차 조회 · M0-1103-C (#11) 로고 3A · M0-1103-D (#12) 옛 draft ID 복구 · M0-1104-A (#13) 기동 크래시 해소 · M0-1104-B (#14) Expo SDK 58
- ✅ M0-1104-C/E/F (storeport #175 · #176): Sentry 서버 · `commerce-core` · Railway `sentry on` 확인(Kyu 11-04)
- ✅ M0-1104-G (storeport #177): 계획서 — "가게" = stock_location · 1매장 MVP · 분할 B(Admin)/C(Shop URL)/D(자동 선택)/K(다중 매장 RBAC · 지연)
- ✅ 아이패드 실기: 1 띠 포맷 ✓ (11-03)
- ✅ Apple Developer Program Individual 가입·결제 (11-04 · 승인 메일 대기) — EAS 선행 조건

### 진행 중 (11-04 4허브)
- [ ] **M0-1104-H** (계획 B · storeport): Admin 리브랜딩 — 구현·빌드·Playwright 4건 PASS · naming-check 예외(결정 A) 적용 후 커밋·PR
- [ ] **M1-1104-A** (계획 C · fork): Shop URL 제거 + api.meros.id 상수 + 옛 URL 마이그레이션 — 어설션 44/44 · Playwright 9/9 · 커밋·PR 대기
- [ ] **M2-1104-A/B** (fork #15): 앱 Sentry env-gated + eas.json — #15 master 충돌 → B 리베이스 중. Kyu: Sentry `pos-app` 프로젝트 생성 · DSN 은 EAS secret
- [ ] **M3-1104-A** (fork #16): 품절 카드 흐림 25% + 배지 + 탭 토스트 — 착지 · **R0-1104-A 리뷰 시범 1호** → 머지 → 아이패드 실기 4건
- [ ] 아이패드 실기 몰아서(머지 뒤 1회): 기동·스플래시 로고 · 로그인 로고 · Shop URL 부재 · 재로그인 안내 1회 · Recent 칩 · 재고 숫자 · 품절 흐림/배지/토스트 · 담기 · Card · 연속 · 할인 · Z

### 다음 (계획 D·K · 기타)
- [ ] **M0-1104-J (계획 D · fork · M3 또는 M1)**: 매장 1개면 setup wizard 자동 통과 — C(M1-A) 머지 후
- [ ] M0-1104-K (지연): 다중 매장 RBAC — "2+ 매장 계정" 요구 시
- [ ] M2 후속: Sentry 소스맵(SENTRY_AUTH_TOKEN · EAS secret) · EAS dev build 실행(Apple 승인 뒤)
- [ ] M3 후속: 품절 배지 brand 토큰 정렬 · `components/ProductCard.tsx` 추출(주인 파일 공식화)
- [ ] (11-03) 유령 예약 C안 Kyu 결정 대기
- [ ] **(11-04) 결제(PG) — 차순**: Kyu "먼저 하던거 마무리하고, 결제 붙이는것은 차순". 채널 3 = ① 매장 QRIS(PG 동적 QR) ② 매장 카드(Mandiri EDC · MTI ECR API) ③ 온라인(Wing · 같은 PG). PG 추천 Xendit 우선(xenPlatform) · Midtrans 대안 · Medusa Payment Provider 직접 구현. Kyu 결정 보류: Xendit/Midtrans · Soopsok KYC

### 로드맵 (10-12 합의)
- [ ] M0-1012-B: 싱가포르 리전 이전(DB 포함) + Redis
- [ ] B: RMA · 픽업 예약 · 보류 주문 — [ ] C: 고객·등급·크레딧(R043)·WA·Scan — [ ] D 소소
- [ ] A 잔여: 결제수단 공식 provider = PG 라운드와 동시
- [ ] 하드웨어: EAS dev build + Xantri BT-58D 인쇄 + 서랍 · iOS BLE
- [ ] 외부 신청: Meta WhatsApp(K11) · PG 머천트(K13/K14)
- [ ] Kyu 결정 보류: Metabase 선행 · 이연 16(AgentsPay) 봉인 · 오프라인은 매장 투입 뒤

## GrowNest (N0 동면)
- 재개 시 docs/handoff/HANDOFF-2026-09-14-N0-HIBERNATION.md 먼저
- [ ] Sentry + Session Replay (전 제품 확장 · 재개 시)
