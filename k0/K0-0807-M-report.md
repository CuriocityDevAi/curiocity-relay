# K0-0807-M · v0.3 구현 4탄 · I+4 원장 공유 (③ 정본 · 하이브리드 · 데몬 write only · E2E 왕복)

**허브**: K0 · test-portal
**일자**: 2026-08-09
**상태**: **완료** (PR #65 · **실기 없음** · 다음 Kyu 실기 지점 = I+8 미션 보드)

---

## [실기] · 없음 (내부 계층 · Kyu 명시)

**M = 데이터 계층 라운드**: 원장 저장 구조 + API + 시드 절차 + E2E 왕복 실증.
**다음 Kyu 실기 지점 = I+8 미션 컨트롤 보드 (ledger read 포털 UI 편입 시점)**.

### 확인 A · CLI 실측 (Kyu 선택)

```bash
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge ledger
# → canonical (비어있음 · seed 필요) · state (없음) · hubs (없음) · rounds (없음)
```

### 확인 B · 시드 절차 문서

`tools/kyu-bridge/src/ledger-seed.README.md` 확인.

### 확인 C · 오케 후속 (실 시드 데이터)

Kyu 명시 = "실 이식 데이터는 오케가 후속 제공 (이번엔 그릇+절차)".
후속 오케 (챗 클로드) 세션에서 canonical.md · 각 허브 초기 상태 · rounds 이력 payload 제공 예정.

---

## 완료 요약

### PR #65 (feat/k0-0807-m-ledger-share · `31c016d`)

- 9 파일 · 1211+ (신설만)
- pnpm check 961 파일 0 err 0 warn
- pnpm test 552 pass (신설 27: ledger unit 22 · E2E 5)
- pnpm build ✔
- main 직접 기반 (J/K/L 병합 완료 · main HEAD = 7b4d77f L)

### M-1 · 저장 구조 (§ 5 정본 · 하이브리드)

```
~/.kyu-bridge/ledger/
├── canonical.md              오케 정본 · 협업 규칙 · 데몬 write only (Q-I-15)
├── state.json                전체 스냅샷 · 기계 판독 · atomic replace
├── hubs/<hubKey>.json        허브별 상세
├── rounds/<YYYY-MM-DD>.md    일별 append · 편집 금지 · tombstone marker
└── .meta.json                메타 (last_write_at · history 100건)
```

**Q-I-2 하이브리드**: MD (canonical + rounds) 사람/챗 오케 · JSON (state + hubs) 세션 기계

### M-2 · API + CLI

**tools/kyu-bridge/src/ledger.mjs (~330 라인)**:
- **Write API** (Q-I-15 데몬 전용): writeCanonical · writeState · writeHub · appendRound · appendTombstone · seedLedger
- **Read API** (자유): readCanonical · readState · readHub · readRoundsForDate · listRoundDates · readMeta · summary · isValidState
- **Atomic write** (tmp + rename · POSIX 원자)

**tools/kyu-bridge/src/ledger-types.js**: JSDoc typedef (LedgerState · HubStatus · RoundStatus 등)

**tools/kyu-bridge/src/commands/ledger.mjs (CLI)**:
- `kyu-bridge ledger` = 요약
- `kyu-bridge ledger show <canonical|state|hub <hubKey>|rounds <date>>` = 원문
- `kyu-bridge ledger seed <path> [--overwrite]` = 시드
- `kyu-bridge ledger dates` = 최근 rounds date

### M-3 · 초기 시드 절차 (그릇 + 문서)

**tools/kyu-bridge/src/ledger-seed.README.md**:
- 저장 구조 · payload 형식 · 4 시드 경로:
  1. **오케 → relay → 데몬** (Kyu 명시 정본 · 이번엔 절차만 · I+5 자동 편입)
  2. **CLI** (`kyu-bridge ledger seed <path>`)
  3. **세션 API** (I+5 이후)
  4. **default 초기값** (hubs.json 기반 · 후속)
- Q-I-15 write only 규약 · Kyu 편집 out-of-band
- append 규약 (rounds/*.md)

`seedLedger` idempotent (기본 skip · `--overwrite` 재적용).

### M-4 · 실증 (27 신설 케이스)

**ledger.test.mjs (22)**: canonical/state/hubs/rounds/summary/seed/atomic
**ledger-e2e.test.mjs (5)**: 6 단계 왕복 · 여러 허브 격리 · MD/JSON 정합 · read only 규약

### E2E 왕복 실측 로그 (K0 직접 재현)

```
=== 1) 오케 시드 (M-3 · relay 경유 시뮬) ===
  written: canonical, state, hubs/k0, hubs/n0

=== 2) 데몬 write · 세션 시작 (k0/K0-0807-M running) ===
  state.hubs.k0.status = running · active_round=K0-0807-M

=== 3) 세션 read (프롬프트 조립 시뮬) ===
  canonical: # CurioCity 오케 정본 · 협업 규칙 …
  state valid: true
  hub k0 status: running · session: running

=== 4) 라운드 완료 · rounds/2026-08-09.md append + state 갱신 ===

=== 5) 재-read · 최종 정합 ===
  state.hubs.k0.status: idle
  rounds_index[K0-0807-M].status: done
  rounds/2026-08-09.md · length: 105 · entries: 1

=== 6) summary (CLI 요약) ===
  canonical: OK · state: 1 · hubs: k0,n0 · recent: 2026-08-09
```

**6 단계 전량 정확 · 왕복 완결 확증**.

---

## 이연 순증감

**implemented (K0-0807-M)**:
- 원장 저장 구조 (하이브리드 MD+JSON)
- Write/Read API (Q-I-15 정합 · atomic · 스키마)
- CLI kyu-bridge ledger
- 시드 절차 문서 (4 경로 · README)
- E2E 왕복 실증 (27 신설)

**신설 이연 (별건 라운드 · 순차)**:
- **I+5** headless 세션 (2일 · claude --session-id · 프롬프트 조립 = ledger read 소비)
- **I+6** 자동 투입 루프 (2일 · appendRound 자동)
- **I+7** 안전장치 4 + 하트비트 (1.5일)
- **I+8** 미션 컨트롤 보드 (2.5일 · **Kyu 실기 지점** · ledger read 포털 UI 편입)
- **I+9** 포털 허브 탭 4 + head SHA 재조회 (2일)

**후속 별건 (스코프 밖)**:
- **relay/ledger/ GitHub sync** (Contents API · 원격 mirroring)
- **오케 실 시드 데이터** (canonical.md · 허브 초기 상태 · rounds 이력) — **오케 후속 제공**

**병합 순서**:
- PR #65 (M) = Kyu 사인 후 병합
- 이전 라운드 = 병합 완료

---

## 다음 대기 (Kyu 회신 후)

1. **PR #65 병합** (실기 없음 · 내부 계층)
2. **오케 실 시드 데이터 제공** (canonical.md 정본 · 초기 payload)
3. **I+5 착수 사인** (headless 세션)
4. 순차: I+6 → I+7 → **I+8 (Kyu 실기 지점)** → I+9

---

*K0-0807-M · 2026-08-09 · v0.3 구현 4탄 · I+4 원장 공유 · ③ 정본 · 하이브리드 MD+JSON · 데몬 write only · E2E 왕복 실증 · 실기 없음 · 다음 실기 = I+8*
