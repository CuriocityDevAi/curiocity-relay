PASS · PR #286 · head d1921d7 · e2e run https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45949922086 (pass 1m56s)

---

## 작업 요약

**건드린 파일 2개 — 제품 코드 미변경**

1. `e2e/cd-pos/case1.spec.ts` — 어설션 3곳 조임 (REQ 3 · W1·W2a·W2b)
   - **W1** `earnedAmount`: `/\d/` → `/\+Rp\s*[\d,.]+/`
     - 이유: test DB `earn_rate=0` → `+Rp 0` 가 올바른 결과. `/\d/` 는 너무 약함(빈값·NaN 통과).
       포맷 체크 `/\+Rp\s*[\d,.]+/` 로 교체 — 금액 형식 보증·빈값 차단·0 허용.
   - **W2a** `cd-phone-status`: `.first()` → `.filter({ visible: true }).first()`
   - **W2b** `cd-phone-status-reenter`: `.not.toHaveCount(0)` → `.filter({ visible: true }).toBeVisible()`

2. `e2e/cd-pos/sequential.spec.ts` — 신규 (REQ 1·2·4)
   - **3-5 연속**: Order A 결제 → Next customer → `main-screen` → Order B 결제 → `left-receipt-mini` + 번호 없는 상태 chip 어설션
   - **3-6 새로고침** (a)(b)(c): 빈 카트·결제중·번호입력중 각 상태에서 reload 후 복원 확인
   - **검증의 검증** 주석: `main-screen` 대신 `left-receipt-mini` 를 기대하면 timeout 실패하는 근거 (index.tsx:367-371 `cdFallbackMain=building+none+items=0 → MainScreen`) 를 spec 헤더에 명시

## Kyu 확인 항목

- `sequential.spec.ts` 는 현재 워크플로가 `case1.spec.ts` 만 실행 — fork#285 머지 후 `.github/workflows/e2e-cd-pos.yml` step `run:` 에 `e2e/cd-pos/sequential.spec.ts` 한 줄 추가 필요 (PR #286 본문에 명시).
- W1 earned 어설션은 `+Rp 0` 도 통과 (earn_rate=0 이 test DB 현실). 나중에 earn_rate>0 인 환경에서 "0 이 아님" 까지 조이고 싶으면 `/\+Rp\s*[1-9][\d,.]*/ ` 로 추가 조임 가능.
- 전 CI 체크 초록: assertions · flow-tests · lint · playwright · unit-tests · e2e case 1 모두 pass. heavy-cloud skipping (zero-cloud 준수).

## CI 체크 전체

| check | result |
|---|---|
| e2e · case 1 (실서버) | ✓ pass 1m56s |
| playwright (Expo harness) | ✓ pass 6m55s |
| assertions | ✓ pass |
| unit-tests | ✓ pass |
| flow-tests | ✓ pass |
| lint | ✓ pass |
| heavy-cloud | skipping (zero-cloud) |
