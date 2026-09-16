# curiocity-relay

**목적**: CurioCity 오케스트레이터 ↔ 각 허브 (K0 test-portal 소스 UI · **K1 test-portal 배관** · T0 todoboss · N0 grownest · M0 storeport) 리포트 게시판. 챗 게시 대체 · 완료/상태 텍스트만.

**개통**: K0-0806-A · 2026-08-06
**K1 배관 편입**: K1-0914-A · 2026-09-14 (`checks/` 규약 신설 · schema_version 2)

---

## [철칙]

1. **소스코드·diff 금지** — 리포트/상태 텍스트만 (코드는 각 허브 리포 PR 에)
2. **비밀정보 금지** — 키·토큰·내부 URL·고객/개인 데이터
3. **간결** — 허브당 최신 리포트 1 개만 유지

---

## [청소]

1. **push 시 자기 허브 폴더의 기존 파일을 같은 커밋에서 삭제** (허브당 리포트 1 개 유지)
2. **매일 첫 조작 터미널이 orphan reset 로 히스토리 초기화**:
   ```bash
   git checkout --orphan tmp
   git add -A
   git commit -m "orphan reset · YYYY-MM-DD"
   git branch -M main
   git push -f
   ```
3. **조작은 항상 새 clone 에서** (로컬 보관 금지 · 매번 `rm -rf` 후 새 `git clone`)

---

## 폴더 구조

```
curiocity-relay/
├─ README.md          (이 파일 · 철칙 · 청소 · checks · events · prompts 규약)
├─ index.json         (build-index.mjs 자동 생성 · schema_version 3)
├─ n0/                (N0 · grownest 허브 · 리포트)
├─ t0/                (T0 · todoboss 허브 · 리포트)
├─ m0/                (M0 · storeport 허브 · 리포트)
├─ k0/                (K0 · test-portal 소스 UI 허브 · 리포트)
├─ k1/                (K1 · test-portal 배관 허브 · 리포트 · K1-0914-A 재정의)
├─ k2/                (K2 · 테스트 체계 허브 · 리포트 · K2-0914-A 신설)
├─ prompts/           (오케 프롬프트 큐 · req_ids 필수 · K1-0916-B 정본)
├─ checks/            (Kyu 실기 항목 파일 · K1-0914-A 신설)
├─ status/            (허브 상태판 · hubs.json · K1-0915-D 신설)
├─ events/            (K1-0916-B 신설 · <hub>/<YYYY-MM-DD>.ndjson · 세션 관측 이벤트)
├─ ledger/            (오케 원장 · requirements.yaml + open-requirements.md)
└─ scripts/           (build-index.mjs · index.json 생성)
```

---

## [prompts 규약] (K1-0916-B 정본 · 2026-09-16)

**목적**: 오케 프롬프트 큐. 각 프롬프트 파일 = 라운드 발부 대상 정본.

**파일 경로**: `prompts/<hub>/<ROUND-ID>.md` (예: `prompts/k0/K0-0916-E.md`)

**frontmatter (필수)**:
```yaml
---
id: <ROUND-ID>              # 예: K0-0916-E
hub: <hub>                  # 예: k0 · k1 · k2
issued_at: <ISO 8601>       # 예: 2026-09-16T00:00:00Z
status: pending             # pending | dispatched | landed
req_ids:                    # ★ 필수 · 발부 대상 R-id 배열 · 부재 = warnings 편입
  - R002
  - R013
---

## 요지
<한 문장 요약>
```

**규범**:
- `req_ids` = **반드시 편입** (K1-0916-B 정본 · Kyu 회신 Q5). 부재 시 build-index 안 `warnings[]` 편입.
- R-id 는 `ledger/requirements.yaml` 안 정의된 R-id 만 참조. 원장 부재 R-id 는 mismatch 대상.
- 소비 = 각 허브 데몬 (kyu-bridge session-events-watcher) 이 세션 안 tool_use 로 감지 → events 로 기록.

---

