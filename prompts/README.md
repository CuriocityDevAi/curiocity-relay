prompts/ · 오케스트레이터 프롬프트 큐 (K0-0911-AQ 정본 · 자동 발부 v2)

# 규약 (K0-0911-AQ · Kyu 원문 정본)

**전달만 자동 · 판단은 사람** (Kyu 원문 · AQ 라운드 봉인 4조건 안).

## 경로

`prompts/<hub>/<ID>.md` · hub ∈ {k0, n0, t0, m0} · ID = `<HUB>-<YYYYMMDD>-<LETTER>` (예:
`K0-0911-AQ`, `N0-0912-A`).

## Frontmatter

```yaml
---
id: K0-0911-AQ
hub: k0
issued_at: 2026-09-11T10:00:00Z
status: pending
---
```

- `id` = 원장 ID (라운드/작업 식별)
- `hub` = 대상 허브 (k0/n0/t0/m0)
- `issued_at` = ISO 8601 UTC
- `status` = `pending` | `dispatched` | `landed`
  - `pending` = 오케 push 완료 · 포털 노출 · Kyu [투입] 대기
  - `dispatched` = 데몬 dispatch 완료 · 허브 세션 안 투입됨
  - `landed` = 착지 리포트 push 완료 (링크 = k0/... report.md)

## 본문 (4-block 프롬프트)

관례 규약 = 아래 4 블록 순서:

1. **요지** (1줄 · 사람 말) — 카드 표시 대상
2. **REQ** — 요구사항 원문
3. **DOC** — 문서 갱신 의무
4. **BUILD/REPORT** — 착지 조건

## 상태 전이

```
[오케 push]
    ↓
pending  ─── [포털 폴링 · 카드 노출] ─── [Kyu 탭 = 투입]
    ↓
dispatched  ─── [데몬 커밋 status 갱신]
    ↓
[허브 세션 라운드 완결]
    ↓
landed  ─── [착지 리포트 push · 데몬 갱신]
```

## Dispatch 프로토콜 (K0-0911-AQ-C)

**포털 → 브리지** (kyu-devenv 데몬):
```
POST /dispatch/prompt
{
  "id": "K0-0911-AQ",
  "hub": "k0",
  "prompt_body": "<본문 markdown>",
  "prompt_path": "prompts/k0/K0-0911-AQ.md"
}
```

**데몬**:
1. 허브 프로젝트 디렉터리 확인 (`/Users/kyu.lee/projects/test-portal` 등)
2. 투입 방식 (K0-0911-AQ-C 실험 후 전결 · 선택 근거 리포트 로그):
   - (a) `claude -p <prompt> --allowed-tools ...` headless 실행 (우선)
   - (b) 실행 중 대화 세션 주입 (후순위)
3. 성공 시 = git commit relay 파일 status pending → dispatched
4. 실패 시 = 카드에 "수동 투입" 상태 + [프롬프트 복사] 후퇴

## Landing 프로토콜 (K0-0911-AQ-D)

착지 리포트 = `<hub>/<ID>-report.md` frontmatter:
```yaml
---
round: K0-0911-AQ
pr: https://github.com/CuriocityDevAi/test-portal/pull/89
outcome: <자기 검증 요약>
kyu_checks: [<실기 항목 배열>]
---
```

포털이 landing 리포트 push 감지 → prompt 파일 status → `landed`.

## 예시

`prompts/k0/K0-0911-AQ.md` (이 라운드 자체):

```markdown
---
id: K0-0911-AQ
hub: k0
issued_at: 2026-09-11T10:00:00Z
status: landed
---

## 요지

자동 발부 v2 (전달만 자동 · 판단은 사람) · AP 결함 인계 + prompts 채널 + 브리지 dispatch.

## REQ / DOC / BUILD / REPORT

<Kyu K0-0911-AQ 원문 인용>
```
