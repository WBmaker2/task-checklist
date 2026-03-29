---
name: design-wireframe
description: Convert a product brief into implementation-ready wireframes, screen states, and component mappings for fullstack website delivery. Trigger when a request starts from concept, requirements, or UX structure rather than code.
---

# Design Wireframe

## 목표

- 제품 요구를 화면 구조, 섹션 우선순위, 상태 정의로 바꾼다.
- 프론트엔드 워커가 바로 구현에 들어갈 수 있도록 핸드오프를 만든다.

## 절차

1. 핵심 사용자 목표와 1차 사용자 흐름을 짧게 정리한다.
2. 화면별 섹션 순서와 주요 상호작용을 정한다.
3. 빈 상태, 로딩, 오류, 성공 상태를 별도로 적는다.
4. 재사용 가능한 컴포넌트와 페이지 전용 컴포넌트를 나눈다.
5. `_workspace/01_design_wireframe.md` 와 `_workspace/01_design_component_map.md` 에 남긴다.

## 입력

- 사용자 요청
- 브랜드나 UI 제약
- 기존 레이아웃 또는 디자인 시스템

## 출력

- 화면별 구조
- 컴포넌트 목록
- 반응형 의도
- 콘텐츠 우선순위

## 주의

- 구현 불가능한 추상 표현보다 실제 컴포넌트 단위로 적는다.
- 애니메이션은 장식보다 의미 중심으로 제안한다.
