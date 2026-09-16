# CurioCity 열린 요구 원장 (오케 유지 · Kyu 원문 기준)

갱신: 2026-09-16 · 규칙: 새 요구 = 여기 먼저 등재(Kyu 원문 그대로 · 오케 번역은 괄호) · 소유 허브 필수 · 착지·실기 통과 시 ✅ · 이 파일이 챗보다 우선
**발부 규약(09-16)**: 모든 프롬프트 작성 직전 이 파일을 읽고, 프롬프트 첫 줄 아래 `원장 대사:` 한 줄에 포함 항목을 적는다. 없으면 발부 금지. Kyu가 같은 요구를 두 번 말하면 🔴 · 다음 발부에 무조건 포함. 터미널 "별건/이연"은 Kyu 원문과 대조해 명시 요구면 거부. 주 1회 "한 번도 발부 안 된 요구" 표를 Kyu에게 보고.

## 🔴 재언급 요구 (Kyu 3회 · 09-16)
- [ ] **"테스트 케이스들을 모았다가, 나중에 자동 테스트한다"** — Kyu 원문. (오케 번역: Kyu가 ✓✗ 찍은 실기 항목 중 기계 판정 가능한 것은 어설션으로 전환되어 축적 → 스케줄(PR마다·야간)로 자동 실행 → 다음 라운드부터 사람은 소리·감각 항목만.) 소유 = K2 · 발부 = K2-0916-A(09-16) · 상태 = 구현 중. 누락 원인 = 07-28~09-14 소유 허브 부재 + 오케가 "REQ↔테스트 매핑"으로 번역하며 원래 기능(축적→자동 실행) 탈락.

## 머지·실기 규칙 (Kyu 확정 2026-09-14)
- **test-portal**: 머지 조건 = 터미널 자기 검증 통과 + CI 초록. Kyu 판정 없음. 오케가 리포트 검토 후 GitHub에서 직접 머지(auto-selfcheck-merge 워크플로 가동 중). Kyu 실기 = 오케가 부르는 마일스톤 때만.
- **Todoboss · StorePort · GrowNest(제품)**: Kyu 판정 필요 유지.
- 사람 판정 최소 원칙: 백엔드/문서/테스트만 변경 = 사람 0건 · 화면 변경 중 숫자·문구로 검증 가능 = 기계 · 새 상호작용·소리·디자인 = 사람 · 돈 규칙 = 기계+샘플 1건.
- **포털 가치 정본(Kyu 09-16)**: 포털 고유 가치 = ① 네 맥과 붙은 자동화(발부 [투입]·환경 열기). 허브 상태판은 cmux가 대체 → 더 다듬지 않음. GitHub가 잘하는 것(알림·PR 목록·이력·checks)은 흉내내지 말고 링크. "조금 더 가보자" — 마일스톤 1 결과로 A(포털) vs B(GitHub+PR 프리뷰 환경) 판단.

## test-portal (K0 주인 · K1/K2 알바)

### 착지 ✅ (09-14~16)
- ✅ AW 홈 v3 상단 탭 · 진행 띠 · ok/ng 렌더 · AV 결함 7 · 판정 완료 PR 제외 · 허브 파생
- ✅ K1 환경 열기 v2(PR 소스 자동 준비·깨끗한 Chrome·autologin·SSE) · auto-merge 워크플로(test-portal 사람 판정 불요) · gate 연결 · 데몬 전용 clone · 허브 status watcher · 심문 자동 알림 · Expo 환경 열기
- ✅ K2 CI 초록 복원 · test_runs 이력 · /api/gate · seed-reset 계약 · docs/testing 4문서 · 야간 알림 · REQ↔테스트 매핑 · flaky · required registry 파생
- ✅ K0 gate/runs/SSE 소비 · 멀티 허브 · 공용 문서 허브별 분리 · 허브 실상태 소비 · 다기기 이어 찍기 · AQ 이월 완결 · 마일스톤 checks 초안
- ✅ 원장 파일 신설 · relay checks/ 규약(오케 push) · 게이트 뚫림 닫힘(야간 cron 1회 실측만 남음)

