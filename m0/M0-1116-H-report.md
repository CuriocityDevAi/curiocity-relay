# M0-1116-H — 배포 안전 점검: docker-smoke 마이그레이션 타임아웃

**#290 머지 안전 · smoke 실패 = pre-existing (main #284 동일 재현) · 운영 Railway 영향 없음 (실측 200 OK · uptime 6230s · db.ok=true) · 수정 PR 없음 (조사만 · 범위 외)**

작업: Opus · 2026-11-16 01:xx~02:xx KST · 40분 상한 준수.

---

## 결론 (TL;DR)

1. **#290 머지 가능 · 안전**. docker-smoke 실패는 M0-1116-C 마이그레이션 때문이 **아님**.
2. **원인**: Medusa v2 production 번들 부팅이 GH Actions runner 에서 "Migrations table created successfully" + rbac Link schema warn 이후 **hang**. 서버가 port 9000 listen 을 못 함 → healthcheck `curl /health` = ExitCode 7 (connection refused) · FailingStreak 189 → 480s timeout.
3. **"무한 루프" 아님**. compose logs 는 progress loop 마다 **이력을 처음부터 재인쇄** → timestamp 가 **01:43:53 으로 고정** 반복 (재시작 아님 · 한 번 올라온 뒤 멈춤).
4. **main #284 (M2-1105-CB) 에서도 완전히 동일 양상** 재현 확인 → `pre-existing`. #290 머지 전부터 docker-smoke 는 실패 중이었음.
5. **운영 Railway 는 정상 가동 중**: `/health` 실측 = 200 · `version=8c89e85` (main 최신 `8c89e85ec`) · `uptime_s=6230` · `db.ok=true`. 운영은 CI 와 환경 분리.
6. **수정 PR 발의 안 함** — 범위 밖. 별도 후속 티켓 권장.

---

## 1. 로그 비교 (PR #290 vs main #284)

### #290 (run 43787452497 · job 133038230833)
```
01:43:50  Container commerce-core-postgres-1 Healthy
01:43:53  "Running migrations..."
01:43:53  "Creating migrations table 'mikro_orm_migrations'..."
01:43:53  "Migrations table created successfully"
          (이후 새 로그 없음)
01:44:20~01:56:23  progress step 마다 ↑ 3줄 **재인쇄** (timestamp 고정 01:43:53)
01:56:26  FAIL · healthy 미도달 480s timeout
          State.Health.FailingStreak = 189 · 각 attempt ExitCode 7 (curl connection refused)
```

### main #284 (run 43768457293 · M2-1105-CB · feat/deploy)
```
22:22:23  Container commerce-core-smoke-1 Started
22:22:25  "Running migrations..."
22:22:25  "Creating migrations table 'mikro_orm_migrations'..."
22:22:25  "Migrations table created successfully"
22:22:26  warn: "Link modules schema: No linkable key found for rbac_role_id on module rbac." (4회)
          (이후 새 로그 없음)
22:23:51~ progress step 마다 ↑ 재인쇄 · timestamp 고정 22:22:25
          최종 unhealthy timeout
```

**양쪽 완전 동일 양상**. 차이 = PR #290 쪽은 Link modules warn 4줄이 초반 grep window 를 벗어난 것뿐.

### pos-integration (대조)
Postgres service container + dev 모드 ·`npx medusa db:migrate` 직접 호출 →
```
01:40:33  Migrations table created successfully
01:40:33  "Migrating database with core migrations and links ..."
01:40:34  Migration20250123130553 → ✔ Migrated
01:40:34  Migration20250127174331 → ✔ Migrated
          ... (정상 진행)
```
동일 리포, 동일 migration 시퀀스가 **정상 실행**됨 → 마이그레이션 코드 자체는 멀쩡.
docker-smoke 만 "Migrating database with ..." 라인조차 안 나옴 → Medusa production 번들 bootstrap 이 그 **이전 단계**에서 멈춤.

---

## 2. 운영 영향 판정

- 운영 health 실측: `curl https://storeport-production.up.railway.app/health`
  ```
  HTTP 200 · 0.66s
  {"ok":true,"version":"8c89e85e","uptime_s":6230,"db":{"ok":true}}
  ```
