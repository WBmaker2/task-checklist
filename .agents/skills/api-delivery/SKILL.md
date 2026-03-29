---
name: api-delivery
description: Design and implement backend or API slices for fullstack website delivery, including request and response contracts, auth, validation, and persistence notes. Trigger when endpoints or server logic are in scope.
---

# API Delivery

## 목표

- 프론트엔드가 안정적으로 붙을 수 있는 API 계약과 서버 구현을 만든다.

## 절차

1. 기능 요구에서 읽기, 쓰기, 인증, 오류 시나리오를 정리한다.
2. request, response, status code, validation 규칙을 문서화한다.
3. 데이터 저장, 캐시, 권한 경계를 명확히 적는다.
4. 구현 후 `_workspace/02_api_contracts.md` 와 `_workspace/02_backend_handoff.md` 에 결과를 남긴다.

## 출력

- 엔드포인트별 계약
- 에러 응답 규칙
- env 또는 secret 의존성
- 테스트 또는 스모크 명령

## 주의

- 프론트엔드가 필요로 하는 필드명을 임의 변경하지 않는다.
- 인증과 권한은 구현 디테일이 아니라 계약 일부로 본다.
