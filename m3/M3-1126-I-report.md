OK — https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/275

## 원인

- **로딩**: `snapshot` null이면 `/mirror` 페이지에 `pos-mirror` 이벤트 미발송 → CD 자체 `Loading…` 대기 무한 지속; `onError` 미처리로 URL 오류 시도 무한 로딩. → mount 시 15s 타임아웃 + `onError` → 오류 오버레이 + "다시 시도", snapshot null 시 `{pos_screen:'sell'}` 아이들 이벤트 발송.
- **드래그**: `PanResponder`가 웹 환경에서 pointer capture 없이 동작해 커서가 핸들 밖으로 나가면 이벤트 추적 중단. → `Platform.OS === 'web'` 분기 후 `setPointerCapture` + DOM pointer event 리스너 직접 등록.

## Playwright E2E 결과 (3/3 통과, 19.9s)

```
✓ loading state transitions: Loading… disappears within 20s
✓ X button touch area ≥ 44px  (Pressable 44×44 원형 어설션 통과)
✓ mouse drag: window follows cursor  (dx ≥50px, dy ≥20px 어설션 통과)
```

스크린샷: e2e/screenshots/M3-1126-I-loading-transition.png (오류 전환 확인) · M3-1126-I-close-btn-44.png · M3-1126-I-drag-moved.png
