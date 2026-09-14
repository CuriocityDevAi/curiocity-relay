# CurioCity 열린 요구 원장 (오케 유지 · Kyu 원문 기준)

갱신: 2026-09-14 · 규칙: 새 요구 = 여기 먼저 등재 · 착지·실기 통과 시 ✅ · 이 파일이 챗보다 우선

## 머지·실기 규칙 (Kyu 확정 2026-09-14)
- **test-portal**: 머지 조건 = 터미널 자기 검증 통과 + CI 초록. Kyu 판정 없음. 오케가 리포트 검토 후 GitHub에서 직접 머지(K1이 auto-merge에 "사람 판정 불요" 규칙 넣으면 자동). Kyu 실기 = 오케가 부르는 마일스톤 때만.
- **Todoboss · StorePort · GrowNest(제품)**: Kyu 판정 필요 유지.
- 사람 판정 최소 원칙: 백엔드/문서/테스트만 변경 = 사람 0건 · 화면 변경 중 숫자·문구로 검증 가능 = 기계 · 새 상호작용·소리·디자인 = 사람 · 돈 규칙 = 기계+샘플 1건.

## test-portal (K0 주인 · K1/K2 알바)

### 진행 중
- [ ] K0-0914-AW 홈 v3: 상단 탭 3(실기·허브·이력) · 프로젝트/설정은 톱니 · "할 일"·"최근 활동"·"프로젝트" 카드 폐지 · 한 줄 정보 ≤3 · 첫 줄 파란 테두리 · 줄 전체 링크 · 빈 상태 화면 · 모달 버튼 56px
- [ ] K0-0914-AW 판정 후 진행 띠: 제출→머지 요청→머지됨(보라)→배포 중→배포 완료(초록)+[실기 시작]+푸시 1건 · /api/version · 실패 빨강+이유
- [ ] K0-0914-AW 상세: checks 항목 = 제목 + ✓줄 + ✗줄 렌더 · PR 본문 test-checklist YAML 필수
- [ ] K1-0914-C PR#94 충돌 해소 → 머지
- [ ] K2-0914-A: CI 초록 복원(al2 삭제·ao4 fix·러너 pre-flight) · test_runs 이력 + /api/runs · /api/gate(green/red/none) · seed-reset 계약 + 포털 자체 시드 · docs/testing 4문서 · retires 규약

### 다음 라운드 (우선순위 순)
- [ ] **K1 환경 열기 v2 (Kyu 최우선 09-14)**: 버튼 1회 = PR 브랜치 worktree checkout+pull+deps(잠금파일 변경 시) → 프로젝트별 환경 레시피(projects.json: 시작 명령·포트·마이그레이션/시드·자동 로그인·기본 화면) → 새 브라우저 프로필(캐시 0) → 자동 로그인 → checks deep_link 화면 → 포털에 "준비됨" 표시 · Expo도 로그인+화면 파라미터
- [ ] K1: auto-merge.yml = test-portal 사람 판정 불요(자기 검증+CI 초록이면 머지) + /api/gate 연결(기계 빨강이면 머지 불가 · K2 gate-contract)
- [ ] K1: Kyu 알림 실기(아이폰 PWA·맥) · 배포 완료 푸시 · Expo QR SVG 상세 렌더
- [ ] K0: 이력 탭 "성공 판정 · 2일 전 · 내가" 행위 중심 · 최근 20+더보기
- [ ] K0: 다기기 P/F 이어 찍기 실측(폰→맥 합산) · 종합 판정 1회
- [ ] K0: PopMenu(bits-ui) · octicon 잔여 · 중첩 푸시 마무리 · DirtyGuard 실 E2E
- [ ] K0/K1: 데몬 프로젝트 타입 범용화(web·expo·기타) · 시드 프로젝트별 · 허브·프로젝트 전부 projects.json 파생(회사 직원 사용 대비 · 새 프로젝트 = JSON 한 줄)
- [ ] K2: 테스트 체계 v1 원칙 문서(수용 기준 코드 전 · 층 배치 · 환경 동일성 · 게이트 · 이력 · 소유) + Kyu 5항(요구 번호로 테스트 찾기 · 요구 변경 시 같은 PR에서 테스트 수정 · 싼 테스트 전량/비싼 테스트 선택+머지 전 전량 · 사람 판정 최소 · 배포 기준 4조건)
- [ ] K2: REQ ID ↔ 테스트 ID 매핑 칸(requirements-tracking) · 테스트 실행 이력·flaky 표시
- [ ] 각 리포 허브(N0/T0/M0): 리포별 CI · docs/testing.md · 시드 고정 (포털 아님 · 각 허브 라운드)
- [ ] 알림 정본: 푸시 = OS 기본음+진동 · 포털 열림 시 띵 1회 · 설정 on/off · 기계 빨강은 사람 부르지 않음 · 같은 PR 재착지 = 갱신
- [ ] 마일스톤 실기 1회차 = AW + 환경 열기 v2 착지 후 (오케가 호출)
- [ ] 회사(BCAP) 직원 사용 = 범용화 검증 라운드(새 프로젝트 등록 시나리오)

## Todoboss (T0)
- [ ] T0-0911-B 실기 (i)~(vii) → PR#23 판정
- [ ] 시각 직접 입력 조정 → 재판정(지각/야근 자동 산출) — B에서 UI만·로직 이연
- [ ] 이연: 파라미터화 · Finalize · Payslip · Work Rotation 편성

## StorePort (M0)
- [ ] M0-0909-A 실기 K1~K8 (개점→현금/카드/QRIS→수금→마감→Z→WA)
- [ ] Kyu 결정: ①(가) "Kyu 혼자 써보는 수준" 목표 확정 ②Metabase 선행
- [ ] M0-B: 코어 중심 ADR 명문화 · Wing 정본 정정(Starter) · (가) 기준 잔여 재산정 · Admin 실기 절차 · 미머지 PR 병합 순서(fork #2→#3→#4→#5 · storeport #59→#68/69→#70/71→#61/65→#104 · #86 닫기)
- [ ] POS 화면 갭 라운드: 반품·환불·취소 · 할인 적용 · 바코드(카메라)
- [ ] 하드웨어 라운드: EAS dev build(Android APK) + Xantri BT-58D BT 인쇄 + 서랍 열기 · iOS는 BLE 확인 후
- [ ] 외부 신청: Meta WhatsApp 번호(K11) · Midtrans/Xendit 머천트(K13/K14)
- [ ] 이연 16(AgentsPay 제약) 봉인 유지 · 오프라인은 매장 투입 뒤

## GrowNest (N0 동면)
- 재개 시 docs/handoff/HANDOFF-2026-09-14-N0-HIBERNATION.md 먼저 · 미결 = 카운트업 스케일 일반 스핀 적용(현행 유지)