### 진행 중
- [ ] K2-0916-A: checks `auto: machine|human` + assertion_id · 착지 규약 "machine 항목마다 어설션 1개 필수" · 카탈로그 3중 매핑·coverage · 축적분 소급 분류 · /api/runs에 checks id별 결과 (🔴 요구의 구현)
- [ ] 마일스톤 실기 1회차 (Todoboss #23 · checks/k0/MILESTONE-1.md 13항목) — Kyu 실기 대기
- [ ] 야간 cron 실 이력 1회 회수 (K2)

### 다음 라운드 (우선순위 순)
- [ ] K0: 상세 "기계가 이미 확인한 N건" 실데이터(K2-0916-A 계약 소비) · 사람 항목만 펼침
- [ ] K0: 마일스톤 결과 결함 회수 · 허브 탭 축소(상태 다듬기 중단) · 이력/PR 목록은 GitHub 링크로 대체 검토
- [ ] K1: status watcher 정밀화(프로세스 존재≠실행 중 · 유휴 감지) — 우선순위 낮음(cmux 대체)
- [ ] K0/K1: 데몬 프로젝트 타입 범용화 · 시드 프로젝트별 · 새 프로젝트 = JSON 한 줄(회사 직원 사용 대비)
- [ ] GrowNest·StorePort 앱 dev 자동 로그인 가드 1줄(docs/env-recipes.md § 앱 협력) — N0/M0 라운드
- [ ] K0: SPEC.md 허브별 절 파일 분리(docs/spec/<hub>.md) — 충돌 재발 방지
- [ ] 각 리포 허브(N0/T0/M0): 리포별 CI · docs/testing.md · 시드 고정
- [ ] 알림 정본: 푸시 = OS 기본음+진동 · 포털 열림 시 띵 1회 · 설정 on/off · 기계 빨강은 사람 부르지 않음
- [ ] 회사(BCAP) 직원 사용 = 범용화 검증 라운드 · 챗 분리(프로젝트 1 + 챗 2: 포털/제품) 마일스톤 후
- [ ] B안 스파이크(결정 시): Todoboss Railway PR 환경 + PR 본문 체크박스 + GitHub 앱 알림 비교

## Todoboss (T0)
- [ ] T0-0915-A 착지(PR#23): orphan 필터 · "판정불가 4(출근 2·퇴근 2)" 표기 · [돌아가기] 필터 · 출근/퇴근 시각 직접 입력→재판정 — 마일스톤 1에서 Kyu 판정
- [ ] 이연: 파라미터화 · Finalize · Payslip · Work Rotation 편성

## StorePort (M0)
- [ ] M0-0915-A 착지(포크 PR#6 · storeport PR#111): 선행 PR 4개 master 머지 · SDK 57 — Kyu 폰 실기 K1~K8(checks/m0/M0-0909-A.md) → 포털 판정
- [ ] Kyu 결정: ①(가) "Kyu 혼자 써보는 수준" 목표 확정 ②Metabase 선행
- [ ] M0-B: 코어 중심 ADR 명문화 · Wing 정본 정정(Starter) · (가) 기준 잔여 재산정 · Admin 실기 절차 · storeport 미머지 PR 병합 순서(#59→#68/69→#70/71→#61/65→#104 · #86 닫기)
- [ ] POS 화면 갭 라운드: 반품·환불·취소 · 할인 적용 · 바코드(카메라)
- [ ] 하드웨어 라운드: EAS dev build(Android APK) + Xantri BT-58D BT 인쇄 + 서랍 열기 · iOS는 BLE 확인 후
- [ ] 외부 신청: Meta WhatsApp 번호(K11) · Midtrans/Xendit 머천트(K13/K14)
- [ ] 이연 16(AgentsPay 제약) 봉인 유지 · 오프라인은 매장 투입 뒤

## GrowNest (N0 동면)
- 재개 시 docs/handoff/HANDOFF-2026-09-14-N0-HIBERNATION.md 먼저 · 미결 = 카운트업 스케일 일반 스핀 적용(현행 유지)
