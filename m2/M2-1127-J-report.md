# M2-1127-J — 영수증 단일 출처 R1 (공용 "줄 목록" 패키지)

**PASS · PR #475 · head 3313a7e · 테스트 36 pass (1 skipped manual-writer) · 패리티 차이 0 · CI: 초록 6/7 · heavy-mac still pending**

- PR: https://github.com/CuriocityDevAi/storeport/pull/475
- Branch: `feat/M2-1127-J-receipt-lines`
- Head: `3313a7e9dde112ad8a408eb4040ffc8434bb750b`

## CI (현장 실측 · 초록만)

| 체크 | 결과 | 시간 |
| --- | --- | --- |
| actionlint | ✅ pass | 21s |
| changes-filter | ✅ pass | 17s |
| check | ✅ pass | 27s |
| docker-build-commerce-core (ubuntu) | ✅ pass | 15s |
| markers-and-forbidden | ✅ pass | 21s |
| route | ✅ pass | 19s |
| heavy-mac | ⏳ pending (리포트 작성 시점) | — |
| heavy-cloud | ⏭ skipped | — |

## 뭘 했나

`packages/receipt-lines/` 신설 — 영수증 단일 출처 공용 패키지 (R1 = 패키지만).

**파일**

- `src/currency.ts` — `formatIdrRp(n)` 1-함수. `Rp 16.500` (양수) · `-Rp 1.500` (음수) · `Rp 0` (0/NaN). 로케일 독립.
- `src/snapshot-types.ts` — `ReceiptSnapshot` (서버 `buildSnapshot` 출력 모양 그대로) · `ReceiptMeta` (receipt_no·issued_at·kind·parent·reprint_count) · `ReceiptStoreFlags` · `Labels` + `DEFAULT_LABELS` (영어).
- `src/line-types.ts` — `ReceiptLine = logo | center | kv | rule | queue | banner | item | tender | qr | footer | blank`. 폭 포맷(32/48) 은 렌더러 몫 — 줄 목록에는 넣지 않음.
- `src/resolve-receipt-lines.ts` — `resolveReceiptLines(snapshot, receipt, opts): ReceiptLine[]`. 분기·순서·문구를 프린터 ESC/POS 렌더러(`apps/anchor/src/utils/pos/receipt/index.ts` + fork `lib/printer/receipt-escpos.ts`)에서 이전. 보존 요소 전부 포함: 로고 · 매장 (name/addr/tel/NPWP) · WA · Queue #N · No. R-… · Date WIB · Order (긴 번호 PIM26B1042) · Cashier · 품목 · 할인 · Service · PB1 · TOTAL · 결제수단 상세 (cash/card/qris · Received/Change · Xendit Ref 등) · VOID/REFUND/COPY 배너 + 원 영수증 메타 · Preorder · Delivery · QR · footer.
- `src/render-text.ts` — 참고 구현 `renderLinesAsText({width:32|48})`. 패리티 테스트와 하류 소비자(POS/CD plain-text preview) 재사용 가능.
- `src/index.ts` — 공개 API.
- `fixtures/snapshots.ts` — sale · reprint · void · refund · partial_refund · split-tender · preorder · delivery · no-tax · no-logo 조합.
- `tests/currency.test.ts` · `tests/resolve-receipt-lines.test.ts` · `tests/parity.test.ts` · `tests/__write-sample.test.ts` (WRITE_SAMPLE=1 로만 산출).
- `docs/testing/receipt-escpos-sample.txt` — 32-col frozen 스냅샷 (프린터 출력 "정답").
- `docs/feature-map.yaml` — `commerce-core.receipt` 프로세스 files 확장 (`packages/receipt-lines/**` · sample txt).

**매장별 표시 토글 (decision-receipt-tab-20261124 C안)**

`show_logo · show_whatsapp · show_queue · show_cashier · show_order_custom_display_id · show_qr` — opts.flags 로 주입 · 기본 보수적(요소 보이기 · WA 만 기본 off).

## REQ 매핑

| # | 요구 | 어디 |
| --- | --- | --- |
| 1 | `resolveReceiptLines(snapshot, receipt, opts)` 순수 함수 · 분기·순서·문구 이전 · 폭 포맷 제외 | `src/resolve-receipt-lines.ts` |
| 2 | 금액 1-함수 `Rp 16.500` / `-Rp 1.500` · 라벨 영어 (snapshot.labels 우선) | `src/currency.ts` · `resolveLabels()` in resolve |
| 3 | 테스트: sale · reprint · void · refund · partial_refund · split · preorder · delivery · 세금/서비스 on-off · 로고 on-off · 매장 토글 · **패리티** | `tests/*` |
| 4 | POS fork 가 쓰는 법 3줄 | PR 본문 "POS fork 가 이 패키지를 쓸 방법" |
| 5 | 검증의 검증: 품목 순서를 바꾸면 패리티 빨강 | `tests/parity.test.ts::DETECTS a reordering regression` 통과 |

## 테스트 요약

```
Test Files  3 passed | 1 skipped (4)
      Tests  36 passed | 1 skipped (37)
```

- `currency.test.ts` — 6 passes (양/음/0/round/NaN/locale)
- `resolve-receipt-lines.test.ts` — 28 passes (sale 공통 6 · discount 1 · reprint 1 · void 1 · refund 1 · partial_refund 1 · split 2 · preorder 1 · delivery 1 · tax/sc off 1 · logo off 2 · 매장 토글 4 · QR 2 · labels 2 · overall 2)
- `parity.test.ts` — 2 passes (byte-for-byte 일치 · 품목 순서 flip 감지)
- `__write-sample.test.ts` — WRITE_SAMPLE=1 아니면 skip (manual-writer 전용)

## 범위 밖 (R2/R3 발부로)

- ⛔ `apps/anchor/src/utils/pos/receipt/index.ts` (프린터 렌더러) — R2 에서 교체.
- ⛔ POS ReceiptCard · 손님 ReceiptScreen — R3.
- ⛔ 서버 `buildSnapshot` 형태 — 변경 금지 (현 snapshot 그대로 소비).

## POS fork 가 쓰는 법 (PR 본문 3줄)

1. **의존성** — fork `package.json` 에 `"@storeport/receipt-lines": "workspace:*"` (모노레포 안) 또는 git 의존성 (`"@storeport/receipt-lines": "github:CuriocityDevAi/storeport#path:packages/receipt-lines"`).
2. **빌드 결과물 위치** — 현재 `main: ./src/index.ts` (TS 그대로 노출 · 번들 없음). fork 가 Vite + ts-loader 환경이면 직접 임포트. tsup 번들이 필요하면 R2 에서 `dist/` 추가.
3. **진입** — `import { resolveReceiptLines, renderLinesAsText, formatIdrRp } from "@storeport/receipt-lines"` — `resolveReceiptLines` 한 번 돌리고 렌더러별로 `ReceiptLine[]` 소비 (프린터 = ESC/POS 바이너리 · POS = React · CD = React Native).

## 확인 지시

- PR 리뷰: https://github.com/CuriocityDevAi/storeport/pull/475
- heavy-mac 결과는 몇 분 뒤 PR 체크에서 확인 가능.
- R2 발부 시 이 패키지만 import — snapshot 모양도 라벨도 더 손댈 것 없음.
