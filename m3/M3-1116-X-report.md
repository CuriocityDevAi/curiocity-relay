판정: DONE — fix/m3-1116-s 에 DROP COLUMN 제거 커밋 push 완료, R0 스레드 resolve, PR #317 본문 갱신.

## 작업 내역

### 변경 파일
`apps/commerce-core/src/modules/register_session/migrations/Migration20261116000001.ts`

### REQ 이행

1. **up() step 3 삭제** — `drop index … idx_register_session_device_token_hash` 및 `alter table … drop column if exists "device_token_hash"` 블록 전체 제거.
2. **down() 대칭 정리** — `add column if not exists "device_token_hash"` 및 `create index … idx_register_session_device_token_hash` 제거. `customer_display_device` 테이블 drop 만 남김.
3. **모델 확인** — `register-session.ts` 에 `device_token_hash` 필드 없음(주석만 존재). Medusa/Mikro-ORM 은 모델에 없는 DB 컬럼을 무시 → 앱 미손상 확인.
4. **상단 주석 추가** — `// device_token_hash 컬럼 DROP 은 다음 라운드(롤백 안전 확보 후)`
5. **커밋·push** — `0088390` → `fix/m3-1116-s`

### 자기 검증

```
$ grep -n "drop column" Migration20261116000001.ts
(출력 없음 — DROP COLUMN 없음 확인)
```

### 단위 테스트 결과

```
Test Suites: 25 passed, 25 total
Tests:       344 passed, 344 total
Snapshots:   12 passed, 12 total
Time:        7.952 s
```

### PR #317 갱신
- R0 리뷰 스레드 (`PRRT_kwDOTe-UYs63-DeD`) resolve 완료
- PR 본문 "확인 항목" 섹션에 "마이그레이션 up 에 DROP COLUMN 없음" 추가
