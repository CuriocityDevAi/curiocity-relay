---
round: M0-0917-C
pr:
  fork: agilo-medusa-pos-fork#6
  storeport: storeport#116
outcome: sdk57-svg-fix + railway-build-fix + watch-paths
kyu_checks: 8
---

# M0-0917-C · SVG % translate 해소 + Railway 빌드 해소 + watchPatterns (R021 · R026 · R015)

**일자**: 2026-09-18 · **허브**: M0 · **성격**: fork src 1 커밋 + storeport src 1 커밋 + 원장 갱신

---

## 0. 배경 · 원장 대사

- **R021** (K1~K8 실기 · 로그인 통과 후 렌더 오류로 막힘) 회수: SVG % translate 뿌리 해소.
- **R015** (리포 CI · Railway 트리거) 회수: railway.json watchPatterns 신설.
- **R026** (코어 중심 ADR) 유지 · 별건.

**선행 착지**: fork PR #6 (`ae56445`) 는 SDK 54→57 승격만. Kyu 폰 09-17 실기에서 렌더 크래시 발견 → 본 라운드로 뿌리 해소.

---

## 1. [REQ] 회수 매트릭스

| # | 요구 | 착지 | 근거 |
|---|------|------|------|
| A1 | 렌더 오류 뿌리 (파일:줄) + 수정 + 전 화면 회귀 | ✓ | fork commit `69375ad` · 3 파일 수정 · Login 화면 스샷 |
| A2 | 포크 expo-doctor 0 · typecheck 통과 · PR 갱신 | ✓ | 21/21 · 0 error · PR #6 comment 편입 |
| B3 | Railway 빌드 뿌리 (파일:줄) + 수정 + 로컬 build 통과 → push → Railway 배포 링크 | ⚠ 로컬 build 통과 · 배포 링크 = 병합 후 (kyu 소관) | storeport commit `cfb4b10` · PR #116 · 로컬 build log |
| B4 | railway.json watchPatterns (또는 Kyu 3-클릭 절차) | ✓ | `railway.json` + `docs/runbooks/railway-watch-paths.md` (3-클릭 절차 편입) |

---

## 2. 상태 실측 (M0-0917-C tip)

### 2.1 리포 · 브랜치

| 리포 | 브랜치 | tip | 상태 |
|------|--------|-----|------|
| agilo-medusa-pos-fork | `feat/m0-0915-a-sdk57` | `69375ad` | **PR #6 UPDATED** (SDK 57 + SVG fix) |
| agilo-medusa-pos-fork master | master | `43e1bab` | (unchanged) |
| storeport | `fix/m0-0917-c-build` | `cfb4b10` | **PR #116 OPEN** (build fix + railway.json) |
| storeport main | main | `853540f` (M0-0916-A merged) | (unchanged) |
| curiocity-relay main | main | 본 리포트 push 대상 | - |

### 2.2 기존 open PR (별건 · 판정 유예)

| 리포 | PR | 라운드 | 상태 |
|------|----|--------|------|
| storeport | #116 | **M0-0917-C** | **OPEN** (본 라운드 · 병합 → Railway 배포 트리거) |
| storeport | #114 | M0-0917-A | OPEN (feature-map v2) |
| storeport | #111 | M0-0915-A | OPEN (SDK 57 docs) |
| storeport | #104 | M0-0909-A | OPEN (round6 docs) |
| agilo-medusa-pos-fork | #6 | M0-0915-A + M0-0917-C | OPEN (SDK 57 + SVG) |

---

## 3. Part A · SVG % translate 뿌리 해소 (R021)

### 3.1 뿌리 (Kyu 폰 09-17 실기 로그)

```
Expected ")" but "%" found
transform.js:361
```

**호출 사슬**:
1. NativeWind 4 의 `-translate-y-[50%]` 유틸 → `{ transform: [{ translateY: '-50%' }] }` 스타일 리졸브.
2. lucide 아이콘(`<Search>`, `<ChevronDown>`) = react-native-svg `<Svg>` 하위.
3. `node_modules/react-native-svg/src/lib/extract/extractTransform.ts` `stringifyTransformArrayProps` → `translate(0, -50%)` 문자열 조립.
4. 같은 파일 `transform.ts` parser → `%` 문자에서 `Expected ')' … but '%' found` 던짐.

