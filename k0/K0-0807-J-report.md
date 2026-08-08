# K0-0807-J · v0.3 구현 1탄 · I+1 로컬 파일 큐 (Q-I 전량 판정 확정)

**허브**: K0 · test-portal
**일자**: 2026-08-08
**상태**: **완료** (PR #62 · **실기 없음** · 다음 Kyu 실기 지점 = I+8 미션 보드)

---

## [실기] · 없음 (내부 계층 · Kyu 명시)

**J = 내부 계층 라운드**: queue API + CLI · 데몬 통합 없음 (승인 큐/원장/세션 착지 후 I+3 이후).
**다음 Kyu 실기 지점 = I+8 미션 컨트롤 보드** (포털 홈 · 하트비트 · 세션 로그 라이브).

### 확인 A (Kyu 선택 · 실행 안 해도 됨)

Kyu 가 원하면:
```bash
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge queue-status
# → 큐 없음 (kyu-bridge install 후 orchestrator 라운드 없음)
```

v0.3 오케 착지 前에는 큐 없음 · 정상.

---

## 완료 요약

### PR #62 (feat/k0-0807-j-local-queue · `7c07152`)

- 7 파일 · 840+ / 53-
- pnpm check 952 파일 0 err 0 warn
- pnpm test 474 pass (신설 27: queue 20 · concurrency 7)
- pnpm build ✔

### J-0 · Q-I-1..16 확정치 오케 기입 (§ 15 정본)

전량 판정 확정:

| # | 판정 | 확정치 | 구현 반영 |
|---|------|--------|----------|
| Q-I-1 | 로컬 큐 매체 | **파일** (자작 최소 · deps 0) | I+1 (본 라운드) |
| Q-I-2 | 원장 파일 형식 | 하이브리드 (MD + JSON) | I+4 |
| Q-I-3 | claude 세션 영속 | **--session-id 고정** | I+5 |
| Q-I-4 | 승인 큐 latency | 15s + blocking 5s | I+3 |
| Q-I-5 | 무진전 임계 | 연속 3회 | I+7 |
| Q-I-6 | N-허브 fallback | 하드코딩 fallback 유지 + deprecation 경고 | I+2 |
| Q-I-7 | 로그 스트림 | polling 초판 | I+8 |
| Q-I-8 | 하트비트 TTL | 30s | I+7/I+8 |
| Q-I-9 | 미션 보드 갱신 | 10s | I+8 |
| Q-I-10 | 체크리스트 | 6문 시작 | I+6 |
| Q-I-11 | 긴급 정지 | 허브별 + 전체 | I+7 |
| Q-I-12 | 세션 이력 | 로컬 30일 · 이후 압축 | I+5 |
| Q-I-13 | 프롬프트 템플릿 | 파일 | I+6 |
| Q-I-14 | 세션 재시작 | **3회 시도 + 이벤트 기록 + 3회 실패 = "죽음" 알림** | I+7 |
| Q-I-15 | ledger 편집 | 데몬 write only (포털 read) | I+4 |
| Q-I-16 | 칸반 · 비용 | 별건 EPIC (v0.4 이후) | I+10/I+11 자리 |

### J-1 · 로컬 큐 구현 (§ 3 정본 그대로)

**tools/kyu-bridge/src/queue.mjs (신설 · ~280 라인)**:
- **API**: `enqueue` · `peek` · `dequeue` · `ack` · `nack` · `list` · `counts` · `recoverStale` · `watchQueue` · `mintId` · `setQueueRoot`
- **파일 배치**: `~/.kyu-bridge/queue/<hub>/<queueName>/<15-digit-ts>-<8-hex>.json`
- **원자성**:
  - `enqueue` = write `.enqueue-<id>.tmp` + `rename` (POSIX atomic · 같은 filesystem)
  - `dequeue` = `O_CREAT|O_EXCL` lock + `rename` queue → `.processing/` (원자)
  - `ack` = `unlink` `.processing/<name>.json`
  - `nack` = `rename` `.processing/<name>.json` → queue (원자 되돌림)
- **FIFO 정렬**: 파일명 lexicographic sort · 동시 enqueue 시 랜덤 tiebreak
- **Lock TTL 30s** (Q-I-8 정합) · stale 시 자동 회수
- **Processing TTL 5분** (crash recovery)
- **fs.watch + polling fallback** (2s 주기 · 100ms debounce · dot 접두 filter)
- **허브별 완전 격리** (k0/t0/n0/m0 등)

**tools/kyu-bridge/src/commands/queue-status.mjs (신설)**:
- CLI: `kyu-bridge queue-status`
- 허브별 대기 수 + FIFO 최근 3 항목 표시

**tools/kyu-bridge/bin/kyu-bridge (dispatcher 편입)**:
- `queue-status` case 추가 · help 문안 편입

### J-2 · 단위 검증 27 케이스 · 100% pass

**queue.test.mjs (20)**:
- mintId (3) · enqueue+peek+list (5) · dequeue+ack+nack (7) · counts (3) · recoverStale (3) · 허브 격리 (2)

**queue-concurrency.test.mjs (7)**:
- 50 concurrent enqueue = 50 unique id · 유실 없음
- 20 concurrent dequeue on 10 항목 = 정확히 10 성공 · 중복 없음
- concurrent enqueue + 순차 dequeue = seq 집합 정합
- lock TTL 0 stale 시나리오
- 순차 (1ms gap) FIFO 순서 정확 30 개

### queue-status 실측 로그 (K0 재현)

```
kyu-bridge queue-status
  root: /Users/kyu.lee/.kyu-bridge/queue

[k0-demo-J]
  decisions                1 대기
    · 001786159289051-d077be… (2026-08-08T03:21:29.051Z)
  pending-approval         2 대기
    · 001786159289043-0fcfc6… (2026-08-08T03:21:29.043Z)
    · 001786159289048-c555a1… (2026-08-08T03:21:29.048Z)
```

---

## 이연 순증감

**implemented (K0-0807-J)**:
- Q-I-1..16 판정 확정 오케 기입 (§ 15)
- 로컬 파일 큐 API + CLI + 27 단위 케이스
- SPEC v1.29 · design § 3.5 착지 표기

**신설 이연 (별건 라운드 · 순차)**:
- **I+2** hubs.json registry (1일)
- **I+3** 승인 큐 데이터 계층 (1일)
- **I+4** 원장 공유 스캐폴드 (1일)
- **I+5** headless 세션 (2일 · --session-id 실측)
- **I+6** 자동 투입 루프 (2일)
- **I+7** 안전장치 4 + 하트비트 (1.5일)
- **I+8** 미션 컨트롤 보드 + 세션 로그 라이브 (2.5일 · **Kyu 실기 지점**)
- **I+9** 포털 허브 탭 4 + head SHA 재조회 (2일)
- I+10/I+11 (자리 · 별건 EPIC · v0.4 이후)

**병합 순서**:
- PR #62 (이 라운드) = Kyu 사인 후 병합
- 이전 라운드 = 병합 완료

---

## 다음 대기 (Kyu 회신 후)

1. **PR #62 병합** (실기 없음 · 내부 계층)
2. **I+2 착수 사인** (hubs.json registry)
3. 순차: I+3 → I+4 → I+5 → I+6 → I+7 → **I+8 (Kyu 실기 지점)** → I+9

---

*K0-0807-J · 2026-08-08 · v0.3 구현 1탄 · I+1 로컬 큐 · Q-I 전량 판정 확정 · 실기 없음 · 다음 실기 = I+8*
