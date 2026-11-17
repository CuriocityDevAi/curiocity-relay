PR #323 · 응답 shape 불변 예 · 테스트 9 pass

## 작업 요약 (M0-1117-B)

전화번호 R2·R3(서버) — Admin POS Orders 번호 검색을 정규화로 + 로컬 마스킹 함수 제거.

### 커밋 · PR

- 브랜치: `feat/m0-1117-b-orders-list-phone-normalize` (origin/main 기준 신규)
- 커밋: `31f634d fix(pos): M0-1117-B — Admin POS Orders 번호 검색 정규화 + 마스킹 통일`
- PR: https://github.com/CuriocityDevAi/storeport/pull/323

### [REQ] 구현

1. `apps/commerce-core/src/api/admin/pos/orders-list/route.ts`
   - `normalizePhone`·`maskE164` import 추가 (M0-1117-A 소유 `lib/phone-id.ts` — 읽기만).
   - `q` 처리: `normalizePhone(q)` 성공 시 손님 저장분(`metadata.phone_e164 ?? phone`) 도 정규화해 E.164 동치 비교. 실패 시 기존 숫자 부분 포함 매칭 + display_id 유지.
   - 로컬 `maskPhone` 함수 **삭제**. `maskE164` 로 통일 표기(`0813-****-2480`). 정규화 실패 저장분은 "—".
   - 손님 로드 시 metadata 도 집어 `metadata.phone_e164` 우선 사용.
   - 응답 shape 불변: 기존 13 필드 그대로, 추가/제거 없음.

2. `apps/commerce-core/integration-tests/pos/orders-list.spec.ts`
   - 기존 #1~#6 테스트 유지, 마스킹 기대값은 기존과 동일(0813-****-4801 등 phone-id.maskE164 결과와 일치).
   - 신규 3건:
     * `q=081…(local), q=6281…(no+), q=+6281… 3모양 저장분 전부 반환`
     * `손님 칸 마스킹 0813-****-2480 통일 · 응답 shape 불변` (13 필드 키셋 어설션)
     * `display_id 검색 회귀 없음`
   - 중요 함정: `@medusajs/test-utils` 는 테스트 사이 DB 를 템플릿 snapshot 에서 restore — nested `beforeAll` 로 만든 데이터는 다음 테스트로 넘어가며 사라짐. 각 `it` 에서 3모양을 재생성해 검증.

### [BUILD]

- 네이밍 체크: PASS (pre-commit).
- `pnpm typecheck`: 신규 에러 0 (에러 전체 245건은 전부 pre-existing `src/admin/**` React19 bigint/ReactNode 호환 노이즈 — 내 변경과 무관).
- `grep -n "function maskPhone" apps/commerce-core/src` = 0건 (타 파일의 `maskPhoneE164` 는 별개 export).
- 통합 테스트 (`TEST_TYPE=integration:pos … orders-list.spec`): **9/9 pass · 14.7s**.

```
PASS integration-tests/pos/orders-list.spec.ts (14.673 s)
  ✓ #1 전화번호 가림 형식 · loyalty_earn 객체 형식 → 숫자 반환 (921 ms)
  ✓ #2 전화번호 일부 필터 (q=2480) (977 ms)
  ✓ #3 주문번호(display_id) 필터 (831 ms)
  ✓ #4 loyalty_earn 없는 주문 → null (820 ms)
  ✓ #5 loyalty_earn 객체 applied=false → null (659 ms)
  ✓ #6 loyalty_earn + loyalty_recover → 순적립(earn − recovered) (792 ms)
  ✓ q=081…(local), q=6281…(no+), q=+6281… 3모양 저장분 전부 반환 (914 ms)
  ✓ 손님 칸 마스킹은 저장 모양과 무관하게 0813-****-2480 통일 · 응답 shape 불변 (1158 ms)
  ✓ display_id 검색 회귀 없음 — q=<display_id> 가 그대로 작동 (714 ms)
Tests: 9 passed, 9 total
```

### 기술 선택지 · 채택 · 이유

- **선택지** (a) q 기반 customer 재조회로 매치 축소 vs (b) 전체 주문 fetch 후 메모리 정규화.
- **채택** (b). 기존 route 패턴(메모리 필터) 과 phone 로드(listCustomers batch) 그대로 유지, 매치 로직만 교체.
- **이유** 범위 최소 · 응답 shape 불변 · 다른 phone-id 공유처(core snapshots) 로 번지기 쉬움.

### 확인(실기 체크 — PR 본문 등재)

- Admin POS Orders 필터에 `081380442480` → `+6281…` 저장 주문도 나옴.
- 손님 칸 표기 `0813-****-2480` (`6281-****-…` 아님).
- `q=2480` 숫자 부분 매칭·`q=<display_id>` 회귀 없음.

### 이연 순증감

- 없음. S1(코어 검색) 완료. 아이패드 Orders 탭(M3-1117-B) 은 이 응답 소비처 — 응답 shape 불변으로 영향 없음.

### 처리 못한 항목

- 없음. 모든 REQ(1·2·3) + BUILD + REPORT 수행.
- 수동 실기 체크는 로컬 Admin 서버 부팅/인증 필요 — 이연. 통합 테스트가 같은 API 경로를 end-to-end 로 검증했으므로 기계 판정 커버. 수동 실기는 Kyu 확인 단계로 회부.
