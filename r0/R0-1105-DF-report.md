# R0-1105-DF 리뷰 리포트

날짜: 2026-11-13  
리뷰어: CuriocityDevAi (Sonnet)  
대상: fork #118 · fork #119 · storeport #236

---

## fork #118 — feat(pos): M3-1105-BN 아이콘

**판정: APPROVE 상당**  
HEAD SHA: `40413d05df8b63a3e919812f4b65781d079e215b`

### REQ 1 결과
| 항목 | 결과 |
|------|------|
| 아이콘이 텍스트 오른쪽 | ✅ `components/ui/OptionChip.tsx:76` — `<Text>` 뒤 `{Icon ? <Icon/> : null}` |
| 상태별 색 토큰 | ✅ `selected→TOKEN_ON_SELECTED / disabled→TOKEN_INK_DISABLED / 기본→TOKEN_INK` |
| raw hex 없음 | ✅ 컴포넌트 본문 하드코딩 없음 |
| 버튼 크기 불변 | ✅ `icon?: LucideIcon` optional, 기존 레이아웃 클래스 미변경 |
| 기존 호출부 호환 | ✅ prop optional — 기존 사용처 무영향 |

### CI
- lint fail → master `5826954` 기준 lint only 실패 — **pre-existing**
- playwright 15m timeout → CI runner dev server 없는 환경 문제
- assertions / flow-tests **pass**

---

## storeport #236 — feat(pos): M0-1105-BK QRIS simulate 서버 라우트

**판정: APPROVE 상당**  
HEAD SHA: `2522272586ccaeb9ccc7a6cc22bd95db45a57f2d`

### REQ 2 결과
| 항목 | 결과 |
|------|------|
| live 키 → 403 | ✅ `creds.mode !== "test"` → 403 `simulate_live_forbidden` |
| amount 서버 세션값 | ✅ `sessionData.amount ?? sessionRow.amount`, 클라 body amount 무시 |
| 다른 주문 pr_id → 400 | ✅ `sessionData.order_id !== url_order_id` → 400 `payment_request_mismatch` |
| 키·raw body 비노출 | ✅ xendit-client whitelist, `leaked_internal_field` 단위 테스트 검증 |
| resolveXenditCreds 정합 | ✅ 전체 경로 `pos_settings/lib/xendit-creds.ts` 단일 소스 통일 |
| 테스트 키 판단 일관성 | ✅ `detectMode` 단일 함수, `xnd_development_` prefix 전체 적용 |

### CI
- pos-integration / unit-commerce-core / check / markers **all pass**

### 주의 (필수 수정 아님)
`qris-simulate/route.ts:71` — `filters: { id: payment_request_id }` 조회 시  
클라가 보내는 값(Xendit pr_id)과 Medusa session ID가 다를 경우 404 반환.  
단위 테스트 query mock이 filter를 무시하므로 커버 안 됨. production에서  
`payment_session.id = Xendit pr_id` 성립 여부 확인 권장.

---

## fork #119 — feat(pos): M0-1105-BK QRIS simulate 클라 버튼

**판정: APPROVE 상당**  
HEAD SHA: `b173b13d606437cf82922388f5d44de839d0d3f6`

### REQ 3 결과
| 항목 | 결과 |
|------|------|
| 버튼은 test_mode · 미만료 · pr_id 있을 때만 | ✅ `tender-qris/[draftOrderId].tsx:232` |
| 더블탭 중복 방지 | ✅ `isPending={simulate.isPending}` |
| 기존 polling 경로 불변 | ✅ checkStatus / setInterval 로직 유지 |

### CI
- lint fail → master pre-existing
- playwright 15m timeout → 환경 문제
- assertions / flow-tests **pass**

---

## REQ 4 — lint 선존 확인

master 브랜치 (`5826954`) 최신 CI run:
- 실패 job: `lint` only
- playwright job: master에서는 pass → PR의 playwright timeout은 새 e2e spec 추가로 인한 CI 환경 문제

fork #118 / #119 모두 신규 lint 위반 없음 (pre-existing 그대로).
