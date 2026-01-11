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

export type ProjectStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  source_type: 'URL' | 'ZIP';
  source_url: string | null;
  hosting_mode?: 'STATIC' | 'REDIRECT';  // STATIC: 정적 호스팅, REDIRECT: 원본 URL로 리다이렉트
  subdomain: string;
  full_domain: string;
  ga_tracking_id: string;
  status: ProjectStatus;
  status_message: string | null;
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
  hosting_mode?: 'STATIC' | 'REDIRECT';  // STATIC: 정적 호스팅, REDIRECT: 원본 URL로 리다이렉트
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

  // URL 프로젝트 다시 가져오기 (re-crawl)
  recrawlProject: (projectId: string) =>
    apiRequest<{ message: string }>(`/api/projects/${projectId}/recrawl`, {
      method: 'POST',
    }),

  // ZIP 프로젝트 재배포
  redeployProject: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequestFormData<{ message: string }>(`/api/projects/${projectId}/redeploy`, formData);
  },
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

export interface ComparisonData {
  current: {
    total_visitors: number;
    sessions: number;
    avg_session_time: number;
    bounce_rate: number;
  };
  previous: {
    total_visitors: number;
    sessions: number;
    avg_session_time: number;
    bounce_rate: number;
  };
  changes: {
    total_visitors: number;
    sessions: number;
    avg_session_time: number;
    bounce_rate: number;
  };
}

export interface BrowserOsData {
  browsers: Array<{ name: string; users: number; percentage: number }>;
  operating_systems: Array<{ name: string; users: number; percentage: number }>;
}

export interface NewVsReturning {
  total_users: number;
  new_users: number;
  returning_users: number;
  new_ratio: number;
  returning_ratio: number;
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
  comparison: ComparisonData;
  browser_os: BrowserOsData;
  new_vs_returning: NewVsReturning;
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
  x_percent: number;
  y_percent: number;
  timestamp: string;
}

export interface HeatmapSpot {
  x_percent: number;
  y_percent: number;
  clicks: number;
  element_id: string;
}

export interface HeatmapData {
  page_path: string;
  total_clicks: number;
  heatmap_spots: HeatmapSpot[];
  clicks: HeatmapClick[];
}

export interface TrendDataPoint {
  date: string;
  visits: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
}

export interface HourlyDataPoint {
  name: string;
  visits: number;
  sessions: number;
}

export interface TrendData {
  daily_trend: TrendDataPoint[];
  hourly_trend: HourlyDataPoint[];
  period_days: number;
}

export const analyticsApi = {
  // 전체 통계 요약 (자체 수집 데이터)
  getSummary: (projectId: string, days: number = 30) =>
    apiRequest<AnalyticsSummary>(`/api/analytics/${projectId}/overview?days=${days}`),

  // 트렌드 데이터 조회 (일별/시간별)
  getTrend: (projectId: string, days: number = 30) =>
    apiRequest<TrendData>(`/api/analytics/${projectId}/trend?days=${days}`),

  // 히트맵 데이터 조회
  getHeatmap: (projectId: string, pagePath: string, days: number = 30) =>
    apiRequest<HeatmapData>(
      `/api/analytics/${projectId}/heatmap?page_path=${encodeURIComponent(pagePath)}&days=${days}`
    ),

  // 유입 경로 통계
  getTrafficSources: (projectId: string, days: number = 30) =>
    apiRequest<{ traffic_sources: TrafficSource[] }>(
      `/api/analytics/${projectId}/traffic-sources?days=${days}`
    ),

  // 검색 키워드 통계
  getKeywords: (projectId: string, days: number = 30) =>
    apiRequest<{ keywords: Array<{ keyword: string; count: number; visitors: number }> }>(
      `/api/analytics/${projectId}/keywords?days=${days}`
    ),

  // 기기 환경 통계
  getDevices: (projectId: string, days: number = 30) =>
    apiRequest<DeviceStats>(`/api/analytics/${projectId}/devices?days=${days}`),

  // 브라우저/OS 통계
  getBrowserOs: (projectId: string, days: number = 30) =>
    apiRequest<BrowserOsData>(`/api/analytics/${projectId}/browser-os?days=${days}`),

  // 목표 달성 통계
  getGoals: (projectId: string, days: number = 30) =>
    apiRequest<GoalStats>(`/api/analytics/${projectId}/goals?days=${days}`),

  // 웹 성능 통계 (자체 수집)
  getPerformanceStats: (projectId: string, days: number = 30) =>
    apiRequest<WebPerformanceStats>(`/api/analytics/${projectId}/performance?days=${days}`),

  // 페이지별 상세 분석 (GA4)
  getPageAnalytics: (projectId: string, pagePath: string, days: number = 30) =>
    apiRequest<PageAnalytics>(`/api/analytics/page/${projectId}?page_path=${encodeURIComponent(pagePath)}&days=${days}`),

  // 실시간 분석 데이터 (GA4)
  getRealtime: (projectId: string) =>
    apiRequest<RealtimeAnalytics>(`/api/analytics/realtime/${projectId}`),

  // 성능 데이터 (PageSpeed Insights)
  getPerformance: (projectId: string, strategy: string = 'mobile') =>
    apiRequest<PerformanceData>(`/api/analytics/performance/${projectId}?strategy=${strategy}`),
};

