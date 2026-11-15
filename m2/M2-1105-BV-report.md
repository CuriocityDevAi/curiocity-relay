# M2-1105-BV 리포트

원인: MikroORM 단일 mikro_orm_migrations 테이블 클래스명 충돌 — register_session에 동명 Migration20261115000001·Migration20261115200000이 먼저 기록돼 loyalty_settings·customer_display_settings가 "Skipped" → 4테이블 미생성 / 운영 영향: 가능성 높음(Dockerfile CMD가 같은 경로·테이블 없으면 Loyalty Admin+손님화면 전부 500) / 수정 PR: #274(loyalty_settings → Migration20261115110000·customer_display_settings → Migration20261115210000) / 빈 DB migrate 로그: 4테이블 생성 확인·2회차 no-op 확인

## 원인 상세

- `register_session/migrations/Migration20261115000001.ts` (고객 phone_e164 unique index)
- `loyalty_settings/migrations/Migration20261115000001.ts` (loyalty_settings·loyalty_audit·loyalty_simulation 테이블) → **동명**

- `register_session/migrations/Migration20261115200000.ts` (손님 화면 S1c 페어링)
- `customer_display_settings/migrations/Migration20261115200000.ts` (customer_display_settings 테이블) → **동명**

MikroORM은 `mikro_orm_migrations` 테이블 1개를 모든 모듈이 공유. register_session이 먼저 등록돼 loyalty_settings·customer_display_settings 모두 "Skipped. Database is up-to-date for module."

## 수정

- `loyalty_settings/Migration20261115000001.ts` → `Migration20261115110000.ts`
- `customer_display_settings/Migration20261115200000.ts` → `Migration20261115210000.ts`
- `create table if not exists` 유지 → 멱등

## 운영 영향 판정

**가능성 높음** — Dockerfile CMD: `npx medusa db:migrate && npx medusa start`. 동일 충돌 경로. 테이블 미생성 → Loyalty Admin 화면·적립·손님 화면 설정 전부 실패.

Kyu 운영 확인: Admin → Settings → Loyalty → 로드 시 500 에러 여부.

## 검증 로그 (로컬 빈 Postgres)

```
MODULE: loyalty_settings
  ● Migrating Migration20261115110000
  ✔ Migrated Migration20261115110000
Completed successfully

MODULE: customer_display_settings
  ● Migrating Migration20261115210000
  ✔ Migrated Migration20261115210000
Completed successfully
```

테이블 확인:
```
customer_display_settings | loyalty_audit | loyalty_settings | loyalty_simulation (4 rows)
```

2회차 no-op: loyalty_settings·customer_display_settings 모두 "Migrating" 출력 없음.

## PR

#274 https://github.com/CuriocityDevAi/storeport/pull/274

## 이연

순증감 없음. (#271 loyalty spec CI 편입은 이 PR 머지 후 M0 담당자가 진행)
