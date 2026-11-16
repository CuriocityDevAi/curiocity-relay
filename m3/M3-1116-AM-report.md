DONE — Order type 버튼 py-4(Pay 동일 토큰) + 뱃지 톱니 왼쪽 배치 완료, 타입체크 pre-existing 오류만, Vitest 27/27 통과.

## 변경 파일

| 파일 | 변경 |
|------|------|
| `components/ui/OptionChip.tsx` | tab+sublabel → py-4(Button p-4 동일), sublabel 인라인 렌더(`· DP today`) |
| `components/loyalty/CustomerDisplayStatus.tsx` | mr-2 제거 (headerRight 컨테이너가 gap-3으로 간격 담당) |
| `app/checkout/[draftOrderId].tsx` | headerRight: 뱃지(왼쪽) + 설정 톱니(오른쪽), mr-3 외부 여백 |

## REQ 검증

- **REQ 1** ✅ Order type 버튼 `py-4` = Pay 버튼 `p-4`의 y축 토큰 공유
- **REQ 2** ✅ sublabel 인라인 (`· DP today`, `· Addr. on checkout`), 선택 상태(체크+차콜) 유지
- **REQ 3** ✅ 뱃지 왼쪽, 톱니 오른쪽, gap-3 간격. "Customer Display Offline" 긴 문구 잘림 없음
- **REQ 4** ✅ Cash/Card/QRIS tab variant(sublabel 없음) py-6 유지, Pay 버튼 미수정

## 자기 검증

- Playwright 스크린샷: **미실행(미검증)** — 빌드 환경 미비
- Vitest: 27/27 통과
- TypeScript: pre-existing 오류만(FlashList estimatedItemSize, split-pending pending_amount 등) — 신규 오류 없음

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/165
