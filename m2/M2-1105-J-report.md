---
round: M2-1105-J
pr: null
outcome: 읽기 전용 상태 확인 · 배포 현행 · Kyu 할 일 **0** (재배포 불요)
kyu_checks: 0 (서버 state 확인만 · 코드·배포 액션 0)
---

# M2-1105-J · 서버 배포 상태 확인 (read-only · 배포 행위 금지)

**일자**: 2026-11-07 · **허브**: M2 (관측 레인) · **상대 리포**: `agilo-medusa-pos-fork` (M2 owner) · **참조 리포**: `storeport` · **work-queue.md**: #7c

## 0. 요약 (1 줄)

**api.meros.id · admin.meros.id 둘 다 `/health` 에서 `version: 946d31cd` 반환 · storeport main (`946d31c` · #191 · #192 · #193 포함) 과 정확히 일치. 재배포 필요 없음. Sentry commerce-core 프로젝트 1 시간 신규 에러 0건.**

## 1. 배포 커밋 ↔ main 대조

| 항목 | 값 | 출처 |
|------|----|------|
| storeport `origin/main` tip | **`946d31c`** | `git log --oneline origin/main -1` |
| 포함 PR | **#193 (M0-1105-K)** · **#192 (M0-1105-H)** · **#191 (M0-1105-C/E/F/G)** | `git log --grep=#191\|#192\|#193` 3건 모두 매치 |
| api.meros.id `/health.version` | **`946d31cd`** | `curl -sS https://api.meros.id/health` |
| admin.meros.id `/health.version` | **`946d31cd`** | `curl -sS https://admin.meros.id/health` |
| **매치 여부** | ✅ **일치** (`946d31c` 가 짧은 sha · `946d31cd` 가 8자리 · 같은 커밋) | — |
| uptime | api `295s` · admin `309s` (약 5 분 전 배포됨) | `/health.uptime_s` |
| db 상태 | `ok: true` (양쪽) | `/health.db.ok` |
| HTTP 헤더 | `Server: railway-hikari` · `x-railway-edge: sin1` | Railway Singapore edge · 응답 정상 |

### 보조 검증 · admin 탭 제목 (M0-1105-K 지속 적용)

```
$ curl -sS https://admin.meros.id/app | grep '<title>'
<title>Meros Admin</title>
$ curl -sS https://admin.meros.id/app/login | grep '<title>'
<title>Meros Admin</title>
```

`<title>Meros Admin</title>` 유지 → M0-1105-K (#193) 의 "permanent Meros Admin tab title" 패치가 실제 산출물에 반영됨. Playwright headless 불필요 — curl 로 확정.

## 2. Railway 자동 배포 상태

- `/health` 가 `version: 946d31cd` 로 응답 · uptime 5 분 → Railway 가 **main push 를 자동 pickup 하여 재시작 완료**.
- 실패 로그 확인 불필요 (현 revision 이 main tip 과 일치 · db ok).
- **Kyu 액션 필요 없음**.

## 3. Sentry (commerce-core = storeport 배포 프로젝트) 최근 1 시간

```
project : commerce-core
window  : 1h
errors  : 0
```

(curiocity-devai org 에 "storeport" 라는 Sentry 프로젝트 없음 · commerce-core 가 storeport `/apps/commerce-core` 의 배포 대응 프로젝트.)

링크 (Sentry 대시보드): https://curiocity-devai.sentry.io/explore/discover/homepage/?dataset=errors&queryDataset=error-events&project=4512372377256016&statsPeriod=1h

## 4. Kyu 할 일

**없음.** 서버 배포는 main tip 과 일치 · DB 정상 · Sentry 조용 · 모바일 앱의 실기 테스트 (M2-1105-H runbook · `docs/testing/native-sim.md`) 진행 가능.

재배포가 필요해졌을 경우 참고 (처음 하는 사람 기준):
1. Railway 대시보드 → storeport 프로젝트 → Deployments 탭
2. 최신 커밋이 `946d31c` 보다 뒤면 자동 배포됨 (GitHub push → Railway webhook)
3. 수동 트리거: "Redeploy" 버튼 (최상단 빌드의 ⋯ 메뉴)
4. `/health.version` 이 새 커밋 sha 로 바뀌었는지 확인 (~2 분 소요)

## 5. 참고

- storeport main: https://github.com/CuriocityDevAi/storeport/commit/946d31c
- PR #191: https://github.com/CuriocityDevAi/storeport/pull/191
- PR #192: https://github.com/CuriocityDevAi/storeport/pull/192
- PR #193: https://github.com/CuriocityDevAi/storeport/pull/193
- api health: `GET https://api.meros.id/health` → `{"ok":true,"version":"946d31cd","uptime_s":295,"db":{"ok":true}}`
- admin health: `GET https://admin.meros.id/health` → `{"ok":true,"version":"946d31cd","uptime_s":309,"db":{"ok":true}}`
- admin login HTML: `<title>Meros Admin</title>` 확인

---

**본 라운드는 read-only 진단 · 커밋/푸시/배포 액션 0.**
