R0-1121-D-report

#222 APPROVE · node20 영향 X · ci.yml cache 후속 필요 O

---

## 체크 1 — route → lint 배선 · route job ubuntu 실행

**PASS**

- `lint.runs-on: ${{ fromJSON(needs.route.outputs.runs_on) }}` + `needs: [route]` ✅
- `route.runs-on: ubuntu-latest` ✅ (#221 ci.yml 패턴과 동일)
- route-fork.sh 출력: self-hosted 시 `["self-hosted","curiocity-mac-fork"]`(JSON array), cloud 시 `"ubuntu-latest"`(JSON string) → `fromJSON()` 양쪽 모두 올바르게 처리

---

## 체크 2 — node 22→20 lint 영향

**영향 없음 (X)**

- `.nvmrc`: `v22` (로컬 개발 환경)
- `package.json`: `engines` 필드 없음
- lint 도구(ESLint + TypeScript) 는 node 20/22 간 동작 차이 없음
- ci.yml assertions/flow-tests/playwright 모두 이미 node 20 사용 중 — 동일 node-version 으로 통일 타당

메모: `.nvmrc v22` ≠ CI lint node 20 불일치 존재. 로컬 린트와 CI 린트가 서로 다른 node 버전에서 돌 수 있으나, 이 프로젝트 lint rule 집합에서는 실질 차이 없음으로 판단.

---

## 체크 3 — lint cloud run quota 미계상 의도 판정

**의도대로 (PASS)**

route-fork.sh `_cloud_today()` 카운트 조건:
1. `workflow_id=ci.yml` 로만 쿼리 (lint.yml 제외)
2. 카운트 증가 조건: run 내 `heavy-cloud` job 이 not-skipped

lint.yml 은 workflow_id · job명 모두 해당 안 됨 → lint 가 ubuntu 로 폴백되어도 quota 에 미계상.  
m2 리포트 명기("lint cloud run 은 quota 카운트에 미계상 · lint ~1분 · 비용 미미")와 일치. ✅

---

## 체크 4 — ci.yml assertions/flow-tests/playwright cache:'npm' hang 위험

**이번 PR 범위 밖 → 후속 필요 O**

현황:
- assertions(L26), flow-tests(L61), playwright(L86) 모두 `cache: 'npm'` 보유
- 세 job 모두 `runs-on: ubuntu-latest` 고정 → 매 실행 fresh 환경, `~/.npm` 누적 없음 → 현재 hang 위험 없음

후속 필요 사유:
- ci.yml 에 routing(self-hosted 폴백) 추가 시 동일 hang 패턴 발현 가능
- 예방 차원에서 routing 추가 전 `cache:'npm'` 제거 or self-hosted/cloud 분기 처리 필요

---

## 체크 5 — actionlint

**0 에러 ✅**

```
actionlint /tmp/pr222-lint.yml → clean (no output)
```