## [events 규약] (K1-0916-B 신설 · 2026-09-16)

**목적**: 요구 트레이스 이벤트 소스 (터미널 자기 보고 의존 없이 관측). Kyu 원문 R002 정본.

**파일 경로**: `events/<hub>/<YYYY-MM-DD>.ndjson` (매일 자정 UTC 회전 · D3 정본)

**line 스키마** (NDJSON · 각 line JSON):
```json
{"ts":"2026-09-16T07:02:51Z","hub":"k1","type":"read","target":"/abs/path or URL","session":"<jsonl-basename-uuid>","req_ids":["R002"]}
```

**type 8종** (Kyu K1-0916-C Q1):
- `read` = 원장/EPIC-STATE/tracking/state 읽기
- `reconcile` = /docs/tracking/* · /docs/state/* 편집 (재정합)
- `dispatch` = 프롬프트 투입 (ops/dispatch/inbox/**)
- `report-push` = relay `<hub>/*-report.md` push
- `inquiry-push` = relay `<hub>/*-inquiry.md` push
- `priority` = 원장 우선순위 변경 (ledger/requirements.yaml 편집)
- `consume` = 발부된 R-id 구현 착수
- `mismatch` = 리포트 주장 vs 세션 관측 불일치 (build-index 파생)

**소비**: `scripts/build-index.mjs` → `index.json.events[]` (최근 30일). `index.json.requirements[].trace5` 파생.

---

## [requirements yaml 필드 규약] (K0-0916-E-BA 신설 · 2026-09-16)

**목적**: K0 흐름판 (docs/spec/k0.md § K0-BA-8) 소비 정본. `index.json.requirements[]` 필드 스키마.

**신설 필드** (Kyu 원문 K0-0916-E · v3 와이어프레임 정본):
- **`size`**: `S` | `M` | `L` | `Epic` — 카드 크기 배지 (K0-BA-4 정합).
- **`next`**: boolean — 대기 열 맨 위 점선 카드 (다음 발부 예정 · 허브 당 최대 1건).
- **`conflict_with`**: string[] — 상충 R-id 배열 · 점선 빨강 + [삭제]/[유지] 버튼 노출.
- **`blocked_by`**: `'kyu'` | string — 파란 태그 "Kyu 결정이 막고 있음" (kyu 값) or 다른 R-id.

**기존 필드** (K0-BA-8 참조): id · hub · column · title · priority · age_days · repeat_count · issue_id · landed_pr · gate_result · drill_pass · drill_total · drill_defer_count · my_turn · needs_decision · merged · version_deployed.

**소비**: `src/lib/ui/flow-data.ts` `FlowRequirement` 인터페이스 정본 · K1 build-index.mjs 집계 시 이 스키마 준수.

---

## [checks 규약] (K1-0914-A 신설 · 2026-09-14)

**목적**: 각 라운드마다 Kyu 가 실 브라우저·기기에서 확인해야 할 항목 (`items[]`) 을 정본 게시. **판정 상태 원장 아님** (상태는 test-portal D1 `case_state` 정본 · GitHub Checks API `kyu-gate` 도장 별건).

**파일 경로**: `checks/<hub>/<ROUND-ID>.md` (예: `checks/k0/K0-0914-AU.md`, `checks/k1/K1-0914-A.md`)

**frontmatter (필수)**:
```yaml
---
id: <ROUND-ID>              # 예: K0-0914-AU · K1-0914-A
hub: <hub>                  # 예: k0 · k1 · n0 · t0 · m0
pr: <full github pr url>    # 예: https://github.com/CuriocityDevAi/test-portal/pull/92
issued_at: <ISO 8601>       # 예: 2026-09-14T12:00:00Z
author: <name>              # 예: orchestrator · k1 · kyu
items:
  - '{"device":"phone","title":"...","ok":"이러면 ✓","ng":"이러면 ✗","est_min":1}'
  - '{"device":"desktop","title":"...","ok":"...","ng":"...","est_min":2,"deep_link":"https://..."}'
---

## 요지
<한 문장 요약>
```

**items[] 각 원소 = JSON 문자열** · 아래 필드 (K0-AU 정본):

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `device` | `phone` \| `tablet` \| `desktop` \| `expo` \| `any` | ✓ | 실기 기기 종류 |
| `title` | string | ✓ | 확인 항목 제목 (사람 말) |
| `ok` | string | ✓ | 통과 조건 ("이러면 ✓") |
| `ng` | string | ✓ | 실패 조건 ("이러면 ✗") |
| `est_min` | number | ✓ | 예상 소요 분 |
| `deep_link` | string \| null | ✗ | 실기 진입 URL (있으면) |
| `auto` | `machine` \| `human` | ✗ | **K2-0916-A 신설** · 자동 회귀 대상 여부 (미지정 = K2 분류기 제안) |
| `assertion_id` | string | ✗ | **K2-0916-A 신설** · machine 항목의 어설션 파일명 (`assertions/<repo>/<assertion_id>.mjs`) |
| `req_id` | string[] | ✗ | **K2-0915-B 신설** · 요구사항 매핑 (traceability.md § 1) |

**규범**:
- **상태 전이 없음** (파일 자체 = 항목 목록 만 · 통과/실패 상태는 D1 case_state).
- **relay checks vs GitHub Checks API**: relay checks = **Kyu 실기 항목 목록** · GitHub Checks API = **kyu-gate 도장** (판정 · P3 정본). 정본 분리.
- 파서: `scripts/build-index.mjs` · `collectChecks()` · `index.json.checks[]` 로 집계 (schema_version 2 · v1 호환).
- 실기 후 판정 회수 = test-portal 상세 화면 (D1 case_state · POST `/api/case-state`).

**K2-0916-A · auto-from-checks 규약** (`test-portal/docs/testing/auto-from-checks.md` 정본):
- **`auto: machine`** = 숫자·문구·행수·DOM 판정 가능 → **`assertion_id` + 어설션 파일 필수** (전환 파이프라인).
- **`auto: human`** = 소리·감각·디자인 (영원히 사람) → assertion_id 없음.
- **미지정** = K2 분류기가 제안 (`test-portal/tools/regression-runner/bin/classify-checks --relay-root <path>`).
- **강제화 로드맵**: K2-0916-A (옵셔널) → K2-0916-B (auto 필수) → K2-0917 (machine 어설션 필수) → K2-0918 (coverage < 70% CI fail).

**예시** (K2-0916-A 이후 정본):

```yaml
items:
  - '{"device":"phone","title":"홈 파란 카드 있다","ok":"카드 보임","ng":"카드 없음","est_min":1,"auto":"machine","assertion_id":"aw-1-home-blue-card","req_id":["K100"]}'
  - '{"device":"phone","title":"착지 소리 딩 한번","ok":"딩 들림","ng":"소리 없음","est_min":1,"auto":"human"}'
```

---

## 조작 예시 (K0 리포트 push)

```bash
rm -rf /tmp/curiocity-relay
git clone https://github.com/CuriocityDevAi/curiocity-relay.git /tmp/curiocity-relay
cd /tmp/curiocity-relay

# (매일 첫 조작이면 orphan reset — 위 [청소] § 2 참조)

# 자기 허브 폴더 (k0/) 기존 파일 삭제
rm -f k0/*.md

# 리포트 신설
cat > k0/K0-XXXX-Y-report.md <<'EOF'
# K0-XXXX-Y · 제목
...
EOF

# commit + push
git add k0/
git commit -m "k0: K0-XXXX-Y 리포트"
git push

# 조작 후 로컬 clone 삭제
cd ~ && rm -rf /tmp/curiocity-relay
```

---

## 사본 정합

- 각 허브 리포에 규약 사본 존재 가능 (K0 = `docs/relay-conventions.md`)
- **이 README 가 정본** · 사본 갱신은 이 파일 갱신 후 각 허브 리포 PR

---

*K0-0806-A · 2026-08-06 · 개통*
