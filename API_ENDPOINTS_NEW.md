# Artify 프론트엔드 개발 가이드

> **백엔드 배포 완료**: 2026-01-08
> **API 베이스 URL**: `https://api.artify.page`
> **API 문서**: [https://api.artify.page/docs](https://api.artify.page/docs)

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [인증 플로우](#2-인증-플로우)
3. [API 엔드포인트](#3-api-엔드포인트)
4. [프론트엔드 구현 예시](#4-프론트엔드-구현-예시)
5. [환경 설정](#5-환경-설정)
6. [주요 기능 구현 가이드](#6-주요-기능-구현-가이드)

---

## 1. 프로젝트 개요

### Artify란?

웹사이트를 업로드하면 자동으로 서브도메인으로 배포하고, Google Analytics 4와 히트맵 분석을 제공하는 서비스입니다.

### 핵심 기능

- ✅ **Google OAuth 2.0 로그인**
- ✅ **웹사이트 배포**: URL 크롤링 또는 ZIP 파일 업로드
- ✅ **서브도메인 자동 할당**: `{subdomain}.artify.page`
- ✅ **GA4 자동 주입**: 모든 배포된 사이트에 자동으로 Google Analytics 추적 코드 삽입
- ✅ **히트맵 추적**: 클릭 X/Y 좌표 수집
- ✅ **대시보드**: GA4 데이터 + 히트맵 데이터 시각화

### 백엔드 기술 스택

- FastAPI (Python)
- MongoDB
- Google OAuth 2.0
- Google Analytics Data API (GA4)
- Caddy (리버스 프록시 + HTTPS)

---

## 2. 인증 플로우

### 2.1 Google OAuth 2.0 로그인

**전체 흐름**:

```
1. 사용자가 "Google로 로그인" 버튼 클릭
   ↓
2. 프론트에서 https://api.artify.page/api/auth/google/login 로 리디렉션
   ↓
3. Google 로그인 페이지로 이동
   ↓
4. 사용자 인증 후 https://api.artify.page/api/auth/google/callback 으로 콜백
   ↓
5. 백엔드가 JWT 토큰 발급 후 프론트로 리디렉션
   ↓
6. 프론트에서 토큰 저장 (localStorage/sessionStorage)
```

**프론트엔드 구현**:

```javascript
// 로그인 버튼 클릭 시
function loginWithGoogle() {
  window.location.href = 'https://api.artify.page/api/auth/google/login';
}

// 콜백 페이지에서 토큰 추출
// URL: https://artify.page?access_token=eyJhbGc...
const urlParams = new URLSearchParams(window.location.search);
const accessToken = urlParams.get('access_token');

if (accessToken) {
  localStorage.setItem('access_token', accessToken);
  // 대시보드로 리디렉션
  window.location.href = '/dashboard';
}
```

### 2.2 인증된 요청 보내기

모든 API 요청에 `Authorization` 헤더 추가:

```javascript
const token = localStorage.getItem('access_token');

fetch('https://api.artify.page/api/projects', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

### 2.3 현재 사용자 정보 조회

```javascript
async function getCurrentUser() {
  const token = localStorage.getItem('access_token');

  const response = await fetch('https://api.artify.page/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.ok) {
    const user = await response.json();
    return user;
    // {
    //   "id": "677e1234567890abcdef1234",
    //   "email": "user@example.com",
    //   "name": "홍길동",
    //   "picture": "https://lh3.googleusercontent.com/...",
    //   "tier": "FREE",
    //   "created_at": "2026-01-01T00:00:00Z"
    // }
  }
}
```

---

## 3. API 엔드포인트

### 3.1 인증 관련

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/auth/google/login` | Google OAuth 로그인 시작 |
| GET | `/api/auth/google/callback` | OAuth 콜백 (자동 처리) |
| GET | `/api/auth/me` | 현재 사용자 정보 조회 |

### 3.2 프로젝트 관리

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/projects/from-url` | URL 크롤링으로 프로젝트 생성 |
| POST | `/api/projects/upload-zip` | ZIP 파일 업로드로 프로젝트 생성 |
| GET | `/api/projects` | 프로젝트 목록 조회 |
| GET | `/api/projects/{project_id}` | 특정 프로젝트 조회 |
| PUT | `/api/projects/{project_id}` | 프로젝트 수정 |
| DELETE | `/api/projects/{project_id}` | 프로젝트 삭제 |

### 3.3 분석 (Analytics)

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/analytics/summary/{project_id}?days=30` | GA4 전체 통계 요약 |
| GET | `/api/analytics/page/{project_id}?page_path=/index.html&days=30` | 페이지별 상세 분석 |
| GET | `/api/analytics/realtime/{project_id}` | 실시간 사용자 수 |
| GET | `/api/analytics/heatmap/{project_id}?page_path=/index.html&days=30` | 히트맵 클릭 데이터 |

### 3.4 정적 파일 서빙

배포된 사이트는 자동으로 서브도메인으로 접근 가능:

- `https://{subdomain}.artify.page`

---

## 4. 프론트엔드 구현 예시

### 4.1 URL로 프로젝트 생성

```javascript
async function createProjectFromUrl(name, sourceUrl, customSubdomain) {
  const token = localStorage.getItem('access_token');

  const response = await fetch('https://api.artify.page/api/projects/from-url', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: name,
      source_url: sourceUrl,
      custom_subdomain: customSubdomain,
      description: "프로젝트 설명 (선택사항)"
    })
  });

  if (response.ok) {
    const project = await response.json();
    console.log(`배포 완료: https://${project.subdomain}.artify.page`);
    return project;
  } else {
    const error = await response.json();
    console.error('프로젝트 생성 실패:', error.detail);
  }
}

// 사용 예시
createProjectFromUrl(
  "내 포트폴리오",
  "https://example.com",
  "myportfolio"
);
```

### 4.2 ZIP 파일로 프로젝트 생성

```javascript
async function createProjectFromZip(file, name, subdomain) {
  const token = localStorage.getItem('access_token');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);
  formData.append('subdomain', subdomain);
  formData.append('description', '프로젝트 설명');

  const response = await fetch('https://api.artify.page/api/projects/upload-zip', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Content-Type은 자동으로 multipart/form-data로 설정됨
    },
    body: formData
  });

  if (response.ok) {
    const project = await response.json();
    console.log(`배포 완료: https://${project.subdomain}.artify.page`);
    return project;
  } else {
    const error = await response.json();
    console.error('업로드 실패:', error.detail);
  }
}

// HTML 파일 업로드 폼
// <input type="file" id="zipFile" accept=".zip">
const fileInput = document.getElementById('zipFile');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    await createProjectFromZip(file, "내 웹사이트", "mysite");
  }
});
```

### 4.3 프로젝트 목록 조회

```javascript
async function getProjects() {
  const token = localStorage.getItem('access_token');

  const response = await fetch('https://api.artify.page/api/projects', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.ok) {
    const data = await response.json();
    return data.projects;
    // [
    //   {
    //     "id": "677e9876543210fedcba9876",
    //     "name": "내 포트폴리오",
    //     "subdomain": "myportfolio",
    //     "full_domain": "myportfolio.artify.page",
    //     "source_type": "URL",
    //     "created_at": "2026-01-08T10:00:00Z"
    //   },
    //   ...
    // ]
  }
}
```

### 4.4 GA4 통계 조회

```javascript
async function getAnalyticsSummary(projectId, days = 30) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(
    `https://api.artify.page/api/analytics/summary/${projectId}?days=${days}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (response.ok) {
    const stats = await response.json();
    return stats;
    // {
    //   "total_visitors": 15234,
    //   "total_page_views": 45678,
    //   "total_sessions": 23456,
    //   "daily_average": 1522.6,
    //   "avg_session_time": 245.5,
    //   "bounce_rate": 45.2,
    //   "mobile_ratio": 65.3,
    //   "desktop_ratio": 30.2,
    //   "tablet_ratio": 4.5,
    //   "top_pages": [...],
    //   "traffic_sources": [...],
    //   "geography": [...]
    // }
  }
}
```

### 4.5 히트맵 데이터 조회

```javascript
async function getHeatmapData(projectId, pagePath, days = 30) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(
    `https://api.artify.page/api/analytics/heatmap/${projectId}?page_path=${encodeURIComponent(pagePath)}&days=${days}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (response.ok) {
    const heatmap = await response.json();
    return heatmap;
    // {
    //   "total_clicks": 1523,
    //   "clicks": [
    //     {
    //       "x": 450,
    //       "y": 320,
    //       "page_path": "/index.html",
    //       "timestamp": "2026-01-08T10:30:00Z"
    //     },
    //     ...
    //   ]
    // }
  }
}
```

---

## 5. 환경 설정

### 5.1 프론트엔드 환경 변수

`.env` 파일 생성:

```bash
# API 베이스 URL
VITE_API_BASE_URL=https://api.artify.page
REACT_APP_API_BASE_URL=https://api.artify.page  # React의 경우
NEXT_PUBLIC_API_BASE_URL=https://api.artify.page  # Next.js의 경우

