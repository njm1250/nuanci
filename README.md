<div align="center">

<img src=".github/readme/banner.webp" alt="nuanci 로고와 '직역하면 사고 나는 순간들' 문구, 픽셀 무대·장면 플레이·유형 결과 화면" width="100%">

짧은 장면을 보고 영어 표현을 골라 보세요.<br>
말 한마디에 상대 반응이 달라져요.

<br>

**[바로 해 보기](https://nuanci.app)** · **[유형 테스트](https://nuanci.app/test)**

<sub>가입 없이 바로 · 한 장면에 1분</sub>

</div>

<br>

<div align="center">
  <h3>이 말, 영어로 통할까?</h3>
  <p>콘센트, 사이다, 물은 셀프.<br>영어인 줄 알고 쓴 말이 상대에게 어떻게 들리는지 무대 위에서 바로 보여요.</p>
  <img src=".github/readme/stage-demo.gif" alt="픽셀 무대 데모: 영어 말실수에 상대가 놀라는 장면이 이어지는 화면" width="76%">
</div>

<br>

<div align="center">
  <h3>골라 보면 알아요</h3>
  <p>고른 말에 따라 상대의 표정과 속마음이 달라져요.<br>왜 그렇게 들리는지 확인하고, 다른 말도 눌러 볼 수 있어요.<br>영하 100도 버티기, 잠자기 대회 같은 5화 연속 병맛 장면도 있어요.</p>
  <img src=".github/readme/play.gif" alt="장면 플레이: 'Where's the consent?'를 고르자 상대가 놀라고 사고 발생 도장이 찍힌 뒤, 'Is there an outlet I can use?'를 고르는 화면" width="36%">
</div>

<br>

<div align="center">
  <h3>영어 사고 유형 테스트</h3>
  <p>8문제, 문제당 10초.<br>내가 자주 치는 사고가 9가지 유형 중 하나로 나오고, 결과는 친구와 비교할 수 있어요.</p>
  <img src=".github/readme/type-test.gif" alt="유형 테스트: 제한 시간 안에 답을 고르며 문제를 넘기는 화면" width="30%">
  <img src=".github/readme/test-result.webp" alt="유형 결과: 예스 노 반대형 고양이 캐릭터와 고치는 한 줄이 있는 카드" width="30%">
</div>

<br>

<div align="center">
  <h3>표현 모음 · 전체 장면 · 아지트</h3>
  <p>해 본 장면의 표현은 모아서 복습하고<br>장면을 하며 얻은 물건으로 내 캐릭터와 방을 꾸며요.</p>
  <img src=".github/readme/expressions.webp" alt="표현 모음: 장면별로 묶은 영어 표현 목록" width="28%">
  <img src=".github/readme/scenes.webp" alt="전체 장면: 무대 썸네일이 있는 화별 장면 목록과 진행 상태" width="28%">
  <img src=".github/readme/room.webp" alt="아지트: 픽셀 방에 있는 캐릭터와 옷장, 방 꾸미기 메뉴" width="28%">
</div>

<br>

## 기술 스택

| | |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4, three.js, React Three Fiber |
| **Backend** | Kotlin, Spring Boot 4, Spring Data JPA, Flyway, Testcontainers |
| **Database** | PostgreSQL 17 |
| **Infra** | Vercel, AWS Lightsail, Docker Compose, Caddy, GitHub Actions |

## 아키텍처

```mermaid
flowchart LR
  user["브라우저"] --> web["Next.js<br>Vercel"]
  web -->|"/api 프록시"| caddy["Caddy<br>Lightsail"]
  caddy --> api["Spring Boot"]
  api --> db[("PostgreSQL")]
  api <-->|로그인| google["Google OAuth"]
  gha["GitHub Actions"] -.->|배포| web
  gha -.->|배포| api
```

<details>
<summary><b>이렇게 만들었어요</b></summary>

<br>

- **픽셀 무대:** three.js 장면을 고정된 가로 픽셀 수로 그려서, 화면 크기가 달라도 도트 밀도가 같아요.
- **빠른 첫 화면:** 무대는 글자와 버튼이 뜬 뒤 따로 불러와요.
- **장면 관리:** 장면은 코드가 아니라 DB에 버전별로 저장해요. 새 장면은 초안으로 들어가고 관리자 화면에서 검수해요.
- **연속 장면:** 다음 장면은 전체 장면 순서를 그대로 따라가요. 예고 문구와 묶음은 장면 데이터로 정해요.
- **효과음:** 음원 파일 없이 Web Audio로 그때그때 만들어요.
- **공유 카드:** 장면과 유형 결과마다 Open Graph 이미지를 코드로 그려요.
- **지표:** 크롤러와 자동화 브라우저는 이용 지표에서 빼요.

</details>

<details>
<summary><b>프로젝트 구조</b></summary>

<br>

```text
.
├── frontend/src/
│   ├── app/                 # Next.js 라우트, 폰트, 전역 스타일
│   └── features/            # 기능별 코드
│       ├── scene/           # 장면 플레이
│       ├── stage/           # 픽셀 무대와 캐릭터
│       ├── landing/         # 홈, 데모, 장면 목록
│       ├── typetest/        # 영어 사고 유형 테스트
│       ├── collection/      # 표현 모음
│       ├── review/          # 오늘의 복습
│       ├── rewards/         # 보상 물건
│       ├── account/         # 로그인, 내 정보, 아지트
│       ├── share/           # 공유 카드
│       └── site/            # 머리줄, 전체 메뉴, 화면 틀
├── backend/src/main/
│   ├── kotlin/com/nuanci/   # scene, account, reward, streak, review, event, metrics, admin ...
│   └── resources/db/migration/   # Flyway 마이그레이션
├── scripts/                 # 로컬 실행, 배포, 장면 업로드
├── compose.yaml             # 로컬 PostgreSQL
└── compose.prod.yaml        # 운영 서버 구성
```

</details>
