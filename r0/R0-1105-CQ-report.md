# R0-1105-CQ — 검증 보고서

**판정: #105 APPROVE · #107 APPROVE** — 충돌 없음, paidTotal 복구 올바름, assertion 완화는 핵심 회귀 감지 유지 (AW 미세 약화 한계 있음, 하단 참조).

| 항목 | 결과 | 근거 |
|---|---|---|
| **[REQ 1] #105 ↔ master(3aff1a2) 충돌** | 없음 ✓ | `git merge-tree` 출력 없음. master는 태스크 기재 82c0751 이후 #106/#108 추가로 3aff1a2이나 충돌 미발생 |
| **[REQ 2] paidTotal 복구 정확성** | 올바름 ✓ | `deriveOutstanding` 내부: `paidTotal_internal = Σ(captured−refunded)`, return `grandTotal − paidTotal_internal` → 화면 `paidTotal = grandTotal − outstanding = Σ(captured−refunded)` = master 방식과 수식 동일. `(c as any)` 제거로 타입 안전성 개선 |
| **[REQ 3-AW] VOID 배너 회귀 감지** | 유지(미세 약화) △ | 구 패턴 `"refundBanner === 'VOID' ? 'text-ink'"` 은 실제 코드(`\|\| 'PARTIAL REFUND'` 삽입)에서 이미 불일치 → 패턴이 깨진 상태였음. 신 패턴 `includes("'VOID'") && includes("'text-ink'")`: `'VOID'`는 주석(line 8, 354)에도 존재해 사실상 항상 true → `'text-ink'`가 파일에서 사라지면 감지. 한계: text-ink가 타 요소에만 남고 VOID 배너에서만 제거된 경우는 미감지 |
| **[REQ 3-BA] symlink 추가** | 완화 없음 ✓ | `symlinkSync(repo/node_modules → tmpDir/node_modules)` — tsc 환경 fix, 검사 약화 없음 |
| **[REQ 4] #107 상태** | 클린 ✓ | `git merge-tree` 충돌 없음. master merge 커밋(f8a2cda) 포함으로 최신 master 반영. Playwright Flow1(Cash QR)·Flow2(Split Cash→Card) 테스트 4/4 통과 커밋 확인 |

**AW 개선 권고(M1 판단):** `'text-ink'` 대신 `refundBanner === 'VOID'` + `'text-ink'` 근접 체크(`/VOID[^?]+text-ink/`) 로 강화하면 더 정확한 보호 가능.