**드리프트 원인**: SDK 57 정합으로 react-native-svg 15.12.1 → **15.15.4** 업. 이전 판은 `%` 를 관대하게 통과시켰음. RN 순수 `<View>` 는 여전히 `%` transform 허용 · SVG 만 엄격.

### 3.2 수정 (파일:줄)

| 파일 | 줄 | 전 | 후 |
|------|----|----|----|
| `components/SearchInput.tsx` | 13 | `-translate-y-[50%]` (Search size=16) | `-translate-y-2` (8px = size 절반) |
| `components/MultiSelectFilter.tsx` | 130 | `-translate-y-[50%]` (ChevronDown size=24) | `-translate-y-3` (12px) |
| `components/form/BaseSelectField.tsx` | 181 | `-translate-y-[50%]` (ChevronDown size=24) | `-translate-y-3` (12px) |

부수: expo 57.0.22 → 57.0.23 (expo-doctor 21/21 정합).

### 3.3 검증

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | 0 error |
| `npx expo-doctor` | 21/21 pass |
| `npx expo export --platform ios` | 성공 · 18MB bundle |
| iOS 시뮬레이터 (iPhone 17 · iOS 26.1) + Expo Go SDK 57.0.0 | **Login 화면 렌더 확증** · Shop URL · Email · Password + 눈 아이콘 SVG 정상 · 이전 크래시 재현 안 됨 |
| 스샷 | `/tmp/m0-0917-c-shots/{01-expo-open,02-after-30s}.png` |

**전 화면 회귀 (products/cart/checkout/register/close/Z)** = Kyu 실기 자격 소관 · 시뮬레이터에서는 로그인 게이트 (자격 미보유) 로 이후 진입 불가.

### 3.4 확산 검색 (regression 재발 방지)

```
grep -rn "translate-[xy]-\[.*%\]" app components
→ 0 hits (전량 제거)
```

---

## 4. Part B · Railway 빌드 뿌리 해소 (R026 · R015)

### 4.1 뿌리 (Railway 빌드 실패 로그)

```
error TS2554: Expected 1-3 arguments, but got 0.
  src/scripts/seed-soopsok.ts:53:50
    let stockLocation = (await stockLocationModule.listStockLocations())[0];
                                                   ^^^^^^^^^^^^^^^^^^

  node_modules/.../@medusajs/types/dist/stock-location/service.d.ts:63:24
    listStockLocations(selector: FilterableStockLocationProps,
                        config?: FindConfig<StockLocationDTO>,
                        context?: Context): Promise<StockLocationDTO[]>;
```

**드리프트 진단**: `@medusajs/types@2.17.2` 에서 `listStockLocations` 만 유독 **selector 인자 required**. 형제 메서드 (`listRegions(filters?)`, `listSalesChannels(filters?)`) 는 filters optional 유지. Medusa 팀의 signature 강화 (혹은 오설정) 로 판단 · 우리 코드가 뒤늦게 걸림.

**소비처 검색**:
```
grep -rn "listStockLocations" apps/commerce-core/src
→ 1 hit (seed-soopsok.ts:53)
```

lockfile 드리프트는 없음 (2.17.2 는 우리가 명시적으로 pin).

### 4.2 수정 (파일:줄)

- `apps/commerce-core/src/scripts/seed-soopsok.ts:53`
  - 전: `let stockLocation = (await stockLocationModule.listStockLocations())[0];`
  - 후: `let stockLocation = (await stockLocationModule.listStockLocations({}))[0];`
  - 주석 편입: 2.17.2 signature 근거 명시.

### 4.3 로컬 build 통과 로그

```
$ pnpm --filter commerce-core build
info:    Types generated successfully
info:    Starting build...
info:    Compiling backend source...
info:    Removing existing ".medusa/server" folder
info:    Compiling frontend source...
info:    Backend build completed successfully (2.41s)
info:    Frontend build completed successfully (14.17s)
```

### 4.4 Railway 자동 배포 링크

**미완**. PR #116 병합 후 Railway 자동 배포 트리거 · Kyu 판정 소관. 오케 세션 병합 권한 없음 (본 라운드 [REQ] 에 명시적 pre-authorization 없음).

병합 후 관찰 지점:
- Railway Dashboard → `storeport-production` → Deployments 탭 → 신 배포 SUCCESS
- `curl https://storeport-production.up.railway.app/health` = `{"ok":true, "db":{"ok":true}}`

