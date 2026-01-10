/**
 * Analytics Hook
 * 분석 데이터 상태 관리
 */

import { useState, useCallback } from 'react';
import {
  analyticsApi,
  AnalyticsSummary,
  PageAnalytics,
  RealtimeAnalytics,
  HeatmapData,
  TrendData,
  PerformanceData,
  GoalStats,
  WebPerformanceStats
} from '../services/api';

interface AnalyticsState {
  summary: AnalyticsSummary | null;
  pageAnalytics: PageAnalytics | null;
  realtime: RealtimeAnalytics | null;
  heatmap: HeatmapData | null;
  trend: TrendData | null;
  performance: PerformanceData | null;
  goals: GoalStats | null;
  webPerformance: WebPerformanceStats | null;
  isLoading: boolean;
  error: string | null;
}

interface UseAnalyticsReturn extends AnalyticsState {
  fetchSummary: (projectId: string, days?: number) => Promise<void>;
  fetchPageAnalytics: (projectId: string, pagePath: string, days?: number) => Promise<void>;
  fetchRealtime: (projectId: string) => Promise<void>;
  fetchHeatmap: (projectId: string, pagePath: string, days?: number) => Promise<void>;
  fetchTrend: (projectId: string, days?: number) => Promise<void>;
  fetchPerformance: (projectId: string, strategy?: string) => Promise<void>;
  fetchGoals: (projectId: string, days?: number) => Promise<void>;
  fetchWebPerformance: (projectId: string, days?: number) => Promise<void>;
  clearAnalytics: () => void;
}

export function useAnalytics(): UseAnalyticsReturn {
  const [state, setState] = useState<AnalyticsState>({
    summary: null,
    pageAnalytics: null,
    realtime: null,
    heatmap: null,
    trend: null,
    performance: null,
    goals: null,
    webPerformance: null,
    isLoading: false,
    error: null,
  });

  // 전체 통계 요약 조회
  const fetchSummary = useCallback(async (projectId: string, days: number = 30) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const summary = await analyticsApi.getSummary(projectId, days);
      setState(prev => ({
        ...prev,
        summary,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics summary',
      }));
    }
  }, []);

  // 페이지별 상세 분석 조회
  const fetchPageAnalytics = useCallback(async (
    projectId: string,
    pagePath: string,
    days: number = 30
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const pageAnalytics = await analyticsApi.getPageAnalytics(projectId, pagePath, days);
      setState(prev => ({
        ...prev,
        pageAnalytics,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch page analytics',
      }));
    }
  }, []);

  // 실시간 사용자 수 조회
  const fetchRealtime = useCallback(async (projectId: string) => {
    try {
      const realtime = await analyticsApi.getRealtime(projectId);
      setState(prev => ({
        ...prev,
        realtime,
      }));
    } catch (error) {
      // 실시간 데이터는 에러가 나도 무시
      console.warn('Failed to fetch realtime data:', error);
    }
  }, []);

  // 히트맵 데이터 조회
  const fetchHeatmap = useCallback(async (
    projectId: string,
    pagePath: string,
    days: number = 30
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const heatmap = await analyticsApi.getHeatmap(projectId, pagePath, days);
      setState(prev => ({
        ...prev,
        heatmap,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch heatmap data',
      }));
    }
  }, []);

  // 트렌드 데이터 조회
  const fetchTrend = useCallback(async (projectId: string, days: number = 30) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const trend = await analyticsApi.getTrend(projectId, days);
      setState(prev => ({
        ...prev,
        trend,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trend data',
      }));
    }
  }, []);

  // 성능 데이터 조회
  const fetchPerformance = useCallback(async (projectId: string, strategy: string = "mobile") => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const performance = await analyticsApi.getPerformance(projectId, strategy);
      setState(prev => ({
        ...prev,
        performance,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch performance data',
      }));
    }
  }, []);

  // 목표 달성 통계 조회
  const fetchGoals = useCallback(async (projectId: string, days: number = 30) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const goals = await analyticsApi.getGoals(projectId, days);
      setState(prev => ({
        ...prev,
        goals,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch goals data',
      }));
    }
  }, []);

  // 웹 성능 통계 조회 (자체 수집)
  const fetchWebPerformance = useCallback(async (projectId: string, days: number = 30) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const webPerformance = await analyticsApi.getPerformanceStats(projectId, days);
      setState(prev => ({
        ...prev,
        webPerformance,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch web performance data',
      }));
    }
  }, []);

  // 분석 데이터 초기화
  const clearAnalytics = useCallback(() => {
    setState({
      summary: null,
      pageAnalytics: null,
      realtime: null,
      heatmap: null,
      trend: null,
      performance: null,
      goals: null,
      webPerformance: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    fetchSummary,
    fetchPageAnalytics,
    fetchRealtime,
    fetchHeatmap,
    fetchTrend,
    fetchPerformance,
    fetchGoals,
    fetchWebPerformance,
    clearAnalytics,
  };
}

export default useAnalytics;
