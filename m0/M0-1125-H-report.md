PASS

# M0-1125-H · setup-multi-store 2회 apply 멱등 + PS PB1·nickname 옵션

- PR: https://github.com/CuriocityDevAi/storeport/pull/432
- Branch: `feat/M0-1125-H-setup-multi-store-idempotent`
- HEAD: `b4535d1 feat(commerce-core): M0-1125-H — setup-multi-store 2회 apply 멱등 + PS PB1·nickname 옵션`
- Worktree: `~/curiocity-live/storeport-wts/M0-1125-H-wt`

## Summary

`apps/commerce-core/src/scripts/setup-multi-store.ts` 를 2 회 연속 apply 해도 쓰기 0 · 에러 0 이 되게 멱등하게 만들었고, PS 매장의 PB1 override 와 nickname 을 스크립트에서 바로 설정할 수 있는 옵션을 추가했다. Admin UI 손품(PB1 Switch Off, nickname 입력)을 1 번의 운영 명령으로 끝낼 수 있다. Kyu 운영 apply 가 중간에 끊긴 뒤 재실행해도 안전.

## 멱등화 상세

| 스텝 | 멱등 전략 |
| --- | --- |
| 3 sales channel ↔ PS link | `query.graph(entity:"stock_location", fields:["sales_channels.id"], filters:{id:psId})` 선조회 후 defaultSc 가 이미 포함되면 workflow 호출 skip (`"이미 연결됨"` 로그) |
| 4 inventory levels | `inventoryModule.listInventoryLevels({ location_id: psId })` 로 (item, PS) 기존 쌍 Set 구성 → `inventoryItems.filter(...)` 로 신규만 추출 · dry-run 포함 `"inventory items: N · PS inventory level 생성 예정 K · 이미 있음 M"` 로그 |
| 5 pos_settings 주소 | `patchLocationSettings` → `patchByScope` → `getOrCreateByScope` + `updatePosSettings` = 이미 upsert (코드 확인 완료 · 변경 없음) |

## 새 옵션 목록

```
--ps-pb1 <off|on|inherit>     default: inherit (손대지 않음)
                                off     = pos_settings.location:psId.pb1_pct = 0
                                on      = pos_settings.location:psId.pb1_pct 키 삭제 (브랜드 상속)
--ps-nickname <NICK>          NICKNAME_REGEX(/^[A-Z][A-Z0-9]{1,3}$/) 통과 필수
                                parseArgs 가 대문자 정규화 + 형식 검증
                                service.setNickname 이 locked / 중복 검증
```

사용법 (프로덕션 컨테이너 안):

```
cd /app/.medusa/server && \
  npx medusa exec ./src/scripts/setup-multi-store.js -- \
    --apply \
    --pim-name "PIM" --pim-address "Pondok Indah Mall, Jakarta" \
    --ps-name  "PS"  --ps-address  "Plaza Senayan, Jakarta" \
    --ps-pb1 off --ps-nickname PS
# `--` 필수 (medusa exec 가 뒷 플래그를 스크립트 인자로 전달)
```

## 테스트 로그

`pnpm --filter commerce-core test` — **681 passed, 60 suites**

setup-multi-store 스펙 18 개 포함:

```
PASS src/scripts/__tests__/setup-multi-store.unit.spec.ts
  M0-1124-E · setup-multi-store parseArgs
    ✓ 빈 argv → defaults (dry-run · PIM/PS 기본 이름·주소)
    ✓ --apply → apply=true · 나머지 기본값 유지
    ✓ 매장 이름·주소 전부 override
    ✓ 알 수 없는 플래그 무시
    ✓ --pim-id 플래그 파싱
    ✓ --ps-pb1 off|on|inherit 파싱
    ✓ --ps-pb1 invalid → ArgParseError
    ✓ --ps-nickname 소문자 입력 → 대문자 정규화
    ✓ --ps-nickname 검증 거절 케이스 — ArgParseError (1글자·5글자·숫자시작·특수문자·공백·값없음)
    ✓ validateNickname 통과 케이스
  M1-1124-R · selectPimTarget (6개 기존)
  M0-1125-H · setup-multi-store · 2회 apply 멱등
    ✓ 첫 apply 가 state 를 채우면 두 번째 apply 는 쓰기 0 · 에러 0
    ✓ dry-run 은 쓰기 workflow / service 를 호출하지 않음

Test Suites: 60 passed, 60 total
Tests:       681 passed, 681 total
```

`pnpm --filter commerce-core typecheck` — PASS
`pnpm --filter commerce-core lint` — 에러 0 (기존 warning 9 건 · 다른 파일)
`bash scripts/naming-check.sh` — PASS

## CI 결과 (PR #432)

| Check | Result |
| --- | --- |
| markers-and-forbidden | pass 18s |
| route | pass 14s |
| changes-filter | pass 15s |
| check (unit) | pass 23s |
| heavy-mac (unit+integration+typecheck+lint+build) | pass 15m11s |
| heavy-cloud | skipping (설계대로) |

## 기술 선택 (PR 본문에 기록)

1. `sales_channel ↔ stock_location` 링크 조회는 `query.graph(entity:"stock_location", fields:["sales_channels.id"])` 로 — 링크 테이블 raw SQL 을 피하고 Medusa 공식 relation 그래프를 사용.
2. `--ps-pb1 on` 의 "브랜드 상속" 은 `pb1_pct: null` + `patchLocationSettings(nullDeletes: true)` 로 **매장 override 키 삭제** 처리 — Admin UI "Apply PB1 at this store" On 과 동일 상태로 수렴.
3. `--ps-nickname` 은 `parseArgs` 단에서 NICKNAME_REGEX 정규화만, DB 쪽 중복/locked 검증은 `OrderNumberModuleService.setNickname` 에 위임 — single source of truth 유지.

## 다음 단계

- Kyu 셀프 머지 (셀프 머지 금지 규약으로 러너·오케 외부에서 수행하지 않음).
- 운영 apply 는 오케가 별도 안내 (Phase 안내 대로 컨테이너 exec).
