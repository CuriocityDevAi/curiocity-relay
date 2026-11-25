APPROVE

## R0-1125-F — PR #255 (M3-1125-C) 리뷰

### 1. tender-qris 헤더 타이틀 고정
`title: displayId ? \`Order #${displayId}\` : 'QRIS payment'` → `title: 'QRIS payment'` 고정.
대사 "긴 Order 번호는 영수증·주문 상세에만" 준수. ✅

### 2. success 헤더 타이틀 고정
`title: displayId ? \`Order #${displayId}\` : ''` → `title: 'Payment successful'` 고정.
빈 문자열 fallback 도 제거되어 항상 의미있는 타이틀 표시. ✅

### 3. 하네스 SRC3 교체 — 기존 검사 의도 유지 여부
- 원 검사(1개): `check('success · Order # 타이틀 패턴', /\`Order #\$\{/.test(successSrc))` — "동적 Order # 패턴이 존재한다"는 긍정 검사.
- 신 검사(2개):
  1. `'success · 타이틀 Payment successful'` — 고정 타이틀 존재 긍정 검사.
  2. `'success · 타이틀 Order #${displayId} 패턴 없음'` — 구 패턴 부재 부정 검사.
- **의도 유지**: 양쪽 모두 "타이틀이 대사 규정대로 올바르게 설정되어 있는지 보증"이 목적. 대사가 바뀌었으므로 기대값이 바뀐 것이며, 2-way 검사로 오히려 회귀 보호력이 높아짐. 의도 완전 유지. ✅

### 4. ci-summary 전 잡 (assertions·playwright 포함)
ci-summary 댓글(`7ecb239` · 2026-11-25 02:39 UTC):
| Check | 결과 |
|---|---|
| Lint / route | ✅ |
| Lint / lint | ✅ |
| CI / route | ✅ |
| CI / assertions | ✅ |
| CI / flow-tests | ✅ |
| CI / playwright | ✅ |
| CI / heavy-cloud | ⏭ (스킵) |

assertions · playwright 모두 green. heavy-cloud 스킵은 별도 환경 전용으로 이 PR 범위 외. ✅

### 종합
4개 검사 항목 전부 이상 없음. APPROVE.
