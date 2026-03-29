# Harness Validation Plan

이 문서는 생성된 하네스의 구조, 트리거, 실행 흐름을 검증하기 위한 기준이다.

## 구조 체크

- `agents/` 에 역할 파일이 모두 존재하는가
- `.agents/skills/` 의 각 `SKILL.md` frontmatter 가 유효한가
- `_workspace/` 산출물 경로 규칙이 문서화되어 있는가

## should-trigger 예시

- "풀스택 랜딩 페이지 하네스 구성해줘"
- "와이어프레임부터 배포까지 조율하는 React/Next.js 팀 구조를 만들어줘"
- "API, 프론트, QA를 나눠서 쓰는 Codex용 하네스 짜줘"
- "로컬 스킬과 에이전트 정의를 포함한 웹앱 개발 체계를 만들어줘"
- "배포 URL 보고까지 포함하는 멀티 에이전트 플레이북이 필요해"

## should-not-trigger 예시

- "현재 브랜치 상태 알려줘"
- "README 오타 하나만 고쳐줘"
- "오늘 날짜 알려줘"
- "package.json 버전만 올려줘"
- "이 함수 설명해줘"

## with-skill vs baseline 비교 계획

- with-skill:
  - `agents/`, `.agents/skills/`, `_workspace/` 를 모두 읽은 뒤 하네스 설계 요청 수행
- baseline:
  - 아무 로컬 하네스 파일 없이 같은 요청 수행

## 기대 차이

- with-skill 은 역할 파일, 스킬 파일, `_workspace/` 플레이북까지 구조화해 제안해야 한다.
- baseline 보다 산출물 위치와 오케스트레이션 규칙이 더 구체적이어야 한다.

## QA 포함 여부

- 포함한다
- 이유:
  - 풀스택 웹사이트 파이프라인은 UI와 API 경계면 검증이 핵심이기 때문
  - 배포 전 실제 접속 주소 확인까지 포함해야 릴리스 품질이 안정되기 때문
