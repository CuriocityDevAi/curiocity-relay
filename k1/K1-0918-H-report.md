---
round: K1-0918-H
hub: k1
pr: null
outcome: merged
ledger_events:
  - id: R034
    action: filed
    note: 'todoboss T0-0918-D · 초기화 후 집계 재확인 정본'
  - id: R035
    action: filed
    note: 'test-portal K0-0917-G · 실기 목록 필터'
  - id: R036
    action: filed
    note: 'test-portal K0-0917-J · 포털 반응 속도 · verified'
  - id: R037
    action: filed
    note: 'todoboss T0-0918-A · STEP N→N+1 룰'
  - id: R038
    action: filed
    note: 'test-portal K0-0918-B · 클코 허브 검색·PR# 필터'
  - id: R039
    action: filed
    note: 'storeport M0-0918-G · POS 앱 R2 스토리지'
  - id: R040
    action: filed
    note: 'storeport M0-0918-C · fulfillment_policy · ADR-0013'
  - id: R041
    action: filed
    note: 'storeport M0-0918-D · POS 앱 영어화'
  - id: R042
    action: filed
    note: 'storeport M0-0918-I · 코어 갭 대사표 · repeat 2 (🔴)'
  - id: R043
    action: filed
    note: 'storeport 로열티 · next 발부 대상'
kyu_checks: []
---

## 요지

**원장 등재 10건 (R034~R043)** + **build-index 파서 R043 drop 회수 (부수 · R107 도 드러남)**.

Kyu K1-0918-H 원문 = "원장 등재 (코드 0)". 실제로는 파서 사전 버그 (`\Z` JS 미지원 · 마지막 엔트리 silently drop) 로 R043 이 index.json 안 편입 안 됨 → 최소 회수 (split 기반 재작성 · 코드 5줄) 편입.

## 등재 결과 (10건 · 정본 index.json 값)

| R-id | 프로젝트/허브 | P | 크기 | 상태 | column | 발부 | note (요지) |
|---|---|---|---|---|---|---|---|
| R034 | todoboss/t0 | P0 | S | landed | landing | T0-0918-D | 초기화 후 집계 재확인 · 정본 = 시드 기준 (Kayla_PS 매핑) |
| R035 | test-portal/k0 | P1 | M | landed | landing | K0-0917-G | 실기 목록 필터 (허브·PR#·상태·검색) |
| R036 | test-portal/k0 | P0 | M | verified | merged | K0-0917-J | 반응 속도 · 4왕복→서버 캐시 1회 |
| R037 | todoboss/t0 | P0 | M | landed | landing | T0-0918-A | STEP N→N+1 프로세스 콘솔 룰 |
| R038 | test-portal/k0 | P1 | M | landed | merged | K0-0918-B | 클코 허브 검색·PR# 필터 |
| R039 | storeport/m0 | P1 | M | landed | landing | M0-0918-G | POS 앱 · R2 스토리지 (LAN/EAS) |
| R040 | storeport/m0 | P0 | M | landed | landing | M0-0918-C | fulfillment_policy immediate\|deferred · ADR-0013 |
| R041 | storeport/m0 | P1 | M | issued | implementing | M0-0918-D | POS 앱 영어화 (잔여 라운드 D) |
| R042 | storeport/m0 | P0 | L | landed | landing | M0-0918-I | 코어 갭 대사표 · repeat 2 · 🔴 |
| R043 | storeport/m0 | P1 | L | filed | waiting | (next) | 고객 로열티 · 등급별 포인트 · 라운드 C |

## build-index 파서 정정 (부수 · 코드 5줄)

**뿌리**: `parseRequirementsYaml` 안 regex `/^- id: (R\d+)\n([\s\S]*?)(?=\n- id:|\n\n[A-Z#]|\Z)/gm` = JS 정규식 안 `\Z` 미지원 (literal Z) · **마지막 엔트리 lookahead 실패 = silently drop**. R107 (K0-0916-F 이관 후) · R043 (이번) 실측 확증.

**정정**: split 기반 파서로 재작성 (`src.split(/^- id: /m).slice(1)` · 각 chunk 안 id 파싱). 모든 엔트리 확실히 캡처.

**부수 회수**: R107 (test-portal 딥링크 · P2 · S · filed · blocked_by hub:t0) 도 이제 index.json 편입. 이전엔 원장 안엔 있지만 index.json 안엔 부재.

## 검증 로그

```
$ node scripts/build-index.mjs (before parser fix)
✓ requirements=49 (yaml=50 · R043 drop)
$ node scripts/build-index.mjs (after parser fix)
[ledger-events] 파싱 완료 · commits=1 · events=40
[pr-states] fetched=26 · uniq=26
✓ index.json · requirements=50 · rollup=(filed=17, max_age=54d, 🔴=4)
$ node -e "..." (R043 확증)
R043: PRESENT · storeport filed waiting next=true note=고객 모듈 + 고객 그룹 + 스토어 크레딧 위 적립 규칙 · 라운드 C
R107: PRESENT (부수 회수)
```

## 착지

- `ledger/requirements.yaml` = R034~R043 append (106 lines)
- `scripts/build-index.mjs` = parseRequirementsYaml split-based rewrite (16 lines diff · 마지막 엔트리 drop 회수)
- `index.json` = CI 자동 rebuild (별건 · 이 push 시 auto-trigger)

## 회부

- K0 흐름판 = 다음 렌더 시 자동 반영 (프록시 60s cache 만료 후). Kyu 별건 조치 없음.
- rollup filed_count 15→17 · red_count 3→4 (R042 repeat 2 · 🔴 편입). 월요일 backlog push 소스 자동 갱신.
