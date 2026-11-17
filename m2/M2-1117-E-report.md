# M2-1117-E 완료 판정

**판정**: PASS — 아이콘 A0(글자 없음·노란 바탕·각진 M) + 영수증 인쇄 애니메이션 구현 완료.  
**#324 rebase**: fix/m2-1117-b-responsive → feat/m2-1116-ak (7fb777a) 위로 rebase 완료. force-push 성공. 충돌 없음.

## 변경 범위

- `apps/customer-display/scripts/gen-icons.mjs` — 아이콘 A0 M 폴리곤(글자 제거) + receipt-anim.png 생성 추가
- `apps/customer-display/app.config.ts` — expo-splash-screen 플러그인 이미지 제거 (배경색만 유지)
- `apps/customer-display/src/components/SplashAnimation.tsx` — 프린터 막대 → 영수증 슬라이드(1.5s) → MEROS/Customer 페이드업(0.6s) → 첫 화면(0.2s)
- `apps/customer-display/app/_layout.tsx` — 콜드스타트 스플래시 오버레이 통합 (mock 모드 스킵)
- `apps/customer-display/e2e/splash-anim.spec.ts` — 프레임 스크린샷(5종) + 아이콘 치수 + 반응형 3뷰포트 테스트
- `docs/feature-map.yaml` — cd-splash 프로세스 등록
- `scripts/naming-check.sh` — SplashAnimation.tsx 예외 추가 (UI 텍스트 한정)

## 테스트 결과

- typecheck: 에러 0
- 테스트: 32 passed / 1 pre-existing fail (기존 미해결) / 8 skipped
- naming-check: PASS
- PR #318 업데이트 완료

## 커밋

feat/m2-1116-ak HEAD: 7fb777a  
fix/m2-1117-b-responsive HEAD (rebased): be0f79a
