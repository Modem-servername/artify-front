/**
 * Projects Hook
 * 프로젝트 상태 관리
 */

import { useState, useCallback } from 'react';
import { projectApi, Project, CreateProjectFromUrlRequest, UpdateProjectRequest } from '../services/api';

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
      setState(prev => ({
        ...prev,
        projects: response.projects,
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
      return project;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create project',
      }));
      throw error;
    }
  }, []);

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
      return project;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create project',
      }));
      throw error;
    }
  }, []);

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

  // 현재 프로젝트 선택
  const selectProject = useCallback((project: Project | null) => {
    setState(prev => ({ ...prev, currentProject: project }));
  }, []);

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
