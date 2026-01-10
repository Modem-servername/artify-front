import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import { TabID, ViewID, InsightResponse, TimeRange, ChartDataPoint, UserSubscription, PlanID } from "./types";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie } from "recharts";
import { Users, Eye, Clock, Calendar, Globe, Smartphone, Zap, MousePointer2, Check, ChevronLeft, ChevronRight, RefreshCcw, ShieldCheck, Download, Layers, Activity, TrendingDown, ArrowUpRight, MousePointerClick, ShoppingCart, CreditCard, CheckCircle2, Timer, AlertTriangle, LayoutGrid, Monitor, Tablet, UserPlus, Sigma, Binary, Mail, Link as LinkIcon, Lock, ArrowRight, Copy, Sparkles, Loader2, MapPin, AlertCircle, Info, UploadCloud, Upload, FileArchive, FileCode, Trash2, X, LogOut, ChevronDown, Target, Settings, Lightbulb } from "lucide-react";
import MetricCard from "./components/MetricCard";
import ReportModal from "./components/ReportModal";
import { BillingUpgrade, BillingSuccess, BillingCancel } from "./components/Billing";
import { NAVIGATION_ITEMS } from "./constants";
import { generateLocalInsights } from "./services/insightGenerator";
import { useAuth, useProjects, useAnalytics } from "./hooks";
import { Project, AnalyticsSummary, CustomGoal, CreateGoalRequest, GoalType, customGoalsApi, usageApi, UsageStats, projectApi } from "./services/api";

