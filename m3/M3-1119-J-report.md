# M3-1119-J 보고서

깔린 빌드 development·development·0.1.0 · 방법 OTA · 실행 O(update group 444fea1f-bf82-42ec-a16c-fcc82d5cf7b3) · 서버 반영 X(부분: Split View 20f0c71 O, Skip 서버 835a8a2 미배포)

---

## 1. 깔린 빌드 (eas build:list 결과)

| 항목 | 값 |
|------|-----|
| 최신 빌드 ID | 57711cf1-8765-4b07-9640-e5b523aa43fc |
| Profile | development |
| Channel | development |
| Runtime Version | 0.1.0 (appVersion policy) |
| App Version | 0.1.0 |
| Commit | 1e1bd3ec (11/17/2026 완료) |
| 배포 | internal (devClient = true) |

## 2. 방법 판단: OTA ✓

오늘 머지 커밋 변경 파일 분석:

**#392 Split View (20f0c71)**
- `apps/customer-display/src/screens/KeypadAfterScreen.tsx` — JS only
- `apps/customer-display/src/screens/ReceiptScreen.tsx` — JS only
- `apps/customer-display/e2e/responsive-M1-1119-F.spec.ts` — test only
- ⚠ app.config.ts orientation 변경(`landscape→default`) 시도 후 **원복됨** → 네이티브 변경 없음

**#389 Skip 서버 (835a8a2)**
- `apps/customer-display/app/index.tsx` — JS only
- `apps/customer-display/src/lib/snapshot-api.ts` — JS only
- `apps/customer-display/src/types/order-snapshot.ts` — TS types only
- `apps/commerce-core/...` — 서버 측 변경 (클라이언트 번들 무관)

**결론**: 네이티브 변경 없음 → runtimeVersion 0.1.0 유지 → OTA 가능.

## 3. OTA 실행 결과

```
Branch           development
Runtime version  0.1.0
Platform         ios
Update group ID  444fea1f-bf82-42ec-a16c-fcc82d5cf7b3
iOS update ID    01a1f2ef-bb39-7f81-b1e6-331dfeb18389
Message          11-19 split view + skip
Commit           835a8a21b06c3c4289ea0f045322fe71c5e96439  ← origin/main HEAD
```

EAS Dashboard: https://expo.dev/accounts/curiocity/projects/customer-display/updates/444fea1f-bf82-42ec-a16c-fcc82d5cf7b3

> ⚠ 참고: 실행 과정에서 잘못된 브랜치 코드(`1d68a69`, split view/skip 없음)로 먼저 발행됨 (update group 759bf713). 이후 올바른 origin/main(835a8a2)으로 재발행(444fea1f)하여 덮어씀. 최신 업데이트는 444fea1f가 맞음.

> 🔧 기술 비고: storeport는 pnpm 워크스페이스 사용 중이며, `babel-preset-expo`가 root node_modules에 호이스팅되지 않아 `eas update` 로컬 실행이 기본적으로 실패함. 임시 조치로 `apps/customer-display/node_modules/babel-preset-expo` → pnpm virtual store 심볼릭 링크 추가. 恒久 fix: `apps/customer-display/package.json`에 `babel-preset-expo`를 devDependency로 명시 추가 권장.

## 4. 서버 반영 확인

```bash
curl https://admin.meros.id/health
# → {"ok":true,"version":"20f0c714","uptime_s":1420,"db":{"ok":true}}
```

- 서버 현재 버전: `20f0c714` = commit `20f0c71...` (Split View #392 PR)
- Skip 서버 (#389, commit 835a8a2)는 **미배포** — railway 배포 대기 중
- 서버 반영: X (부분 — Split View O, Skip API X)

## 5. Kyu iPad 안내

### iPad 앱 업데이트 적용 방법

1. MEROS Customer 앱 완전히 종료 (홈 화면에서 스와이프 업 → 앱 카드 위로 플릭)
2. 앱 재시작 → Expo Updates가 백그라운드에서 OTA 다운로드
3. 앱 한 번 더 종료 후 재시작 → 새 번들 적용됨
   > Expo OTA는 "다음 시작 시 적용" 방식이므로 2회 재시작 필요

### Split View로 여는 법 (iPad)

1. POS 앱 실행 (전체 화면)
2. 화면 아래에서 독(Dock)이 보일 때까지 살짝 위로 스와이프
3. 독에서 MEROS Customer 앱 아이콘을 POS 화면 오른쪽 가장자리로 드래그
4. Split View 50:50 으로 고정 (구분선 드래그로 조정 가능)
   - 왼쪽: POS (Anchor)
   - 오른쪽: MEROS Customer Display

### 테스트 순서

| # | 행동 | 기대 결과 |
|---|------|-----------|
| 1 | POS에서 결제 흐름 시작 | POS 왼쪽 · 손님 화면 오른쪽 Split View 정상 표시 |
| 2 | POS "Ask phone on display" 도달 | 손님 화면에 키패드 표시 |
| 3 | 손님 화면에서 Skip 탭 | 손님 화면 → 초기 화면 복귀 |
| 4 | POS 확인 (10초 이내) | POS에 "Skipped" 배지 표시 |
| 5 | Orders 탭에서 해당 주문 확인 | 전화번호 연결 없음, 409 오류 없음 |

> ⚠ Skip 즉시 알림 기능(서버 PATCH)은 서버 835a8a2 배포 후 완전 동작. 현재 서버(20f0c71)에서는 Skip 감지가 polling 방식으로 약 10~30초 지연될 수 있음.

### 웹판 URL

손님 화면 웹버전: `https://admin.meros.id/customer-display-web/`
- Split View 변경 포함 (서버 20f0c71 배포됨)
- Skip 서버 아직 미배포