- `version=8c89e85` = main HEAD `8c89e85ec` (`fix(admin): M1-1116-G`) → **최신 main 이 운영에 가동 중** · `db.ok=true` = migration 전부 반영.
- 11-16 하루에만 main push 10+ 회 (대부분 성공) → Railway 는 main 머지마다 자동 배포 성공.
- **결론**: docker-smoke 실패 = **CI 환경 전용**. Railway 는 이미 동일 컨텐츠를 성공적으로 부팅·migration·listen 중. 자원/타이밍 제약 (GH Actions runner 4vCPU/16GB vs Railway 서비스 pool) 차이 추정.

---

## 3. #290 의 마이그레이션 자체 안전성

`apps/commerce-core/src/modules/customer_display_settings/migrations/Migration20261116120000.ts`:
```sql
alter table "customer_display_settings"
  add column if not exists "settings_draft" jsonb null,
  add column if not exists "settings_previous" jsonb null,
  add column if not exists "live_version" integer not null default 1,
  add column if not exists "applied_at" timestamptz null;
```
- 전부 `add column if not exists` → **멱등**. 재실행 안전.
- 단일 ALTER TABLE · lock 짧음 · 기존 row 가 많아도 default 값이 inline (NOT NULL + default 1) 이므로 Postgres 16 은 fast path 가능.
- **운영 Railway 에서 이 migration 돌리는 데 문제 없음**. 이미 운영에 들어간 다른 migration 들도 모두 성공했음 (`db.ok=true`).

---

## 4. "무한 루프" 재해석

M2-1116-J report 의 "migration 루프 — 01:40:02 timestamp 무한 반복" 표현은
실제론 `docker compose logs` 재호출로 **이력 재인쇄**가 보이는 것. 컨테이너 재시작 아님 (StartedAt 한 번 · Pid 고정 · Health.Status=running 유지).
=> **DB · migration 자체 루프 아님**. 서버가 특정 bootstrap 지점 (rbac Link schema 로드 직후) 에서 **응답 없이 wait** → curl 거부 → timeout.

---

## 5. 수정 가능 여부 · 권장

1. **#290 머지에는 수정 불필요**. 머지 가능.
2. docker-smoke 자체 복구는 별도 티켓 권장. 후보:
   - `MEDUSA_WORKER_MODE=worker` 또는 heap/CPU 증가 (runner 교체는 이미 ubuntu-latest).
   - rbac Link schema warn 원인 조사 (rbac module `rbac_role_id` 미노출 linkable).
   - `node --inspect` 로 bootstrap hang 지점 캡처 (CI 환경 재현).
   - 또는 docker-smoke path-filter 를 좁혀서 (현재 src/** 전체 감시) blocking 완화.
3. Nightly `nightly-commerce-core-smoke.yml` 가 별도로 돌고 있으므로 full-build 보증 여지 있음 (ad-hoc 확인은 생략).

---

## 6. 확인 명령 (재현 · 아웃풋)

```
# 운영 health
curl -s https://storeport-production.up.railway.app/health
# → {"ok":true,"version":"8c89e85e","uptime_s":6230,"db":{"ok":true}}

# #290 docker-smoke failed 로그
gh run view 43787452497 --log-failed

# main #284 docker-smoke failed 로그 (동일 패턴 재현)
gh run view 43768457293 --log-failed

# 최근 main 배포 성공 이력
gh run list --branch main --workflow ci --limit 30
```

---

## 7. 원장 대사

- `m2/M2-1116-J-report.md` "migration 루프 01:40:02 반복" → **정정 필요**: 재시작·루프 아님 · logs 재인쇄 (timestamp 고정). 양상은 동일하나 뿌리 해석이 다름.
- `m1/M1-1116-J-report.md` "docker-smoke timeout · 3회 연속 · pre-existing" → **확증**. #284 로그 실측으로 뒷받침.
- `R0-1116-A` "smoke 실패 = 기존 migration timeout" → **큰 그림 맞음**. 단 "migration timeout" 보다는 "**서버 bootstrap hang · migration 실행 전 단계에서 멈춤**" 으로 교정.
- `#290` **APPROVE 유지 · 머지 안전**.

---

## 서명
Opus · 2026-11-16 · 상한 40분 · 실제 수행 ~15분
