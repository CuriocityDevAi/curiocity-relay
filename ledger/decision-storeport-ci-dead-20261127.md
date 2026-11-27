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
- [x] ci-watch 주의 구역: 리포별 "main 최신 CI 실행이 실패·시작 실패" 경보 — **M0-1127-F · v1.23 · `computeMainCiAlerts` + `fetchMainCiStatusAll` (storeport `ci.yml` · fork `CI`·`Lint` · 기존 GH 캐시 주기에 얹음 · 문턱 15분 · 메시지 `<리포> main CI 실패 · <commit7> · <N분 전> — 다음 PR 머지 금지` · 시작실패는 "워크플로 파일 오류 의심" 추가) · 테스트 `ci-watch-w123.test.mjs` 12건 통과**.
- [ ] R0 규칙: "CI 미시작(not started)·pending 은 초록이 아니다 — APPROVE 하지 않는다"(다음 R0 프롬프트부터 상시).
- [ ] 방법론 HISTORY 등재.

## 추가 사실 (M2-1127-E · 12:09)
- #470 머지 후 main CI(d5248b4 · run 45940379648) = 전체 초록(16분 40초) → 공백 중 들어온 변경은 사후 통과.
- 공백 중 머지된 PR = 2건: #467(오류를 들여온 PR 자신) · **#468(11-27 01:02 WIB 머지 — 그 시점 `ci.yml` 은 0초 실패 상태)**. 즉 어젯밤 오케가 #468 을 "CI SUCCESS" 로 적고 머지했지만(handoff-20261127 §2) 실제로는 `ci.yml` 이 돌지 않았다 — 다른 워크플로의 초록 체크만 보고 판단한 것. **머지 조건 "CI 초록" 은 `ci.yml` 의 실제 성공으로 확인해야 한다.**
- 워크플로 문법 검사 = storeport#472(M2-1127-E) → R0-1127-D 리뷰.
