R0-1123-A-report
#225: APPROVE · #411: APPROVE

---

## #225 `agilo-medusa-pos-fork` — 버튼 높이 통일 · 칩 넘침 · Next customer 잘림

**판정: APPROVE**  
GitHub 계정 제약(자기 PR)으로 APPROVE 이벤트 대신 COMMENT 이벤트로 리뷰 의견 제출.  
리뷰 URL: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/225

### 검토 근거

| 항목 | 결과 |
|---|---|
| CI (Lint · flow-tests · assertions · playwright) | ✅ all green · `8a92012` |
| Playwright 8/8 (M3-1121-B 6 + M3-1121-C 2) | ✅ CI 확인 · 로컬 미실행(미검증) |
| `RegisterBadge` 상태 표시 전용 분리 | ✅ |
| `products.tsx` Pickup·Close 행1 / Next customer 행2(풀폭) | ✅ M3-1121-C 측정 60px |
| `OptionChip` tab sublabel 2번째 줄 · 이중 렌더 없음 | ✅ |
| `checkout/[draftOrderId]` Split·Pay 높이 Hand over ±0px | ✅ |
| `success/[orderId]` windowWidth 고정 폭 제거 | ✅ |
| 하드코딩 색상 없음 | ✅ |
| Next customer 회귀 없음(§5 대체 예정) | ✅ |

### 미검증

- 로컬 Playwright 미실행 — CI `playwright ✅` (13m 24s) · 스크린샷 `e2e/screenshots/M3-1121-B/C-*.png` PR 첨부로 갈음.
- OPPO 실기 미확인 (기기 없음).

---

## #411 `storeport` — /admin/pos/registers/:id/snapshot id 접두어 분기

**판정: APPROVE** (feature-map.yaml 업데이트 권고 포함)  
GitHub 계정 제약으로 COMMENT 이벤트로 제출.  
리뷰 URL: https://github.com/CuriocityDevAi/storeport/pull/411

### 검토 근거

| 항목 | 결과 |
|---|---|
| CI (route · markers · changes-filter · heavy-mac) | ✅ all green · `3b90fe5` |
| integration-tests 5/5 | ✅ CI heavy-mac 12m 55s · 로컬 미실행(미검증) |
| `startsWith("sloc_")` 분기 — 외부 주입 없음 | ✅ |
| `rss_` 경로 하위 호환 | ✅ |
| 테스트 4) sloc_ → open session snapshot | ✅ register_id=sessionId 어설션 |
| 테스트 5) sloc_ + 세션 없음 → null 200 | ✅ |
| display-machine.ts / useDisplayMachine.ts 무변경 | ✅ |

### feature-map 봇 대응

`commerce-core.pos-register-snapshot` 상태 `planned → live` 승격 권고 (CI는 planned에서도 green).  
`docs/feature-map.yaml` 에서 `status: live` 로 변경 + route 파일 경로를 `files:` 목록에 추가 필요.  
이 PR 범위 밖이면 후속 작업 가능 — 머지 전 판단 요청.

### 미검증

- 로컬 integration-tests 미실행 — CI heavy-mac ✅ 로 갈음.
