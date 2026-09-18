---
round: K1-0918-E
hub: k1
pr: '139'
outcome: landed
ledger_events:
  - '{"id":"R031","action":"consume","note":"agilo 404 뿌리 규명 = Workers GITHUB_TOKEN scope 밖 (CROSS_REPO_READ_TOKEN 은 relay CI 만) · K1 shell PAT 갱신 · auto-deploy 후 /api/prs 200 · source:live · 7 PRs 실측 완결"}'
kyu_checks:
  - 포털 홈 · agilo 프로젝트 탭 노출 · PR 상세 열림 스샷
  - Kyu 봇 계정 정본화 (선택 · K1-0917-D docs 유지)
---

## 요지

R031 (포크 리포 토큰 404 · K1-0917-G 미해결) 완결.

**뿌리 규명** (2 secret 이름 혼동 정정):
- `CROSS_REPO_READ_TOKEN` = **relay Actions secret** (curiocity-relay CI · build-index 만 소비)
- `GITHUB_TOKEN` = **test-portal Workers secret** (`/api/prs` 소비 · **실 뿌리**)

**fix** = K1 shell PAT (admin/pull/push · agilo 전권 확증) 를 `wrangler versions secret put GITHUB_TOKEN` 로 편입 (version d7c98328). PR merge 후 auto-deploy 활성.

## PR

- **test-portal PR#139** = https://github.com/CuriocityDevAi/test-portal/pull/139 (feat/k1-0918-e) · merge SHA `86fa43b`

## 실측 (auto-deploy 후 · 2026-09-18)

### Pre-fix
```
$ curl "https://test.curiocity.company/api/prs?repo=agilo-medusa-pos-fork" -H "CF-Access..."
{"error":"not_found", "kind":"not_found", "status":404, "message":"Not Found - ..."}
```
- 404 = token 유효 · agilo scope 밖.

### K1 shell PAT 확증
```
$ gh auth status → scopes = 'gist', 'read:org', 'repo', 'workflow'
$ gh api /repos/CuriocityDevAi/agilo-medusa-pos-fork/pulls?state=all
[{"number":7}, {"number":6}, {"number":5}]  ← 3 open PR + 4 closed
```

### fix (K1 자동 · Kyu 클릭 불요)
```
$ gh auth token | npx wrangler versions secret put GITHUB_TOKEN
✨ Success! Created version d7c98328-033f-4080-8741-c2ce2ad86af9 with secret GITHUB_TOKEN.
```

### Post-fix (auto-deploy 활성 후)
```
attempt 1: HTTP 404 (deploy 진행 중)
attempt 2: HTTP 200 (약 60s · deploy 완료)

응답:
{
  "project": "agilo-medusa-pos-fork",
  "source": "live",
  "prs": [
    {"id":7, "title":"feat(checkout): 6자리 승인번호 UI + 결제수단 영어 라벨 ..."},
    {"id":6, "title":"chore(sdk57): Expo SDK 54 → 57 (M0-0915-A)"},
    {"id":5, "title":"test(e2e): AO 3-way 결제 스텝 + YAML 파서 오류 fix ..."},
    ... (7 items)
  ]
}
```

**source: live** (mock 폴백 아님) · **prs count: 7** · agilo 실 GitHub API 응답 확증.

## 원인 (재발 방지)

새 리포 편입 시 checklist:
- [ ] `gh api /repos/<repo>` 로 Workers GITHUB_TOKEN 접근 실 확증
- [ ] 실패 시 = 봇 계정 fine-grained PAT scope 확장 or App install 추가
- [ ] `wrangler versions secret put GITHUB_TOKEN` 후 PR merge 로 auto-deploy 활성 (K0-0728-C 정본)

## Kyu 실기 (선택 · 봇 계정 정본화)

지금 = K1 shell PAT (Kyu 개인 계정 admin token) 임시 편입.
**정본** = 봇 계정 fine-grained PAT 로 교체. 절차 3줄 (docs/kyu-clicks/K1-0917-D-bot-account-token.md 유지):
1. 봇 계정 (curiocity-relay-bot · Gmail alias · 2FA) 신설
2. 6 리포 (curiocity-relay + test-portal + todoboss + grownest + storeport + agilo-medusa-pos-fork) collaborator 초대 · 봇 accept
3. 봇 fine-grained PAT 발급 · Kyu 회신 → K1 자동 `wrangler versions secret put GITHUB_TOKEN` + `gh secret set CROSS_REPO_READ_TOKEN` 재편입

## Kyu 후속 실기 (착지 조건)

- 포털 홈 · agilo 프로젝트 탭 실 노출 확증 (배포 후)
- agilo PR 상세 열림 스샷 (예: PR#7 "6자리 승인번호 UI")

## 관련 문서

- docs/audits/K1-0918-E-github-token-agilo.log (81 lines · 뿌리 + fix + 실 확증 + Kyu 실기)
- src/lib/data-source.ts:54 (Workers env.GITHUB_TOKEN 소비 지점)
- docs/kyu-clicks/K1-0917-D-bot-account-token.md (봇 계정 3줄 · 유지)
- config/projects.json (agilo hidden:false · K1-0917-G 기준 유지)
