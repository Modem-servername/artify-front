/**
 * Artify API Service
 * 백엔드 API와 통신하는 서비스 모듈
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.artify.page';

// 토큰 관리
export const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token');
};

export const setAccessToken = (token: string): void => {
  localStorage.setItem('access_token', token);
};

export const removeAccessToken = (): void => {
  localStorage.removeItem('access_token');
};

// API 요청 헬퍼
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP Error: ${response.status}`);
  }

  return response.json();
}

// FormData용 API 요청 헬퍼 (파일 업로드)
async function apiRequestFormData<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const token = getAccessToken();

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP Error: ${response.status}`);
  }

  return response.json();
}

// ============ 인증 API ============

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  created_at: string;
  last_login?: string; // 선택적 필드
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export const authApi = {
  // Google OAuth 로그인 URL로 리디렉션
  loginWithGoogle: () => {
    window.location.href = `${API_BASE_URL}/api/auth/google/login`;
  },

  // 현재 사용자 정보 조회
  getCurrentUser: () => apiRequest<User>('/api/auth/me'),

  // 로그아웃
  logout: () => {
    removeAccessToken();
  },
};

// ============ 사용자 API ============

export interface UpdateUserRequest {
  name?: string;
}

export const userApi = {
  // 사용자 정보 수정
  updateUser: (data: UpdateUserRequest) =>
    apiRequest<User>('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============ 프로젝트 API ============

export interface Project {
  id: string;
  name: string;
  description: string | null;
  source_type: 'URL' | 'ZIP';
  source_url: string | null;
  subdomain: string;
  full_domain: string;
  ga_tracking_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  projects: Project[];
}

export interface CreateProjectFromUrlRequest {
  name: string;
  source_url: string;
  description?: string;
  custom_subdomain?: string;
}

export interface DeleteProjectResponse {
  message: string;
  success: boolean;
  data: {
    project_id: string;
  };
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  custom_subdomain?: string;
}

export const projectApi = {
  // URL로 프로젝트 생성
  createFromUrl: (data: CreateProjectFromUrlRequest) =>
    apiRequest<Project>('/api/projects/from-url', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ZIP 파일로 프로젝트 생성
  createFromZip: (file: File, name: string, subdomain: string, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('subdomain', subdomain);
    if (description) {
      formData.append('description', description);
    }
    return apiRequestFormData<Project>('/api/projects/upload-zip', formData);
  },

  // 프로젝트 목록 조회
  getProjects: () => apiRequest<ProjectListResponse>('/api/projects'),

  // 프로젝트 상세 조회
  getProject: (projectId: string) =>
    apiRequest<Project>(`/api/projects/${projectId}`),

  // 프로젝트 수정
  updateProject: (projectId: string, data: UpdateProjectRequest) =>
    apiRequest<Project>(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // 프로젝트 삭제
  deleteProject: (projectId: string) =>
    apiRequest<DeleteProjectResponse>(`/api/projects/${projectId}`, {
      method: 'DELETE',
    }),
};

// ============ 분석 API ============

export interface DeviceBreakdown {
  users: number;
  page_views: number;
}

export interface TopPage {
  path: string;
  title: string;
  views: number;
  users: number;
  avg_time: number;
}

export interface TrafficSource {
  source: string;
  medium: string;
  users: number;
  sessions: number;
}

export interface Geography {
  country: string;
  city: string;
  users: number;
}

export interface AnalyticsSummary {
  total_visitors: number;
  total_page_views: number;
  total_sessions: number;
  daily_average: number;
  avg_session_time: number;
  bounce_rate: number;
  mobile_ratio: number;
  desktop_ratio: number;
  tablet_ratio: number;
  device_breakdown: {
    mobile: DeviceBreakdown;
    desktop: DeviceBreakdown;
    tablet: DeviceBreakdown;
  };
  top_pages: TopPage[];
  traffic_sources: TrafficSource[];
  geography: Geography[];
  period_days: number;
}

export interface PageAnalytics {
  page_path: string;
  total_views: number;
  unique_visitors: number;
  avg_time_on_page: number;
  bounce_rate: number;
}

export interface RealtimeAnalytics {
  active_users: number;
  timestamp: string;
}

export interface HeatmapClick {
  x: number;
  y: number;
  page_path: string; // 각 클릭에 page_path 포함
  timestamp: string;
}

export interface HeatmapData {
  total_clicks: number;
  clicks: HeatmapClick[];
}

export const analyticsApi = {
  // 전체 통계 요약
  getSummary: (projectId: string, days: number = 30) =>
    apiRequest<AnalyticsSummary>(`/api/analytics/summary/${projectId}?days=${days}`),

  // 페이지별 상세 분석
  getPageAnalytics: (projectId: string, pagePath: string, days: number = 30) =>
    apiRequest<PageAnalytics>(
      `/api/analytics/page/${projectId}?page_path=${encodeURIComponent(pagePath)}&days=${days}`
    ),

  // 실시간 사용자 수
  getRealtime: (projectId: string) =>
    apiRequest<RealtimeAnalytics>(`/api/analytics/realtime/${projectId}`),

  // 히트맵 데이터 조회
  getHeatmap: (projectId: string, pagePath: string, days: number = 30) =>
    apiRequest<HeatmapData>(
      `/api/analytics/heatmap/${projectId}?page_path=${encodeURIComponent(pagePath)}&days=${days}`
    ),
};

export default {
  auth: authApi,
  user: userApi,
  project: projectApi,
  analytics: analyticsApi,
};
