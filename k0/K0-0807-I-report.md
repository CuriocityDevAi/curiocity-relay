# K0-0807-I · kyu-orchestrator v0.3 설계 정본 갱신 (⑦ 미션 보드 신설 · H 폐기 · docs-only)

**허브**: K0 · test-portal
**일자**: 2026-08-08
**상태**: **완료** (PR #61 · docs-only · Kyu 판정 대기)

---

## [실기] · Kyu 확인 절차 (docs-only)

**docs-only 라운드** = 실기 절차 최소 · Kyu 는 설계 문서 판독 위주.

### 확인 A · 문서 갱신

- `docs/design/kyu-orchestrator-v0.3.md` 갱신 확인 (17절 · 갱신 delta 390+/144-)
- § 17 Kyu 원문 (K0-0807-I 지시) 보존 확인
- `docs/SPEC.md` 트레일러 v1.28 편입 확인

### 확인 B · 확정 정본 7조 반영

- ① 큐 계층 분리 (§ 3)
- ② 포털 승인 큐 (§ 4)
- ③ 원장 공유 (§ 5)
- ④ 허브별 headless 세션 (§ 6)
- ⑤ 안전장치 (§ 7 · 4-조건 + ⑦ 하트비트 통합)
- ⑥ N-허브 확장성 (§ 8 · hubs.json registry · 하드코딩 제거)
- **⑦ 미션 컨트롤 보드 (§ 9 · 신설 · I 정본 핵심)**

### 확인 C · ⑦ 세부

- § 9.2 홈 미션 보드 레이아웃 (ASCII 도)
- § 9.3 허브 카드 필드 스펙 (표):
  - 상태 (작업 중/대기/막힘/실기 준비/정지 · 5종)
  - 라운드 ID · 마지막 이벤트
  - **하트비트 표지** (💗 alive / 💀 죽음)
  - **Kyu 할 일** 배지
  - [탭 열기] · [🛑 정지]
- § 9.4 상태 → 색상 정본 (파랑·회색·빨강·주황·진회색)
- § 9.5 **하트비트 규약**:
  - 세션 heartbeat.json 15s 주기 · TTL 30s
  - 데몬 `GET /events/heartbeat` 즉시 응답
  - 죽음 = macOS 알림 + 포털 배너
  - 원칙: **조용함 ≠ 정상** (침묵 = 결함)
- § 9.6 세션 로그 라이브 스트림:
  - `GET /events/session-log/:hub`
  - 옵션 (a) SSE / (b) chunked / (c) polling
  - K0 권고 = polling 초판 (자작 zero)
- § 9.7 승인 큐 패널 (② 연동 · Kyu 할 일 자동 집계)
- § 9.8 감사 이력 (relay 링크 · 라운드/원장/프롬프트)
- § 9.9 후순위 자리 (구현 후속): 작업 칸반 · 비용/토큰 패널
- § 9.10 **원칙**: 별도 도구 부착 금지 · test-portal 단일 통합 (파편화 방지)

### 확인 D · Kyu 판정 요청

**Q-I-1..Q-I-16 미결**:
- Q-I-1 로컬 큐 매체 (파일 or SQLite) — K0 권고 = 파일
- Q-I-2 원장 파일 형식 (하이브리드) — K0 권고 = 하이브리드
- Q-I-3 claude 세션 영속 (--continue or --session-id)
- Q-I-4 승인 큐 latency (5s · 15s · 30s)
- Q-I-5 무진전 임계 (연속 3회)
- Q-I-6 N-허브 하드코딩 fallback 유지 여부 · 편집 UI 시점
- Q-I-7 세션 로그 스트림 (SSE / polling)
- Q-I-8 하트비트 TTL (30s)
- Q-I-9 미션 보드 갱신 주기 (10s 권고)
- Q-I-10 자동 vs Kyu gate 6문 (확장?)
- Q-I-11 긴급 정지 스코프 (허브별 + 전체)
- Q-I-12 세션 이력 retention (30일 압축)
- Q-I-13 프롬프트 조립 템플릿 (파일)
- Q-I-14 세션 자동 재시작 (3회 시도)
- Q-I-15 relay ledger 편집 권한 (데몬 write only)
- Q-I-16 작업 칸반 · 비용 패널 = 로드맵 후속 or 별건 EPIC

**I+1 착수 사인** (or 순서 조정) · Kyu 판정.

---

## 완료 요약

### PR #61 (docs/k0-0807-i-orchestrator-mission-control · `40bcd9a`)

- 2 파일 · 390+ / 144- (갱신)
- **docs-only 확증**: `git diff --name-only main..HEAD | grep -vE '^docs/'` = empty
- 코드 · 테스트 · 빌드 무변경 (Kyu 명시 · 구현 금지)
- SPEC § 5.4 docs-only 자동 pass 대상

### 신설 산출물

**`docs/design/kyu-orchestrator-v0.3.md` (17절)**:
- § 1 요지 · Non-goals · 스코프
- § 2 아키 3층 (챗 오케 → 데몬 → session)
- § 3 ① 큐 계층 분리 (파일 채택)
- § 4 ② 포털 승인 큐 (endpoint 8 확장)
- § 5 ③ 원장 공유
- § 6 ④ 허브별 headless 세션
- § 7 ⑤ 안전장치 (4-조건 · Kyu 불변)
- § 8 ⑥ N-허브 확장성 (H 편입 · hubs.json registry)
- **§ 9 ⑦ 미션 컨트롤 보드 (신설 · 10 서브절)**
- § 10 분기 기준 (6문 체크리스트)
- § 11 포털 허브 탭 4 UI
- § 12 hubs.json 관리 · 편집 UI
- § 13 판정 head SHA 재조회 (I+9)
- § 14 로드맵 I+1..I+9 (+ I+10/I+11 자리)
- § 15 Q-I-1..Q-I-16 미결
- § 16 이연 순증감
- § 17 정본 근거 · Kyu 원문 (보존)

**`docs/SPEC.md` 트레일러 v1.28** = F/H 폐기 · G 흡수 · I 정본 명시 · 7조 요약 · I+n 로드맵 · Q-I-n

---

## 이연 순증감

**implemented (K0-0807-I)**:
- v0.3 설계 정본 갱신 (17절 · ⑥ + ⑦ 편입)
- SPEC v1.28 트레일러
- Q-I-1..Q-I-16 미결 목록

**신설 이연 (별건 라운드 · Kyu 사인 후)**:
- **I+1** 로컬 큐 (1일)
- **I+2** hubs.json registry (1일 · ⑥ 착지)
- **I+3** 승인 큐 데이터 (1일)
- **I+4** 원장 공유 (1일)
- **I+5** headless 세션 (2일)
- **I+6** 자동 투입 루프 (2일)
- **I+7** 안전장치 4 + 하트비트 (1.5일)
- **I+8** ⑦ 미션 컨트롤 보드 + 세션 로그 라이브 (2.5일)
- **I+9** 허브 탭 4 + head SHA 재조회 (2일)
- I+10 (자리) 작업 칸반 · 별건 EPIC
- I+11 (자리) 비용/토큰 · 별건 EPIC

**폐기**:
- kyu-orchestrator v0.3 F 라운드 (K0-0807-F) — 참조 안 함
- kyu-orchestrator v0.3 H 라운드 (K0-0807-H) — 참조 안 함 (⑥ 만 흡수)
- kyu-orchestrator v0.3 G 라운드 (K0-0807-G) — 이 문서로 흡수 (초안)

**기존 이연 유지**:
- kyu-bridge v0.2 (K0-0807-D 완결)
- K0-0807-E 병합 완료 → I+1 착수 조건 충족
- Mixed content Safari/Chrome 실측 (K0-0807-A 잔존)

---

## 다음 대기 (Kyu 회신 후)

1. **문서 판독** → 7조 반영 확인 · ⑦ 세부 검토
2. **Q-I-1..Q-I-16 판정** → 각 미결 Kyu 결정 (K0 권고 채택 or 대안)
3. **I+1 착수 사인** (or 순서 조정)
4. **PR #61 병합** (docs-only 자동 pass · 관행)

---

*K0-0807-I · 2026-08-08 · v0.3 설계 정본 갱신 · docs-only · 구현 금지 · F/H 폐기 · G 흡수 · ⑦ 미션 컨트롤 보드 신설*
