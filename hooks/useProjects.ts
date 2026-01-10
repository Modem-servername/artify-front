/**
 * Projects Hook
 * 프로젝트 상태 관리
 */

import { useState, useCallback, useEffect } from 'react';
import { projectApi, Project, CreateProjectFromUrlRequest, UpdateProjectRequest } from '../services/api';

const STORAGE_KEY = 'artify_currentProjectId';

interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
}

interface UseProjectsReturn extends ProjectsState {
  fetchProjects: () => Promise<void>;
  createProjectFromUrl: (data: CreateProjectFromUrlRequest) => Promise<Project>;
  createProjectFromZip: (file: File, name: string, subdomain: string, description?: string) => Promise<Project>;
  updateProject: (projectId: string, data: UpdateProjectRequest) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  selectProject: (project: Project | null) => void;
}

// localStorage에서 저장된 프로젝트 ID 가져오기
function getSavedProjectId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// localStorage에 프로젝트 ID 저장
function saveProjectId(projectId: string | null): void {
  try {
    if (projectId) {
      localStorage.setItem(STORAGE_KEY, projectId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage 사용 불가 시 무시
  }
}

export function useProjects(): UseProjectsReturn {
  const [state, setState] = useState<ProjectsState>({
    projects: [],
    currentProject: null,
    isLoading: false,
    error: null,
  });

  // 프로젝트 목록 조회
  const fetchProjects = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await projectApi.getProjects();
      const savedProjectId = getSavedProjectId();

      // 저장된 프로젝트 ID가 있으면 해당 프로젝트를 currentProject로 설정
      let restoredProject: Project | null = null;
      if (savedProjectId && response.projects.length > 0) {
        restoredProject = response.projects.find(p => p.id === savedProjectId) || null;
      }

      setState(prev => ({
        ...prev,
        projects: response.projects,
        // 이미 currentProject가 있으면 유지, 없으면 복원된 프로젝트 사용
        currentProject: prev.currentProject || restoredProject,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
      }));
    }
  }, []);

  // 프로젝트 상태 폴링 (READY가 될 때까지)
  const pollProjectStatus = useCallback(async (projectId: string, maxAttempts: number = 60) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3초 대기

      try {
        const response = await projectApi.getProjects();
        const updatedProject = response.projects.find(p => p.id === projectId);

        if (updatedProject) {
          setState(prev => ({
            ...prev,
            projects: prev.projects.map(p => p.id === projectId ? updatedProject : p),
            currentProject: prev.currentProject?.id === projectId ? updatedProject : prev.currentProject,
          }));

          if (updatedProject.status === 'READY' || updatedProject.status === 'ERROR') {
            return updatedProject;
          }
        }
      } catch (error) {
        console.error('프로젝트 상태 확인 실패:', error);
      }
    }
    return null;
  }, []);

  // URL로 프로젝트 생성
  const createProjectFromUrl = useCallback(async (data: CreateProjectFromUrlRequest): Promise<Project> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const project = await projectApi.createFromUrl(data);
      setState(prev => ({
        ...prev,
        projects: [...prev.projects, project],
        currentProject: project,
        isLoading: false,
      }));

      // 백그라운드에서 상태 폴링 시작
      pollProjectStatus(project.id);

      return project;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create project',
      }));
      throw error;
    }
  }, [pollProjectStatus]);

  // ZIP 파일로 프로젝트 생성
  const createProjectFromZip = useCallback(async (
    file: File,
    name: string,
    subdomain: string,
    description?: string
  ): Promise<Project> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const project = await projectApi.createFromZip(file, name, subdomain, description);
      setState(prev => ({
        ...prev,
        projects: [...prev.projects, project],
        currentProject: project,
        isLoading: false,
      }));

      // 백그라운드에서 상태 폴링 시작 (URL 프로젝트와 동일하게)
      pollProjectStatus(project.id);

      return project;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create project',
      }));
      throw error;
    }
  }, [pollProjectStatus]);

  // 프로젝트 수정
  const updateProject = useCallback(async (projectId: string, data: UpdateProjectRequest): Promise<Project> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const updatedProject = await projectApi.updateProject(projectId, data);
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === projectId ? updatedProject : p),
        currentProject: prev.currentProject?.id === projectId ? updatedProject : prev.currentProject,
        isLoading: false,
      }));
      return updatedProject;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update project',
      }));
      throw error;
    }
  }, []);

  // 프로젝트 삭제
  const deleteProject = useCallback(async (projectId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await projectApi.deleteProject(projectId);
      setState(prev => ({
        ...prev,
        projects: prev.projects.filter(p => p.id !== projectId),
        currentProject: prev.currentProject?.id === projectId ? null : prev.currentProject,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete project',
      }));
      throw error;
    }
  }, []);

  // 현재 프로젝트 선택 (localStorage 저장은 useEffect에서 처리)
  const selectProject = useCallback((project: Project | null) => {
    setState(prev => ({ ...prev, currentProject: project }));
  }, []);

  // currentProject가 변경될 때 localStorage에 저장
  useEffect(() => {
    saveProjectId(state.currentProject?.id || null);
  }, [state.currentProject]);

  return {
    ...state,
    fetchProjects,
    createProjectFromUrl,
    createProjectFromZip,
    updateProject,
    deleteProject,
    selectProject,
  };
}

export default useProjects;
