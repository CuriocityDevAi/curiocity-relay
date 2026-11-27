# iMac 무거운 CI 워커 2개 증설 의사결정

**작성**: M2-1126-T · 2026-11-26  
**상태**: 측정 대기 — A는 실측 수치 없으면 착지 아님

---

## 배경

Kyu 22:47: "아이맥의 CI 무거운잡 워커를 더 늘리는건 어떻게 생각해?"  
Kyu 22:49: "그래 이렇게 하는게 더 좋겠다" (무거운 워커 2개로 늘려 메모리 실측 · 넘칠 곳 MBP · 대기열 줄이기 점검)

**아이맥 사양**: M1 · 메모리 16 GB  
**무거운 잡 구성**: PostgreSQL 16(로컬) + Playwright Chromium

---

## 1. 현재 메모리 기준선 (mem-log 실측 — MacBook 러너)

> ⚠️ 아래 수치는 MacBook(M1 · 16GB)의 mem-log.ndjson (status/runners/mem-log.ndjson).  
> 아이맥 전용 CI 기계는 별도 측정 필요.

| 날짜 | 최대 used_gb | swap_used_gb 범위 | 압력 |
|------|-------------|-------------------|------|
| 2026-11-18 | 15.93 | 6.4 – 9.4 GB | normal |
| 2026-11-19 | 15.93 | 7.0 – 11.3 GB | normal |
| 2026-11-25 | 15.94 | 3.5 – 4.2 GB | normal |
| 2026-11-26 | 15.93 | 2.6 – 6.3 GB | normal |

**해석**: MacBook은 CI 러너 외에도 개발 작업으로 15+ GB를 항상 사용. iMac 전용 CI 기계는 baseline이 훨씬 낮을 것으로 예상(macOS 시스템 ~4–6 GB).

---

## 2. 아이맥 메모리 측정 방법 (Kyu 실행 명령)

CI 무거운 잡 1개 실행 중(GitHub Actions heavy job running) 아이맥에서 실행:

```bash
while true; do
  vm_stat | awk '
    /Pages free/     { free=$3 }
    /Pages active/   { active=$3 }
    /Pages inactive/ { inactive=$3 }
    /Pages wired/    { wired=$3 }
    /Pages occupied/ { compressed=$3 }
    END {
      pgsize=16384
      total=free+active+inactive+wired+compressed
      printf "free=%.1fGB active=%.1fGB inactive=%.1fGB wired=%.1fGB compressed=%.1fGB\n",
        free*pgsize/1073741824, active*pgsize/1073741824,
        inactive*pgsize/1073741824, wired*pgsize/1073741824,
        compressed*pgsize/1073741824
    }
  ' | tr -d '.'
  sysctl vm.swapusage | awk '{print "swap: " $4 " / " $7}'
  sleep 10
done
```

또는 간단히:
```bash
while true; do memory_pressure; sysctl vm.swapusage | grep -o 'used = [0-9.]*M'; sleep 15; done
```

**판정 기준**: 2개 동시 실행 중 swap < 2 GB → 안전 / swap > 4 GB or pressure=warn → 보류

---

## 3. 포트 충돌 분석

### Postgres (port 5432)
- 각 job이 `storeport_ci_${run_id}` 고유 DB 이름 사용
- **충돌 없음** — 동일 포트, 다른 DB로 격리

### Playwright (port 5173)
- `apps/commerce-core/playwright.config.ts` line 17: `baseURL: "http://localhost:5173"` **하드코딩**
- `webServer.url` 도 `http://localhost:5173` 고정
- 2개 heavy job 동시 실행 시 → 2번째 Vite 서버가 `EADDRINUSE: address already in use :::5173` 에러

**해결 방법** (별도 storeport PR):
```typescript
// apps/commerce-core/playwright.config.ts
const PORT = Number(process.env.CI_VITE_PORT ?? 5173);
export default defineConfig({
  webServer: {
    command: `npx vite --config e2e/vite.config.ts --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    // ...
  },
  use: { baseURL: `http://localhost:${PORT}` },
});
```
storeport#464 · fork#278 머지 후 다음 라운드에서 진행.

### Customer Display E2E (port 4173)
- `apps/customer-display/e2e/playwright.config.ts`: `CD_E2E_PORT ?? 4173`
- 환경변수로 이미 파라미터화 → **충돌 없음**

---

## 4. setup.sh 변경 초안 (M2-1126-T)

다음 슬롯 추가:
- `sp-heavy2` → `ci-box-storeport-heavy2-<host>` (label: `curiocity-mac`, 동일 큐 공유)
- `fork-heavy2` → `ci-box-fork-heavy2-<host>` (label: `curiocity-mac-fork`, 동일 큐 공유)

각 슬롯은 별도 디렉토리(`~/actions-runner-ci-box-sp-heavy2`, `~/actions-runner-ci-box-fork-heavy2`)를 가지므로 workspace 격리 자동 보장.

**전제 조건**:
1. iMac 메모리 실측 → swap < 2 GB 확인
2. storeport Vite 포트 하드코딩 수정 (별도 PR)

---

## 5. 결정 (pending)

| 항목 | 상태 |
|------|------|
| 메모리 실측 | ⏳ 대기 — 아이맥에서 heavy job 중 측정 필요 |
| Playwright 포트 충돌 수정 | ⏳ 대기 — storeport#464·fork#278 머지 후 |
| setup.sh 2번째 heavy 등록 | 초안 완료 — 위 2개 완료 후 착지 |

**착지 시점**: 측정 결과 swap < 2 GB & Playwright 포트 수정 PR 머지 후 Kyu 판단.
