# K0-0807-G · kyu-orchestrator v0.3 설계 정본 (F 폐기 · docs-only · 구현 금지)

**허브**: K0 · test-portal
**일자**: 2026-08-08
**상태**: **완료** (PR #60 · docs-only · Kyu 판정 대기)

---

## [실기] · Kyu 확인 절차 (docs-only · 실기 최소)

**docs-only 라운드** = 실기 절차 최소 · Kyu 는 설계 문서 판독 위주.

### 확인 A · 문서 존재 · 형식

- `docs/design/kyu-orchestrator-v0.3.md` 신설 확인 (14절 · 726 라인 · Kyu 원문 § 14 보존)
- `docs/SPEC.md` 트레일러 v1.27 편입 확인

### 확인 B · 확정 정본 5조 반영

- ① 큐 계층 분리 (§ 3) — 파일 채택 · 구조도
- ② 포털 승인 큐 (§ 4) — 데이터 흐름 · 스키마 · endpoint 4
- ③ 원장 공유 (§ 5) — 하이브리드 MD+JSON · append-only · 충돌 우선순위
- ④ 허브별 headless 세션 (§ 6) — claude -p · cwd · lifecycle · 5 단계 루프
- **⑤ 안전장치 개정 (§ 7) — 라운드 상한 없음 · 4-조건**:
  - ⓐ 실기 가능 상태 도달 (판정 6항 AND)
  - ⓑ Kyu 결정 필요 (승인 큐)
  - ⓒ 무진전 감지 (연속 3회 FAIL)
  - ⓓ 긴급 정지 스위치 (포털 + CLI · halt.flag persistent)
  - Kyu 불변 = main 병합 · approve · kyu-gate 판정 (K0-0806-A/D 재확인)

### 확인 C · 추가 항목

- 분기 기준 (§ 8) — 자동 vs Kyu 게이트 · 6 문 체크리스트
- "실기 가능 상태" 판정 6 항 (§ 7.2 ⓐ)
- 포털 허브 탭 4 UI (§ 9)
- 로드맵 G+1..G+8 (§ 11 · 총 11일 예상)
- **Q-G-1..Q-G-12 미결** (§ 12)
- 판정 제출 head SHA 재조회 (§ 10 · G+8)

### 확인 D · Kyu 판정 요청 항목 (구현 진입 前)

**Q-G-1..Q-G-12** 중 착수 前 결정 필요 항목:
- Q-G-1 로컬 큐 매체 (파일 or SQLite) — K0 권고 = 파일
- Q-G-2 원장 파일 형식 (MD or JSON or 하이브리드) — K0 권고 = 하이브리드
- Q-G-3 claude 세션 영속 방식 (--continue or --session-id)
- Q-G-4 승인 큐 latency (5s · 15s · 30s) — K0 권고 = 15s + 5s(blocking)
- Q-G-5 무진전 임계 (연속 3회 or 조정)
- Q-G-6 자동 vs Kyu gate 체크리스트 항목 (6항 or 확장)
- Q-G-7 포털 탭 배치 순서 · 우선순위
- Q-G-8 긴급 정지 스코프 (허브별 or 전체 병존) — K0 권고 = 둘 다
- Q-G-9 세션 이력 저장 위치 · retention
- Q-G-10 relay ledger 편집 권한 (데몬 write only or 포털 write 허용)
- Q-G-11 프롬프트 조립 템플릿 (하드코딩 or 파일)
- Q-G-12 세션 자동 재시작 (auto or Kyu 판정)

**G+1 착수 사인** (or 순서 조정) · Kyu 판정.

---

## 완료 요약

### PR #60 (docs/k0-0807-g-orchestrator-v0.3-design · `2cb9182`)

- 2 파일 · 743+ / 0-
- **docs-only 확증**: `git diff --name-only main..HEAD | grep -vE '^docs/'` = empty
- 코드 · 테스트 · 빌드 무변경 (Kyu 명시 · docs-only)
- SPEC § 5.4 docs-only 자동 pass 대상 (kyu-gate 면제)

### 신설 산출물

**`docs/design/kyu-orchestrator-v0.3.md` (14절 · 726 라인)**:

- § 1 요지 · Non-goals · 스코프
- § 2 아키 3층 (챗 오케 → 데몬 → session)
- § 3 ① 큐 계층 분리 (파일 채택 근거 · 구조도 · atomic rename + advisory lock + fs.watch)
- § 4 ② 포털 승인 큐 (데이터 흐름 · 스키마 · endpoint 4 · latency)
- § 5 ③ 원장 공유 (relay/ledger · 하이브리드 · append-only + tombstone · 충돌 우선순위)
- § 6 ④ 허브별 headless 세션 (claude -p · lifecycle 6 상태 · 자동 투입 5단계)
- § 7 ⑤ 안전장치 개정 (4-조건 · Kyu 불변 재확인)
- § 8 분기 기준 (자동 vs Kyu 게이트 · 6문 체크리스트)
- § 9 포털 허브 탭 4 UI 스펙
- § 10 판정 제출 head SHA 재조회 (G+8)
- § 11 로드맵 G+1..G+8
- § 12 Q-G-1..Q-G-12 미결
- § 13 이연 순증감
- § 14 정본 근거 · Kyu 원문 (보존)

**`docs/SPEC.md` 트레일러 v1.27** = 로드맵 등재 (F 폐기 · G 정본 · 5조 요약 · G+n)

---

## 이연 순증감

**implemented (K0-0807-G)**:
- v0.3 설계 정본 문서 (14절)
- SPEC v1.27 로드맵 등재
- Q-G-1..Q-G-12 미결 목록

**신설 이연 (별건 라운드 · Kyu 사인 후)**:
- **G+1** 로컬 큐 스캐폴드 (1일)
- **G+2** 승인 큐 데이터 계층 (1일)
- **G+3** 원장 공유 스캐폴드 (1일)
- **G+4** headless 세션 프로세스 (2일)
- **G+5** 자동 투입 루프 (2일)
- **G+6** 안전장치 4 조건 구현 (1.5일)
- **G+7** 포털 허브 탭 4 UI (2일)
- **G+8** 판정 head SHA 재조회 (0.5일)
- **Q-G-1..Q-G-12** 판정 (구현 진입 前)

**기존 이연 유지**:
- kyu-bridge v0.2 (K0-0807-D 완결 · v0.3 조건)
- K0-0807-E 병합 = G+1 착수 조건 (병합 대기)
- Mixed content 실측 (K0-0807-A 잔존)
- **kyu-orchestrator F 라운드 = 폐기 · 참조 안 함**

**병합 순서**:
- PR #60 (이 라운드 · docs-only) = SPEC § 5.4 docs-only 자동 pass 대상
- 이전 라운드 = 병합 완료

---

## 다음 대기 (Kyu 회신 후)

1. **문서 판독** → 5조 반영 확인 · 8·9·11·12 검토
2. **Q-G-1..Q-G-12 판정** → 각 미결 Kyu 결정 (K0 권고 채택 or 대안)
3. **G+1 착수 사인** (or 순서 조정)
4. **PR #60 병합** (docs-only 자동 pass · 관행)

---

*K0-0807-G · 2026-08-08 · v0.3 설계 정본 · docs-only · 구현 금지 · Kyu 안전장치 ⑤ 개정 반영 · F 폐기*
