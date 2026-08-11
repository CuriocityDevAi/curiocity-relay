# K0-0807-Z · Y live 점화 결함 3 fix (approval 실 배선 · 승인 큐 자동 새로고침 · 토큰 온보드)

**round_id**: K0-0807-Z
**hub**: k0 (test-portal)
**pr**: test-portal_PR#75
**branch**: feat/k0-0807-z-approval-and-onboarding
**status**: PR 심리 대기 · Kyu 실기 재검증 5단계 (배포 후)
**timestamp**: 2026-08-11

## 요지

**Kyu 실측 08-11 · Y live 점화 판정** · 판독→판단→멈춤 실증 ✓ · **결함 3건 fix**.

- ✓ tick verdict=finished:kyu_decision · halt.flag reason=kyu_decision_pending · approval_id 보드 표시
- ❌ 승인 큐 D1 GET status=pending count=0 · /approvals 화면 = 옛 반려만 표시 (approval 미적재 뿌리)
- ❌ 홈 "데몬 미기동" [설정] 링크 = 일반 설정 · 토큰 입력 UI 없음

## 착지 (9 files · +551 insertions)

| 파일 | 라인 | 역할 |
|------|------|------|
| `tools/kyu-bridge/src/approvals-store-adapter.mjs` | 신설 ~30 | Z-1 · client.postApproval → upsertApproval 어댑터 · 예외/실패 폴백 |
| `tools/kyu-bridge/src/commands/serve.mjs` | +18 | Z-1 · config.approval_daemon 확인 · createApprovalsClient + adapter → orchestrator 주입 |
| `tools/kyu-bridge/src/loop-orchestrator.mjs` | +6 | Z-4 · question 폴백 강화 |
| `src/routes/approvals/+page.svelte` | +18 | Z-2 · cache no-store + 30s 폴링 + visibility skip |
| `src/routes/settings/+page.svelte` | +200 | Z-3 · [🔌 kyu-bridge 온보드] 섹션 신설 |
| `tools/kyu-bridge/test/approvals-store-adapter.test.mjs` | 신설 4 case | Z-1 어댑터 unit |
| `tools/kyu-bridge/test/loop-orchestrator-pilot.test.mjs` | +3 case | Z-4 question 폴백 |
| `docs/design/kyu-orchestrator-v0.3.md` § 9.16 · § 9.19 | 보강 + 신설 | 계약 정본 + 착지 |
| `docs/SPEC.md` v1.42 | 트레일러 | 요약 |

## Z-1 · 뿌리 실측 · orchestrator approvalsStore 실 배선

**뿌리 (X 라운드 조립 누락)**:
- `serve.mjs:53` = `createLoopOrchestrator({sessionManager, config, log})` = **approvalsStore 미주입**
- orchestrator 안 `shouldPersist && approvalsStore?.upsertApproval` = false → upsert skip
- halt.flag reason 메타 문자열 (`approval_id=loop-k0-...msogb4ui`) 만 남음
- Kyu 실측 = 보드 approval_id 표시는 halt reason 파싱 결과 · **실 D1 항목 없음**

**fix**:
- `approvals-store-adapter.mjs` 신설 = `client.postApproval` 을 `upsertApproval` 인터페이스로 감쌈
- `serve.mjs` 안 `config.approval_daemon.portal_base_url + token` 확인 → `createApprovalsClient` + `createApprovalsStoreAdapter` → orchestrator 주입
- 미설정 시 = skip 로그 (docs/kyu-clicks/Q-approval-daemon-and-hubs.md 참조)

**설계 정본 보강 (design § 9.16)**:
- 필수 조건 3 = `isLive AND approvalsStore != null AND approvalsStore.upsertApproval`
- 재발 방지 문언 = "orchestrator 생성 시 approvalsStore 미주입 = kyu_decision D1 upsert 안 됨"

## Z-2 · /approvals 화면 fix

- `fetch(url, { credentials: 'include', cache: 'no-store' })` = 프록시/브라우저 캐시 회수
- 30s 자동 폴링 (setInterval + visibility hidden skip) = 미션 보드 정합

## Z-3 · 설정 페이지 토큰 온보드 UI

`settings/+page.svelte` 상단 신설 섹션:
- 상태 표시 (✓ 토큰 저장됨 / ⚠ 토큰 없음 · 미션 보드 표시 안 됨)
- 토큰/baseUrl 입력·저장·제거 (localStorage `test-portal:kyu-bridge-token:v1` write)
- 발급 안내 (details/summary · `kyu-bridge install` → `print-token` → 붙여넣기 → 저장 4단계)
- kyu-clicks/K0-0807-A 링크

## Z-4 · kyu_decision question 폴백 강화

기존:
```
const question = parsed.question ?? '(질문 미제공)';
```

fix:
```
const question =
    parsed.question ??
    (parsed.reasoning
        ? `루프 판정 필요: ${parsed.reasoning}`
        : `루프가 hub=${hubKey} · round=${roundId ?? '?'} 판정 필요 (question 미산출 · 세션 로그 참조)`);
```

판독 세션이 question 미산출 시에도 최소 컨텍스트 유지 · '(질문 미제공)' 폐기.

## QC

```
pnpm check → COMPLETED 969 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
pnpm test  → Test Files  56 passed (56) · Tests  739 passed (739)
pnpm build → adapter-cloudflare ✔
```

**신설 7** = adapter unit 4 + question 폴백 3.

## Kyu 실기 재검증 · self-contained 5단계 (PR body [실기] 최상단)

1. **데몬 재설치** · Z-1 어댑터 배선 로그 확증 (`approvals-store adapter 배선 · portal=...`)
2. **홈 [설정]** → 상단 [🔌 kyu-bridge 온보드] 확증 (Z-3)
3. **live 재점화** (`config.loop.live=true` · pilot 활성) · 60s 대기
4. **kyu_decision 발동** = D1 GET pending count≥1 (curl POST + GET pull) + /approvals 화면 표시 확증
5. **Kyu 판정** [승인]/[반려] → 데몬 pull → resume-loop → 다음 tick 재개 왕복

## 이연 순증감

**Z 신규 이연 = 없음** (Y 결함 fix 완결)

**기존 이연 유지 (X · Y)**:
- 타 허브 loop 확장 (n0/t0/m0)
- 프롬프트 자동 주입 고도화
- SIGINT halt (SPEC § 7.2 ⓓ)
- 구 PR#40/#43 정리
- watcher onNewReport 통합 (Q1 a3)
- 자동 재개 approvals-loop 편입 (Q8 g1)

## PR

https://github.com/CuriocityDevAi/test-portal/pull/75
