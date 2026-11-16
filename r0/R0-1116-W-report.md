#311 A · #308 A

## #311 — fix(admin): M1-1116-P earn 역산 제거 · nav-hide /app/ 접두사

**ci-summary**: ci-summary 미게재 (PR 생성 직후 조회, CI pending)

### ① earn 카드 역산 제거

- ✅ `rate = (earnedAmount / subtotal) * 100` + `item_subtotal` 변수 삭제 확인.
- ✅ route에 `earn_rate_pct` 추가 → 위젯이 설정 실제값(1%) 직접 표시. 세전 역산 1.10% 버그 해소.
- ⚠️ **기준 금액 미표시**: 새 형식 `"Rp 990 (1% earn rate · floor)"` 는 적립 기준 금액(세후 99,000)을 노출하지 않음. REQ에서 `"Rp 99,000 × 1%"` 형식을 요구했으나, `earn` 메타데이터에 `earn_base` 미저장 → 현재 route 변경만으로 표시 불가. 후속: pos-payments hook에 `earn_base` 저장 → route 노출 → `Rp {base} × {rate}%` 형식 변경 권장. (non-blocker — 본 PR 범위 초과)
- 📝 **메타데이터 earn_rate 미저장**: `earn { applied, amount, new_balance, at, skipped_reason }` 에 적립률 미저장. route는 현재 settings fallback 사용 — 설정 변경 후 과거 주문 조회 시 현재 적립률 표시됨 (REQ 확인 · non-blocker 기록).

### ② nav-hide 선택자 `/app/` 접두사

- ✅ 세 선택자 모두 `/app/` 접두사 추가 (store-credits · store-credit-accounts · orders) · trailing slash 버전 포함.
- ✅ basename 근거: build artifact `createRouter(routes,{basename:"/app"})` 직접 확인.
- ✅ 세 메뉴 외 영향 없음.

**→ APPROVE** (기준 금액 미표시 non-blocker 기록 · CI pending 확인 후 머지)

---

## #308 최종 — M2-1116-R naming-check name: 줄 한정

**ci-summary** (239bb3a): pos-integration ✅ · customer-display ✅ · docker-smoke-commerce-core ❌ (인프라 무관)  
315d05f(naming-check only) → 위 두 job 영향 없음.

### naming-check 예외 name: 줄 한정

- ✅ 패턴 `[0-9]+:[[:space:]]*name:` — `grep -n` 출력 `파일:줄번호:내용` 형식에서 name: 줄만 정확히 필터링.
- ✅ 구멍 테스트: slug 줄에 임시 "meros" 추가 → FAIL (다른 줄 여전히 차단).
- ✅ 케이스 3종 모두 검증: 현재 저장소 PASS · name: 줄 PASS · 다른 줄 FAIL.

**→ APPROVE**
