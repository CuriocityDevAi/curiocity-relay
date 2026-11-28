PASS https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46102037222

## 충돌 해결 요약

| 파일 | 충돌 종류 | 해결 방법 |
|---|---|---|
| `__tests__/m3-1127-k-cd-preview-edge.test.ts` | add/add × 2 | our K 취함 — 테스트 ⑤⑧ 양쪽 보존 |
| `components/cd-preview/CdPreviewEdgeStrip.tsx` | add/add × 6 | our K 취함 (TOKEN_ACCENT, 한글) — M 커밋이 재적용해 최종 BRAND_AMBER·영어 |
| `components/cd-preview/CdPreviewOverlay.tsx` | content × 1 | our K 취함 (다중행 JSX) |
| `components/cd-preview/CdPreviewWindow.tsx` | content × 7 | our K 취함 (import 블록 K 상태로 직접 재작성 포함) |

- L 커밋(`spec-guard` 100→60px)은 `already upstream` — git이 자동 drop (master에 이미 포함)
- rebase 후 master 대비 차이: `__tests__/m3-1127-k-cd-preview-edge.test.ts` 한 파일만 (테스트 ⑤⑧ 추가)

## 보존 확인

- **#294 N fix 보존**: `CustomerPhoneStatus.tsx:106` → `{numLabel ? <Text className="text-sm text-ink-muted">{`${numLabel} · `}</Text> : null}` ✓
- **#291 미리보기 띠·미러창**: CdPreviewEdgeStrip, CdPreviewWindow, CdPreviewOverlay 모두 최종 BRAND_AMBER·영어 상태 유지 ✓

## e2e 결과

- run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46102037222
- storeport SHA: `9cd3bc5541191e6d81804628e96da81dc914acdd`
- 케이스: case1·case1b·sequential → **success** (3:16~3:20, 약 4분)

## check:pr 결과

- PASS: 머지여부 / master 충돌 / lint / 단위테스트 (1230 passed)
- FAIL: typecheck — 오류 모두 pre-existing (master 동일), 우리 커밋 무관
