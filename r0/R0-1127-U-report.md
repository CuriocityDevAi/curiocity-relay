fork#292: CHANGES · storeport#481: CHANGES — 직접 비교: 두 `resolveReceiptLines` 소스 추적 (lib/receipt-lines/resolve.ts vs packages/receipt-lines/src/resolve-receipt-lines.ts) + 섹션 순서·라벨·필드 대조표 작성

## 실행 명령

```
git show origin/feat/M1-1127-H-receipt-r2:lib/receipt-lines/resolve.ts
git show origin/feat/M0-1127-O-cd-receipt-full:packages/receipt-lines/src/resolve-receipt-lines.ts
git show origin/feat/M0-1127-O-cd-receipt-full:apps/customer-display/src/screens/receipt-lines-adapter.ts
git show origin/feat/M1-1127-H-receipt-r2:docs/testing/receipt-escpos-sample.txt
# (storeport repo)
git show origin/feat/M0-1127-O-cd-receipt-full:docs/testing/receipt-escpos-sample.txt
gh pr view 292 --json body,files
gh pr view 481 --json body,files  (storeport repo)
gh pr view 481 --json statusCheckRollup  (storeport: heavy-mac IN_PROGRESS → CI 미확인)
```

## CI

- fork#292: CI 미확인 (checks 미응답)
- storeport#481: CI 미확인 (heavy-mac IN_PROGRESS)

## REQ 1 — 직접 비교 결과: 같은 줄 목록 아님

fork 프린터(`lib/receipt-lines/resolve.ts::resolveReceiptLines(receipt: Receipt)`)와 storeport CD(`@storeport/receipt-lines::resolveReceiptLines(snapshot, meta, opts)`)는 **별개 구현**이며 동일 데이터 → 다른 출력:

| 항목 | fork#292 프린터 | storeport#481 CD |
|------|-----------------|------------------|
| 섹션 수 | 11 | 19 |
| 배너 위치 | 로고 앞 (1번) | 로고 뒤 (6번) |
| `#N` 출력 | queue + meta text 중복 | queue 1회만 |
| `order_custom_display_id` | 없음 | kv "Order: PIM26B…" |
| ITEMS 헤더 | 없음 | center bold "ITEMS" |
| tender 라벨 | "CASH"/"CARD TERMINAL" | "Cash"/"Card" |
| 구분선 | 모두 rule-thin | 주요 경계 rule-thick |
| 날짜 형식 | 초 없음, 직접 UTC+7 | 초 포함, Intl.DateTimeFormat |

샘플 파일도 불일치: fork `docs/testing/receipt-escpos-sample.txt` ≠ storeport 같은 경로 내용.  
storeport 패리티 테스트는 storeport 내부 일관성만 검증 — fork 프린터와의 교차 비교 없음.

## REQ 2 — QRIS 체크

- PB1 줄: fork 테스트가 `tax.show=true` 강제 주입으로 증명. 실제 서버는 QRIS 시 `tax.show=false` 송출(코드 주석 인정) → 실 주문에서 미출력. 서버 수정 티켓 없음.
- 품목 단가: snapshot 수신 그대로 렌더. 서버가 세금포함 단가 보낼 경우 세전 금액 아님.
- `Order #<display_id>` 없음: ✅ 양쪽 모두
- `#N` 있음: ✅ 양쪽 모두 (fork 는 queue+meta 중복)

## REQ 3 — fork 의존성·빌드 위험

- fork 는 storeport commit `5c6754d` 의 타입·currency만 vendor 복사 (`lib/receipt-lines/currency.ts`, `line-types.ts`)
- `@storeport/receipt-lines` npm/git 의존성 없음 → Android/iOS 빌드 위험 **없음**
- drift 위험 높음: storeport R1 패키지가 preorder·NPWP·store-address·logo 등을 추가해도 fork vendored 복사본은 5c6754d 고정으로 남음
- "단일 출처" 목표 미달성: 프린터와 CD 가 서로 다른 `resolveReceiptLines` 사용

## 코멘트 URL

- fork#292: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/292#issuecomment-7217713281
- storeport#481: https://github.com/CuriocityDevAi/storeport/pull/481#issuecomment-7217717977
