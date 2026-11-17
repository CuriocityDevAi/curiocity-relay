#170 APPROVE · 네이티브 위험 없음

## 측정 결과

### vitest (단위 테스트)
- 41 test files, 494 passed | 6 expected fail | 2 todo — **전부 통과**

### Playwright 어설션 스크립트 (M1-1117-D-measure.spec.ts)
초회 실행 FAIL — Playwright `reuseExistingServer: !CI` 설정이 이전 실행의 stale `serve dist` 프로세스(PID 59883, 포트 4321)를 재사용해 구버전 dist를 서빙 중이었음. 프로세스 종료 후 재빌드된 dist로 재실행:

```
=== iPad 1180×820 ===
| button    | height | borderRadius | paddingTop | paddingBottom |
|-----------|--------|--------------|------------|---------------|
| Pay       | 58     | 12px         | 16px       | 16px          |
| Takeaway  | 58     | 12px         | 16px       | 16px          |
| Pre-order | 58     | 12px         | 16px       | 16px          |
| Delivery  | 58     | 12px         | 16px       | 16px          |

=== 화면 분할 590×820 ===
(동일 — 모두 58px · 12px)
```

**2 passed** · 높이 차 0 · 라운딩 차 0 ✓

## 코드 변경 검토

### 변경 파일 3개
- `components/ui/Button.tsx` — `BUTTON_ROUNDED='rounded-xl'`, `BUTTON_H='min-h-[3.625rem]'` 상수 추출·export. Button 자신도 이 토큰 사용.
- `components/ui/OptionChip.tsx` — tab 변종: `rounded-lg`+조건부`py-6` → `BUTTON_H+BUTTON_ROUNDED+BUTTON_PY` 공유 토큰으로 교체.
- `e2e/flows/M1-1117-D-measure.spec.ts` — 어설션 스크립트 추가.
- 결제 로직 파일 미변경 ✓

### 핵심 수정 내용
| 항목 | 전(OptionChip tab) | 후(OptionChip tab) | Pay 버튼 |
|------|-------------------|-------------------|---------|
| border-radius | `rounded-lg` (8px) | `BUTTON_ROUNDED` = `rounded-xl` (12px) | `rounded-xl` (12px) |
| paddingVertical | `py-6` (sublabel 없을 때) or `py-4` | `BUTTON_PY` = `py-4` 항상 | `py-4` |
| minHeight | 없음 | `BUTTON_H` = `min-h-[3.625rem]` (58px) | `min-h-[3.625rem]` (58px) |

## 네이티브(iPad) 위험 분석

**#165 에서 같은 버그가 재발한 이유 추정:**  
#165 는 조건부 `py-6` (sublabel 없을 때 Takeaway에만 적용) 를 미처 제거하지 못했거나, 웹에서는 맞는 것처럼 보였지만 `rounded-lg` vs `rounded-xl` 차이가 남아 있었을 가능성이 높음.

**PR #170의 네이티브 안전성:**

1. **동일 문자열 상수 공유** — `BUTTON_ROUNDED`, `BUTTON_H`, `BUTTON_PY` 는 Button.tsx 에서 export된 단일 string 리터럴. OptionChip이 import해 같은 값을 사용. NativeWind는 같은 클래스 문자열 → 같은 StyleSheet 엔트리 → 런타임에 완전히 동일한 스타일. 별도 복사본 없음.

2. **`rounded-xl` = 0.75rem = 12px** — Tailwind spacing에서 rem이 아닌 고정 값(0.75rem)으로 처리되므로 웹/네이티브 동일.

3. **`py-4` = space-4 = 1rem = 16px** — NativeWind 빌드 타임에 16px으로 컴파일. 런타임 rem 기준 불일치 없음.

4. **`min-h-[3.625rem]` = 3.625 × 16 = 58px** — NativeWind v4 빌드 타임 컴파일. `minHeight: 58`. React Native Yoga의 border-box 모델로 `border-2`(2px×2=4px) 포함 총 58px 보장. Pay 버튼(no border, minHeight:58) 과 동일한 렌더링 높이.

5. **조건부 로직 완전 제거** — 기존 `sublabel ? BUTTON_PY : 'py-6'` 삭제. tab 변종은 항상 같은 세 토큰만 사용. 웹/네이티브 분기 없음.

**잔류 위험: 없음.**

## 판정

**APPROVE** — 2/2 웹 어설션 통과, 네이티브 위험 없음. 공유 토큰 접근이 조건부 로직 의존 방식 대비 근본적으로 더 안전.
