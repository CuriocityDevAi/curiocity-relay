# M0-1105-AH 보고 — #208 main 위로 정리 · CI 초록 · P6 분할 결제 계획서 §0

## 요약
- #208 (`feat/m0-1105-ac-return-partial`) 을 `origin/main` (1eae82c · #207 squash) 위로 rebase. #207 원커밋 4건(`534c99c`·`fc69a8b`·`b4e5371`·`0dcb97a`) 제거, AC/AE 2건만 남김.
- 리베이스 **충돌 0건** · force-with-lease push 성공.
- CI: `pos-integration` **PASS** (2m39s) · `changes-filter`·`check`·`markers-and-forbidden` PASS · docker-smoke 전부 skipping (정상).
- P6 분할 결제(2 tender) 계획서 §0 신설 — 별도 브랜치 `docs/p6-split-tender-plan` (코드 0).

## #208 충돌 표

| 파일 | 충돌 |
| --- | --- |
| (전 파일) | **0 — 깨끗한 리베이스** |

`git rebase --onto origin/main 0dcb97a` 단일 명령으로 통과. #207 의 변경이 squash 되어 main 에 완전히 포함돼 있어 AC(e72d703)·AE(4761c14) 가 비충돌 fast-apply.

리베이스 후 HEAD: `b502b73` (AE) · 직전 `eb6440f` (AC) · base `1eae82c` (origin/main · #207).

## 로컬 검증

- `pnpm --filter apps/commerce-core typecheck` → 에러 0.
- `pnpm --filter apps/commerce-core test` → 5 suite · 33 pass · 0 fail.
- 전체 monorepo `pnpm typecheck` 는 `apps/wing/components/ui/button.tsx` 에서 pre-existing TS2786 (origin/main 과 **동일 · 본 리베이스와 무관** · 재현 완료).

## CI (`gh pr checks 208`)

| job | status | 시간 |
| --- | --- | --- |
| pos-integration | **pass** | 2m39s |
| changes-filter | pass | 7s |
| check | pass | 11s |
| markers-and-forbidden | pass | 9s |
| docker-smoke-{anchor,commerce-core,wing} | skipping | — |
| wrangler-check-care-agent | skipping | — |

→ 지시 "pos-integration 초록" 달성 · 빈 커밋 불필요.

## P6 분할 결제 계획서

- 경로: `docs/plans/P6-split-tender-plan.md`
- 브랜치: `docs/p6-split-tender-plan` (origin/main 기준 · 코드 0 · PR 미생성)
- 커밋: `2ea8714` (실제 SHA — prettier 재포맷 후 숫자 변동 가능) — origin 반영.
- 섹션: ① Medusa 2.17 대사표 (옵션 B "PC 2개" 권장) · ② 라우트 계약 (split 필드 + paid_so_far/remaining 응답 · 2 tender 상한 가드) · ③ 영수증·Z Report (array 구조 기존 재사용) · ④ 앱 화면 흐름 · ⑤ Kyu 질문 4건 · ⑥ 파일·허브 분할 (M0-1105-AI~AM).

## Kyu 에게 물을 질문 (계획서 §⑤ 요약)

1. **상한 tender 수**: (a) 2개 하드캡 ← 권장 · (b) N개 · (c) 3개. 근거: 원장 Q4 "최대 2개" 이미 명시.
2. **혼합 Void/Refund PIN 규칙**: (a) CASH 1건이라도 포함되면 PIN 필수 ← 권장 · (b) 혼합 무조건 PIN · (c) portion별 원 수단 규칙. 근거: PIN 뿌리 = 현금흐름 통제.
3. **품목 부분 환불 분배**: (a) CASH-first ← 권장 · (b) 마지막 tender-first · (c) 비율 배분. 근거: EDC 승인번호 체인 운영 비용 회피.
4. **Preorder DP + Split 동시 허용?**: (a) 상호 배타 ← 권장 · (b) 허용. 근거: metadata.preorder.balance_due 와 paid_so_far 이중 state 복잡도 폭증.

## 이연 순증감

- **신규 Deferred 0** — 본 라운드 자체가 계획 §0 발행.
- **해소 0** — AC/AE 는 #208 이 아직 OPEN (오케 지시: 머지 금지).
- **다음 라운드**: M0-1105-AI (서버 split 모드 구현) — Kyu Q1~Q4 응답 수신 후 티켓 개설.

## 착지 명령

```
cp /tmp/M0-1105-AH-report.md ~/projects/curiocity-relay/m0/
cd ~/projects/curiocity-relay
git add m0/M0-1105-AH-report.md
git commit -m "m0: M0-1105-AH"
git pull --rebase --autostash origin main
git push
node scripts/claim.mjs M0-1105-AH done "#208 리베이스·CI 초록 · P6 분할 결제 계획서 §0"
```