// 기기 통계 타입
export interface DeviceStats {
  desktop: { count: number; percentage: number };
  mobile: { count: number; percentage: number };
  tablet: { count: number; percentage: number };
  total: number;
}

// 목표 통계 타입
export interface GoalStats {
  total_conversions: number;
  conversion_rate: number;
  goals: Array<{
    goal_name: string;
    conversions: number;
    total_value: number;
    unique_visitors: number;
    conversion_rate: number;
  }>;
}

// 웹 성능 통계 타입
export interface WebPerformanceStats {
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
  fcp: number;
  page_load: number;
  sample_count: number;
  lcp_score: 'good' | 'needs_improvement' | 'poor' | 'unknown';
  fid_score: 'good' | 'needs_improvement' | 'poor' | 'unknown';
  cls_score: 'good' | 'needs_improvement' | 'poor' | 'unknown';
}

// 성능 데이터 타입
export interface PerformanceMetric {
  id: string;
  label: string;
  val: string;
  status: string;
  color: string;
  desc: string;
}

export interface PerformanceOptimization {
  label: string;
  passed: boolean;
}

export interface PerformanceData {
  performance_score: number;
  metrics: PerformanceMetric[];
  optimizations: PerformanceOptimization[];
  strategy: string;
  url: string;
  error?: string;
}

// ============ Custom Goals API ============

export type GoalType = 'visitors' | 'stay_time' | 'page_views' | 'bounce_rate' | 'sessions' | 'new_visitors';

export interface CustomGoal {
  id: string;
  project_id: string;
  name: string;
  goal_type: GoalType;
  target_value: number;
  current_value: number;
  progress: number;
  period: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalRequest {
  name: string;
  goal_type: GoalType;
  target_value: number;
  period?: string;
}

export const customGoalsApi = {
  getGoals: (projectId: string) =>
    apiRequest<CustomGoal[]>(`/api/projects/${projectId}/custom-goals`),

  createGoal: (projectId: string, data: CreateGoalRequest) =>
    apiRequest<CustomGoal>(`/api/projects/${projectId}/custom-goals`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteGoal: (projectId: string, goalId: string) =>
    apiRequest<{ message: string }>(`/api/projects/${projectId}/custom-goals/${goalId}`, {
      method: 'DELETE',
    }),
};

// ============ 사용량 API ============

export interface UsageStats {
  credits_used: number;
  credits_limit: number;
  credits_remaining: number;
  usage_percentage: number;
  tier: string;
  last_reset_at: string | null;
  next_reset_at: string;
  is_limit_exceeded: boolean;
}

export const usageApi = {
  getUsage: () =>
    apiRequest<UsageStats>('/api/usage'),

  resetCredits: () =>
    apiRequest<{ success: boolean; message: string; projects_reactivated: number }>('/api/usage/reset', {
      method: 'POST',
    }),
};

export default {
  auth: authApi,
  user: userApi,
  project: projectApi,
  analytics: analyticsApi,
  customGoals: customGoalsApi,
  usage: usageApi,
};