const App: React.FC = () => {
	// API Hooks
	const { user, isAuthenticated, isLoading: isAuthLoading, login, logout } = useAuth();
	const {
		projects,
		currentProject,
		isLoading: isProjectsLoading,
		error: projectsError,
		fetchProjects,
		createProjectFromUrl,
		createProjectFromZip,
		deleteProject,
		selectProject,
	} = useProjects();
	const {
		summary: analyticsSummary,
		heatmap: heatmapData,
		realtime: realtimeData,
		trend: trendData,
		performance: performanceData,
		goals: goalsData,
		webPerformance: webPerformanceData,
		isLoading: isAnalyticsLoading,
		fetchSummary,
		fetchHeatmap,
		fetchRealtime,
		fetchTrend,
		fetchPerformance,
		fetchGoals,
		fetchWebPerformance,
	} = useAnalytics();

	// Navigation State - localStorage에서 복원
	const [currentView, setCurrentView] = useState<ViewID>(() => {
		const saved = localStorage.getItem('artify_currentView');
		return saved ? (saved as ViewID) : ViewID.CONNECT;
	});
	const [activeTab, setActiveTab] = useState<TabID>(() => {
		const saved = localStorage.getItem('artify_activeTab');
		return saved ? (saved as TabID) : TabID.OVERVIEW;
	});

	// Connect View State
	const [connectMode, setConnectMode] = useState<"url" | "file">("file");
	const [urlInput, setUrlInput] = useState("");
	const [projectName, setProjectName] = useState("");
	const [subdomain, setSubdomain] = useState("");
	const [hostingMode, setHostingMode] = useState<"STATIC" | "REDIRECT">("STATIC");  // 호스팅 모드
	const [isGenerating, setIsGenerating] = useState(false);
	const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
	const [connectError, setConnectError] = useState<string | null>(null);
	const [copySuccess, setCopySuccess] = useState(false);
	const [showCompareModal, setShowCompareModal] = useState(false);
	const [showProjectSelector, setShowProjectSelector] = useState(false);

	// File Upload State
	const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");
	const [uploadProgress, setUploadProgress] = useState(0);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Dashboard State
	const [timeRange, setTimeRange] = useState<TimeRange>(TimeRange.MONTH);
	const [currentDate, setCurrentDate] = useState<Date>(new Date());
	const [insights, setInsights] = useState<InsightResponse | null>(null);
	const [isInsightLoading, setIsInsightLoading] = useState(false);
	const [isReportModalOpen, setIsReportModalOpen] = useState(false);
	const [isNavigating, setIsNavigating] = useState(false);
	const [selectedHeatmapPage, setSelectedHeatmapPage] = useState<string>("");
	const [isRecrawling, setIsRecrawling] = useState(false);
	const [showRedeployModal, setShowRedeployModal] = useState(false);
	const [isRedeploying, setIsRedeploying] = useState(false);
	const [redeployFile, setRedeployFile] = useState<File | null>(null);

	// Toast 알림 상태
	const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean }>({ message: '', type: 'info', visible: false });

	const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
		setToast({ message, type, visible: true });
		setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
	};

	// 커스텀 목표 상태
	const [customGoals, setCustomGoals] = useState<CustomGoal[]>([]);
	const [isLoadingGoals, setIsLoadingGoals] = useState(false);
	const [showGoalModal, setShowGoalModal] = useState(false);
	const [newGoal, setNewGoal] = useState<CreateGoalRequest>({
		name: '',
		goal_type: 'visitors',
		target_value: 1000,
		period: 'daily'

	});

	// 사용량 상태
	const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
	const [isLoadingUsage, setIsLoadingUsage] = useState(false);
	// 목표 유형별 기본값
	const goalTypeDefaults: Record<GoalType, { defaultValue: number; unit: string; placeholder: string }> = {
		visitors: { defaultValue: 1000, unit: '명', placeholder: '예: 1000' },
		stay_time: { defaultValue: 120, unit: '초', placeholder: '예: 120' },
		page_views: { defaultValue: 5000, unit: '회', placeholder: '예: 5000' },
		bounce_rate: { defaultValue: 40, unit: '%', placeholder: '예: 40 (목표: 이하)' },
		sessions: { defaultValue: 2000, unit: '회', placeholder: '예: 2000' },
		new_visitors: { defaultValue: 500, unit: '명', placeholder: '예: 500' }
	};

	// 목표 유형 변경 시 기본값 설정
	const handleGoalTypeChange = (type: GoalType) => {
		setNewGoal(prev => ({
			...prev,
			goal_type: type,
			target_value: goalTypeDefaults[type].defaultValue
		}));
	};

	// D-Day 계산 함수
	const calculateDDay = (period: string, createdAt: string): { dDay: number; targetDate: string } | null => {
		if (period === 'unlimited') return null;

		const created = new Date(createdAt);
		const now = new Date();
		let targetDate = new Date(created);

		switch (period) {
			case 'daily':
				targetDate.setDate(created.getDate() + 1);
				break;
			case 'weekly':
				targetDate.setDate(created.getDate() + 7);
				break;
			case 'monthly':
				targetDate.setMonth(created.getMonth() + 1);
				break;
			default:
				return null;
		}

		const diffTime = targetDate.getTime() - now.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		return {
			dDay: diffDays,
			targetDate: targetDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
		};
	};

	// D-Day 표시 텍스트
	const getDDayText = (dDay: number): string => {
		if (dDay === 0) return 'D-Day';
		if (dDay > 0) return `D-${dDay}`;
		return `D+${Math.abs(dDay)}`;
	};

	// subscription은 usageStats 또는 user 정보 기반으로 동적으로 설정
	const subscription = useMemo<UserSubscription>(() => {
		const tierConfig: Record<string, { limit: number; plan: PlanID }> = {
			FREE: { limit: 100000, plan: "free" },
			PRO: { limit: 5000000, plan: "pro" },
			ENTERPRISE: { limit: 100000000, plan: "enterprise" },
		};
		const tier = usageStats?.tier || user?.tier || "FREE";
		const config = tierConfig[tier] || tierConfig.FREE;
		return {
			plan_id: config.plan,
			request_limit: usageStats?.credits_limit || config.limit,
			usage_current_period: usageStats?.credits_used || 0,
			subscription_status: usageStats?.is_limit_exceeded ? "limit_exceeded" : "active",
			billing_period_end: usageStats?.next_reset_at || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
		};
	}, [user, usageStats]);

	// 상태 변경 시 localStorage에 저장
	useEffect(() => {
		localStorage.setItem('artify_currentView', currentView);
	}, [currentView]);

	useEffect(() => {
		localStorage.setItem('artify_activeTab', activeTab);
	}, [activeTab]);

	// 인증 상태에 따른 뷰 전환
	useEffect(() => {
		if (!isAuthLoading) {
			if (isAuthenticated) {
				// 로그인 상태면 저장된 뷰 유지 (LOGIN이면 ANALYTICS로)
				if (currentView === ViewID.LOGIN) {
					setCurrentView(ViewID.ANALYTICS);
				}
				// CONNECT 페이지에서도 프로젝트가 있으면 ANALYTICS로 이동
				// (단, 저장된 currentView가 ANALYTICS인 경우에만)
				const savedView = localStorage.getItem('artify_currentView');
				if (savedView === ViewID.ANALYTICS && currentView === ViewID.CONNECT) {
					setCurrentView(ViewID.ANALYTICS);
				}
				fetchProjects();
			} else {
				// 로그아웃 상태면 로그인 또는 연결 페이지로
				if (currentView === ViewID.ANALYTICS) {
					setCurrentView(ViewID.CONNECT);
				}
			}
		}
	}, [isAuthenticated, isAuthLoading, fetchProjects]);

	// 현재 프로젝트 분석 데이터 조회
	useEffect(() => {
		if (currentProject && currentView === ViewID.ANALYTICS) {
			const days = timeRange === TimeRange.DAY ? 1 : timeRange === TimeRange.WEEK ? 7 : timeRange === TimeRange.MONTH ? 30 : 365;
			fetchSummary(currentProject.id, days);
			fetchTrend(currentProject.id, days);
			fetchPerformance(currentProject.id, "mobile");
			fetchGoals(currentProject.id, days);
			fetchWebPerformance(currentProject.id, days);
			if (selectedHeatmapPage) {
				fetchHeatmap(currentProject.id, selectedHeatmapPage, days);
			}
			// 실시간 데이터는 주기적으로 조회
			fetchRealtime(currentProject.id);
		}
	}, [currentProject, currentView, timeRange, selectedHeatmapPage, fetchSummary, fetchHeatmap, fetchRealtime, fetchTrend, fetchPerformance, fetchGoals, fetchWebPerformance]);

	// 커스텀 목표 조회
	const fetchCustomGoals = useCallback(async () => {
		if (!currentProject) return;
		setIsLoadingGoals(true);
		try {
			const goals = await customGoalsApi.getGoals(currentProject.id);
			setCustomGoals(goals);
		} catch (error) {
			console.error('Failed to fetch custom goals:', error);
		} finally {
			setIsLoadingGoals(false);
		}
	}, [currentProject]);

	useEffect(() => {
		if (currentProject && currentView === ViewID.ANALYTICS) {
			fetchCustomGoals();
		}
	}, [currentProject, currentView, fetchCustomGoals]);

	// 사용량 조회
	const fetchUsageStats = useCallback(async () => {
		setIsLoadingUsage(true);
		try {
			const stats = await usageApi.getUsage();
			setUsageStats(stats);
		} catch (error) {
			console.error('Failed to fetch usage stats:', error);
		} finally {
			setIsLoadingUsage(false);
		}
	}, []);

	useEffect(() => {
		if (isAuthenticated) {
			fetchUsageStats();
		}
	}, [isAuthenticated, fetchUsageStats]);

	// 목표 생성
	const handleCreateGoal = async () => {
		if (!currentProject || !newGoal.name) return;
		try {
			const created = await customGoalsApi.createGoal(currentProject.id, newGoal);
			setCustomGoals(prev => [...prev, created]);
			setShowGoalModal(false);
			setNewGoal({ name: '', goal_type: 'visitors', target_value: 1000, period: 'daily' });
			showToast('목표가 추가되었습니다.', 'success');
		} catch (error) {
			console.error('Failed to create goal:', error);
			const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
			showToast(`목표 추가 실패: ${errorMessage}`, 'error');
		}
	};

	// 목표 삭제
	const handleDeleteGoal = async (goalId: string) => {
		if (!currentProject) return;
		try {
			await customGoalsApi.deleteGoal(currentProject.id, goalId);
			setCustomGoals(prev => prev.filter(g => g.id !== goalId));
			showToast('목표가 삭제되었습니다.', 'success');
		} catch (error) {
			console.error('Failed to delete goal:', error);
			showToast('목표 삭제에 실패했습니다.', 'error');
		}
	};

	// 목표 타입 라벨
	const getGoalTypeLabel = (type: GoalType): string => {
		const labels: Record<GoalType, string> = {
			visitors: '일일 방문자',
			stay_time: '평균 체류시간(초)',
			page_views: '페이지뷰',
			bounce_rate: '이탈률(%)',
			sessions: '세션 수',
			new_visitors: '신규 방문자'
		};
		return labels[type] || type;
	};

	// 목표 현재 값 계산
	const getGoalCurrentValue = (goal: CustomGoal): number => {
		if (!analyticsSummary) return 0;
		switch (goal.goal_type) {
			case 'visitors': return analyticsSummary.total_visitors;
			case 'stay_time': return analyticsSummary.avg_session_time;
			case 'page_views': return analyticsSummary.total_page_views;
			case 'bounce_rate': return analyticsSummary.bounce_rate;
			case 'sessions': return analyticsSummary.total_sessions;
			case 'new_visitors': return analyticsSummary.new_vs_returning?.new_users || 0;
			default: return 0;
		}
	};

	// 목표 진행률 계산
	const getGoalProgress = (goal: CustomGoal): number => {
		const current = getGoalCurrentValue(goal);
		// bounce_rate는 낮을수록 좋으므로 역으로 계산
		if (goal.goal_type === 'bounce_rate') {
			return Math.min(((goal.target_value / current) * 100), 100);
		}
		return Math.min((current / goal.target_value) * 100, 100);
	};

	// 목표 색상
	const getGoalColor = (type: GoalType): string => {
		const colors: Record<GoalType, string> = {
			visitors: 'from-indigo-500 to-purple-500',
			stay_time: 'from-emerald-500 to-teal-500',
			page_views: 'from-blue-500 to-cyan-500',
			bounce_rate: 'from-orange-500 to-red-500',
			sessions: 'from-pink-500 to-rose-500',
			new_visitors: 'from-violet-500 to-purple-500'
		};
		return colors[type] || 'from-gray-500 to-slate-500';
	};

	const isBillingPage = useMemo(() => {
		return activeTab === TabID.BILLING_UPGRADE || activeTab === TabID.BILLING_SUCCESS || activeTab === TabID.BILLING_CANCEL;
	}, [activeTab]);

	const formattedPeriodLabel = useMemo(() => {
		const y = currentDate.getFullYear();
		const m = currentDate.getMonth() + 1;
		const d = currentDate.getDate();
		if (timeRange === TimeRange.DAY) return `${y}년 ${m}월 ${d}일`;
		if (timeRange === TimeRange.WEEK) return `${y}년 ${m}월 ${Math.ceil(d / 7)}주차`;
		if (timeRange === TimeRange.MONTH) return `${y}년 ${m}월`;
		return `${y}년 전체`;
	}, [currentDate, timeRange]);

	const handleNavigateTime = (direction: "prev" | "next") => {
		const newDate = new Date(currentDate);
		const modifier = direction === "next" ? 1 : -1;
		switch (timeRange) {
			case TimeRange.DAY:
				newDate.setDate(newDate.getDate() + modifier);
				break;
			case TimeRange.WEEK:
				newDate.setDate(newDate.getDate() + modifier * 7);
				break;
			case TimeRange.MONTH:
				newDate.setMonth(newDate.getMonth() + modifier);
				break;
			case TimeRange.YEAR:
				newDate.setFullYear(newDate.getFullYear() + modifier);
				break;
		}
		setCurrentDate(newDate);
	};

	// 실제 GA4 트렌드 데이터 사용
	const chartData = useMemo((): ChartDataPoint[] => {
		// timeRange에 따라 적절한 데이터 사용
		if (timeRange === TimeRange.DAY && trendData?.hourly_trend) {
			// 시간별 데이터
			return trendData.hourly_trend.map((item) => ({
				name: item.name,
				visits: item.visits,
				conversions: Math.floor(item.visits * 0.05), // 전환율 추정
				stayTime: 180,
				bounceRate: 40,
			}));
		}

		if (trendData?.daily_trend && trendData.daily_trend.length > 0) {
			// 일별 데이터를 timeRange에 맞게 가공
			const dailyData = trendData.daily_trend;

			if (timeRange === TimeRange.WEEK) {
				// 최근 7일
				const recentDays = dailyData.slice(-7);
				const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
				return recentDays.map((item) => {
					const date = new Date(item.date);
					return {
						name: dayNames[date.getDay()],
						visits: item.visits,
						conversions: Math.floor(item.visits * 0.05),
						stayTime: item.avgSessionDuration,
						bounceRate: item.bounceRate,
					};
				});
			}

			if (timeRange === TimeRange.MONTH) {
				// 최근 30일
				return dailyData.slice(-30).map((item) => {
					const date = new Date(item.date);
					return {
						name: `${date.getDate()}일`,
						visits: item.visits,
						conversions: Math.floor(item.visits * 0.05),
						stayTime: item.avgSessionDuration,
						bounceRate: item.bounceRate,
					};
				});
			}

			if (timeRange === TimeRange.YEAR) {
				// 월별 집계
				const monthlyData: Record<string, { visits: number; count: number; stayTime: number; bounceRate: number }> = {};
				dailyData.forEach((item) => {
					const month = item.date.substring(5, 7);
					if (!monthlyData[month]) {
						monthlyData[month] = { visits: 0, count: 0, stayTime: 0, bounceRate: 0 };
					}
					monthlyData[month].visits += item.visits;
					monthlyData[month].stayTime += item.avgSessionDuration;
					monthlyData[month].bounceRate += item.bounceRate;
					monthlyData[month].count++;
				});

				return Object.entries(monthlyData)
					.sort(([a], [b]) => parseInt(a) - parseInt(b))
					.map(([month, data]) => ({
						name: `${parseInt(month)}월`,
						visits: data.visits,
						conversions: Math.floor(data.visits * 0.05),
						stayTime: data.count > 0 ? data.stayTime / data.count : 0,
						bounceRate: data.count > 0 ? data.bounceRate / data.count : 0,
					}));
			}
		}

		// 데이터가 없을 때 빈 배열 반환 (로딩 상태)
		return [];
	}, [trendData, timeRange]);

	const getScaledValue = (base: number) => {
		if (timeRange === TimeRange.YEAR) return base * 12;
		if (timeRange === TimeRange.MONTH) return base;
		if (timeRange === TimeRange.WEEK) return Math.floor(base * 0.25);
		return Math.floor(base * 0.04);
	};

	// API 데이터 사용 (더미 데이터 제거)
	const displayMetrics = useMemo(() => {
		if (analyticsSummary) {
			return {
				totalVisitors: analyticsSummary.total_visitors,
				dailyAverage: Math.floor(analyticsSummary.daily_average),
				avgSessionTime: analyticsSummary.avg_session_time,
				bounceRate: analyticsSummary.bounce_rate,
				mobileRatio: analyticsSummary.mobile_ratio,
				desktopRatio: analyticsSummary.desktop_ratio,
				topPages: analyticsSummary.top_pages,
				trafficSources: analyticsSummary.traffic_sources,
				geography: analyticsSummary.geography,
				// 새로 추가된 데이터
				comparison: analyticsSummary.comparison,
				browserOs: analyticsSummary.browser_os,
				newVsReturning: analyticsSummary.new_vs_returning,
			};
		}
		// 데이터 로딩 중 - 빈 데이터 반환
		return {
			totalVisitors: 0,
			dailyAverage: 0,
			avgSessionTime: 0,
			bounceRate: 0,
			mobileRatio: 0,
			desktopRatio: 0,
			topPages: [],
			trafficSources: [],
			geography: [],
			comparison: null,
			browserOs: null,
			newVsReturning: null,
		};
	}, [analyticsSummary]);

	// topPages 데이터가 로드되면 첫 번째 페이지를 자동 선택
	useEffect(() => {
		if (displayMetrics.topPages.length > 0 && !selectedHeatmapPage) {
			setSelectedHeatmapPage(displayMetrics.topPages[0].path);
		}
	}, [displayMetrics.topPages, selectedHeatmapPage]);

	// 상황별 최적화 팁 생성 함수
	const getOptimizationTips = () => {
		const tips: { type: 'success' | 'warning' | 'info'; message: string }[] = [];
		const bounceRate = displayMetrics.bounceRate || 0;

		// 커스텀 목표 기반 팁 생성
		customGoals.forEach(goal => {
			const progress = getGoalProgress(goal);
			if (progress >= 100) {
				tips.push({ type: 'success', message: `${goal.name} 목표를 달성했습니다! 목표를 상향 조정해보세요.` });
			} else if (progress >= 70) {
				tips.push({ type: 'info', message: `${goal.name} 목표 달성까지 거의 다 왔습니다. 조금만 더 힘내세요!` });
			} else if (progress < 30) {
				if (goal.goal_type === 'visitors') {
					tips.push({ type: 'warning', message: 'SEO 최적화와 소셜 미디어 홍보로 방문자 유입을 늘려보세요.' });
				} else if (goal.goal_type === 'stay_time') {
					tips.push({ type: 'warning', message: '체류시간이 목표에 미달합니다. 콘텐츠 품질을 점검하세요.' });
				}
			}
		});

		// 기본 팁 (목표가 없거나 팁이 부족한 경우)
		if (tips.length < 3) {
			if (bounceRate > 70) {
				tips.push({ type: 'warning', message: '이탈률이 높습니다. 랜딩 페이지 개선이 필요합니다.' });
			} else if (bounceRate < 40) {
				tips.push({ type: 'success', message: '이탈률이 낮아 사용자 참여도가 좋습니다.' });
			} else {
				tips.push({ type: 'info', message: 'CTA 버튼 위치와 디자인을 A/B 테스트해보세요.' });
			}
		}

		if (tips.length < 3 && customGoals.length === 0) {
			tips.push({ type: 'info', message: '목표를 설정하여 사이트 성과를 체계적으로 관리해보세요.' });
		}

		return tips.slice(0, 3);
	};

	// 체류시간 포맷팅 (초 -> mm:ss)
	const formatSessionTime = (seconds: number) => {
		if (!seconds || isNaN(seconds) || seconds === 0) {
			return "데이터 부족";
		}
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
	};

	// 일평균 방문자 포맷팅
	const formatDailyAverage = (value: number) => {
		if (!value || isNaN(value) || value === 0) {
			return "데이터 부족";
		}
		return value.toLocaleString();
	};

	// 시간 범위에 따른 평균 방문자 라벨
	const getAverageVisitorLabel = () => {
		switch (timeRange) {
			case TimeRange.DAY:
				return "시간당 평균";
			case TimeRange.WEEK:
				return "일평균 방문자";
			case TimeRange.MONTH:
				return "일평균 방문자";
			case TimeRange.YEAR:
				return "월평균 방문자";
			default:
				return "평균 방문자";
		}
	};

	const updateInsights = async () => {
		setIsInsightLoading(true);
		try {
			const metricStates = [
				{ label: "방문자", current: getScaledValue(124532), change: 12.5 },
				{ label: "이탈률", current: 42.3, change: -1.2 },
				{ label: "체류 시간", current: 262, change: 5.8 },
				{ label: "신규 방문", current: getScaledValue(43120), change: 2.4 },
			];
			const result = await generateLocalInsights(activeTab, timeRange, metricStates, chartData);
			setInsights(result);
		} catch (error) {
			console.error("Failed to generate insights:", error);
		} finally {
			setIsInsightLoading(false);
		}
	};

	useEffect(() => {
		if (currentView === ViewID.ANALYTICS && !isBillingPage) {
			updateInsights();
		}
	}, [activeTab, timeRange, currentDate, currentView]);

	const handleTabChange = (tab: TabID) => {
		if (tab === activeTab) return;
		setIsNavigating(true);
		setTimeout(() => {
			setActiveTab(tab);
			setIsNavigating(false);
		}, 150);
	};

	const handleSelectPlan = async (planId: PlanID) => {
		setIsInsightLoading(true);
		setTimeout(() => {
			// TODO: 실제 API 호출로 플랜 업그레이드 처리
			// 업그레이드 성공 후 user.tier가 변경되면 subscription이 자동으로 업데이트됨
			handleTabChange(TabID.BILLING_SUCCESS);
			setIsInsightLoading(false);
		}, 1500);
	};

	const handleGenerateFromUrl = async () => {
		if (!urlInput.trim()) {
			setConnectError("홈페이지 주소를 입력해 주세요.");
			return;
		}

		if (!projectName.trim()) {
			setConnectError("프로젝트 이름을 입력해 주세요.");
			return;
		}

		let normalized = urlInput.trim();
		if (!/^https?:\/\//i.test(normalized)) {
			normalized = "https://" + normalized;
		}

		setConnectError(null);
		setIsGenerating(true);

		try {
			const project = await createProjectFromUrl({
				name: projectName.trim(),
				source_url: normalized,
				custom_subdomain: subdomain.trim() || undefined,
				hosting_mode: hostingMode,
			});
			setGeneratedUrl(`https://${project.full_domain}`);
			selectProject(project);
		} catch (error) {
			setConnectError(error instanceof Error ? error.message : "프로젝트 생성에 실패했습니다.");
		} finally {
			setIsGenerating(false);
		}
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) validateAndUploadFile(file);
	};

	const validateAndUploadFile = (file: File) => {
		setConnectError(null);
		if (!file.name.endsWith(".zip")) {
			setConnectError("ZIP 파일 형식만 업로드 가능합니다.");
			return;
		}
		if (file.size > 50 * 1024 * 1024) {
			// 50MB
			setConnectError("파일 용량이 너무 큽니다 (최대 50MB).");
			return;
		}

		setSelectedFile(file);
		setUploadStatus("uploading");
		setUploadProgress(0);

		const interval = setInterval(() => {
			setUploadProgress(prev => {
				if (prev >= 100) {
					clearInterval(interval);
					setUploadStatus("uploaded");
					return 100;
				}
				return prev + 5;
			});
		}, 100);
	};

	const handleGenerateFromFile = async () => {
		if (!selectedFile) {
			setConnectError("파일을 선택해 주세요.");
			return;
		}

		if (!projectName.trim()) {
			setConnectError("프로젝트 이름을 입력해 주세요.");
			return;
		}

		if (!subdomain.trim()) {
			setConnectError("서브도메인을 입력해 주세요.");
			return;
		}

		setConnectError(null);
		setIsGenerating(true);

		try {
			const project = await createProjectFromZip(
				selectedFile,
				projectName.trim(),
				subdomain.trim()
			);
			setGeneratedUrl(`https://${project.full_domain}`);
			selectProject(project);
		} catch (error) {
			setConnectError(error instanceof Error ? error.message : "프로젝트 생성에 실패했습니다.");
		} finally {
			setIsGenerating(false);
		}
	};

	const handleResetConnect = () => {
		setGeneratedUrl(null);
		setUrlInput("");
		setProjectName("");
		setSubdomain("");
		setHostingMode("STATIC");
		setSelectedFile(null);
		setUploadStatus("idle");
		setUploadProgress(0);
		setConnectError(null);
	};

	const handleCopyUrl = (url: string) => {
		navigator.clipboard.writeText(url);
		setCopySuccess(true);
		setTimeout(() => setCopySuccess(false), 2000);
	};

	const handleGoogleLogin = () => {
		login(); // Google OAuth 로그인 시작
	};

	const handleLogout = () => {
		logout();
		setCurrentView(ViewID.CONNECT);
		handleResetConnect();
	};

	const handleRecrawl = async () => {
		if (!currentProject || isRecrawling) return;

		setIsRecrawling(true);
		try {
			await projectApi.recrawlProject(currentProject.id);
			showToast("다시 가져오기가 완료되었습니다!", "success");
		} catch (error) {
			const message = error instanceof Error ? error.message : "다시 가져오기에 실패했습니다.";
			showToast(message, "error");
		} finally {
			setIsRecrawling(false);
		}
	};

	const handleRedeploy = async () => {
		if (!currentProject || !redeployFile || isRedeploying) return;

		setIsRedeploying(true);
		try {
			await projectApi.redeployProject(currentProject.id, redeployFile);
			showToast("재배포가 완료되었습니다!", "success");
			setShowRedeployModal(false);
			setRedeployFile(null);
		} catch (error) {
			const message = error instanceof Error ? error.message : "재배포에 실패했습니다.";
			showToast(message, "error");
		} finally {
			setIsRedeploying(false);
		}
	};

	// --- RENDERING VIEWS ---

	const renderConnectView = () => (
		<>
		<div className="flex-1 flex flex-col items-center justify-center p-6 animate-reveal">
			<div className="w-full max-w-3xl bg-white p-12 md:p-16 rounded-[4rem] border border-slate-200 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)] text-center relative overflow-hidden transition-all duration-500">
				<div className="absolute top-0 left-0 w-full h-2.5 bg-indigo-600"></div>

				<div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 animate-bounce-subtle">
					<Sigma size={32} />
				</div>

				<h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4 leading-tight">
					통계를 추적할 사이트를
					<br />
					어떤 방식으로 연결할까요?
				</h2>
				<p className="text-slate-500 font-bold mb-6 text-lg">가장 빠르고 정확한 데이터 수집을 시작해 보세요.</p>

				{/* 기존 프로젝트가 있으면 대시보드 바로가기 표시 */}
				{isAuthenticated && projects.length > 0 && (
					<button
						onClick={() => {
							if (currentProject) {
								setCurrentView(ViewID.ANALYTICS);
							} else {
								selectProject(projects[0]);
								setCurrentView(ViewID.ANALYTICS);
							}
						}}
						className="inline-flex items-center gap-2 px-6 py-3 mb-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-indigo-100">
						<LayoutGrid size={16} />
						기존 프로젝트 대시보드 보기
						<ArrowRight size={14} />
					</button>
				)}
				{/* 로그인은 되어있지만 프로젝트가 없는 경우 - 로딩 중이거나 프로젝트 없음 */}
				{isAuthenticated && projects.length === 0 && !isProjectsLoading && (
					<p className="text-sm text-slate-400 mb-6">아래에서 새 프로젝트를 추가하세요.</p>
				)}
				{/* 로그인 안내 - 로그인하지 않은 경우 */}
				{!isAuthenticated && !isAuthLoading && (
					<button
						onClick={() => setCurrentView(ViewID.LOGIN)}
						className="inline-flex items-center gap-2 px-6 py-3 mb-8 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl text-sm font-bold transition-all border border-indigo-200">
						<Lock size={16} />
						로그인하고 대시보드 이용하기
						<ArrowRight size={14} />
					</button>
				)}

				{/* Tab Selection - Minimal Style (Removed drop shadow effects) */}
				<div className="flex bg-slate-100 p-1 rounded-[2.2rem] border border-slate-200 mb-4 max-w-md mx-auto relative z-10">
					<button
						onClick={() => {
							setConnectMode("file");
							setConnectError(null);
						}}
						className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-[1.8rem] text-sm font-black transition-all relative ${connectMode === "file" ? "bg-white text-indigo-600 border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}>
						<FileArchive size={18} />
						파일 업로드
						<span className="absolute -top-3 -right-3 px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full border-2 border-white animate-reveal">권장</span>
					</button>
					<button
						onClick={() => {
							setConnectMode("url");
							setConnectError(null);
						}}
						className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-[1.8rem] text-sm font-black transition-all ${connectMode === "url" ? "bg-white text-indigo-600 border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}>
						<LinkIcon size={18} />
						사이트 링크
					</button>
				</div>

				{/* Info Box - Method Comparison Hint */}
				<div
					key={connectMode}
					className={`flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-bold mb-8 max-w-md mx-auto animate-reveal ${
						connectMode === "file" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-amber-50 text-amber-600 border border-amber-100"
					}`}>
					{connectMode === "file" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
					<span>{connectMode === "file" ? "로그인, 결제 등 모든 기능이 그대로 작동합니다." : "일부 기능이 작동하지 않을 수 있습니다."}</span>
					<button onClick={() => setShowCompareModal(true)} className="underline underline-offset-2 hover:no-underline ml-1">
						자세히 보기
					</button>
				</div>

				<div className="space-y-6 max-w-xl mx-auto">
					{generatedUrl ? (
						<div className="p-10 bg-indigo-50/50 border border-indigo-100 rounded-[3rem] space-y-6 animate-scale-in">
							<div className="flex items-center justify-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest mb-1">
								<Sparkles size={18} className="animate-pulse" /> 분석용 사이트 생성 완료
							</div>
							<div className="relative flex items-center gap-3 bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm group">
								<div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
									<Globe size={20} />
								</div>
								<span className="flex-1 text-left truncate text-slate-700 font-black text-sm">{generatedUrl}</span>
								<div className="flex items-center gap-2">
									{copySuccess && <span className="text-[10px] font-black text-emerald-500 animate-reveal whitespace-nowrap">복사됨!</span>}
									<button onClick={() => handleCopyUrl(generatedUrl)} className={`p-3 rounded-xl transition-all ${copySuccess ? "bg-emerald-50 text-emerald-600 scale-110" : "bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white"}`}>
										{copySuccess ? <Check size={18} /> : <Copy size={18} />}
									</button>
								</div>
							</div>
							<p className="text-[12px] font-bold text-slate-400 leading-relaxed px-4">
								축하합니다! 이제 위 링크를 통해 접속하는 모든 데이터가
								<br />
								ARTIFY Intelligence로 실시간 수집됩니다.
							</p>
							<div className="grid grid-cols-2 gap-4">
								<button onClick={() => {
									if (isAuthenticated && currentProject) {
										setCurrentView(ViewID.ANALYTICS);
									} else {
										setCurrentView(ViewID.LOGIN);
									}
								}} className="w-full bg-indigo-600 text-white py-4.5 rounded-2xl font-black text-md hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95">
									대시보드 보기
								</button>
								<button onClick={handleResetConnect} className="w-full bg-white border border-slate-200 text-slate-600 py-4.5 rounded-2xl font-black text-md hover:bg-slate-50 transition-all active:scale-95">
									다른 사이트 추가
								</button>
							</div>
						</div>
					) : (
						<>
							{connectMode === "url" ? (
								<div className="space-y-4 animate-reveal">
									<div className="relative group">
										<div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
											<Globe size={22} />
										</div>
										<input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://your-site.com" className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-slate-900 font-bold placeholder:text-slate-300 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all shadow-inner" />
									</div>
									<div className="grid grid-cols-2 gap-4">
										<input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="프로젝트 이름" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-slate-900 font-bold placeholder:text-slate-300 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all shadow-inner" />
										<input type="text" value={subdomain} onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="서브도메인 (선택)" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-slate-900 font-bold placeholder:text-slate-300 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all shadow-inner" />
									</div>
									{/* 호스팅 모드 UI 숨김 - 동적 크롤링으로 대체됨 (백엔드 코드는 유지) */}
									<button onClick={handleGenerateFromUrl} disabled={isGenerating || !isAuthenticated} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl tracking-tight hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70 shadow-2xl shadow-slate-900/10">
										{isGenerating ? (
											<>
												<Loader2 size={24} className="animate-spin" />
												분석 정보 동기화 중...
											</>
										) : !isAuthenticated ? (
											<>
												<Lock size={22} />
												로그인 후 이용 가능
											</>
										) : (
											<>
												통계 버전 생성 시작 <ArrowRight size={22} />
											</>
										)}
									</button>
									{!isAuthenticated && (
										<button onClick={handleGoogleLogin} className="w-full border-2 border-slate-200 bg-white py-4 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95">
											<img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
											Google 계정으로 로그인
										</button>
									)}
								</div>
							) : (
								<div className="space-y-6 animate-reveal">
									{uploadStatus === "idle" ? (
										<div
											onClick={() => fileInputRef.current?.click()}
											onDragOver={e => {
												e.preventDefault();
												e.stopPropagation();
											}}
											onDrop={e => {
												e.preventDefault();
												e.stopPropagation();
												if (e.dataTransfer.files[0]) validateAndUploadFile(e.dataTransfer.files[0]);
											}}
											className="group cursor-pointer border-3 border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/20 bg-slate-50 rounded-[3rem] p-16 transition-all duration-300 flex flex-col items-center justify-center gap-5">
											<input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".zip" />
											<div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:shadow-xl group-hover:shadow-indigo-100 transition-all">
												<UploadCloud size={40} />
											</div>
											<div>
												<p className="text-lg font-black text-slate-900 mb-1">ZIP 파일을 여기에 끌어다 놓으세요</p>
												<p className="text-sm font-bold text-slate-400">또는 클릭하여 내 컴퓨터에서 선택 (최대 50MB)</p>
											</div>
											<div className="flex flex-wrap justify-center gap-2.5 mt-2">
												<span className="px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-[10px] font-black text-slate-400">정적 파일 권장</span>
												<span className="px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-[10px] font-black text-slate-400">index.html 필수</span>
												<span className="px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-[10px] font-black text-slate-400">깨짐 확률 0%</span>
											</div>
										</div>
									) : (
										<div className="p-10 bg-white border-2 border-slate-100 rounded-[3rem] space-y-8 animate-scale-in">
											<div className="flex items-center gap-5 text-left">
												<div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shrink-0">
													<FileArchive size={30} />
												</div>
												<div className="flex-1 overflow-hidden">
													<h4 className="font-black text-slate-900 truncate">{selectedFile?.name}</h4>
													<p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{(selectedFile!.size / (1024 * 1024)).toFixed(2)} MB • Ready to Process</p>
												</div>
												{uploadStatus === "uploaded" && (
													<button onClick={() => setUploadStatus("idle")} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
														<Trash2 size={20} />
													</button>
												)}
											</div>

											{uploadStatus === "uploading" ? (
												<div className="space-y-4">
													<div className="flex justify-between items-end text-[11px] font-black text-indigo-600 uppercase tracking-widest">
														<span>파일 분석 및 업로드 중...</span>
														<span>{uploadProgress}%</span>
													</div>
													<div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
														<div className="h-full bg-indigo-600 transition-all duration-300 shimmer" style={{ width: `${uploadProgress}%` }}></div>
													</div>
												</div>
											) : (
												<div className="space-y-5">
													<div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center gap-4 text-left">
														<div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
															<FileCode size={20} />
														</div>
														<div>
															<p className="text-[13px] font-bold text-slate-900">index.html 파일을 감지했습니다</p>
															<p className="text-[11px] font-bold text-slate-400 mt-0.5">정적 사이트 구조가 유효하며 최적화 준비가 되었습니다.</p>
														</div>
													</div>
													<div className="grid grid-cols-2 gap-4">
														<input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="프로젝트 이름 *" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 font-bold placeholder:text-slate-300 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all" />
														<input type="text" value={subdomain} onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="서브도메인 *" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 font-bold placeholder:text-slate-300 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all" />
													</div>
													<p className="text-[11px] font-bold text-slate-400 text-left">* 생성될 주소: <span className="text-indigo-600">{subdomain || 'your-site'}.artify.page</span></p>
													<button onClick={handleGenerateFromFile} disabled={isGenerating || !isAuthenticated} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl tracking-tight hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70 shadow-2xl shadow-slate-900/10">
														{isGenerating ? (
															<>
																<Loader2 size={24} className="animate-spin" />
																통계 인프라 구축 중...
															</>
														) : !isAuthenticated ? (
															<>
																<Lock size={22} />
																로그인 후 이용 가능
															</>
														) : (
															<>
																지금 바로 생성하기 <ArrowRight size={22} />
															</>
														)}
													</button>
													{!isAuthenticated && (
														<button onClick={handleGoogleLogin} className="w-full border-2 border-slate-200 bg-white py-4 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95">
															<img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
															Google 계정으로 로그인
														</button>
													)}
												</div>
											)}
										</div>
									)}
								</div>
							)}
						</>
					)}

					{connectError && (
						<div className="mt-6 flex items-center justify-center gap-2.5 text-rose-500 font-black text-sm bg-rose-50 py-3.5 px-6 rounded-2xl border border-rose-100 animate-reveal">
							<AlertTriangle size={18} /> {connectError}
						</div>
					)}
				</div>

				<div className="mt-16 pt-10 border-t border-slate-50 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60">
					<div className="flex items-center gap-2.5 text-[11px] font-black text-slate-400">
						<ShieldCheck size={16} className="text-emerald-500" />
						자동 IP 마스킹 (익명성 보장)
					</div>
					<div className="flex items-center gap-2.5 text-[11px] font-black text-slate-400">
						<Lock size={16} className="text-indigo-500" />
						AES-256 파일 암호화 전송
					</div>
					<div className="flex items-center gap-2.5 text-[11px] font-black text-slate-400">
						<Check size={16} className="text-indigo-600" />
						99.9% 렌더링 무결성 보장
					</div>
				</div>
			</div>
		</div>

		{/* Compare Modal */}
		{showCompareModal && (
			<div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl" onClick={() => setShowCompareModal(false)}>
				<div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl animate-scale-in overflow-hidden" onClick={e => e.stopPropagation()}>
					{/* Modal Header */}
					<div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
						<h3 className="font-black text-slate-900 text-lg tracking-tight">어떤 방식이 나에게 맞을까요?</h3>
						<button onClick={() => setShowCompareModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
							<X size={20} />
						</button>
					</div>

					{/* Modal Content */}
					<div className="p-8 space-y-6">
						{/* Comparison Table */}
						<div className="space-y-3">
							{[
								{ label: "로그인 / 회원가입", file: true, url: false },
								{ label: "결제 / 장바구니", file: true, url: false },
								{ label: "폼 제출 / 검색", file: true, url: "partial" },
								{ label: "페이지 이동", file: true, url: true },
								{ label: "화면 표시", file: "원본 그대로", url: "일부 깨질 수 있음" },
							].map((item, idx) => (
								<div key={idx} className="grid grid-cols-3 gap-4 py-3 border-b border-slate-50 last:border-0">
									<span className="text-sm font-bold text-slate-600">{item.label}</span>
									<div className="flex items-center justify-center gap-1.5">
										{item.file === true ? (
											<><CheckCircle2 size={16} className="text-emerald-500" /><span className="text-xs font-bold text-emerald-600">정상 작동</span></>
										) : (
											<span className="text-xs font-bold text-slate-500">{item.file}</span>
										)}
									</div>
									<div className="flex items-center justify-center gap-1.5">
										{item.url === true ? (
											<><CheckCircle2 size={16} className="text-emerald-500" /><span className="text-xs font-bold text-emerald-600">정상 작동</span></>
										) : item.url === false ? (
											<><X size={16} className="text-rose-400" /><span className="text-xs font-bold text-rose-500">작동 안 함</span></>
										) : item.url === "partial" ? (
											<><AlertTriangle size={14} className="text-amber-500" /><span className="text-xs font-bold text-amber-600">제한적</span></>
										) : (
											<span className="text-xs font-bold text-slate-500">{item.url}</span>
										)}
									</div>
								</div>
							))}
						</div>

						{/* Recommendation Section */}
						<div className="grid grid-cols-2 gap-4 pt-4">
							<div className="p-4 bg-indigo-50 rounded-xl text-center">
								<FileArchive size={20} className="text-indigo-600 mx-auto mb-2" />
								<p className="text-xs font-black text-indigo-600 mb-1">파일 업로드</p>
								<p className="text-[11px] font-bold text-indigo-400">실제 운영할 사이트</p>
							</div>
							<div className="p-4 bg-amber-50 rounded-xl text-center">
								<LinkIcon size={20} className="text-amber-600 mx-auto mb-2" />
								<p className="text-xs font-black text-amber-600 mb-1">URL 입력</p>
								<p className="text-[11px] font-bold text-amber-400">빠른 미리보기/테스트</p>
							</div>
						</div>
					</div>

					{/* Modal Footer */}
					<div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50">
						<button onClick={() => setShowCompareModal(false)} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-black text-sm hover:bg-slate-800 transition-colors">
							확인
						</button>
					</div>
				</div>
			</div>
		)}
		</>
	);

	const renderLoginView = () => (
		<div className="flex-1 flex items-center justify-center p-6 animate-reveal">
			<div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden min-h-[550px]">
				{/* Login Form Column */}
				<div className="p-12 md:p-16 flex flex-col justify-center items-center">
					<div className="w-full max-w-sm space-y-8">
						{/* Logo & Title */}
						<div className="text-center space-y-3">
							<div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/20">
								<Sigma size={32} className="text-white" />
							</div>
							<h2 className="text-2xl font-black text-slate-900 tracking-tight">ARTIFY에 오신 것을 환영합니다</h2>
							<p className="text-sm font-medium text-slate-500">Google 계정으로 간편하게 시작하세요</p>
						</div>

						{/* Google Login Button */}
						<button
							type="button"
							onClick={handleGoogleLogin}
							className="w-full border-2 border-slate-200 bg-white py-4 rounded-2xl font-black text-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm"
						>
							<svg className="w-5 h-5" viewBox="0 0 24 24">
								<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
								<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
								<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
								<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
							</svg>
							Google 계정으로 계속하기
						</button>

						{/* Terms */}
						<p className="text-[11px] text-center text-slate-400 leading-relaxed">
							계속 진행하면 ARTIFY의{" "}
							<span className="text-slate-600 underline underline-offset-2 cursor-pointer hover:text-indigo-600">이용약관</span> 및{" "}
							<span className="text-slate-600 underline underline-offset-2 cursor-pointer hover:text-indigo-600">개인정보처리방침</span>에 동의하는 것으로 간주됩니다.
						</p>
					</div>
				</div>

				{/* Brand Side Panel */}
				<div className="hidden lg:flex bg-slate-900 p-16 flex-col justify-between text-white relative overflow-hidden">
					<div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none">
						<div className="absolute top-[10%] right-[-5%] w-80 h-80 bg-indigo-500 rounded-full blur-[120px]"></div>
						<div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 bg-emerald-500 rounded-full blur-[100px]"></div>
					</div>

					<div className="relative z-10">
						<div className="flex items-center gap-3 mb-10">
							<div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
								<Sigma size={24} />
							</div>
							<h1 className="text-xl font-black tracking-tighter">ARTIFY Intelligence</h1>
						</div>
						<h3 className="text-4xl font-black tracking-tighter leading-tight mb-8">
							데이터 이면의
							<br />
							진짜 가치를 찾아내세요.
						</h3>
						<div className="space-y-6">
							{[
								{ i: <LayoutGrid size={18} />, t: "유입경로/페이지/기기환경 한눈에" },
								{ i: <Clock size={18} />, t: "시간대별 트래픽 흐름 분석" },
								{ i: <Zap size={18} />, t: "웹 성능(Core Web Vitals) 추적" },
							].map((b, i) => (
								<div key={i} className="flex items-center gap-4 group cursor-default">
									<div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">{b.i}</div>
									<span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{b.t}</span>
								</div>
							))}
						</div>
					</div>

					<div className="relative z-10 pt-10 border-t border-white/5">
						<p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Stat Engine v4.2.0</p>
					</div>
				</div>
			</div>
		</div>
	);

	const renderDashboardView = () => (
		<div className="flex-1 ml-60 p-10 lg:p-14 max-w-screen-2xl mx-auto transition-opacity duration-300 flex flex-col min-h-screen">
			{!isBillingPage && (
				<header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-5">
					<div className="animate-reveal">
						<div className="flex items-center gap-2.5 text-indigo-600 font-black text-[11px] mb-2.5 uppercase tracking-[0.2em]">
							<div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></div>ARTIFY Statistical Analysis Engine
							{realtimeData && (
								<span className="ml-4 text-emerald-500 flex items-center gap-1.5">
									<Activity size={12} /> {realtimeData.active_users} 실시간 사용자
								</span>
							)}
						</div>
						<div className="flex items-center gap-4">
							<h2 className="text-4xl font-black text-slate-900 tracking-tighter">{NAVIGATION_ITEMS.find(i => i.id === activeTab)?.label || "ARTIFY Intelligence Suite"}</h2>
							{/* 프로젝트 선택기 */}
							{projects.length > 0 && (
								<div className="relative flex items-center gap-2">
									<button
										onClick={() => setShowProjectSelector(!showProjectSelector)}
										className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-600 transition-colors"
									>
										<Globe size={16} />
										{currentProject?.name || '프로젝트 선택'}
										{/* 현재 프로젝트 상태 배지 */}
										{currentProject && currentProject.status && currentProject.status !== 'READY' && (
											<span className={`ml-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${
												currentProject.status === 'PROCESSING' || currentProject.status === 'PENDING'
													? 'bg-amber-100 text-amber-700'
													: currentProject.status === 'ERROR'
													? 'bg-red-100 text-red-700'
													: 'bg-slate-100 text-slate-500'
											}`}>
												{currentProject.status === 'PENDING' ? '대기중' :
												 currentProject.status === 'PROCESSING' ? '준비중' :
												 currentProject.status === 'ERROR' ? '오류' : currentProject.status}
											</span>
										)}
										<ChevronDown size={16} className={`transition-transform ${showProjectSelector ? 'rotate-180' : ''}`} />
									</button>
									{/* URL 복사 버튼 */}
									{currentProject && currentProject.status === 'READY' && (
										<button
											onClick={() => {
												const url = `https://${currentProject.subdomain}.artify.page`;
												navigator.clipboard.writeText(url);
												showToast(`URL이 복사되었습니다: ${url}`, 'success');
											}}
											className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-xs font-bold text-indigo-600 transition-colors"
											title={`https://${currentProject.subdomain}.artify.page`}
										>
											<Copy size={14} />
											URL 복사
										</button>
									)}
									{showProjectSelector && (
										<div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden">
											<div className="p-2 border-b border-slate-100">
												<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">프로젝트 목록</p>
											</div>
											<div className="max-h-60 overflow-auto">
												{projects.map(project => (
													<div
														key={project.id}
														className={`w-full px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between ${
															currentProject?.id === project.id ? 'bg-indigo-50' : ''
														}`}
													>
														<button
															onClick={() => {
																selectProject(project);
																setShowProjectSelector(false);
															}}
															className="flex items-center gap-2 flex-1 text-left"
														>
															{/* 상태 인디케이터 */}
															{project.status === 'READY' ? (
																<span className="w-2 h-2 rounded-full bg-green-500" title="준비 완료" />
															) : project.status === 'PROCESSING' || project.status === 'PENDING' ? (
																<span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title={project.status_message || '준비 중'} />
															) : project.status === 'ERROR' ? (
																<span className="w-2 h-2 rounded-full bg-red-500" title={project.status_message || '오류'} />
															) : (
																<span className="w-2 h-2 rounded-full bg-slate-300" />
															)}
															<div>
																<p className="text-sm font-bold text-slate-700">{project.name}</p>
																<p className="text-[10px] text-slate-400">
																	{project.status === 'READY' || !project.status
																		? project.full_domain
																		: project.status_message || '준비 중...'}
																</p>
															</div>
														</button>
														<div className="flex items-center gap-1">
															{currentProject?.id === project.id && (
																<Check size={16} className="text-indigo-600" />
															)}
															<button
																onClick={async (e) => {
																	e.stopPropagation();
																	if (confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
																		try {
																			await deleteProject(project.id);
																			showToast('프로젝트가 삭제되었습니다.', 'success');
																			if (currentProject?.id === project.id) {
																				selectProject(null);
																			}
																		} catch (error) {
																			showToast('프로젝트 삭제에 실패했습니다.', 'error');
																		}
																	}
																}}
																className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
																title="프로젝트 삭제"
															>
																<Trash2 size={14} />
															</button>
														</div>
													</div>
												))}
											</div>
											<div className="p-2 border-t border-slate-100">
												<button
													onClick={() => {
														setShowProjectSelector(false);
														setCurrentView(ViewID.CONNECT);
													}}
													className="w-full px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors flex items-center gap-2"
												>
													<Sigma size={14} /> 새 프로젝트 추가
												</button>
											</div>
										</div>
									)}
								</div>
							)}
						</div>
					</div>
					<div className="flex flex-col sm:flex-row gap-3.5 items-center">
						<div className="flex items-center bg-white border border-slate-200 rounded-[1.5rem] shadow-sm p-1.5 gap-2">
							<div className="flex items-center gap-1.5 px-1">
								{[
									{ id: TimeRange.DAY, label: "일" },
									{ id: TimeRange.WEEK, label: "주" },
									{ id: TimeRange.MONTH, label: "월" },
									{ id: TimeRange.YEAR, label: "년" },
								].map(range => (
									<button key={range.id} onClick={() => setTimeRange(range.id)} className={`px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all h-9 flex items-center justify-center min-w-[48px] ${timeRange === range.id ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}>
										{range.label}
									</button>
								))}
							</div>
							<div className="flex items-center bg-slate-50 rounded-xl p-0.5">
								<button onClick={() => handleNavigateTime("prev")} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 active:scale-90 transition-all">
									<ChevronLeft size={18} />
								</button>
								<button onClick={() => handleNavigateTime("next")} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 active:scale-90 transition-all">
									<ChevronRight size={18} />
								</button>
							</div>
						</div>
						<div className="bg-white pl-5 pr-1.5 py-1.5 rounded-[1.5rem] border border-slate-200 flex items-center gap-4 text-sm font-black text-slate-600 shadow-sm">
							<div className="flex items-center gap-3">
								<Calendar size={18} className="text-slate-400" />
								<span className="whitespace-nowrap">{formattedPeriodLabel}</span>
							</div>
							<button onClick={() => setCurrentDate(new Date())} className="bg-indigo-600 text-white text-[9px] font-black py-2.5 px-4 rounded-[1rem] shadow-lg shadow-indigo-100 uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2">
								<RefreshCcw size={11} />
								<span>Today</span>
							</button>
						</div>
						{currentProject?.source_type === "URL" ? (
							<button
								onClick={handleRecrawl}
								disabled={isRecrawling}
								className="bg-slate-900 text-white px-7 py-3 rounded-[1.5rem] flex items-center gap-2.5 text-sm font-black shadow-2xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isRecrawling ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} 다시 가져오기
							</button>
						) : currentProject?.source_type === "ZIP" ? (
							<button
								onClick={() => setShowRedeployModal(true)}
								className="bg-slate-900 text-white px-7 py-3 rounded-[1.5rem] flex items-center gap-2.5 text-sm font-black shadow-2xl hover:bg-slate-800 transition-all active:scale-95"
							>
								<Upload size={16} /> 재배포
							</button>
						) : null}
					</div>
				</header>
			)}
			{!isBillingPage && (
				<div className="mb-10 relative overflow-hidden group animate-reveal" style={{ animationDelay: "0.2s" }}>
					<div className="absolute inset-0 bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200"></div>
					<div className="relative p-9 flex flex-col md:flex-row items-stretch gap-9 text-white">
						<div className="md:w-2/3 flex flex-col gap-6">
							<div className="flex items-start gap-5">
								<div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
									<Sigma size={28} />
								</div>
								<div className="flex-1">
									<h4 className="text-xl font-black tracking-tighter mb-2.5">ARTIFY 정보 브리핑</h4>
									<p className="text-slate-300 text-[15px] leading-relaxed font-medium">{insights?.summary || "데이터 수집 및 통계 분석 중..."}</p>
								</div>
							</div>
							{insights && (
								<div className="flex flex-wrap gap-2.5">
									{insights.recommendations.map((rec, i) => (
										<span key={i} className="text-[10px] bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full font-bold flex items-center gap-2 text-indigo-200">
											<Check size={12} className="text-emerald-400" /> {rec}
										</span>
									))}
								</div>
							)}
						</div>
						<div className="md:w-1/3 bg-black/20 rounded-[1.75rem] border border-white/5 p-6 flex flex-col gap-5">
							<h5 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2 flex items-center gap-2">
								<Binary size={14} className="text-indigo-500" />
								Statistical Signals
							</h5>
							<div className="space-y-4">
								{insights?.signals.map((signal, i) => (
									<div key={i} className="flex gap-3">
										<div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${signal.direction === "positive" ? "bg-emerald-500" : "bg-rose-500"}`}></div>
										<p className="text-[11px] font-bold text-slate-200 leading-snug">{signal.description}</p>
									</div>
								))}
								{(!insights || insights.signals.length === 0) && <p className="text-[11px] font-bold text-slate-500">계산을 위한 충분한 샘플을 수집 중입니다.</p>}
							</div>
						</div>
					</div>
				</div>
			)}

			<div className="flex-1">
				{!currentProject && !isBillingPage ? (
					<div className="flex flex-col items-center justify-center py-20 text-center">
						<div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6">
							<Globe size={40} className="text-slate-300" />
						</div>
						<h3 className="text-2xl font-black text-slate-900 mb-3">프로젝트를 선택하세요</h3>
						<p className="text-slate-500 mb-8 max-w-md">
							분석할 프로젝트를 선택하거나 새 프로젝트를 추가하여 웹사이트 분석을 시작하세요.
						</p>
						<div className="flex gap-4">
							{projects.length > 0 && (
								<button
									onClick={() => selectProject(projects[0])}
									className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-colors"
								>
									첫 번째 프로젝트 선택
								</button>
							)}
							<button
								onClick={() => setCurrentView(ViewID.CONNECT)}
								className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors flex items-center gap-2"
							>
								<Sigma size={18} /> 새 프로젝트 추가
							</button>
						</div>
					</div>
				) : (
					renderTabContentBody()
				)}
			</div>

			<Footer />
		</div>
	);

	const renderTabContentBody = () => {
		if (activeTab === TabID.BILLING_UPGRADE) return <BillingUpgrade subscription={subscription} onNavigate={handleTabChange} onSelectPlan={handleSelectPlan} />;
		if (activeTab === TabID.BILLING_SUCCESS) return <BillingSuccess onReturn={() => handleTabChange(TabID.OVERVIEW)} />;
		if (activeTab === TabID.BILLING_CANCEL) return <BillingCancel onReturn={() => handleTabChange(TabID.BILLING_UPGRADE)} />;

		switch (activeTab) {
			case TabID.OVERVIEW:
				return (
					<div className="space-y-7 animate-reveal">
						{isAnalyticsLoading && (
							<div className="flex items-center justify-center py-4">
								<Loader2 size={24} className="animate-spin text-indigo-600" />
								<span className="ml-2 text-sm font-bold text-slate-500">데이터 로딩 중...</span>
							</div>
						)}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
							<MetricCard title="총 방문자 수" value={displayMetrics.totalVisitors.toLocaleString()} change={displayMetrics.comparison?.changes.total_visitors ?? 0} description="선택한 기간 동안 사이트를 방문한 총 순 방문자 수입니다." icon={<Users size={18} />} />
							<MetricCard title={getAverageVisitorLabel()} value={formatDailyAverage(displayMetrics.dailyAverage)} change={displayMetrics.comparison?.changes.sessions ?? 0} description="선택한 기간 내 평균 방문자 수입니다." icon={<Activity size={18} />} />
							<MetricCard title="평균 체류시간" value={formatSessionTime(displayMetrics.avgSessionTime)} change={displayMetrics.comparison?.changes.avg_session_time ?? 0} description="사용자가 사이트에 머무르는 평균 시간으로 몰입도를 나타냅니다." icon={<Clock size={18} />} />
							<MetricCard title="이탈률" value={displayMetrics.bounceRate.toFixed(1)} suffix="%" change={displayMetrics.comparison?.changes.bounce_rate ?? 0} description="첫 페이지만 보고 이탈한 방문자의 비율입니다." icon={<TrendingDown size={18} />} />
						</div>
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
							<div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
								<div className="flex justify-between items-center mb-8">
									<div>
										<h3 className="text-xl font-black text-slate-900 tracking-tight">방문자 추이</h3>
										<p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{timeRange.toUpperCase()} Visitor Trend</p>
									</div>
									<div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
										<div className="flex items-center gap-1.5">
											<div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200"></div> 방문자 추이
										</div>
									</div>
								</div>
								<div className="h-72 w-full">
									<ResponsiveContainer width="100%" height="100%">
										<AreaChart data={chartData}>
											<defs>
												<linearGradient id="colorVisitsMain" x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
													<stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
												</linearGradient>
											</defs>
											<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
											<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} dy={15} />
											<YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} dx={-10} />
											<Tooltip cursor={{ stroke: "#6366f1", strokeWidth: 1 }} contentStyle={{ borderRadius: "20px", border: "none", boxShadow: "0 25px 50px -12px rgb(0 0, 0 / 0.15)", padding: "15px" }} />
											<Area type="monotone" dataKey="visits" stroke="#6366f1" strokeWidth={4} fill="url(#colorVisitsMain)" animationDuration={1000} />
										</AreaChart>
									</ResponsiveContainer>
								</div>
							</div>
							<div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col group relative">
								<h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">신규 vs 재방문 비율</h3>
								<div className="flex-1 flex flex-col items-center justify-center">
									<div className="h-56 w-full relative">
										<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
											<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retention</span>
											<span className="text-3xl font-black text-slate-900 tracking-tighter">{(displayMetrics.newVsReturning?.returning_ratio ?? 0).toFixed(1)}%</span>
										</div>
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={[
														{ name: "신규 방문", value: displayMetrics.newVsReturning?.new_ratio ?? 0, color: "#6366f1" },
														{ name: "재방문", value: displayMetrics.newVsReturning?.returning_ratio ?? 0, color: "#f1f5f9" },
													]}
													cx="50%"
													cy="50%"
													innerRadius={70}
													outerRadius={95}
													paddingAngle={8}
													dataKey="value"
													stroke="none"
													animationBegin={200}
													animationDuration={1500}>
													{[
														{ name: "신규", value: displayMetrics.newVsReturning?.new_ratio ?? 0, color: "#6366f1" },
														{ name: "재방문", value: displayMetrics.newVsReturning?.returning_ratio ?? 0, color: "#f1f5f9" },
													].map((e, i) => (
														<Cell key={i} fill={e.color} className="hover:opacity-80 transition-opacity" />
													))}
												</Pie>
											</PieChart>
										</ResponsiveContainer>
									</div>
									<div className="w-full mt-6 space-y-3">
										<div className="flex justify-between items-center p-3 rounded-2xl bg-indigo-50/30 border border-indigo-50">
											<div className="flex items-center gap-3">
												<div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
												<span className="text-[12px] font-bold text-slate-600">신규 방문자</span>
											</div>
											<span className="text-sm font-black text-slate-900">{(displayMetrics.newVsReturning?.new_ratio ?? 0).toFixed(1)}%</span>
										</div>
										<div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
											<div className="flex items-center gap-3">
												<div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
												<span className="text-[12px] font-bold text-slate-600">재방문자</span>
											</div>
											<span className="text-sm font-black text-slate-900">{(displayMetrics.newVsReturning?.returning_ratio ?? 0).toFixed(1)}%</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				);
			case TabID.BEHAVIOR:
				return (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-7 animate-reveal">
						<div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm">
							<h3 className="text-lg font-black mb-6">페이지별 트래픽</h3>
							<div className="space-y-1">
								{displayMetrics.topPages.length > 0 ? (
									displayMetrics.topPages.map((page, idx) => (
										<div key={idx} onClick={() => setSelectedHeatmapPage(page.path)} className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all ${selectedHeatmapPage === page.path ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.01]" : "hover:bg-slate-50"}`}>
											<div className="flex items-center gap-3">
												<span className={`text-[10px] font-black ${selectedHeatmapPage === page.path ? "text-white/40" : "text-slate-300"}`}>0{idx + 1}</span>
												<span className="text-sm font-bold">{page.title || page.path}</span>
											</div>
											<div className="text-right">
												<p className="text-sm font-black">{page.views.toLocaleString()}명</p>
												<p className={`text-[10px] font-bold ${selectedHeatmapPage === page.path ? "text-white/60" : "text-slate-400"}`}>평균 {formatSessionTime(page.avg_time || 0)}</p>
											</div>
										</div>
									))
								) : (
									<div className="text-center py-8 text-slate-400">
										<p className="text-sm">페이지 데이터 없음</p>
									</div>
								)}
							</div>
						</div>
						<div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-visible">
							<h3 className="text-lg font-black mb-6 flex items-center gap-2">
								<MousePointer2 size={18} className="text-rose-500" /> 히트맵 분석:
								{selectedHeatmapPage ? (
									<>
										<span className="text-indigo-600">{selectedHeatmapPage}</span>
										<span className="text-sm font-normal text-slate-500 ml-2">({heatmapData?.total_clicks?.toLocaleString() ?? 0} 클릭)</span>
									</>
								) : (
									<span className="text-slate-400 font-normal text-sm">페이지를 선택해주세요</span>
								)}
							</h3>
							<div className="aspect-video bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden shadow-inner">
								{!selectedHeatmapPage ? (
									<div className="flex flex-col items-center justify-center h-full text-slate-400">
										<MousePointer2 size={32} className="mb-3 opacity-30" />
										<p className="text-sm font-medium">좌측 페이지별 트래픽에서</p>
										<p className="text-sm font-medium">분석할 페이지를 선택해주세요</p>
									</div>
								) : heatmapData && heatmapData.heatmap_spots && heatmapData.heatmap_spots.length > 0 ? (
									(() => {
										const spots = heatmapData.heatmap_spots;
										const maxClicks = Math.max(...spots.map(s => s.clicks), 1);
										const colorOptions = ['bg-rose-500', 'bg-indigo-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500'];
										return spots.map((spot, idx) => {
											const intensity = spot.clicks / maxClicks;
											const size = 24 + intensity * 56;
											const color = colorOptions[idx % colorOptions.length];
											return (
												<div key={spot.element_id} className={`absolute rounded-full ${color} cursor-help group/spot flex items-center justify-center z-10 opacity-60`} style={{ left: `${spot.x_percent}%`, top: `${spot.y_percent}%`, width: `${size}px`, height: `${size}px`, transform: "translate(-50%, -50%)" }}>
													<div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover/spot:opacity-100 transition-all duration-300 pointer-events-none bg-slate-900 text-white text-[10px] font-black px-3 py-2.5 rounded-xl whitespace-nowrap z-[100] shadow-2xl scale-95 group-hover/spot:scale-100">
														{spot.element_id}: {spot.clicks.toLocaleString()} clicks
													</div>
												</div>
											);
										});
									})()
								) : (
									<div className="flex flex-col items-center justify-center h-full text-slate-400">
										<MousePointerClick size={32} className="mb-3 opacity-30" />
										<p className="text-sm font-medium">클릭 데이터 없음</p>
										<p className="text-xs mt-1">사용자 클릭이 수집되면 여기에 표시됩니다</p>
									</div>
								)}
							</div>
						</div>
					</div>
				);
			case TabID.ACQUISITION:
				return (
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-7 animate-reveal">
						<div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
							<h3 className="text-lg font-black mb-8">유입 채널</h3>
							<div className="space-y-6">
								{displayMetrics.trafficSources && displayMetrics.trafficSources.length > 0 ? (
									(() => {
										const totalUsers = displayMetrics.trafficSources.reduce((sum, s) => sum + (s.users || 0), 0) || 1;
										const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];
										return displayMetrics.trafficSources.slice(0, 5).map((source, i) => {
											const percentage = ((source.users || 0) / totalUsers * 100).toFixed(1);
											return (
												<div key={i} className="group">
													<div className="flex justify-between items-center mb-2 text-xs font-black">
														<span className="text-slate-600 flex items-center gap-2">
															<div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }}></div>
															{source.source || '직접 유입'}
														</span>
														<span className="text-slate-900">{percentage}%</span>
													</div>
													<div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
														<div className="h-full transition-all duration-1000 group-hover:brightness-90" style={{ width: `${percentage}%`, backgroundColor: colors[i % colors.length] }}></div>
													</div>
												</div>
											);
										});
									})()
								) : (
									<div className="text-center py-8 text-slate-400">
										<p className="text-sm">유입 경로 데이터 없음</p>
									</div>
								)}
							</div>
						</div>
						<div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
							<h3 className="text-lg font-black mb-8">국가별 유입</h3>
							<div className="space-y-5">
								{displayMetrics.geography && displayMetrics.geography.length > 0 ? (
									(() => {
										const maxUsers = displayMetrics.geography[0]?.users || 1;
										const countryEmojis: Record<string, string> = {
											'South Korea': '🇰🇷', 'Korea': '🇰🇷', 'KR': '🇰🇷',
											'United States': '🇺🇸', 'US': '🇺🇸',
											'Japan': '🇯🇵', 'JP': '🇯🇵',
											'China': '🇨🇳', 'CN': '🇨🇳',
										};
										return displayMetrics.geography.slice(0, 5).map((c, i) => {
											const emoji = countryEmojis[c.country] || '🌎';
											return (
												<div key={i} className="flex items-center gap-4 group">
													<div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-lg">{emoji}</div>
													<div className="flex-1">
														<div className="flex justify-between items-center mb-1 text-[11px] font-black">
															<span className="text-slate-700">{c.country}</span>
															<span className="text-slate-400">{(c.users || 0).toLocaleString()}</span>
														</div>
														<div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
															<div className="h-full bg-indigo-500/30" style={{ width: `${Math.min(((c.users || 0) / maxUsers) * 100, 100)}%` }}></div>
														</div>
													</div>
												</div>
											);
										});
									})()
								) : (
									<div className="text-center py-8 text-slate-400">
										<p className="text-sm">국가별 데이터 없음</p>
									</div>
								)}
							</div>
						</div>
					</div>
				);
			case TabID.TECH:
				return (
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-7 animate-reveal">
						<div className="lg:col-span-5 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
							<div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl"></div>
							<h3 className="text-lg font-black mb-12 flex items-center gap-2 w-full">
								<Smartphone size={18} className="text-indigo-500" /> 기기별 사용 비중
							</h3>
							<div className="flex items-center gap-16">
								<div className="text-center group cursor-default">
									<div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-500 mb-4 transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-indigo-100">
										<Smartphone size={48} />
									</div>
									<p className="text-3xl font-black text-slate-900 tracking-tighter">{(displayMetrics.mobileRatio || 0).toFixed(0)}%</p>
									<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Mobile</p>
								</div>
								<div className="w-px h-24 bg-slate-100"></div>
								<div className="text-center group cursor-default">
									<div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-400 mb-4 transition-all group-hover:scale-110 group-hover:bg-indigo-50 group-hover:text-indigo-500">
										<Monitor size={48} />
									</div>
									<p className="text-3xl font-black text-slate-900 tracking-tighter">{(displayMetrics.desktopRatio || 0).toFixed(0)}%</p>
									<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Desktop</p>
								</div>
							</div>
							<div className="mt-12 w-full bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
								<div className="flex items-center gap-3">
									<Tablet size={20} className="text-slate-300" />
									<span className="text-xs font-bold text-slate-500">기타 기기(태블릿 등)</span>
								</div>
								<span className="text-sm font-black text-slate-900">미미함 (&lt; 1%)</span>
							</div>
						</div>
						<div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-7">
							<div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
								<h3 className="text-base font-black mb-8 flex items-center gap-2">
									<Globe size={18} className="text-indigo-500" /> 브라우저 점유율
								</h3>
								<div className="space-y-6">
									{displayMetrics.browserOs?.browsers && displayMetrics.browserOs.browsers.length > 0 ? (
										displayMetrics.browserOs.browsers.slice(0, 5).map((b, i) => (
											<div key={i} className="group">
												<div className="flex justify-between text-xs font-black mb-1.5">
													<span className="text-slate-600">{b.name}</span>
													<span className="text-indigo-600">{b.percentage}%</span>
												</div>
												<div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
													<div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${b.percentage}%` }}></div>
												</div>
											</div>
										))
									) : (
										<div className="text-center py-8 text-slate-400">
											<p className="text-sm">브라우저 데이터 없음</p>
										</div>
									)}
								</div>
							</div>
							<div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
								<h3 className="text-base font-black mb-8 flex items-center gap-2">
									<Layers size={18} className="text-indigo-500" /> 운영체제 (OS)
								</h3>
								<div className="space-y-5">
									{displayMetrics.browserOs?.operating_systems && displayMetrics.browserOs.operating_systems.length > 0 ? (
										displayMetrics.browserOs.operating_systems.slice(0, 5).map((os, i) => (
											<div key={i} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all cursor-default">
												<span className="text-sm font-bold text-slate-700">{os.name}</span>
												<span className="text-sm font-black text-slate-900">{os.percentage}%</span>
											</div>
										))
									) : (
										<div className="text-center py-8 text-slate-400">
											<p className="text-sm">OS 데이터 없음</p>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			case TabID.CONVERSION:
				return (
					<div className="space-y-4 sm:space-y-7 animate-reveal">
						{/* 목표 추가 모달 */}
						{showGoalModal && (
							<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowGoalModal(false)}>
								<div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
									<div className="flex justify-between items-center mb-4 sm:mb-6">
										<h3 className="text-lg sm:text-xl font-black text-slate-900">새 목표 추가</h3>
										<button onClick={() => setShowGoalModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
											<X size={20} className="text-slate-400" />
										</button>
									</div>
									<div className="space-y-3 sm:space-y-4">
										<div>
											<label className="block text-sm font-bold text-slate-600 mb-2">목표 이름</label>
											<input
												type="text"
												value={newGoal.name}
												onChange={e => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
												placeholder="예: 일일 방문자 1000명 달성"
												className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
											/>
										</div>
										<div>
											<label className="block text-sm font-bold text-slate-600 mb-2">목표 유형</label>
											<select
												value={newGoal.goal_type}
												onChange={e => handleGoalTypeChange(e.target.value as GoalType)}
												className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
											>
												<option value="visitors">일일 방문자 (명)</option>
												<option value="stay_time">평균 체류시간 (초)</option>
												<option value="page_views">페이지뷰 (회)</option>
												<option value="bounce_rate">이탈률 (%, 목표 이하)</option>
												<option value="sessions">세션 수 (회)</option>
												<option value="new_visitors">신규 방문자 (명)</option>
											</select>
										</div>
										<div>
											<label className="block text-sm font-bold text-slate-600 mb-2">
												목표 값 ({goalTypeDefaults[newGoal.goal_type as GoalType]?.unit || ''})
											</label>
											<input
												type="number"
												value={newGoal.target_value}
												onChange={e => setNewGoal(prev => ({ ...prev, target_value: Number(e.target.value) }))}
												placeholder={goalTypeDefaults[newGoal.goal_type as GoalType]?.placeholder || ''}
												className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
											/>
											{newGoal.goal_type === 'bounce_rate' && (
												<p className="text-xs text-slate-400 mt-1">* 이탈률은 목표 값 이하로 낮추는 것이 목표입니다.</p>
											)}
										</div>
										<div>
											<label className="block text-sm font-bold text-slate-600 mb-2">목표 기간</label>
											<select
												value={newGoal.period}
												onChange={e => setNewGoal(prev => ({ ...prev, period: e.target.value }))}
												className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
											>
												<option value="daily">일간 (1일)</option>
												<option value="weekly">주간 (7일)</option>
												<option value="monthly">월간 (30일)</option>
												<option value="unlimited">기한없음</option>
											</select>
											{newGoal.period !== 'unlimited' && (
												<p className="text-xs text-slate-400 mt-1">
													* 목표 기간: 설정일로부터 {newGoal.period === 'daily' ? '1일' : newGoal.period === 'weekly' ? '7일' : '30일'}
												</p>
											)}
										</div>
									</div>
									<div className="flex gap-3 mt-5 sm:mt-6">
										<button
											onClick={() => setShowGoalModal(false)}
											className="flex-1 px-4 py-2.5 sm:py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm sm:text-base"
										>
											취소
										</button>
										<button
											onClick={handleCreateGoal}
											disabled={!newGoal.name}
											className="flex-1 px-4 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
										>
											추가
										</button>
									</div>
								</div>
							</div>
						)}

						{/* 목표 달성 메인 카드 */}
						<div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-5 sm:p-8 lg:p-10 rounded-2xl sm:rounded-[2.5rem] lg:rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
							<div className="absolute top-0 right-0 w-32 sm:w-48 lg:w-64 h-32 sm:h-48 lg:h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 sm:-mr-24 lg:-mr-32 -mt-16 sm:-mt-24 lg:-mt-32"></div>
							<div className="absolute bottom-0 left-0 w-24 sm:w-36 lg:w-48 h-24 sm:h-36 lg:h-48 bg-purple-500/10 rounded-full blur-3xl -ml-12 sm:-ml-18 lg:-ml-24 -mb-12 sm:-mb-18 lg:-mb-24"></div>

							<div className="relative z-10">
								<div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
									<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
										<div className="flex gap-4 sm:gap-6 items-center">
											<div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-indigo-500 rounded-xl sm:rounded-2xl lg:rounded-[2rem] flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
												<Target size={28} className="sm:hidden" />
												<Target size={32} className="hidden sm:block lg:hidden" />
												<Target size={40} className="hidden lg:block" />
											</div>
											<div>
												<p className="text-[10px] sm:text-xs font-black uppercase text-indigo-400 tracking-widest mb-1 sm:mb-2">나의 목표</p>
												<h4 className="text-xl sm:text-2xl lg:text-3xl font-black">
													{customGoals.length > 0 ? `${customGoals.length}개의 목표` : '목표를 설정해보세요'}
												</h4>
											</div>
										</div>
										<button
											onClick={() => setShowGoalModal(true)}
											className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-indigo-500 hover:bg-indigo-400 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2"
										>
											<Target size={16} className="sm:hidden" />
											<Target size={18} className="hidden sm:block" />
											새 목표 추가
										</button>
									</div>
								</div>

								{/* 목표 프로그레스 바 목록 */}
								{isLoadingGoals ? (
									<div className="flex items-center justify-center py-6 sm:py-8">
										<Loader2 size={24} className="animate-spin text-indigo-400" />
									</div>
								) : customGoals.length > 0 ? (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
										{customGoals.map(goal => {
											const progress = getGoalProgress(goal);
											const currentValue = getGoalCurrentValue(goal);
											const dDayInfo = calculateDDay(goal.period, goal.created_at);
											const unit = goalTypeDefaults[goal.goal_type as GoalType]?.unit || '';
											return (
												<div key={goal.id} className="bg-white/5 p-4 sm:p-5 rounded-xl sm:rounded-2xl group">
													<div className="flex justify-between items-start mb-2 sm:mb-3">
														<div className="flex-1 min-w-0 pr-2">
															<p className="text-xs sm:text-sm font-bold text-white mb-1 truncate">{goal.name}</p>
															<div className="flex items-center gap-2 flex-wrap">
																<p className="text-[10px] sm:text-xs text-slate-400">{getGoalTypeLabel(goal.goal_type as GoalType)}</p>
																{dDayInfo ? (
																	<span className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded ${dDayInfo.dDay <= 0 ? 'bg-red-500/20 text-red-400' : dDayInfo.dDay <= 3 ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
																		{getDDayText(dDayInfo.dDay)}
																	</span>
																) : (
																	<span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400">
																		기한없음
																	</span>
																)}
															</div>
														</div>
														<button
															onClick={() => handleDeleteGoal(goal.id)}
															className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all flex-shrink-0"
														>
															<Trash2 size={14} className="sm:hidden text-red-400" />
															<Trash2 size={16} className="hidden sm:block text-red-400" />
														</button>
													</div>
													<div className="flex justify-between text-xs sm:text-sm font-bold mb-2">
														<span className="text-slate-400">
															{goal.period === 'unlimited' ? '기한없음' : dDayInfo ? `${dDayInfo.targetDate}까지` : goal.period === 'daily' ? '일간' : goal.period === 'weekly' ? '주간' : '월간'}
														</span>
														<span className="text-white text-right">
															{goal.goal_type === 'bounce_rate'
																? `${currentValue.toFixed(1)}% / ${goal.target_value}%`
																: `${Math.round(currentValue).toLocaleString()}${unit} / ${goal.target_value.toLocaleString()}${unit}`
															}
														</span>
													</div>
													<div className="bg-white/10 h-2.5 sm:h-3 rounded-full overflow-hidden">
														<div
															className={`h-full bg-gradient-to-r ${getGoalColor(goal.goal_type as GoalType)} rounded-full transition-all duration-1000`}
															style={{ width: `${progress}%` }}
														></div>
													</div>
													<div className="flex justify-between items-center mt-1.5 sm:mt-2">
														<span className="text-[10px] sm:text-xs text-slate-500">
															{goal.goal_type === 'bounce_rate' ? '낮을수록 좋음' : ''}
														</span>
														<p className="text-[10px] sm:text-xs font-bold text-indigo-400">{progress.toFixed(1)}% 달성</p>
													</div>
												</div>
											);
										})}
									</div>
								) : (
									<div className="bg-white/5 p-6 sm:p-8 rounded-xl sm:rounded-2xl text-center">
										<p className="text-slate-400 mb-3 sm:mb-4 text-sm sm:text-base">아직 설정된 목표가 없습니다.</p>
										<button
											onClick={() => setShowGoalModal(true)}
											className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all"
										>
											첫 번째 목표 만들기
										</button>
									</div>
								)}
							</div>
						</div>

						{/* 최적화 팁 */}
						<div className="bg-white p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[2rem] lg:rounded-[2.5rem] border border-slate-200 shadow-sm">
							<h3 className="text-base sm:text-lg lg:text-xl font-black mb-4 sm:mb-5 lg:mb-6 flex items-center gap-2 sm:gap-3">
								<div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-amber-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
									<Lightbulb size={18} className="sm:hidden text-amber-500" />
									<Lightbulb size={20} className="hidden sm:block lg:hidden text-amber-500" />
									<Lightbulb size={22} className="hidden lg:block text-amber-500" />
								</div>
								최적화 팁
							</h3>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
								{getOptimizationTips().map((tip, i) => (
									<div key={i} className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-slate-50 rounded-xl sm:rounded-2xl">
										<div className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 ${tip.type === 'success' ? 'bg-emerald-100 text-emerald-600' : tip.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'} rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0`}>
											{tip.type === 'success' ? <Check size={16} className="sm:hidden" /> : tip.type === 'warning' ? <AlertTriangle size={16} className="sm:hidden" /> : <Lightbulb size={16} className="sm:hidden" />}
											{tip.type === 'success' ? <Check size={20} className="hidden sm:block" /> : tip.type === 'warning' ? <AlertTriangle size={20} className="hidden sm:block" /> : <Lightbulb size={20} className="hidden sm:block" />}
										</div>
										<p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed">{tip.message}</p>
									</div>
								))}
							</div>
						</div>
					</div>
				);
			case TabID.PERFORMANCE:
				// URL 프로젝트인 경우 외부 사이트라 성능 측정 불가 안내
				if (currentProject?.source_type === "URL") {
					return (
						<div className="space-y-8 animate-reveal">
							<div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm text-center">
								<div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
									<Globe size={40} className="text-slate-300" />
								</div>
								<h3 className="text-2xl font-black text-slate-900 mb-3">외부 사이트 성능 측정</h3>
								<p className="text-slate-500 mb-6 max-w-lg mx-auto">
									URL로 가져온 프로젝트는 외부 호스팅 사이트입니다. 성능 데이터는 실제 사이트 방문자의 브라우저에서 수집됩니다.
								</p>
								<div className="flex items-center justify-center gap-3 mb-8">
									<span className="text-sm font-bold text-slate-400">원본 사이트:</span>
									<a
										href={currentProject.source_url || "#"}
										target="_blank"
										rel="noopener noreferrer"
										className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
									>
										{currentProject.source_url} <ArrowUpRight size={14} />
									</a>
								</div>
								<button
									onClick={handleRecrawl}
									disabled={isRecrawling}
									className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
								>
									{isRecrawling ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
									사이트 다시 가져오기
								</button>
							</div>

							{/* 실제 사용자 수집 데이터 (있는 경우에만 표시) */}
							{webPerformanceData && webPerformanceData.sample_count > 0 && (
								<div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
									<div className="flex items-center justify-between mb-8">
										<div>
											<h3 className="text-2xl font-black text-slate-900 tracking-tight">실제 사용자 성능 데이터</h3>
											<p className="text-sm font-bold text-slate-400 mt-1">Core Web Vitals ({webPerformanceData.sample_count}개 샘플)</p>
										</div>
										<span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Real User Monitoring</span>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
										<div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
											<div className="flex items-center gap-2 mb-3">
												<span className="text-xs font-black text-slate-400 uppercase">LCP</span>
											</div>
											<p className="text-2xl font-black text-slate-900">{(webPerformanceData.lcp / 1000).toFixed(2)}s</p>
										</div>
										<div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
											<div className="flex items-center gap-2 mb-3">
												<span className="text-xs font-black text-slate-400 uppercase">FID</span>
											</div>
											<p className="text-2xl font-black text-slate-900">{webPerformanceData.fid}ms</p>
										</div>
										<div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
											<div className="flex items-center gap-2 mb-3">
												<span className="text-xs font-black text-slate-400 uppercase">CLS</span>
											</div>
											<p className="text-2xl font-black text-slate-900">{webPerformanceData.cls.toFixed(3)}</p>
										</div>
										<div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
											<div className="flex items-center gap-2 mb-3">
												<span className="text-xs font-black text-slate-400 uppercase">TTFB</span>
											</div>
											<p className="text-2xl font-black text-slate-900">{webPerformanceData.ttfb}ms</p>
										</div>
										<div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
											<div className="flex items-center gap-2 mb-3">
												<span className="text-xs font-black text-slate-400 uppercase">FCP</span>
											</div>
											<p className="text-2xl font-black text-slate-900">{(webPerformanceData.fcp / 1000).toFixed(2)}s</p>
										</div>
										<div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
											<div className="flex items-center gap-2 mb-3">
												<span className="text-xs font-black text-slate-400 uppercase">페이지 로드</span>
											</div>
											<p className="text-2xl font-black text-slate-900">{(webPerformanceData.page_load / 1000).toFixed(2)}s</p>
										</div>
									</div>
								</div>
							)}
						</div>
					);
				}

				// ZIP 프로젝트 - 자체 호스팅 사이트 성능 분석
				const perfScore = performanceData?.performance_score ?? 0;
				const perfScoreColor = perfScore >= 90 ? "#10b981" : perfScore >= 50 ? "#f59e0b" : "#ef4444";
				const perfScoreText = perfScore >= 90 ? "매우 안정적인" : perfScore >= 50 ? "개선이 필요한" : "최적화가 시급한";
				const perfMetricIcons: Record<string, React.ReactNode> = {
					LCP: <Clock size={18} />,
					TTFB: <Zap size={18} />,
					FID: <MousePointerClick size={18} />,
					CLS: <LayoutGrid size={18} />,
					FCP: <Timer size={18} />,
					TBT: <Monitor size={18} />,
				};
				const getStatusBgColor = (status: string) => {
					if (status === "Good") return "bg-emerald-50 text-emerald-600";
					if (status === "Needs Improvement") return "bg-amber-50 text-amber-600";
					return "bg-rose-50 text-rose-600";
				};
				const getProgressWidth = (status: string) => {
					if (status === "Good") return "100%";
					if (status === "Needs Improvement") return "60%";
					return "30%";
				};
				return (
					<div className="space-y-8 animate-reveal">
						{/* 자체 호스팅 사이트 성능 분석 - PageSpeed API 기반 */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
							<div className="lg:col-span-2 bg-white px-12 py-14 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-16 relative overflow-hidden">
								<div className="relative flex-shrink-0">
									<div className="w-44 h-44 rounded-full border-[6px] border-slate-50 flex flex-col items-center justify-center relative shadow-inner">
										<svg className="absolute inset-0 w-full h-full -rotate-90">
											<circle cx="50%" cy="50%" r="84" fill="transparent" stroke={perfScoreColor} strokeWidth="6" strokeDasharray="527.5" strokeDashoffset={527.5 * (1 - perfScore / 100)} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
										</svg>
										<span className="text-6xl font-black text-slate-900 tracking-tight">{perfScore || "-"}</span>
									</div>
								</div>
								<div className="flex-1 space-y-6">
									<div className="space-y-2">
										<h3 className="text-3xl font-black text-slate-900 tracking-tight">전체 성능 분석</h3>
										<p className="text-slate-400 text-sm font-bold leading-relaxed max-w-md">
											{performanceData ? (
												<>귀하의 사이트는 {perfScoreText} 로딩 성능을 보이고 있습니다. {perfScore >= 90 ? <>사용자의 <span className="text-indigo-600">95% 이상</span>이 쾌적한 환경을 경험합니다.</> : perfScore >= 50 ? "일부 항목의 최적화를 권장합니다." : "성능 최적화가 필요합니다."}</>
											) : (
												"성능 데이터를 불러오는 중입니다..."
											)}
										</p>
									</div>
									<div className="flex flex-wrap gap-3 pt-2">
										{performanceData?.optimizations?.length ? performanceData.optimizations.map((opt, i) => (
											<div key={i} className="flex items-center gap-2 px-3.5 py-1.5 border border-slate-100 rounded-full text-[11px] font-black bg-slate-50/50">
												<span className={opt.passed ? "text-emerald-500" : "text-amber-500"}>{opt.passed ? <Check size={14} /> : <AlertTriangle size={14} />}</span>
												<span className="text-slate-600">{opt.label}</span>
											</div>
										)) : (
											<span className="text-slate-400 text-xs">최적화 정보 없음</span>
										)}
									</div>
								</div>
							</div>

							<div className="bg-[#111827] p-10 rounded-[3rem] text-white flex flex-col justify-between shadow-2xl relative">
								<div>
									<h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-8 flex items-center gap-2">리소스 최적화 현황</h4>
									<div className="space-y-6">
										{performanceData?.optimizations?.length ? performanceData.optimizations.map((opt, i) => (
											<div key={i} className="flex justify-between items-center group cursor-default">
												<span className="text-[13px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors">{opt.label}</span>
												<span className={`text-xs font-black ${opt.passed ? "text-emerald-400" : "text-amber-400"}`}>{opt.passed ? "GOOD" : "개선 필요"}</span>
											</div>
										)) : (
											<span className="text-slate-500 text-xs">데이터 없음</span>
										)}
									</div>
								</div>
								<button
									onClick={() => setShowRedeployModal(true)}
									className="w-full mt-10 bg-indigo-600 hover:bg-indigo-700 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
								>
									<Upload size={14} /> 새 버전 배포
								</button>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{performanceData?.metrics?.length ? performanceData.metrics.map((m) => (
								<div key={m.id} className="bg-white p-7 rounded-[2.25rem] border border-slate-200 shadow-sm hover-lift group relative overflow-hidden">
									<div className="flex justify-between items-start mb-6">
										<div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">{perfMetricIcons[m.id] || <Activity size={18} />}</div>
										<div className="relative group/tt">
											<Info size={14} className="text-slate-300 cursor-help" />
											<div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-3 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover/tt:opacity-100 transition-all z-20 pointer-events-none font-bold leading-relaxed">{m.desc}</div>
										</div>
									</div>
									<div className="space-y-2">
										<div className="flex items-baseline gap-2">
											<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.id}</span>
											<span className={`px-2 py-0.5 text-[9px] font-black rounded-md ${getStatusBgColor(m.status)}`}>{m.status}</span>
										</div>
										<div className="text-3xl font-black text-slate-900 tracking-tighter">{m.val || "-"}</div>
										<div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
											<div className={`h-full ${m.color} rounded-full transition-all duration-1000`} style={{ width: getProgressWidth(m.status) }}></div>
										</div>
									</div>
								</div>
							)) : (
								<div className="col-span-3 text-center py-16 text-slate-400">
									{isAnalyticsLoading ? "성능 데이터를 불러오는 중..." : "성능 데이터가 없습니다"}
								</div>
							)}
						</div>

						{/* 실제 사용자 수집 데이터 섹션 */}
						{webPerformanceData && webPerformanceData.sample_count > 0 && (
							<div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
								<div className="flex items-center justify-between mb-8">
									<div>
										<h3 className="text-2xl font-black text-slate-900 tracking-tight">실제 사용자 성능 데이터</h3>
										<p className="text-sm font-bold text-slate-400 mt-1">Core Web Vitals (자체 수집, {webPerformanceData.sample_count}개 샘플)</p>
									</div>
									<span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Real User Monitoring</span>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
									<div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
										<div className="flex items-center gap-2 mb-3">
											<span className="text-xs font-black text-slate-400 uppercase">LCP</span>
											<span className={`px-2 py-0.5 text-[9px] font-black rounded-md ${webPerformanceData.lcp_score === 'good' ? 'bg-emerald-50 text-emerald-600' : webPerformanceData.lcp_score === 'needs_improvement' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
												{webPerformanceData.lcp_score === 'good' ? 'Good' : webPerformanceData.lcp_score === 'needs_improvement' ? 'Needs Improvement' : 'Poor'}
											</span>
										</div>
										<p className="text-2xl font-black text-slate-900">{(webPerformanceData.lcp / 1000).toFixed(2)}s</p>
									</div>
									<div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
										<div className="flex items-center gap-2 mb-3">
											<span className="text-xs font-black text-slate-400 uppercase">FID</span>
											<span className={`px-2 py-0.5 text-[9px] font-black rounded-md ${webPerformanceData.fid_score === 'good' ? 'bg-emerald-50 text-emerald-600' : webPerformanceData.fid_score === 'needs_improvement' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
												{webPerformanceData.fid_score === 'good' ? 'Good' : webPerformanceData.fid_score === 'needs_improvement' ? 'Needs Improvement' : 'Poor'}
											</span>
										</div>
										<p className="text-2xl font-black text-slate-900">{webPerformanceData.fid}ms</p>
									</div>
									<div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
										<div className="flex items-center gap-2 mb-3">
											<span className="text-xs font-black text-slate-400 uppercase">CLS</span>
											<span className={`px-2 py-0.5 text-[9px] font-black rounded-md ${webPerformanceData.cls_score === 'good' ? 'bg-emerald-50 text-emerald-600' : webPerformanceData.cls_score === 'needs_improvement' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
												{webPerformanceData.cls_score === 'good' ? 'Good' : webPerformanceData.cls_score === 'needs_improvement' ? 'Needs Improvement' : 'Poor'}
											</span>
										</div>
										<p className="text-2xl font-black text-slate-900">{webPerformanceData.cls.toFixed(3)}</p>
									</div>
									<div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
										<div className="flex items-center gap-2 mb-3">
											<span className="text-xs font-black text-slate-400 uppercase">TTFB</span>
										</div>
										<p className="text-2xl font-black text-slate-900">{webPerformanceData.ttfb}ms</p>
									</div>
									<div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
										<div className="flex items-center gap-2 mb-3">
											<span className="text-xs font-black text-slate-400 uppercase">FCP</span>
										</div>
										<p className="text-2xl font-black text-slate-900">{(webPerformanceData.fcp / 1000).toFixed(2)}s</p>
									</div>
									<div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
										<div className="flex items-center gap-2 mb-3">
											<span className="text-xs font-black text-slate-400 uppercase">페이지 로드</span>
										</div>
										<p className="text-2xl font-black text-slate-900">{(webPerformanceData.page_load / 1000).toFixed(2)}s</p>
									</div>
								</div>
							</div>
						)}
					</div>
				);
			default:
				return null;
		}
	};

	const Header = () => (
		<header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8 md:px-12 fixed top-0 w-full z-[100]">
			<div
				className="flex items-center gap-3 cursor-pointer"
				onClick={() => {
					handleResetConnect();
					setCurrentView(ViewID.CONNECT);
				}}>
				<div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-100">
					<Sigma size={20} />
				</div>
				<span className="text-lg font-black tracking-tighter text-slate-900 uppercase">ARTIFY</span>
			</div>
			<div className="flex items-center gap-6">
				{currentView !== ViewID.ANALYTICS && !isAuthenticated && (
					<button onClick={() => setCurrentView(currentView === ViewID.LOGIN ? ViewID.CONNECT : ViewID.LOGIN)} className="text-sm font-black text-slate-500 hover:text-indigo-600 transition-colors">
						{currentView === ViewID.LOGIN ? "서비스 연결" : "로그인"}
					</button>
				)}
				{isAuthenticated && (
					<div className="flex items-center gap-4">
						{user?.picture ? (
							<img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
						) : (
							<div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black text-[10px]">
								{user?.name?.charAt(0).toUpperCase() || 'U'}
							</div>
						)}
						<span className="text-xs font-bold text-slate-400">{user?.email}</span>
						{currentView !== ViewID.ANALYTICS && projects.length > 0 && (
							<button
								onClick={() => {
									if (projects.length > 0 && !currentProject) {
										selectProject(projects[0]);
									}
									setCurrentView(ViewID.ANALYTICS);
								}}
								className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-colors"
							>
								대시보드
							</button>
						)}
						<button
							onClick={handleLogout}
							className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
							title="로그아웃"
						>
							<LogOut size={18} />
						</button>
					</div>
				)}
			</div>
		</header>
	);

	const Footer = () => (
		<footer className="mt-auto py-16 border-t border-slate-200">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
				<div className="space-y-5">
					<div className="flex items-center gap-3">
						<div className="p-1.5 bg-indigo-600 rounded-lg text-white">
							<Activity size={18} />
						</div>
						<h3 className="text-[14px] font-black tracking-tighter text-slate-900 uppercase">ARTIFY Intelligence</h3>
					</div>
					<div className="space-y-1.5 text-slate-500 text-[12px] font-bold leading-relaxed">
						<div className="flex items-center gap-3">
							<MapPin size={14} className="text-slate-300" />
							<span>서울 강남구 역삼로 172 5층</span>
						</div>
						<div className="flex items-center gap-3">
							<Mail size={14} className="text-slate-300" />
							<span>
								문의{" "}
								<a href="mailto:mason0713sh@gmail.com" className="text-indigo-600 hover:text-indigo-700 underline underline-offset-4 decoration-indigo-200 hover:decoration-indigo-600 transition-all font-black">
									mason0713sh@gmail.com
								</a>
							</span>
						</div>
					</div>
				</div>
				<div className="flex flex-col items-start md:items-end gap-5">
					<div className="flex items-center gap-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
						<span>Privacy First</span>
						<span>|</span>
						<span>Reliable Tech</span>
						<span>|</span>
						<span>Statistical Integrity</span>
					</div>
					<p className="text-[11px] font-bold text-slate-400 tracking-wider">© 2026 ARTIFY</p>
				</div>
			</div>
		</footer>
	);

	return (
		<div className="min-h-screen flex flex-col bg-slate-50 selection:bg-indigo-100">
			{currentView === ViewID.ANALYTICS ? (
				<div className="flex flex-1">
					<Sidebar activeTab={activeTab} onTabChange={handleTabChange} subscription={subscription} user={user} onLogout={handleLogout} />
					{renderDashboardView()}
				</div>
			) : (
				<>
					<Header />
					<main className="flex-1 pt-20 flex flex-col">
						{currentView === ViewID.CONNECT ? renderConnectView() : renderLoginView()}
						<div className="max-w-7xl mx-auto w-full px-12 mt-auto">
							<Footer />
						</div>
					</main>
				</>
			)}

			<ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} activeTab={activeTab} periodLabel={formattedPeriodLabel} insights={insights} getScaledValue={getScaledValue} />

			{/* 재배포 모달 (ZIP 프로젝트용) */}
			{showRedeployModal && (
				<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200]" onClick={() => setShowRedeployModal(false)}>
					<div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-xl font-black text-slate-900">프로젝트 재배포</h3>
							<button onClick={() => setShowRedeployModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
								<X size={20} className="text-slate-400" />
							</button>
						</div>
						<p className="text-sm text-slate-500 mb-6">
							새로운 ZIP 파일을 업로드하여 <span className="font-bold text-indigo-600">{currentProject?.subdomain}.artify.page</span>를 업데이트합니다.
						</p>
						<div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-indigo-300 transition-colors">
							<input
								type="file"
								accept=".zip"
								onChange={(e) => setRedeployFile(e.target.files?.[0] || null)}
								className="hidden"
								id="redeploy-file"
							/>
							<label htmlFor="redeploy-file" className="cursor-pointer">
								{redeployFile ? (
									<div className="flex items-center justify-center gap-3">
										<FileArchive size={24} className="text-indigo-600" />
										<span className="font-bold text-slate-900">{redeployFile.name}</span>
										<span className="text-sm text-slate-400">({(redeployFile.size / 1024 / 1024).toFixed(2)} MB)</span>
									</div>
								) : (
									<>
										<Upload size={32} className="mx-auto text-slate-300 mb-3" />
										<p className="font-bold text-slate-600 mb-1">ZIP 파일을 선택하세요</p>
										<p className="text-sm text-slate-400">클릭하여 파일 선택</p>
									</>
								)}
							</label>
						</div>
						<div className="flex gap-3 mt-6">
							<button
								onClick={() => {
									setShowRedeployModal(false);
									setRedeployFile(null);
								}}
								className="flex-1 py-3 px-6 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
							>
								취소
							</button>
							<button
								onClick={handleRedeploy}
								disabled={!redeployFile || isRedeploying}
								className="flex-1 py-3 px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							>
								{isRedeploying ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
								{isRedeploying ? "재배포 중..." : "재배포"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* 토스트 알림 */}
			<div
				className={`fixed bottom-6 right-6 z-[300] transition-all duration-300 ${
					toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
				}`}
			>
				<div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl backdrop-blur-sm ${
					toast.type === 'success' ? 'bg-emerald-500 text-white' :
					toast.type === 'error' ? 'bg-rose-500 text-white' :
					'bg-slate-900 text-white'
				}`}>
					{toast.type === 'success' && <Check size={20} />}
					{toast.type === 'error' && <AlertCircle size={20} />}
					{toast.type === 'info' && <Info size={20} />}
					<span className="font-bold text-sm">{toast.message}</span>
					<button
						onClick={() => setToast(prev => ({ ...prev, visible: false }))}
						className="ml-2 p-1 hover:bg-white/20 rounded-lg transition-colors"
					>
						<X size={16} />
					</button>
				</div>
			</div>
		</div>
	);
};

export default App;
