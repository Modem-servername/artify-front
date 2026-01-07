# ARTIFY Analytics

웹사이트 분석을 위한 올인원 대시보드 솔루션입니다. 정적 사이트를 업로드하거나 URL을 연결하여 방문자 행동, 전환율, 기술 스택 등 다양한 인사이트를 실시간으로 확인할 수 있습니다.

## 주요 기능

### 사이트 연결

- **파일 업로드**: ZIP 파일로 정적 사이트 업로드 (최대 50MB)
- **URL 연결**: 기존 사이트 URL 입력으로 빠른 미리보기

### 대시보드

- **개요 (Overview)**: 핵심 지표 요약, 방문자 추이, AI 인사이트
- **행동 분석 (Behavior)**: 페이지뷰, 체류 시간, 이탈률, 히트맵
- **유입 분석 (Acquisition)**: 트래픽 채널, 검색 키워드, 지역별 분포
- **기술 (Tech)**: 디바이스, 브라우저, 운영체제 통계
- **전환 (Conversion)**: 퍼널 분석, 전환율 추적
- **성능 (Performance)**: 페이지 로드 속도, Core Web Vitals

### 추가 기능

- 기간별 데이터 필터링 (일/주/월/연)
- PDF 리포트 내보내기
- AI 기반 자동 인사이트 생성
- 구독 플랜 관리 (Free / Pro / Enterprise)

## 기술 스택

| 분류      | 기술                    |
| --------- | ----------------------- |
| Framework | React 19, Vite 6        |
| Language  | TypeScript 5.8          |
| Styling   | Tailwind CSS 3.4        |
| Charts    | Recharts 3.6            |
| Icons     | Lucide React            |
| AI        | Google Generative AI    |
| Payments  | Stripe                  |

## 설치

### 요구 사항

- Node.js 18.x 이상
- npm 또는 yarn

### 설치 명령어

```bash
# 저장소 클론
git clone <repository-url>
cd next_front

# 의존성 설치
npm install
```

## 환경 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 환경 변수를 설정합니다:

```env
# Google Gemini API (AI 인사이트용)
GEMINI_API_KEY=your_gemini_api_key

# Stripe (결제 기능용, 선택사항)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### API 키 발급

- **Gemini API**: [Google AI Studio](https://ai.google.dev/)에서 발급
- **Stripe**: [Stripe Dashboard](https://dashboard.stripe.com/)에서 발급

## 스크립트

```bash
# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과물 미리보기
npm run preview
```

## 프로젝트 구조

```text
next_front/
├── App.tsx              # 메인 애플리케이션 컴포넌트
├── types.ts             # TypeScript 타입 정의
├── constants.ts         # 상수 및 목업 데이터
├── components/
│   ├── Sidebar.tsx      # 사이드바 네비게이션
│   ├── MetricCard.tsx   # 지표 카드 컴포넌트
│   ├── ReportModal.tsx  # 리포트 모달
│   └── Billing.tsx      # 결제 관련 컴포넌트
├── services/
│   └── insightGenerator.ts  # AI 인사이트 생성
├── src/
│   ├── main.tsx         # 앱 진입점
│   └── main.css         # 글로벌 스타일
└── public/              # 정적 파일
```

## 배포

### Vercel (권장)

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel
```

환경 변수는 Vercel 대시보드에서 설정:

- Project Settings > Environment Variables

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# 이미지 빌드
docker build -t artify-analytics .

# 컨테이너 실행
docker run -p 80:80 artify-analytics
```

### 정적 호스팅 (Netlify, GitHub Pages 등)

```bash
# 빌드
npm run build

# dist/ 폴더를 호스팅 서비스에 업로드
```

## 라이선스

MIT License