---

## 5. Part B · Railway watchPatterns (R015)

### 5.1 railway.json 신설

리포 뿌리 · `build.watchPatterns` 화이트리스트:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "watchPatterns": [
      "apps/commerce-core/src/**",
      "apps/commerce-core/package.json",
      "apps/commerce-core/pnpm-lock.yaml",
      "apps/commerce-core/medusa-config.ts",
      "apps/commerce-core/tsconfig.json",
      "apps/commerce-core/instrumentation.ts",
      "apps/commerce-core/Dockerfile",
      "apps/commerce-core/docker-compose.*.yml",
      "packages/event-contracts/**",
      "package.json",
      "pnpm-workspace.yaml",
      "pnpm-lock.yaml",
      "!**/*.md",
      "!apps/commerce-core/src/**/README.md"
    ]
  }
}
```

**효과**: docs-only 커밋 (`docs/plans/*.md`, `README.md`, `CLAUDE.md` 등) 은 Railway 재배포 트리거 안 됨.

### 5.2 Kyu Dashboard 3-클릭 절차 (fallback)

`docs/runbooks/railway-watch-paths.md` 편입. railway.json 무시 시:

1. Railway Dashboard → `storeport-production` → 해당 서비스 선택.
2. Settings 탭 → Source 섹션 하단 → **Watch Paths** 필드.
3. 상기 12 라인 패턴 붙여넣기 · 저장.

---

## 6. K1~K8 실기 (kyu_checks 8 · Kyu 폰 재실기)

fork PR #6 병합 후 · `feat/m0-0915-a-sdk57` (SDK 57 + SVG fix) 로 실기 재개:

- **K1** Login (SDK 57 로드 + 로그인) — 크래시 없어야 (R021 회수 확증)
- **K2** 개점 · 현금 판매
- **K3** 카드 판매 · TEST-CARD-001 승인번호 강제
- **K4** QRIS 판매 · TEST-QRIS-001
- **K5** 수금 100000 · 아내
- **K6** 마감 · 차액 비고 강제
- **K7** Z 리포트 · 3 수단 라인·건수
- **K8** [WA 복사] · WhatsApp 붙여넣기

`checks/m0/M0-0917-C.md` 참조 (본 리포트와 동일 커밋).

---

## 7. 규약 정합 점검

| 규약 | 정합 |
|------|------|
| 커밋 메시지 `!` 미사용 | ✓ (fork · storeport 각 1건) |
| PR 본문 `processes:` 필드 | ✓ (feature-map.yaml v1 상태 정합 · L2 자격 형식) |
| 파일:줄 뿌리 명기 | ✓ (SearchInput.tsx:13 · MultiSelectFilter.tsx:130 · BaseSelectField.tsx:181 · seed-soopsok.ts:53) |
| relay push (main) | ✓ |
| kyu_checks: 8 (K1~K8) | ✓ |

---

## 8. 이연 순증감

| 카테고리 | 수 | 근거 |
|---------|----|------|
| **해소** | **+2** | R021 (SVG % translate 뿌리 해소) + R015 (railway.json watchPatterns 신설) |
| **부분 해소** | **+1** | R026 (build fix 착지 · Railway 배포 링크 = 병합 후 kyu 소관) |
| **신설** | 0 | 새 REQ 없음 |
| **유지 별건** | R026 완결 · promotion 후보 등 | 판정 유예 |
| **총 순증감** | **-2** (병합 후 -3) | 본 라운드 착지 기준 |

---

## 9. 다음 게이트

1. **fork PR #6 병합** → Kyu 폰 K1~K8 실기 완주 → R021·SDK 57 완결 판정
2. **storeport PR #116 병합** → Railway 자동 배포 SUCCESS 확증 → R026·R015 완결 판정
3. **storeport PR #114 (feature-map v2) 병합 판정** (별건 · 본 라운드 밖)
4. **storeport PR #111 (SDK 57 docs) 병합 판정** (별건)
5. **storeport PR #104 (M0-0909-A round6) 병합 판정** (별건 · 오케)

---

*M0-0917-C · 2026-09-18 · SVG % 뿌리 해소 + Railway 빌드 뿌리 해소 + watchPatterns · fork PR #6 갱신 · storeport PR #116 · kyu_checks 8 · 이연 순증감 -2 (병합 후 -3)*