# OAuth 리디렉션 URL (프론트엔드 URL)
VITE_FRONTEND_URL=https://artify.page
```

### 5.2 Axios 인터셉터 설정 (권장)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.artify.page',
});

// 요청 인터셉터: 모든 요청에 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 401 에러 시 로그인 페이지로 리디렉션
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

사용 예시:

```javascript
import api from './api';

// 프로젝트 목록 조회
const response = await api.get('/api/projects');
const projects = response.data.projects;

// 프로젝트 생성
const newProject = await api.post('/api/projects/from-url', {
  name: "내 사이트",
  source_url: "https://example.com",
  custom_subdomain: "mysite"
});
```

---

## 6. 주요 기능 구현 가이드

### 6.1 대시보드 화면 구성

**필수 컴포넌트**:

1. **프로젝트 목록 카드**
   - 프로젝트 이름
   - 서브도메인 (클릭 시 새 탭에서 열기)
   - 배포 날짜
   - 편집/삭제 버튼

2. **프로젝트 생성 모달**
   - 탭 1: URL 입력
   - 탭 2: ZIP 파일 업로드
   - 서브도메인 입력 (중복 체크)

3. **분석 대시보드**
   - 전체 방문자 수
   - 페이지뷰
   - 평균 세션 시간
   - 이탈률
   - 디바이스 비율 (모바일/데스크톱/태블릿) - 파이 차트
   - 인기 페이지 목록 - 테이블
   - 트래픽 소스 - 바 차트
   - 지역별 방문자 - 지도 또는 테이블

4. **히트맵 시각화**
   - 라이브러리 추천: `heatmap.js`, `h337`
   - 페이지 스크린샷 위에 히트맵 오버레이
   - 클릭 좌표 기반 히트맵 렌더링

### 6.2 React 예시 코드

```jsx
// Dashboard.jsx
import React, { useState, useEffect } from 'react';
import api from './api';

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/api/projects');
      setProjects(response.data.projects);
    } catch (error) {
      console.error('프로젝트 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>로딩 중...</div>;

  return (
    <div>
      <h1>내 프로젝트</h1>
      <button onClick={() => window.location.href = '/create-project'}>
        새 프로젝트 만들기
      </button>

      <div className="project-grid">
        {projects.map(project => (
          <div key={project.id} className="project-card">
            <h3>{project.name}</h3>
            <a href={`https://${project.full_domain}`} target="_blank" rel="noopener noreferrer">
              {project.full_domain}
            </a>
            <p>배포일: {new Date(project.created_at).toLocaleDateString()}</p>
            <button onClick={() => window.location.href = `/analytics/${project.id}`}>
              분석 보기
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
```

```jsx
// Analytics.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from './api';

function Analytics() {
  const { projectId } = useParams();
  const [stats, setStats] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [projectId, days]);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get(`/api/analytics/summary/${projectId}?days=${days}`);
      setStats(response.data);
    } catch (error) {
      console.error('분석 데이터 로드 실패:', error);
    }
  };

  if (!stats) return <div>로딩 중...</div>;

  return (
    <div>
      <h1>프로젝트 분석</h1>

      <select value={days} onChange={(e) => setDays(e.target.value)}>
        <option value="7">최근 7일</option>
        <option value="30">최근 30일</option>
        <option value="90">최근 90일</option>
      </select>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>총 방문자</h3>
          <p>{stats.total_visitors.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>페이지뷰</h3>
          <p>{stats.total_page_views.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>평균 세션 시간</h3>
          <p>{Math.round(stats.avg_session_time)}초</p>
        </div>
        <div className="stat-card">
          <h3>이탈률</h3>
          <p>{stats.bounce_rate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="device-ratio">
        <h3>디바이스 비율</h3>
        <p>모바일: {stats.mobile_ratio.toFixed(1)}%</p>
        <p>데스크톱: {stats.desktop_ratio.toFixed(1)}%</p>
        <p>태블릿: {stats.tablet_ratio.toFixed(1)}%</p>
      </div>

      <div className="top-pages">
        <h3>인기 페이지</h3>
        <table>
          <thead>
            <tr>
              <th>페이지</th>
              <th>조회수</th>
              <th>방문자</th>
            </tr>
          </thead>
          <tbody>
            {stats.top_pages.map((page, idx) => (
              <tr key={idx}>
                <td>{page.path}</td>
                <td>{page.views.toLocaleString()}</td>
                <td>{page.users.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Analytics;
```

### 6.3 히트맵 시각화 예시

```jsx
// Heatmap.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import h337 from 'heatmap.js';
import api from './api';

function Heatmap() {
  const { projectId } = useParams();
  const [pagePath, setPagePath] = useState('/index.html');
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchHeatmapData();
  }, [projectId, pagePath, days]);

  const fetchHeatmapData = async () => {
    try {
      const response = await api.get(
        `/api/analytics/heatmap/${projectId}?page_path=${encodeURIComponent(pagePath)}&days=${days}`
      );

      const heatmapData = response.data.clicks.map(click => ({
        x: click.x,
        y: click.y,
        value: 1
      }));

      // heatmap.js로 히트맵 렌더링
      const heatmapInstance = h337.create({
        container: document.getElementById('heatmap-container')
      });

      heatmapInstance.setData({
        max: 10,
        data: heatmapData
      });
    } catch (error) {
      console.error('히트맵 데이터 로드 실패:', error);
    }
  };

  return (
    <div>
      <h1>히트맵 분석</h1>

      <select value={pagePath} onChange={(e) => setPagePath(e.target.value)}>
        <option value="/index.html">/index.html</option>
        <option value="/about.html">/about.html</option>
      </select>

      <select value={days} onChange={(e) => setDays(e.target.value)}>
        <option value="7">최근 7일</option>
        <option value="30">최근 30일</option>
      </select>

      <div id="heatmap-container" style={{ width: '100%', height: '600px', position: 'relative' }}>
        {/* 페이지 스크린샷 또는 iframe */}
      </div>
    </div>
  );
}

export default Heatmap;
```

---

## 7. 에러 처리

### 7.1 공통 에러 코드

| 상태 코드 | 의미 | 처리 방법 |
|----------|------|----------|
| 400 | 잘못된 요청 | 요청 데이터 확인 |
| 401 | 인증 실패 | 로그인 페이지로 리디렉션 |
| 403 | 권한 없음 | 권한 안내 메시지 표시 |
| 404 | 리소스 없음 | 404 페이지 표시 |
| 500 | 서버 에러 | 에러 메시지 표시, 재시도 버튼 |

### 7.2 에러 처리 예시

```javascript
async function handleApiCall() {
  try {
    const response = await api.get('/api/projects');
    return response.data;
  } catch (error) {
    if (error.response) {
      // 서버가 응답했지만 에러 코드 반환
      switch (error.response.status) {
        case 401:
          alert('로그인이 필요합니다.');
          window.location.href = '/login';
          break;
        case 404:
          alert('프로젝트를 찾을 수 없습니다.');
          break;
        case 500:
          alert('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
          break;
        default:
          alert(error.response.data.detail || '오류가 발생했습니다.');
      }
    } else if (error.request) {
      // 요청은 보냈지만 응답이 없음
      alert('네트워크 연결을 확인해주세요.');
    } else {
      // 요청 설정 중 에러 발생
      alert('요청 중 오류가 발생했습니다.');
    }
  }
}
```

---

## 8. 배포 전 체크리스트

- [ ] Google OAuth 로그인 구현
- [ ] JWT 토큰 관리 (저장/갱신/삭제)
- [ ] 프로젝트 생성 (URL/ZIP)
- [ ] 프로젝트 목록 조회
- [ ] 프로젝트 삭제
- [ ] GA4 분석 대시보드
- [ ] 히트맵 시각화
- [ ] 에러 처리
- [ ] 로딩 상태 표시
- [ ] 반응형 디자인
- [ ] CORS 설정 확인

---

## 9. 참고 자료

### API 문서

- **Swagger UI**: [https://api.artify.page/docs](https://api.artify.page/docs)
- **상세 API 명세**: `API_ENDPOINTS.md` 참고

### 백엔드 아키텍처

- `ARCHITECTURE_DECISION.md` - 기술 결정 사항 및 구현 세부 정보

### 라이브러리 추천

- **차트**: Chart.js, Recharts, Victory
- **히트맵**: heatmap.js, h337
- **HTTP 클라이언트**: Axios, Fetch API
- **상태 관리**: React Query, SWR, Zustand

### Google Analytics 4

- [GA4 공식 문서](https://developers.google.com/analytics/devguides/reporting/data/v1)

---

## 10. 문의

백엔드 관련 문의사항이 있으면 백엔드 담당자에게 연락하거나 `ARCHITECTURE_DECISION.md` 문서를 참고해주세요.

**백엔드 배포 완료일**: 2026-01-08
**프로덕션 환경**: 완료 ✅
