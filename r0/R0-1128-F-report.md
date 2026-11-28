# R0-1128-F 리뷰 리포트

## PR 판정

| PR | 판정 |
|----|------|
| storeport#487 | **APPROVE** (선택 1건) |
| relay#82 | **CHANGES** (필수 1건 · 선택 1건) |

## storeport#487 기준 파일 재생성 diff 결과

`/tmp/gen-baselines/gen.mjs` 직접 실행 (fork master `00acc59475fa6a39c8ae82834966248a5a46d177`):

| 파일 | diff |
|------|------|
| receipt-escpos-printer-sample.txt | **0** |
| receipt-escpos-printer-card.txt | **0** |
| receipt-escpos-printer-qris.txt | **0** |
| receipt-escpos-printer-void-s.txt | **0** |
| receipt-escpos-printer-refund-s.txt | **0** |

**5/5 바이트 일치** ✅

---

## storeport#487 세부 체크

| 체크포인트 | 결과 |
|-----------|------|
| 기준 파일 = fork master `renderReceiptEscPos → escposBytesToText → IDR→Rp` | ✅ diff 0 |
| parity test = 외부 파일 비교 (자기 생성 아님) | ✅ `__write-sample.test.ts` 삭제 |
| NPWP · 봉사료 = 데이터 있을 때만 | ✅ `if (npwp)` / `if (sc && sc.pct > 0)` |
| 검증의 검증: PB1→PB1 10% 시 parity 빨강 | ✅ `tax.label` 직접 사용으로 보장 |
| 손님 화면·POS kind 변경 없음 | ✅ 기존 kind 그대로 (render-text 는 테스트 전용) |

**선택** (머지 블로커 아님): `renderLinesAsText` 도구 용도를 짧게 명시 권장 (parity 테스트 전용, POS/CD UI 렌더러는 kind 소비 별도 구현).

---

## relay#82 세부 체크

| 체크포인트 | 결과 |
|-----------|------|
| Add funds / Stop-and-wait 선택 없음 | ✅ `return` 후 키 전송 없음 |
| `!existsSync(RUNNER_PAUSE_PATH)` 중복 감지 방지 | ✅ |
| self-update 중 pause 유지 | ✅ 파일 디스크 잔존 → 재기동 후도 일시정지 |
| 테스트 8/8 GREEN (fixture 3건 · 오판 0) | ✅ |

**CHANGES-필수**: `resets_at` 에 `"Nov 30 at 9am"` (사람이 읽는 문자열) 저장 → `Date.parse` = `NaN` → `checkRunnerPauseExpiry` 자동 해제 불가. PR 설명의 "(a) resets_at 경과 → 자동 삭제"와 불일치. 현재는 수동 삭제만 동작. 수정 방안: (A) `writeRunnerPauseFile` 에서 ISO 타임스탬프로 변환 저장, (B) PR 설명에서 자동 해제 항목 삭제 · 수동 삭제만 공식 조건으로 명시.

**선택**: `/rate-limit-options` 단독 OR 감지 → 코드 작업 중 해당 경로명 pane 출력 시 오판 미세 가능. AND 조건으로 변경 권장.
