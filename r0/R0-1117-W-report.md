#332 APPROVE · #180 APPROVE · #333 CHANGES

## #332 — feat(loyalty): S1 포인트 빚 side-car 레저

| 항목 | 결과 |
|------|------|
| 모델 2 (`loyalty_negative_balance` · `loyalty_negative_event`) | ✅ |
| 마이그레이션 rollback (`down()` drop 역순) | ✅ |
| `ref` unique index on `loyalty_negative_event` | ✅ `IDX_loyalty_negative_event_ref_unique` WHERE deleted_at IS NULL |
| 동시 쓰기 in-process `withCustomerLock` mutex | ✅ 테스트 커버 (concurrent 10-call + race 2-call + debt+offset mix) |
| 금지 파일 (recover.ts · earn.ts · route) 미변경 | ✅ |
| 단위 테스트 | ✅ 15/15 PASS |
| 전체 commerce-core 회귀 | ✅ 394/394 PASS, 스냅샷 12/12 |

verdict: **APPROVE**

---

## #180 vs #333 — 시작 화면 수치 대조표

| 항목 | POS #180 | 손님앱 #333 | 일치 |
|------|----------|------------|------|
| RECEIPT_W | 160dp | 160dp | ✅ |
| BAR_W | 208dp (160+48) | 208dp (160+48) | ✅ |
| marginTop (textWrapper) | 24dp | 24dp | ✅ |
| 워드마크 height prop | **28dp** | **26dp** | ❌ |
| 워드마크 glyph path (vs meros-wordmark-dark.svg) | ✅ 동일 | ✅ 동일 | — |
| 네이티브 splash imageWidth | 208 | 208 | ✅ |
| splash-icon.png 참조 | 0 | 0 | ✅ |
| scheduleOnRN | 0 (삭제·runOnJS 대체) | 0 | ✅ |
| tsc 신규 오류 | 0 (PR 선언·imports 유효) | 0 (tsc --noEmit 직접 확인) | ✅ |

---

## #180 — fix(splash): M3-1117-M POS 시작화면

전체 체크 통과. 단, PR body 비교표 "워드마크 높이 | 28pt text | 28dp SVG ✅"는
#333 반영 전 손님앱(기존 `fontSize:28`) 기준이라 현 상태와 불일치함.
코드 자체는 문제없음.

verdict: **APPROVE**

---

## #333 — fix(customer-display): M2-1117-M 손님앱 시작화면 ← CHANGES

**CHANGES: `apps/customer-display/src/components/SplashAnimation.tsx:133`**

```diff
- <MerosWordmark height={26} fill={INK} />
+ <MerosWordmark height={28} fill={INK} />
```

이유: REQ 요구 "워드마크 높이 두 앱 동일". POS #180은 `height={28}`를 사용.
#333는 `height={26}`을 사용하므로 불일치.

추가 메모:
- MerosWordmark (viewBox 3920×712)와 MerosLogo kind="wordmark" (viewBox 312×90)는
  viewBox/scale factor가 달라 같은 height 값도 시각적 크기가 다름.
  28로 맞추더라도 시각적 등가는 별도 확인 필요.
- 연동 수정 필요: `__tests__/splash-wordmark.test.ts` height=26 케이스 → height=28로 변경
  (이미 height=28 케이스도 존재하므로 height=26 케이스 삭제 또는 교체).

verdict: **CHANGES** (`SplashAnimation.tsx:133`, `__tests__/splash-wordmark.test.ts:23`)
