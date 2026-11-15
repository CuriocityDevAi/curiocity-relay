# R0-1105-FC 리포트

#274 APPROVE (migration 이름 충돌 해소 · 멱등 완료 · CI all pass) · #273 APPROVE (GET paid_so_far SoT 교체 · 레거시 폴백 · #CL-a 테스트 · CI all pass)

## #274 — loyalty_settings·customer_display_settings 클래스명 충돌 해소

**체크 결과**

- 파일명·클래스명 둘 다 변경: ✅ rename from/to + 클래스명 동일하게 수정
- MikroORM 추적 단위: 클래스명 (`mikro_orm_migrations.name`) — PR body·commit·BV 리포트 일치
- 다른 모듈 동명 마이그레이션:
  ```sh
  find apps/commerce-core/src/modules -path '*migrations*' -name 'Migration*.ts' | xargs -n1 basename | sort | uniq -d
  ```
  출력 0 (중복 없음)
- 운영 시나리오 a (테이블 미존재): `create table if not exists` → 신규 생성 ✅
- 운영 시나리오 b (이미 존재): `create table if not exists` → no-op ✅
- 인덱스 if not exists: `CREATE UNIQUE INDEX IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` 전 항목 ✅
- FK: 해당 없음 (loyalty/customer_display 모두 외부 FK 없음)
- 빈 DB migrate 2회: BV 리포트 로그 — 4테이블 생성·2회차 no-op 확인 (로컬 재실행 미수행 — BV 리포트 충분)
- CI: pos-integration·e2e-admin-loyalty·unit-commerce-core·check·markers-and-forbidden all PASS

**권고 (블로킹 없음)**

재발 방지 naming-check CI hook 미존재. 이후 별도 태스크로 추가 권장:
```sh
find apps/commerce-core/src/modules -path '*migrations*' -name 'Migration*.ts' | xargs -n1 basename | sort | uniq -d
```
non-zero exit on duplicate.

**판정: APPROVE** — https://github.com/CuriocityDevAi/storeport/pull/274#issuecomment-6891888138

---

## #273 — 돈 버그 · 1차 QRIS paid 뒤 remaining 전액 노출 수정

**체크 결과**

- GET paid_so_far SoT 교체: ✅ `route.ts:193-220` → `metadata.tenders[status==='captured']` 합산
- 레거시 폴백: ✅ `mdTenders.length > 0` 분기 — tenders 미존재 주문은 구 captures 경로 폴백
- 환불/void 된 tender: ✅ 환불 금액은 `refund-status/route.ts:112`에서 별도 계산. GET paid_so_far는 split tender 진행용
- 실패/만료 tender: ✅ `status !== 'captured'` → 합산 제외 (의도적 — GET은 "확인된 금액", POST는 captured+pending 포함으로 guard 용도 구분)
- 다른 곳 일관성: ✅ 주문 목록·anchor Admin·앱 영수증: paid_so_far 미사용. POST /tenders 응답 paid_so_far는 tenders/route.ts 내 별도 계산 (Bug 2 수정 시 이미 SoT 전환)
- `status` fallback 안전성: ✅ `mdTenders.length > 0` 분기 내 fallback. 해당 구간(M0-1105-AK~BS) tender는 항상 captured 상태 — tenders/route.ts:368 동일 패턴 선례
- #CL-a 테스트: ✅ `tenders.spec.ts` +78줄 — 1차 QRIS 50k→webhook paid→GET remaining=53400·과수령 400 가드·2차 53400 완결
- CI pos-integration: ✅ PASS (5m26s)

**판정: APPROVE** — https://github.com/CuriocityDevAi/storeport/pull/273#issuecomment-6891891252
