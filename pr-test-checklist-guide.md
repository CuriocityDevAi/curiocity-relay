# PR test-checklist 형식 가이드

**status**: 정본 (K0-0807-A · 2026-08-07 게시 · relay 루트)
**목적**: test-portal 이 PR 본문에서 파싱하는 **개요·케이스** 형식을 통일. 이후 오케가 전 허브 [REPORT] 에 이 형식을 강제할 근거 문서.

**적용 대상**: CurioCity 전 리포 (grownest · todoboss · storeport · test-portal 등) PR 본문. **README/PLAN/코드 코멘트 아님** — 오직 PR body.

---

## 1. 기본 규칙

- 형식 = **마크다운 + 코드펜스 YAML 블록**
- 위치 = PR body 안 · 개수 상관없음 (하나 이상 · 여러 개면 concat)
- 인코딩 = UTF-8 · 이모지 허용 · 한글 허용

---

## 2. 블록 구조

### 2.1 개요 (필수 · 최상단)

PR 본문 첫 문단 3~5 줄. 이 라운드가 무엇을 바꾸는지 · 왜 바꾸는지. test-portal 상세 화면 "테스트 개요" 섹션에 표시.

```
## 요지
- 이 PR 이 무엇을 바꾸는지 (1~2 줄)
- 왜 바꾸는지 · 어떤 결함/요구를 회수하는지 (1~2 줄)
- 배포·데이터·API 영향 (1 줄 · 있으면)
```

### 2.2 test-checklist 블록 (필수 · 최소 1 개)

```markdown
## test-checklist

​```yaml
- id: c1
  title: "카드 목록에서 '환경 미준비' chip 미표시"
  description: "홈 카드에서 disabled span 이 렌더되지 않아야 함"
  deep_link: "/"
  area: "test-portal/home"
  tags: ["ui", "regression"]

- id: c2
  title: "상세 [🚀 준비 + 열기] 원클릭"
  description: "kyu-bridge 데몬 소비 · 3 단계 badge 관찰"
  deep_link: "/pr/CuriocityDevAi/test-portal/55"
  area: "test-portal/bridge"
  tags: ["one-click", "kyu-bridge"]
​```
```

**필드**:

| 필드 | 필수 | 뜻 |
|------|------|----|
| `id` | ✅ | 케이스 ID (라운드 내 유일) · 예: c1, c2 |
| `title` | ✅ | 케이스 제목 (한 줄) |
| `description` | ✅ | 무엇을 확인하는지 (1~2 줄) |
| `deep_link` | 선택 | 도달할 URL 조각 (예: `/dashboard`) · 앱 base URL 에 append |
| `area` | ✅ | 스마트 회귀 매칭용 (예: `grownest/payroll`) · 자유 태그 아님 |
| `tags` | 선택 | 배열 · 필터·검색용 |

---

## 3. 회귀 영속화 필드 (선택 · 라운드에서 요구 회수 시)

test-portal SPEC § 18 회귀 스키마 5 항목 중 **① 추적성** 을 위한 필드:

```yaml
- id: c3
  title: "..."
  description: "..."
  area: "..."
  # ① 추적성 (선택 · 요구 명시 시)
  req_round_id: "K0-0807-A"      # 이 케이스를 요구한 라운드 ID
  req_text: "kyu-bridge 원클릭 착지 실기"  # [REQ] 원문
```

`req_pr` / `req_commit` = test-portal 이 PR merge 후 자동 채움 (수기 입력 불요).

---

## 4. 판정 유형

test-portal 상세 화면 판정 토글:

- `pass` (통과) · `fail` (실패) · `null` (미판정)
- 필수 아님 (수기 후 저장) · PR body 에 사전 기입 안 함

fail 시 fail_context (스크린샷 refs · 로그 · 딥링크 URL) 는 제출 시 자동 수집.

---

## 5. 예시 (전체 PR body)

```markdown
# K0-0807-A · β 승격 · kyu-bridge

## 요지
- kyu-bridge 로컬 데몬 신설 (127.0.0.1 · Bearer · 화이트리스트)
- 상세 화면 [🚀 준비 + 열기] 원클릭 배선 + γ 폴백 유지
- 배포 = auto-deploy 1-3 분 · 데이터/API 무영향

## test-checklist

​```yaml
- id: install
  title: "kyu-bridge 데몬 설치"
  description: "install 실행 후 status = OK · listening 확증"
  area: "test-portal/bridge"
  req_round_id: "K0-0807-A"

- id: oneclick-safari
  title: "[🚀 준비 + 열기 · Safari] 원클릭"
  description: "3 단계 badge · Safari 창 자동 열림"
  deep_link: "/"
  area: "test-portal/bridge"
  tags: ["one-click", "safari"]

- id: oneclick-chrome
  title: "[🚀 준비 + 열기 · Chrome] 원클릭"
  description: "3 단계 badge · Chrome 창 자동 열림"
  deep_link: "/"
  area: "test-portal/bridge"
  tags: ["one-click", "chrome"]

- id: fallback
  title: "브리지 실패 시 γ 폴백 자동 노출"
  description: "잘못된 토큰 입력 → error 안내 + fallback details 자동 열림"
  area: "test-portal/bridge"
  tags: ["fallback"]
​```
```

---

## 6. 잘못된 예 · 회피 규약

**❌ 코드 블록 언어 미지정** (파싱 실패):
````
```
- id: c1
```
````
→ `​```yaml` 로 지정 필수.

**❌ area 없음** (스마트 회귀 매칭 불가):
```yaml
- id: c1
  title: "..."
```
→ `area` 필수.

**❌ id 중복** (test_run 매핑 충돌):
```yaml
- id: c1
- id: c1
```
→ 라운드 내 유일 · 재사용 시 case_id 승격 관리 필요.

**❌ deep_link 에 base URL 포함**:
```yaml
deep_link: "http://localhost:3000/dashboard"
```
→ URL fragment 만 (`/dashboard`) · base URL 은 앱 매트릭스에서 조립.

---

## 7. 진화 계획 (test-portal 로드맵)

- **현재 (K0-0807-A)**: PR body 파싱 · manual 판정
- **후속 (v0.2 예정)**: `.test-portal/area-map.json` 각 리포 편입 → PR changed files → area 매칭 → 서브셋 자동 회귀
- **후속 (v0.3 예정)**: kyu-bridge → GitHub bus poll → 각 허브 자동 test_case 등록

---

*K0-0807-A · 2026-08-07 · relay 루트 게시 · 오케 형식 강제 근거 · 사본 정합 = relay 원본이 정본*
