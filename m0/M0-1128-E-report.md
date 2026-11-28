# M0-1128-E — PASS · PR #487 · 5/5 byte match

## 첫 줄 요약
**PASS** · PR [#487](https://github.com/CuriocityDevAi/storeport/pull/487) · 5/5 바이트 일치 · 머지 금지 (Kyu 실기 프린터 1장 확인 몫)

## 체크리스트

- [x] 기준 파일 5종 생성 — `docs/testing/receipt-escpos-printer-{sample,card,qris,refund-s,void-s}.txt`
  - 출처: fork master `00acc59` · `lib/printer/receipt-escpos.ts :: renderReceiptEscPos → escposBytesToText`
  - transform: `IDR N,NNN → Rp N.NNN` (음수 sign 앞으로)
  - 생성 스크립트: `/tmp/gen-baselines/gen.mjs` (fork 리포 미터치 — node_modules·tsc 만 활용)
- [x] 패키지 수정 7항목 + NPWP·Service charge 데이터-가드 → `packages/receipt-lines/src/resolve-receipt-lines.ts`
- [x] 들여쓰기 수정 — 라벨 있는 detail(APPROVAL · Ref) 는 col 0, 플레인 줄(brand+last4 · issuer) 만 2칸 (`render-text.ts`)
- [x] parity.test.ts 를 **기준 파일 byte-equal** 비교로 교체 (5종 전부 일치 · QR caption 포함)
- [x] NPWP·Service charge "데이터 있을 때만" 검증 fixture + 어서션 추가
- [x] 검증의 검증 — `PB1` → `PB1 10%` 로 되돌리면 parity 5/5 빨강 재현 → 원복

## 커밋·브랜치
- 브랜치: `feat/M0-1128-D-receipt-printer-baseline`
- 커밋: `ecd4e36a feat(receipt-lines): M0-1128-D — 프린터 완전 패리티 + 기준 파일 교체`
- 변경: 14 files · +307 / −280

## `pnpm run check:pr`
```
════════════════════════════════════════
 precheck 요약  PASS=5  FAIL=0
════════════════════════════════════════
  PASS: 머지 여부 (현재 브랜치는 미머지)
  PASS: origin/main 충돌 없음 · 최신 상태
  PASS: lint (바뀐 패키지 1개)
  PASS: typecheck
  PASS: 단위 테스트
════════════════════════════════════════
✅ 모든 검사 PASS
```

## 패키지 테스트
`packages/receipt-lines` — 3 test files · **47/47 passed**
- `tests/currency.test.ts` 6/6
- `tests/parity.test.ts` 13/13 (byte-equal 5종 + QRIS/CARD/VOID/REFUND 보조 어설션 + NPWP·Service charge 데이터-가드 3)
- `tests/resolve-receipt-lines.test.ts` 28/28

## 레포 전역 상태
- `apps/anchor`, `apps/care-agent`, `packages/*` typecheck: OK
- `apps/wing` typecheck: **FAIL (pre-existing · main 에서도 동일)** — `components/ui/button.tsx:50` `ButtonPrimitive` React 19 types 오류. 본 PR 변경과 무관.
- `apps/commerce-core` 테스트 887/887 · `apps/customer-display` 테스트 352/352 · 패키지 테스트 전부 녹색.

## 미수행 / 다음 라운드
- fork#292 어댑터 패러티 1건 (M3-1128-E 진단 8항목 중 1건) — 다음 라운드.
- Kyu 몫: 실제 BT-58D 프린터로 영수증 1장 출력하여 손으로 대조 (실기 확인).
- 머지 금지 · R0 → 오케.

## 상시 조항 ⓒ
- 네이밍 규약 (§0) 유지 — "meros" 문자열 추가 없음.
- `processes: [commerce-core.receipt]` 커밋/PR 본문에 명시 (R030 v2).
- docs/feature-map.yaml 의 receipt files 블록을 새 파일명 (`receipt-escpos-printer-*.txt`) 으로 갱신.
- CI 결과 대기 안 함 · /loop · 예약 깨우기 호출 안 함 (상한 50분 준수).
