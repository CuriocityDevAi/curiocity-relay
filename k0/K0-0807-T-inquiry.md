# K0-0807-T · 심문 게시 (CLAUDE.md § 8 ③-relay 신설 규약 첫 적용)

**round_id**: K0-0807-T
**hub**: k0 (test-portal)
**목적**: I+8 실기 차단 3건 회수 (Kyu 실측 08-09) · S 폐기
**timestamp**: 2026-08-09

**심문 게시일 참고**: 본 라운드 심문은 실 시점에 chat 로 발화된 후 Kyu 회신 회수 완료. 이 파일 = **다음 라운드부터 정본 정합 위한 소급 사본** (③-relay 규약 첫 적용의 감사 자료).

---

## § ② 큐 · 원장 · 스펙 게시

### (1) dispatch 큐
- inbox (7): P2/P5/딥링크 · 무관
- active: 없음
- await-kyu (1 · STALE 13일): P2.2-0 access-before-real-data

### (2) EPIC-STATE
kyu-orchestrator v0.3 시리즈 후속 · K0-0807-Q 착지 실기 결함 회수 라운드.

### (3) SPEC 정본 인용 · 뿌리 실측

**T-1 뿌리**: `POST /api/approvals` = Access OTP 정책 하에서 Access 302 발동 (데몬 브라우저 없음 · IdP 로그인 불가).

**T-2 뿌리 (K0 확증)**:
- `tools/kyu-bridge/src/commands/serve.mjs:36` = `createBridgeServer({ ... })` 안 `hubs` 미주입
- `server.mjs:89` = `hubs = opts.hubs ?? null` = null
- `server.mjs:139` = `hubs: hubs ?? []` = 빈 배열
- `mission-board.mjs:47` = 빈 배열 순회 = payload.hubs = 0
- `kyu-bridge hubs` CLI = `commands/hubs.mjs` 안 `loadHubs()` 직접 호출 → fallback 4건 정상 반환
- **fix = serve.mjs 안 loadHubs() 편입** (동일 정본 소비)

**T-3 뿌리 (재현 불가)**:
- `+page.svelte:333` = onclick 배선 정상
- Kyu 실측 "콘솔 로그 0 = 핸들러 미발화"
- 후보: (a) hubs=0 조건부 렌더링 · (b) 토큰 부재 조기 리턴 · (c) 브라우저 캐시
- 방어 = 진입 로그 + confirm + disabled + 성공/실패 toast

---

## § ③ 심문 게이트 (10 질문 · 3 지적 · 2 반론 · 3 역제안)

### (a) 확인 질문 요약

- **Q1** T-1 daemon-auth 방식 = (a2) Service Token + Bearer 병존 (인프라 + 앱 이중 방어)
- **Q2** Service Token 스코프 = (b2) `/api/approvals/pull` 만 (K0 초안) · **Kyu 정정 = (b1) /api/approvals/* 전체** (POST 도 Access 앞단 302)
- **Q3** config 스키마 = `approval_daemon.cf_access_client_id/secret` (미설정 시 skip)
- **Q4** T-2 fix = serve.mjs loadHubs 편입
- **Q5** T-3 방어 4종 = 진입 로그 + confirm + disabled + 성공 toast
- **Q6** confirm() native (자작 최소 · 파괴적 action 정본)
- **Q7** 성공 toast 대칭 (기존 lastError 만 있음)
- **Q8** kyu-clicks T 문서 신설 (Service Token 발급 + 재실기 curl)
- **Q9** 테스트 매트릭스 ~20 승인

### (b) 충돌 · 중복 지적

- **C1** T-1 Service Token = daemon-auth.ts 계약 확장 (Bearer + Access 헤더 병존)
- **C2** Q PR body 실기 절차 = Service Token 언급 없음 (kyu-clicks T 문서 신설로 흡수)
- **C3** SPEC § 4 인증 절 = Bearer only 문언 · Service Token 정본 편입 필수

### (c) 반론

- **R1** T-2 뿌리 확증 완료 = serve.mjs loadHubs 미편입 · 1-line 편입 fix
- **R2** T-3 뿌리 확정 불가 = 방어 코드로 모든 후보 흡수

### (d) 역제안

- **D1** Q kyu-clicks 갱신 = T 문서 신설로 흡수
- **D2** serve.mjs loadHubs 편입 시 로그 (source · count)
- **D3** hubs_source 를 mission-board payload 편입 + UI fallback 배너 (Q7 정본)

---

## Kyu 회신 (2026-08-09 오케 판정)

- Q1 = (a2) 채택
- **Q2 = (b1) 채택** (K0 권고 b2 기각 · 이유 정합)
- Q3 = 채택
- Q4 = 채택 + payload.hubs_source 편입
- Q5 = 전 4종 채택
- Q6 = (d1) confirm() native
- Q7 = 성공 toast 대칭 채택
- Q8 = kyu-clicks T 문서 신설 채택
- Q9 = 승인
- D1 = T 문서 신설로 흡수 채택
- D2 = 필수
- D3 = 이번 라운드 편입
- C3 = § 4 인증 절 정정 포함

**+ 신설 규약**: **본 라운드부터 전 허브 적용** = 심문·질문·중간 보고 = relay push · 터미널 요약만 · Kyu 복붙 소멸.

---

## 후속

- 심문 게이트 통과 → 즉시 구현 진행
- 최종 리포트 = `K0-0807-T-report.md` (별도 파일)
- PR: https://github.com/CuriocityDevAi/test-portal/pull/70
