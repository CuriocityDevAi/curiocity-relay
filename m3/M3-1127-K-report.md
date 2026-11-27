# M3-1127-K Report

PASS

## PR

| 리포 | PR | head 커밋 |
|------|-----|-----------|
| agilo-medusa-pos-fork | [#291](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/291) | `2e1804f` |
| storeport | [#476](https://github.com/CuriocityDevAi/storeport/pull/476) | `5e997cd` |

## 기술 선택

- **엣지 띠(띠)**: `Animated.View` + `PanResponder`(native) / `setPointerCapture`(web) 드래그. 절반 초과 당기면 `store.open()`. 주황선 깜빡임은 `Animated.sequence` 1회.
- **코너 스냅**: 드래그 release 시 `Math.hypot`으로 가장 가까운 코너 계산, 60px 이내면 스냅.
- **모서리 리사이즈**: `resizeRef` 웹 pointer 이벤트로 `customW`(px) 직접 조절. S/M/L 클릭 시 `customW: null` 초기화해 비율 유지.
- **?mirror=1 URL**: pos-m3 `MIRROR_URL` → `${MEROS_CD_WEB_URL}?mirror=1`. storeport `_layout.tsx`에서 `isMirrorRequested()` 감지 → `router.replace('/mirror')` (bootCheck 없이).
- **Eye 버튼 삭제**: `SellTopBar.tsx`에서 Eye import·버튼·`useCdPreviewStore` 의존 제거.

## ci-summary

테스트 로컬: 92 파일 · 1215 통과 · 0 실패. CI push 후 상태 미확인 (오케가 확인).
