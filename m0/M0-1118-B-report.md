PR #359 · A1 단계 4 · A2 이행 필요 N · 경계 위반 15건 · 라운드 11개

# M0-1118-B 리포트

**티켓**: M0-1118-B — POS 마무리 공용 정리 계획서 (A1 · A2 · 폴더 경계) · 문서만
**브랜치**: `docs/M0-1118-B-pos-finish-plan` @ `469105d`
**PR**: https://github.com/CuriocityDevAi/storeport/pull/359 (ready · 머지 X)
**워크트리**: `/Users/kyu.lee/curiocity-live/storeport-wts/hub-m0`
**산출**: `docs/plans/pos-finish-shared.md` 1개 (332줄)

## 결과 요약

- **A1 설계 단계 수**: 4 (S1 receipt 이동 · S2 응답 바디 보존 · S3 QRIS slim · S4 register_session Wing 가드)
- **A2 이행(데이터 백필) 필요 여부**: **N** — `order.metadata.preorder.*` 포맷 유지 · 신규 reservation row 는 신규 preorder 만
- **폴더 경계 위반 수(공용 → POS 전용 import)**: **15** (payment_xendit 5 · subscribers 6 · workflows pos-{fulfill,void} 2 · 테스트 2)
- **라운드 수**: **11** (R-B0~B3 경계 4 + R-A1-0~A1-2 결제 뒤처리 3 + R-A2-S1~S5 픽업 4)

## 핵심 발견

1. 뒤처리 신규 workflow 안 만듦 — Medusa 이벤트 subscriber 3개(`loyalty-earn-on-paid`, `order-snapshot-paid`, `register-session-order-attribution`)가 이미 "공용 orderPaidWorkflow" 역할. Wing은 `completeCartWorkflow` + `capturePaymentWorkflow` 만 부르면 같은 뒤처리 자동으로 돔.
2. 유일한 "라우트 안 inline" = receipt 생성 (`tenders/route.ts:1517`, `xendit/route.ts:766`). 이걸 `receipt-mint-on-paid` subscriber 로 떼는 게 A1 의 실 작업.
3. pickup_slot 모듈은 `service.ts:1-18` 빈 스캐폴드 · 모델 無 · 마이그레이션 無. 신설 자유.
4. 선주문은 metadata 11개 키(`order_type`, `preorder.{deposit_pct, deposit_amount, balance_due, stage, pickup_at, note, dp_paid_at, paid_full_at}`, `tenders[]`, `line_item.metadata.lettering_text`)에 전부. 이행 없이 공용 서비스가 metadata 쓰기 소스로 수렴.
5. 결정 필요 애매 4건 (§4.4) — `register_session` 쪼개기 · `payment_xendit` 자격 이동 · `customer-display` 위치 · `workflows/pos-*` 유지 여부.

## 준수 (D1·D3·D4·D5)

- D1: commerce-core 한 서버 유지 · POS/공용 영역 분리 = ESLint 룰로 enforce (§4)
- D3 A1: 공용화 범위 명시 (§1~2)
- D3 A2: Wing = 채널 모양 (§3.5)
- D3 폴더 경계: 15건 위반 리스트 + 수정 라운드(R-B1·R-B2·R-B3)
- D4 Wing 로그인: customer-identity 워크플로가 이미 다중 identity — 충돌 없음 (§6)
- D5 순서: POS 마무리 → Wing 마일스톤 · 이 계획서가 전자

## 라운드 순서

R-B0 → (R-B1 ∥ R-B2) → R-B3 → R-A1-0 → R-A1-1 → (R-A1-2 ∥ R-A2-S1) → R-A2-S3 → R-A2-S4 → R-A2-S5

파일 주인 겹침:
- `tenders/route.ts` — R-A1-1 → R-A2-S3 → R-A2-S5
- `xendit/route.ts` — R-A1-1 → R-A1-2
- `pickup_slot/**` — R-A2-S1 → R-A2-S4 → R-A2-S5

## 커밋·PR 상태

- `git log --oneline -1` → `469105d docs(plans): M0-1118-B — POS 마무리 공용 정리 계획서`
- `processes: [infra.docs-plans]` 포함 (CLAUDE.md §10 준수)
- feature-map.yaml 글로브 `docs/plans/**` 가 커버 (infra.docs-plans) — 갱신 불필요
- PR open as draft → **ready** · 머지 X (오케 소관)
- 승인 없이 commit·push·PR 완료

## 다음

1. 사용자 리뷰 → §4.4 애매 4건 결정
2. 라운드 티켓 발행 (R-B0 먼저 · 30분)
3. R-A1-1 전후 Kyu 실기 1회 (영수증 subscriber 이동)
