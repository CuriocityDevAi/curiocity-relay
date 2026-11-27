# 사건 — storeport CI 가 약 11시간 동안 시작도 못 하고 있었음 (11-27 00:27 ~ 11:2x WIB)

발견: 11-27 10:53 오케가 storeport#470 의 ci-summary 가 30분째 `ci.yml / (not started)` 인 것을 보고 M2-1127-D 에 원인 규명 발부 → 11:25 착지.

## 사실
- 원인: `ci.yml` heavy-mac 잡의 `env:` 에 `${{ 5173 + (github.run_id % 1000) }}` — GitHub Actions 표현식은 `+` `%` 산술을 지원하지 않음 → 워크플로 파싱 실패("workflow file issue") → 0초 실패. 들어온 곳 = storeport#467(M2-1126-U · 11-27 00:27 WIB 머지).
- 범위: 그 뒤 storeport main 과 main 에서 갈라진 모든 브랜치의 `ci.yml` 이 한 번도 돌지 않음(약 11시간). `feature-map-check` 같은 다른 워크플로는 정상이라 PR 화면엔 초록 체크가 일부 보였음.
- 수정: storeport#470(M2-1127-D · d5248b4) — `env:` 표현식 제거 → bash `$(( ))` 스텝. 수정 후 CI 17분 · 전체 초록.

## 왜 아무도 몰랐나
1. 실패가 "빨간 잡" 이 아니라 "잡이 아예 안 생김" 이라 ci-watch 대기열·진행 중·경보 어디에도 안 잡힘(잡 0개 = 조용함).
2. ci-summary 코멘트는 "(not started) ⏳" 로만 표시 — 실패로 읽히지 않음. R0-1127-B 도 "실패 없음" 으로 보고 APPROVE.
3. 오케의 CI 건강 감시가 "오래 걸림·대기열" 만 보고 "main 의 최신 CI 가 성공했는가" 를 안 봄.
4. 워크플로 파일 자체의 문법을 검사하는 단계가 없음.

## 조치
- [x] 원인 수정 머지(storeport#470).
- [ ] 00:27 이후 CI 없이 머지된 storeport PR 이 있었는지 · main 최신이 전체 초록인지 확인(M2-1127-E).
- [ ] 워크플로 문법 검사(actionlint)를 `.github/**` 를 건드리는 PR 에 별도 워크플로로(M2-1127-E) — ci.yml 이 깨져도 이 검사는 돌게.
- [ ] ci-watch 주의 구역: 리포별 "main 최신 CI 실행이 실패·시작 실패" 경보(M0 · relay#60 머지 뒤).
- [ ] R0 규칙: "CI 미시작(not started)·pending 은 초록이 아니다 — APPROVE 하지 않는다"(다음 R0 프롬프트부터 상시).
- [ ] 방법론 HISTORY 등재.
