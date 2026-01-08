# Artify API 엔드포인트 명세서

**버전**: 1.0
**베이스 URL**: `http://localhost:10000` (개발), `https://api.artify.page` (프로덕션)
**인증 방식**: Bearer Token (JWT)

---

## 목차

1. [인증 (Authentication)](#1-인증-authentication)
2. [사용자 관리 (Users)](#2-사용자-관리-users)
3. [프로젝트 관리 (Projects)](#3-프로젝트-관리-projects)
4. [분석 (Analytics)](#4-분석-analytics)
5. [서브도메인 호스팅](#5-서브도메인-호스팅)

---

## 1. 인증 (Authentication)

### 1.1 Google OAuth 로그인

**Endpoint**: `GET /api/auth/google/login`

**설명**: Google OAuth 인증 페이지로 리디렉션

**요청**:

```http
GET /api/auth/google/login
```

**응답**: Google OAuth 페이지로 302 리디렉션

---

### 1.2 Google OAuth 콜백

**Endpoint**: `GET /api/auth/google/callback`

**설명**: Google OAuth 인증 후 콜백 처리 및 JWT 토큰 발급

**요청**:

```http
GET /api/auth/google/callback?code=AUTH_CODE&state=STATE
```

**응답**:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

### 1.3 현재 사용자 정보 조회

**Endpoint**: `GET /api/auth/me`

**설명**: 현재 로그인한 사용자 정보 조회

**인증**: 필요 (Bearer Token)

**요청**:

```http
GET /api/auth/me
Authorization: Bearer {access_token}
```

**응답**:

```json
{
  "id": "677e1234567890abcdef1234",
  "email": "user@example.com",
  "name": "홍길동",
  "picture": "https://lh3.googleusercontent.com/...",
  "tier": "FREE",
  "created_at": "2026-01-01T00:00:00Z",
  "last_login": "2026-01-08T10:30:00Z"
}
```

---

## 2. 사용자 관리 (Users)

### 2.1 사용자 정보 수정

**Endpoint**: `PUT /api/users/me`

**설명**: 현재 사용자의 정보 수정

**인증**: 필요

**요청**:

```http
PUT /api/users/me
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "새로운 이름"
}
```

**응답**:

```json
{
  "id": "677e1234567890abcdef1234",
  "email": "user@example.com",
  "name": "새로운 이름",
  "picture": "https://lh3.googleusercontent.com/...",
  "tier": "FREE",
  "created_at": "2026-01-01T00:00:00Z",
  "last_login": "2026-01-08T10:30:00Z"
}
```

---

## 3. 프로젝트 관리 (Projects)

### 3.1 URL로 프로젝트 생성

**Endpoint**: `POST /api/projects/from-url`

**설명**: 웹사이트 URL을 크롤링하여 프로젝트 생성

**인증**: 필요

**요청**:

```http
POST /api/projects/from-url
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "내 포트폴리오",
  "source_url": "https://example.com",
  "description": "개인 웹사이트입니다",
  "custom_subdomain": "myportfolio"  // 선택 사항
}
```

**응답**:

```json
{
  "id": "677e9876543210fedcba9876",
  "name": "내 포트폴리오",
  "description": "개인 웹사이트입니다",
  "source_type": "URL",
  "source_url": "https://example.com",
  "subdomain": "myportfolio",
  "full_domain": "myportfolio.artify.page",
  "ga_tracking_id": "G-KZP1DVY0K0",
  "created_at": "2026-01-08T10:00:00Z",
  "updated_at": "2026-01-08T10:00:00Z"
}
```

---

### 3.2 ZIP 파일로 프로젝트 생성

**Endpoint**: `POST /api/projects/upload-zip`

**설명**: ZIP 파일을 업로드하여 프로젝트 생성

**인증**: 필요

**요청**:

```http
POST /api/projects/upload-zip
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

file: [ZIP 파일]
name: "내 웹사이트"
subdomain: "mysite"
description: "프로젝트 설명"  // 선택 사항
```

**응답**:

```json
{
  "id": "677e9876543210fedcba9876",
  "name": "내 웹사이트",
  "description": "프로젝트 설명",
  "source_type": "ZIP",
  "source_url": null,
  "subdomain": "mysite",
  "full_domain": "mysite.artify.page",
  "ga_tracking_id": "G-KZP1DVY0K0",
  "created_at": "2026-01-08T10:00:00Z",
  "updated_at": "2026-01-08T10:00:00Z"
}
```

---

### 3.3 프로젝트 목록 조회

**Endpoint**: `GET /api/projects`

**설명**: 현재 사용자의 모든 프로젝트 목록 조회

**인증**: 필요

**요청**:

```http
GET /api/projects
Authorization: Bearer {access_token}
```

**응답**:

```json
{
  "projects": [
    {
      "id": "677e9876543210fedcba9876",
      "name": "내 포트폴리오",
      "description": "개인 웹사이트입니다",
      "source_type": "URL",
      "source_url": "https://example.com",
      "subdomain": "myportfolio",
      "full_domain": "myportfolio.artify.page",
      "ga_tracking_id": "G-KZP1DVY0K0",
      "created_at": "2026-01-08T10:00:00Z",
      "updated_at": "2026-01-08T10:00:00Z"
    }
  ]
}
```

---

### 3.4 프로젝트 상세 조회

**Endpoint**: `GET /api/projects/{project_id}`

**설명**: 특정 프로젝트의 상세 정보 조회

**인증**: 필요

**요청**:

```http
GET /api/projects/677e9876543210fedcba9876
Authorization: Bearer {access_token}
```

**응답**:

```json
{
  "id": "677e9876543210fedcba9876",
  "name": "내 포트폴리오",
  "description": "개인 웹사이트입니다",
  "source_type": "URL",
  "source_url": "https://example.com",
  "subdomain": "myportfolio",
  "full_domain": "myportfolio.artify.page",
  "ga_tracking_id": "G-KZP1DVY0K0",
  "created_at": "2026-01-08T10:00:00Z",
  "updated_at": "2026-01-08T10:00:00Z"
}
```

---

### 3.5 프로젝트 삭제

**Endpoint**: `DELETE /api/projects/{project_id}`

**설명**: 프로젝트 및 관련 파일 삭제

**인증**: 필요

**요청**:

```http
DELETE /api/projects/677e9876543210fedcba9876
Authorization: Bearer {access_token}
```

**응답**:

```json
{
  "message": "Project deleted successfully",
  "success": true,
  "data": {
    "project_id": "677e9876543210fedcba9876"
  }
}
```

---

## 4. 분석 (Analytics)

### 4.1 전체 통계 요약 (GA4)

**Endpoint**: `GET /api/analytics/summary/{project_id}`

**설명**: Google Analytics 4에서 수집된 전체 통계 데이터 조회

**인증**: 필요

**파라미터**:

- `days` (선택, 기본값: 30): 조회 기간 (일)

**요청**:

```http
GET /api/analytics/summary/677e9876543210fedcba9876?days=30
Authorization: Bearer {access_token}
```

**응답**:

```json
{
  "total_visitors": 1250,
  "total_page_views": 5430,
  "total_sessions": 1680,
  "daily_average": 181.0,
  "avg_session_time": 245.5,
  "bounce_rate": 42.3,
  "mobile_ratio": 65.2,
  "desktop_ratio": 32.1,
  "tablet_ratio": 2.7,
  "device_breakdown": {
    "mobile": {
      "users": 815,
      "page_views": 3540
    },
    "desktop": {
      "users": 401,
      "page_views": 1740
    },
    "tablet": {
      "users": 34,
      "page_views": 150
    }
  },
  "top_pages": [
    {
      "path": "/index.html",
      "title": "Home",
      "views": 1250,
      "users": 890,
      "avg_time": 125.5
    },
    {
      "path": "/about.html",
      "title": "About",
      "views": 540,
      "users": 320,
      "avg_time": 98.2
    }
  ],
  "traffic_sources": [
    {
      "source": "google",
      "medium": "organic",
      "users": 450,
      "sessions": 620
    },
    {
      "source": "direct",
      "medium": "(none)",
      "users": 380,
      "sessions": 480
    }
  ],
  "geography": [
    {
      "country": "South Korea",
      "city": "Seoul",
      "users": 320
    },
    {
      "country": "United States",
      "city": "New York",
      "users": 125
    }
  ],
  "period_days": 30
}
```

**에러 응답**:

```json
{
  "detail": "GA4 not configured. Please set GA4_PROPERTY_ID in environment variables."
}
```

상태 코드: `503 Service Unavailable`

---

### 4.2 페이지별 상세 분석 (GA4)

**Endpoint**: `GET /api/analytics/page/{project_id}`

**설명**: 특정 페이지의 상세 통계 조회

**인증**: 필요

**파라미터**:

- `page_path` (필수): 페이지 경로 (예: "/index.html")
- `days` (선택, 기본값: 30): 조회 기간 (일)

**요청**:

```http
GET /api/analytics/page/677e9876543210fedcba9876?page_path=/index.html&days=30
Authorization: Bearer {access_token}
```

**응답**:

```json
{
  "page_path": "/index.html",
  "total_views": 1250,
  "unique_visitors": 890,
  "avg_time_on_page": 125.5,
  "bounce_rate": 35.2
}
```

---

### 4.3 실시간 사용자 수 (GA4)

**Endpoint**: `GET /api/analytics/realtime/{project_id}`

**설명**: 현재 활성 사용자 수 조회

**인증**: 필요

**요청**:

```http
GET /api/analytics/realtime/677e9876543210fedcba9876
Authorization: Bearer {access_token}
```

**응답**:

```json
{
  "active_users": 12,
  "timestamp": "2026-01-08T12:30:00Z"
}
```

---

### 4.4 히트맵 데이터 조회

**Endpoint**: `GET /api/analytics/heatmap/{project_id}`

**설명**: 페이지별 클릭 히트맵 데이터 조회 (자체 수집 데이터)

**인증**: 필요

**파라미터**:

- `page_path` (필수): 페이지 경로
- `days` (선택, 기본값: 30): 조회 기간 (일)

**요청**:

```http
GET /api/analytics/heatmap/677e9876543210fedcba9876?page_path=/index.html&days=30
Authorization: Bearer {access_token}
```

**응답**:

```json
{
  "page_path": "/index.html",
  "total_clicks": 450,
  "clicks": [
    {
      "x": 320,
      "y": 150,
      "timestamp": "2026-01-08T10:30:00Z"
    },
    {
      "x": 450,
      "y": 280,
      "timestamp": "2026-01-08T10:31:15Z"
    },
    {
      "x": 320,
      "y": 155,
      "timestamp": "2026-01-08T10:32:45Z"
    }
  ]
}
```

---

### 4.5 히트맵 클릭 수집 (내부 API)

**Endpoint**: `POST /api/analytics/heatmap`

**설명**: 클라이언트에서 클릭 이벤트 수집 (호스팅된 웹사이트에서 자동 호출)

**인증**: 불필요 (Referer 헤더로 검증)

**요청**:

```http
POST /api/analytics/heatmap
Content-Type: application/json
Referer: https://mysite.artify.page/index.html

{
  "x": 320,
  "y": 150,
  "page": "/index.html",
  "timestamp": "2026-01-08T10:30:00Z"
}
```

**응답**:

```json
{
  "success": true
}
```

---

## 5. 서브도메인 호스팅

### 5.1 정적 파일 제공

**Endpoint**: `GET /sites/{subdomain}/{file_path}`

**설명**: 호스팅된 웹사이트의 정적 파일 제공

**인증**: 불필요

**요청**:

```http
GET /sites/myportfolio/index.html
```

**응답**: HTML 파일 내용 반환

**에러**:

- `404`: 프로젝트 또는 파일을 찾을 수 없음
- `403`: 디렉토리 트래버설 시도 차단

---

## 공통 응답 형식

### 성공 응답

```json
{
  // 엔드포인트별 데이터
}
```

### 에러 응답

```json
{
  "detail": "에러 메시지"
}
```

### HTTP 상태 코드

- `200 OK`: 요청 성공
- `201 Created`: 리소스 생성 성공
- `400 Bad Request`: 잘못된 요청 (유효성 검증 실패)
- `401 Unauthorized`: 인증 실패 (토큰 없음 또는 만료)
- `403 Forbidden`: 권한 없음
- `404 Not Found`: 리소스를 찾을 수 없음
- `409 Conflict`: 리소스 충돌 (예: 서브도메인 중복)
- `500 Internal Server Error`: 서버 에러
- `503 Service Unavailable`: 서비스 사용 불가 (예: GA4 미설정)

---

## 인증 헤더 형식

모든 인증이 필요한 엔드포인트는 다음 헤더를 포함해야 합니다:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Rate Limiting

현재 구현되지 않음. 향후 Phase 5에서 추가 예정.

---

## CORS 설정

허용된 Origin:

- `https://artify.page`
- `https://www.artify.page`
- `http://localhost:3000` (개발)
- `http://localhost:5173` (개발)

---

## 프론트엔드 통합 예시

### JavaScript (Fetch API)

```javascript
// 인증 토큰 저장
const token = localStorage.getItem('access_token');

// API 호출 헬퍼 함수
async function apiCall(endpoint, options = {}) {
  const response = await fetch(`http://localhost:10000${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }

  return response.json();
}

// 사용 예시
const summary = await apiCall('/api/analytics/summary/PROJECT_ID?days=30');
console.log(summary);
```

### React (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:10000',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});

// 사용 예시
const { data } = await api.get('/api/analytics/summary/PROJECT_ID', {
  params: { days: 30 }
});
console.log(data);
```

---

## 변경 이력

- **v1.0** (2026-01-08): 초기 버전 작성
  - 인증, 사용자, 프로젝트, 분석 API 추가
  - GA4 Data API 통합
  - 히트맵 수집 기능 추가

---

## 참고 문서

- [ARCHITECTURE_DECISION.md](ARCHITECTURE_DECISION.md) - 아키텍처 설계 문서
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - 기존 API 문서 (상세 버전)
