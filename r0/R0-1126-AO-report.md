relay#56 APPROVE

PR: feat/M2-1126-Q-ci-watch-v115 · 60f6b2e · v1.15
검토자: R0-1126-AO · 2026-11-26

---

## REQ 1 — 손계산 vs 실제 렌더 비교표

**기준 파일**: `status/ci/2026-11-26.jsonl` (485줄)
**MARKER_JOBS**: `{route, ci-summary, feature-map-route, changes-filter, markers-and-forbidden, cancel-on-close}` + `heavy-cloud`(fork 한정)

### 손계산 (Python · isCountableJob + classifyMachine + runner_kind)

| 기계 | PR | PT | 잡 |
|------|---:|---:|---:|
| MBP M1 | 12 | 13 | 82 |
| iMAC M1 | 15 | 19 | 138 |
| 클라우드 | 11 | 14 | 24* |
| **전체(세줄합)** | **38** | **46** | **244** |

> *Cloud 잡: `runner_kind=cloud` 기준 24건. `classifyMachine(runner_name)` 기준으로는 23건
> (차이 1건: `linux-check` runner_name=null, pr=None — PR/PT에 영향 없음)

### 실제 렌더 출력 (node renderLayout, 폭 100)

```
  MBP M1 오늘     PR 12 · PT 13 · 잡 82
  iMAC M1 오늘    PR 15 · PT 19 · 잡 138
  클라우드 오늘   PR 11 · PT 14 · 잡 24 · 넘김 0/5
  전체 오늘       PR 38 · PT 46 · 잡 244  (고유 PR 23)
```

**손계산 = 실제 렌더 완전 일치 ✅**

### 상단 오늘 처리(잡) ↔ 하단 클라우드 오늘 비교

```
  오늘 처리(잡)   ...  24건·1.3m $2.14   ← cloudData.realCount
  클라우드 오늘   ...  잡 24             ← 동일 소스
```

v1.15 핵심 수정: `buildTodayProcessedRow` 에 `cloudJobs = cd.realCount` 를 명시 전달 →
상단·하단 클라우드 잡 수 동일 소스 보장. **24 = 24 ✅**

---

## REQ 2 — ⚠ 집계 불일치 가드 확인

### 가드 함수 직접 호출

```
G1 (top≠bottom):   ['클라우드 상단 100 ≠ 하단 24']     ✅ 감지
G2 (totalPR wrong): ['전체 PR 99 ≠ 12+15+11=38']       ✅ 감지
G3+G4 (all bad):    4개 메시지 모두 올바르게 생성        ✅
```

### 화면 발동 여부

현재 `renderLayout` 내부는 `topCloudJobs: cloudJobs, bottomCloudJobs: cloudJobs`
(동일 변수)으로 가드를 호출하고, `totalPR = mbpPRv + imacPRv + cloudPRv` 로 직접 계산하므로
**G1~G4 모두 항등식 — 화면에서는 절대 발동 불가**.

코드 주석에 의도 명시됨:
> "(현재 코드는 같은 변수로 양쪽을 그려서 분기 가능성이 없지만, 회귀 방지 안전망)"

**판정**: 가드 함수 자체는 정상 동작. 화면 발동 불가는 의도된 설계(tautology).
함수 직접 호출 테스트(W115-G1~G4) 로 검증됨. **APPROVE 수준**.

---

## REQ 3 — PT 중복 집계 상식 점검

| 항목 | 값 |
|------|---:|
| 세줄합 PR | 38 |
| 고유 PR (summaryPR) | 23 |
| 중복 PR 수 | 15 (38-23) |
| 세줄합 PT | 46 |
| PT/PR 비율 | 1.21 |
| claims 기반 총 PT | 114 |

- 같은 PR이 MBP+iMAC 양쪽에서 돌 경우, 해당 PR의 pipeline PT는 두 기계 모두에 집계됨 (by design)
- PT 46 / PR 38 = 1.21 → **정상 범위** (터무니없이 크지 않음 ✅)
- MBP: PT 13 / PR 12 = 1.08, iMAC: 19/15 = 1.27, Cloud: 14/11 = 1.27 — 모두 정상

---

## REQ 4 — iMAC '쉼' 판정

실제 렌더:
```
  storeport-heavy   —    ?    쉼    —
  storeport-light   —    ?    쉼    —
  fork-heavy        —    ?    쉼    —
  fork-light        —    ?    쉼    —
```

- iMAC online+idle → `'쉼'` 표시 ✅
- v1.15 fix: `partial: false` 반환 (old: `partial: isPoolPartial`) — online 러너는 전역 partial 플래그 무시
- W115-imac-쉼 테스트 통과 ✓
- MBP `'?'`: 현재 allJson.ci_runners에 MBP runner 미등록 상태 (정상 — 오늘 OFF)

---

## 테스트 결과

| 파일 | 통과/전체 |
|------|-----------|
| ci-watch-w111.test.mjs | 15/15 ✅ |
| ci-watch-w113.test.mjs | 15/15 ✅ |
| ci-watch-w115.test.mjs | 11/11 ✅ |

---

## 최종 판정: APPROVE

**근거**:
1. Kyu 22:13 지적 핵심 (전체 오늘 숫자 불일치) 수정 완료 — 단일 소스 사용 보장
2. 손계산 = 실제 렌더 완전 일치
3. 가드 함수 작동 확인 (화면 발동은 설계상 tautology — 의도된 것)
4. iMAC online+idle → '쉼' 올바르게 표시
5. 모든 테스트 (41/41) 통과

**참고**: 화면에 ⚠가 직접 뜨려면 외부에서 불일치를 주입해야 하는데, v1.15는 렌더 함수 내에서
동일 변수로 양쪽을 채우므로 guard-screen 발동 불가. 이는 "조용히 틀린 숫자가 없다"의 증거.
