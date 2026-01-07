import React, { useState, useEffect, useMemo, useRef } from "react";
import Sidebar from "./components/Sidebar";
import { TabID, ViewID, InsightResponse, TimeRange, ChartDataPoint, UserSubscription, PlanID } from "./types";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie } from "recharts";
import { Users, Eye, Clock, Calendar, Globe, Smartphone, Zap, MousePointer2, Check, ChevronLeft, ChevronRight, RefreshCcw, ShieldCheck, Download, Layers, Activity, TrendingDown, ArrowUpRight, MousePointerClick, ShoppingCart, CreditCard, CheckCircle2, Timer, AlertTriangle, LayoutGrid, Monitor, Tablet, UserPlus, Sigma, Binary, Mail, Link as LinkIcon, Lock, ArrowRight, Copy, Sparkles, Loader2, MapPin, AlertCircle, Info, UploadCloud, FileArchive, FileCode, Trash2, X } from "lucide-react";
import MetricCard from "./components/MetricCard";
import ReportModal from "./components/ReportModal";
import { BillingUpgrade, BillingSuccess, BillingCancel } from "./components/Billing";
import { MOCK_CHANNELS, MOCK_FUNNEL, MOCK_PAGE_VIEWS, MOCK_HEATMAP_DATA, NAVIGATION_ITEMS, MOCK_KEYWORDS, MOCK_COUNTRIES } from "./constants";
import { generateLocalInsights } from "./services/insightGenerator";

const App: React.FC = () => {
	// Navigation State
	const [currentView, setCurrentView] = useState<ViewID>(ViewID.CONNECT);
	const [activeTab, setActiveTab] = useState<TabID>(TabID.OVERVIEW);

	// Connect View State
	const [connectMode, setConnectMode] = useState<"url" | "file">("file");
	const [urlInput, setUrlInput] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
	const [connectError, setConnectError] = useState<string | null>(null);
	const [copySuccess, setCopySuccess] = useState(false);
	const [showCompareModal, setShowCompareModal] = useState(false);

	// File Upload State
	const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");
	const [uploadProgress, setUploadProgress] = useState(0);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Login View State
	const [isLoginTab, setIsLoginTab] = useState(true);

	// Dashboard State
	const [timeRange, setTimeRange] = useState<TimeRange>(TimeRange.MONTH);
	const [currentDate, setCurrentDate] = useState<Date>(new Date());
	const [insights, setInsights] = useState<InsightResponse | null>(null);
	const [isInsightLoading, setIsInsightLoading] = useState(false);
	const [isReportModalOpen, setIsReportModalOpen] = useState(false);
	const [isNavigating, setIsNavigating] = useState(false);
	const [selectedHeatmapPage, setSelectedHeatmapPage] = useState<string>("/home");

	const [subscription, setSubscription] = useState<UserSubscription>({
		plan_id: "free",
		request_limit: 1000000,
		usage_current_period: 750000,
		subscription_status: "active",
		billing_period_end: "2025-05-15",
	});

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

	const chartData = useMemo((): ChartDataPoint[] => {
		const seed = currentDate.getTime() % 1000;
		const getRandom = (i: number) => Math.floor(Math.abs(Math.sin(seed + i)) * 1000) + 200;
		let length = 30;
		let labelSuffix = "일";
		if (timeRange === TimeRange.DAY) {
			length = 24;
			labelSuffix = "시";
		} else if (timeRange === TimeRange.WEEK) {
			const days = ["월", "화", "수", "목", "금", "토", "일"];
			return days.map((day, i) => ({
				name: day,
				visits: getRandom(i) * 0.8,
				conversions: Math.floor(getRandom(i) * 0.05),
				stayTime: 150 + Math.random() * 50,
				bounceRate: 40 + Math.random() * 10,
			}));
		} else if (timeRange === TimeRange.YEAR) {
			length = 12;
			labelSuffix = "월";
		}
		return Array.from({ length }, (_, i) => ({
			name: `${i + 1}${labelSuffix}`,
			visits: getRandom(i) * (timeRange === TimeRange.YEAR ? 15 : 3),
			conversions: Math.floor(getRandom(i) * 0.15),
			stayTime: 180 + Math.random() * 120,
			bounceRate: 35 + Math.random() * 15,
		}));
	}, [currentDate, timeRange]);

	const getScaledValue = (base: number) => {
		if (timeRange === TimeRange.YEAR) return base * 12;
		if (timeRange === TimeRange.MONTH) return base;
		if (timeRange === TimeRange.WEEK) return Math.floor(base * 0.25);
		return Math.floor(base * 0.04);
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
			const newLimit = planId === "pro" ? 5000000 : 100000000;
			setSubscription(prev => ({ ...prev, plan_id: planId, request_limit: newLimit }));
			handleTabChange(TabID.BILLING_SUCCESS);
			setIsInsightLoading(false);
		}, 1500);
	};

	const handleGenerateFromUrl = () => {
		if (!urlInput.trim()) {
			setConnectError("홈페이지 주소를 입력해 주세요.");
			return;
		}

		let normalized = urlInput.trim();
		if (!/^https?:\/\//i.test(normalized)) {
			normalized = "https://" + normalized;
		}

		setConnectError(null);
		setIsGenerating(true);

		setTimeout(() => {
			setIsGenerating(false);
			setGeneratedUrl(`https://artify.analytics/${Math.random().toString(36).substring(7)}`);
		}, 2500);
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

	const handleGenerateFromFile = () => {
		setIsGenerating(true);
		setTimeout(() => {
			setIsGenerating(false);
			setGeneratedUrl(`https://artify.app/${Math.random().toString(36).substring(7)}`);
		}, 3000);
	};

	const handleResetConnect = () => {
		setGeneratedUrl(null);
		setUrlInput("");
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

	const handleLogin = (e: React.FormEvent) => {
		e.preventDefault();
		setCurrentView(ViewID.ANALYTICS);
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
				<p className="text-slate-500 font-bold mb-12 text-lg">가장 빠르고 정확한 데이터 수집을 시작해 보세요.</p>

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
								<button onClick={() => setCurrentView(ViewID.LOGIN)} className="w-full bg-indigo-600 text-white py-4.5 rounded-2xl font-black text-md hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95">
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
								<div className="space-y-6 animate-reveal">
									<div className="relative group">
										<div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
											<Globe size={22} />
										</div>
										<input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://your-site.com" className="w-full pl-16 pr-6 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-slate-900 font-bold placeholder:text-slate-300 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all shadow-inner text-lg" />
									</div>
									<button onClick={handleGenerateFromUrl} disabled={isGenerating} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl tracking-tight hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70 shadow-2xl shadow-slate-900/10">
										{isGenerating ? (
											<>
												<Loader2 size={24} className="animate-spin" />
												분석 정보 동기화 중...
											</>
										) : (
											<>
												통계 버전 생성 시작 <ArrowRight size={22} />
											</>
										)}
									</button>
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
												<div className="space-y-6">
													<div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center gap-4 text-left">
														<div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
															<FileCode size={20} />
														</div>
														<div>
															<p className="text-[13px] font-bold text-slate-900">index.html 파일을 감지했습니다</p>
															<p className="text-[11px] font-bold text-slate-400 mt-0.5">정적 사이트 구조가 유효하며 최적화 준비가 되었습니다.</p>
														</div>
													</div>
													<button onClick={handleGenerateFromFile} disabled={isGenerating} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl tracking-tight hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70 shadow-2xl shadow-slate-900/10">
														{isGenerating ? (
															<>
																<Loader2 size={24} className="animate-spin" />
																통계 인프라 구축 중...
															</>
														) : (
															<>
																지금 바로 생성하기 <ArrowRight size={22} />
															</>
														)}
													</button>
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
			<div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden min-h-[650px]">
				{/* Login Form Column */}
				<div className="p-12 md:p-16 flex flex-col justify-center">
					<div className="mb-10 flex gap-4 border-b border-slate-100">
						<button onClick={() => setIsLoginTab(true)} className={`pb-4 px-2 text-lg font-black transition-all relative ${isLoginTab ? "text-slate-900" : "text-slate-300 hover:text-slate-400"}`}>
							로그인
							{isLoginTab && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full animate-reveal"></div>}
						</button>
						<button onClick={() => setIsLoginTab(false)} className={`pb-4 px-2 text-lg font-black transition-all relative ${!isLoginTab ? "text-slate-900" : "text-slate-300 hover:text-slate-400"}`}>
							회원가입
							{!isLoginTab && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full animate-reveal"></div>}
						</button>
					</div>

					<form className="space-y-6" onSubmit={handleLogin}>
						<div className="space-y-1.5">
							<label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">이메일 주소</label>
							<input type="email" required placeholder="mason@artify.com" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:bg-white focus:border-indigo-600 focus:outline-none transition-all" />
						</div>
						<div className="space-y-1.5">
							<div className="flex justify-between items-center">
								<label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호</label>
								{isLoginTab && (
									<button type="button" className="text-[10px] font-black text-indigo-500 hover:text-indigo-600">
										비밀번호 찾기
									</button>
								)}
							</div>
							<input type="password" required placeholder="••••••••" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:bg-white focus:border-indigo-600 focus:outline-none transition-all" />
						</div>
						{!isLoginTab && (
							<div className="flex items-start gap-3 p-1">
								<input type="checkbox" required className="mt-1 accent-indigo-600" id="terms" />
								<label htmlFor="terms" className="text-[12px] font-bold text-slate-500 leading-snug cursor-pointer">
									ARTIFY의 <span className="text-slate-900 underline underline-offset-4 decoration-slate-200">이용약관</span> 및 <span className="text-slate-900 underline underline-offset-4 decoration-slate-200">개인정보처리방침</span>에 동의합니다.
								</label>
							</div>
						)}
						<button type="submit" className="w-full bg-slate-900 text-white py-4.5 rounded-2xl font-black text-md tracking-tight hover:bg-slate-800 transition-all shadow-xl active:scale-95">
							{isLoginTab ? "로그인" : "계정 만들기"}
						</button>
						<div className="relative py-4 flex items-center gap-4">
							<div className="flex-1 h-px bg-slate-100"></div>
							<span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">or continue with</span>
							<div className="flex-1 h-px bg-slate-100"></div>
						</div>
						<button type="button" className="w-full border border-slate-200 bg-white py-4 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95">
							<img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
							Google 계정으로 계속하기
						</button>
					</form>
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
						</div>
						<h2 className="text-4xl font-black text-slate-900 tracking-tighter">{NAVIGATION_ITEMS.find(i => i.id === activeTab)?.label || "ARTIFY Intelligence Suite"}</h2>
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
						<button onClick={() => setIsReportModalOpen(true)} className="bg-slate-900 text-white px-7 py-3 rounded-[1.5rem] flex items-center gap-2.5 text-sm font-black shadow-2xl hover:bg-slate-800 transition-all active:scale-95">
							<Download size={16} /> 리포트 내보내기
						</button>
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

			<div className="flex-1">{renderTabContentBody()}</div>

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
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
							<MetricCard title="총 방문자 수" value={getScaledValue(124532).toLocaleString()} change={12.5} description="선택한 기간 동안 사이트를 방문한 총 순 방문자 수입니다." icon={<Users size={18} />} />
							<MetricCard title="일평균 방문자" value={Math.floor(getScaledValue(124532) / (timeRange === TimeRange.YEAR ? 365 : chartData.length)).toLocaleString()} change={2.1} description="해당 기간 내 하루 평균 유입되는 활성 방문자 수의 평균값입니다." icon={<Activity size={18} />} />
							<MetricCard title="평균 체류시간" value="04:22" change={5.8} description="사용자가 사이트에 머무르는 평균 시간으로 몰입도를 나타냅니다." icon={<Clock size={18} />} />
							<MetricCard title="신규 방문 비중" value="34.6" suffix="%" change={-1.2} description="전체 유입 중 서비스에 처음 접속한 신규 유입의 비율입니다." icon={<UserPlus size={18} />} />
						</div>
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
							<div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
								<div className="flex justify-between items-center mb-8">
									<div>
										<h3 className="text-xl font-black text-slate-900 tracking-tight">트래픽 유입 트렌드</h3>
										<p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{timeRange.toUpperCase()} Flow Analysis</p>
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
											<span className="text-3xl font-black text-slate-900 tracking-tighter">65.4%</span>
										</div>
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={[
														{ name: "신규 방문", value: 34.6, color: "#6366f1" },
														{ name: "재방문", value: 65.4, color: "#f1f5f9" },
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
														{ name: "신규", value: 34.6, color: "#6366f1" },
														{ name: "재방문", value: 65.4, color: "#f1f5f9" },
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
											<span className="text-sm font-black text-slate-900">34.6%</span>
										</div>
										<div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
											<div className="flex items-center gap-3">
												<div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
												<span className="text-[12px] font-bold text-slate-600">재방문자</span>
											</div>
											<span className="text-sm font-black text-slate-900">65.4%</span>
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
								{MOCK_PAGE_VIEWS.map((page, idx) => (
									<div key={idx} onClick={() => setSelectedHeatmapPage(page.name)} className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all ${selectedHeatmapPage === page.name ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.01]" : "hover:bg-slate-50"}`}>
										<div className="flex items-center gap-3">
											<span className={`text-[10px] font-black ${selectedHeatmapPage === page.name ? "text-white/40" : "text-slate-300"}`}>0{idx + 1}</span>
											<span className="text-sm font-bold">{page.name}</span>
										</div>
										<div className="text-right">
											<p className="text-sm font-black">{getScaledValue(page.views).toLocaleString()}명</p>
											<p className={`text-[10px] font-bold ${selectedHeatmapPage === page.name ? "text-white/60" : "text-slate-400"}`}>평균 {page.time}</p>
										</div>
									</div>
								))}
							</div>
						</div>
						<div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-visible">
							<h3 className="text-lg font-black mb-6 flex items-center gap-2">
								<MousePointer2 size={18} className="text-rose-500" /> 히트맵 분석: <span className="text-indigo-600">{selectedHeatmapPage}</span>
							</h3>
							<div className="aspect-video bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden shadow-inner">
								{(() => {
									const pageData = MOCK_HEATMAP_DATA[selectedHeatmapPage] || [];
									const maxClicks = Math.max(...pageData.map(s => s.clicks), 1);
									return pageData.map(spot => {
										const intensity = spot.clicks / maxClicks;
										const size = 24 + intensity * 56;
										return (
											<div key={spot.id} className={`absolute rounded-full ${spot.color} cursor-help group/spot flex items-center justify-center z-10 opacity-60`} style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `${size}px`, height: `${size}px`, transform: "translate(-50%, -50%)" }}>
												<div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover/spot:opacity-100 transition-all duration-300 pointer-events-none bg-slate-900 text-white text-[10px] font-black px-3 py-2.5 rounded-xl whitespace-nowrap z-[100] shadow-2xl scale-95 group-hover/spot:scale-100">
													{spot.label}: {spot.clicks.toLocaleString()} clicks
												</div>
											</div>
										);
									});
								})()}
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
								{MOCK_CHANNELS.map((c, i) => (
									<div key={i} className="group">
										<div className="flex justify-between items-center mb-2 text-xs font-black">
											<span className="text-slate-600 flex items-center gap-2">
												<div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }}></div>
												{c.name}
											</span>
											<span className="text-slate-900">{c.value}%</span>
										</div>
										<div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
											<div className="h-full transition-all duration-1000 group-hover:brightness-90" style={{ width: `${c.value}%`, backgroundColor: c.color }}></div>
										</div>
									</div>
								))}
							</div>
						</div>
						<div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
							<h3 className="text-lg font-black mb-8">검색 키워드 TOP 5</h3>
							<div className="space-y-3">
								{MOCK_KEYWORDS.map((k, i) => (
									<div key={i} className="flex justify-between items-center p-4 bg-slate-50 hover:bg-indigo-50 rounded-2xl transition-all cursor-pointer group">
										<span className="text-sm font-bold text-slate-700">{k.text}</span>
										<span className="text-xs font-black text-indigo-500">{k.value}</span>
									</div>
								))}
							</div>
						</div>
						<div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
							<h3 className="text-lg font-black mb-8">국가별 유입</h3>
							<div className="space-y-5">
								{MOCK_COUNTRIES.map((c, i) => (
									<div key={i} className="flex items-center gap-4 group">
										<div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-lg">{c.code === "KR" ? "🇰🇷" : "🌎"}</div>
										<div className="flex-1">
											<div className="flex justify-between items-center mb-1 text-[11px] font-black">
												<span className="text-slate-700">{c.name}</span>
												<span className="text-slate-400">{c.percentage}%</span>
											</div>
											<div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
												<div className="h-full bg-indigo-500/30" style={{ width: `${c.percentage}%` }}></div>
											</div>
										</div>
									</div>
								))}
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
									<p className="text-3xl font-black text-slate-900 tracking-tighter">62%</p>
									<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Mobile</p>
								</div>
								<div className="w-px h-24 bg-slate-100"></div>
								<div className="text-center group cursor-default">
									<div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-400 mb-4 transition-all group-hover:scale-110 group-hover:bg-indigo-50 group-hover:text-indigo-500">
										<Monitor size={48} />
									</div>
									<p className="text-3xl font-black text-slate-900 tracking-tighter">38%</p>
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
									{[
										{ n: "Chrome", v: 74 },
										{ n: "Safari", v: 18 },
										{ n: "Edge", v: 5 },
										{ n: "기타", v: 3 },
									].map((b, i) => (
										<div key={i} className="group">
											<div className="flex justify-between text-xs font-black mb-1.5">
												<span className="text-slate-600">{b.n}</span>
												<span className="text-indigo-600">{b.v}%</span>
											</div>
											<div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
												<div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${b.v}%` }}></div>
											</div>
										</div>
									))}
								</div>
							</div>
							<div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
								<h3 className="text-base font-black mb-8 flex items-center gap-2">
									<Layers size={18} className="text-indigo-500" /> 운영체제 (OS)
								</h3>
								<div className="space-y-5">
									{[
										{ n: "iOS", v: 45 },
										{ n: "Android", v: 28 },
										{ n: "Windows", v: 22 },
										{ n: "macOS", v: 5 },
									].map((os, i) => (
										<div key={i} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all cursor-default">
											<span className="text-sm font-bold text-slate-700">{os.n}</span>
											<span className="text-sm font-black text-slate-900">{os.v}%</span>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				);
			case TabID.CONVERSION:
				return (
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-7 animate-reveal">
						<div className="lg:col-span-6 bg-white p-10 md:p-14 rounded-[3.5rem] border border-slate-200 shadow-sm relative overflow-visible flex flex-col">
							<h3 className="text-2xl font-black mb-14 tracking-tighter">구매 퍼널 플로우</h3>
							<div className="flex-1 flex flex-col">
								{(() => {
									const dropOffs = MOCK_FUNNEL.map((f, i) => {
										const prevStep = MOCK_FUNNEL[i - 1];
										return prevStep ? (prevStep.count - f.count) / prevStep.count : 0;
									});
									const maxDropOffVal = Math.max(...dropOffs);
									const maxDropOffIdx = dropOffs.indexOf(maxDropOffVal);

									return MOCK_FUNNEL.map((f, i) => {
										const prevStep = MOCK_FUNNEL[i - 1];
										const dropOffValRaw = prevStep ? (prevStep.count - f.count) / prevStep.count : null;
										const dropOff = dropOffValRaw !== null ? (dropOffValRaw * 100).toFixed(1) : null;
										const isMaxDropOff = i === maxDropOffIdx && dropOffValRaw && dropOffValRaw > 0;

										return (
											<div key={i} className="relative flex flex-col group/f">
												{dropOff && (
													<div className="relative h-16 flex items-center">
														<div className="absolute left-8 -translate-x-1/2 w-0.5 h-full bg-slate-100 group-hover/f:bg-indigo-100 transition-colors"></div>
														<div className={`ml-16 px-4 py-2.5 rounded-2xl border text-[11px] font-black flex items-center gap-2.5 transition-all shadow-md z-20 ${isMaxDropOff ? "bg-rose-50 border-rose-100 text-rose-600 animate-pulse ring-4 ring-rose-500/5" : "bg-slate-50/70 border-slate-100 text-slate-400"}`}>
															{isMaxDropOff ? <AlertCircle size={14} className="text-rose-500" /> : <TrendingDown size={14} />}
															<span className="opacity-70">{isMaxDropOff ? "최고 이탈" : "이탈"}</span> {dropOff}%
														</div>
													</div>
												)}
												<div className="flex items-start gap-8">
													<div className={`w-16 h-16 rounded-[1.75rem] flex items-center justify-center transition-all duration-500 z-10 ${i === 4 ? "bg-emerald-500 text-white shadow-xl" : i === 0 ? "bg-indigo-600 text-white shadow-xl" : "bg-slate-50 text-slate-400"}`}>{i === 0 ? <Users size={28} /> : i === 1 ? <Eye size={28} /> : i === 2 ? <ShoppingCart size={28} /> : i === 3 ? <CreditCard size={28} /> : <CheckCircle2 size={28} />}</div>
													<div className="flex-1 pt-1">
														<div className="flex justify-between items-baseline mb-3">
															<span className="text-[16px] font-bold text-slate-700">{f.step}</span>
															<span className="text-xl font-black text-slate-900 tracking-tighter">{getScaledValue(f.count).toLocaleString()}명</span>
														</div>
														<div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden border border-slate-100">
															<div className={`h-full rounded-full transition-all duration-1000 ${i === 4 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${f.percentage}%` }}></div>
														</div>
													</div>
												</div>
											</div>
										);
									});
								})()}
							</div>
						</div>
						<div className="lg:col-span-6 space-y-7">
							<div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex items-center justify-between shadow-2xl relative overflow-hidden group">
								<div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-rose-500/20 transition-all duration-700"></div>
								<div className="flex gap-6 items-center relative z-10">
									<div className="w-16 h-16 bg-rose-500 rounded-[1.75rem] flex items-center justify-center shadow-lg shadow-rose-500/20">
										<Zap size={30} fill="currentColor" />
									</div>
									<div>
										<p className="text-[10px] font-black uppercase text-rose-400 tracking-widest mb-1">최대 유실 구간 발견</p>
										<h4 className="text-xl font-black mb-1">'상품 조회 → 장바구니' 75% 이탈 중</h4>
									</div>
								</div>
								<button className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-black transition-all relative z-10">솔루션 보기</button>
							</div>
							<div className="grid grid-cols-2 gap-7">
								<div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm hover-lift">
									<h5 className="text-sm font-black mb-4">기기별 전환율</h5>
									<p className="text-2xl font-black text-slate-900">3.2% (Mobile)</p>
								</div>
								<div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm hover-lift">
									<h5 className="text-sm font-black mb-4">전환 소요 시간</h5>
									<p className="text-2xl font-black text-slate-900">12m 45s</p>
								</div>
							</div>
							<div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
								<h3 className="text-lg font-black mb-6">퍼널 최적화 점수</h3>
								<div className="flex items-end gap-3 mb-4">
									<span className="text-5xl font-black text-slate-900 tracking-tighter">64</span>
									<span className="text-sm font-bold text-slate-400 mb-1.5">/ 100</span>
								</div>
								<div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden border border-slate-100">
									<div className="h-full bg-amber-500" style={{ width: "64%" }}></div>
								</div>
								<p className="text-xs font-bold text-slate-500 mt-4 leading-relaxed">장바구니 전환 단계에서 병목 현상이 발생하고 있습니다. 상세 페이지의 '장바구니 담기' 버튼의 시인성을 개선하면 점수를 높일 수 있습니다.</p>
							</div>
						</div>
					</div>
				);
			case TabID.PERFORMANCE:
				return (
					<div className="space-y-8 animate-reveal">
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
							<div className="lg:col-span-2 bg-white px-12 py-14 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-16 relative overflow-hidden">
								<div className="relative flex-shrink-0">
									<div className="w-44 h-44 rounded-full border-[6px] border-slate-50 flex flex-col items-center justify-center relative shadow-inner">
										<svg className="absolute inset-0 w-full h-full -rotate-90">
											<circle cx="50%" cy="50%" r="84" fill="transparent" stroke="#10b981" strokeWidth="6" strokeDasharray="527.5" strokeDashoffset={527.5 * (1 - 0.94)} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
										</svg>
										<span className="text-6xl font-black text-slate-900 tracking-tight">94</span>
									</div>
								</div>
								<div className="flex-1 space-y-6">
									<div className="space-y-2">
										<h3 className="text-3xl font-black text-slate-900 tracking-tight">전체 성능 분석</h3>
										<p className="text-slate-400 text-sm font-bold leading-relaxed max-w-md">
											귀하의 사이트는 매우 안정적인 로딩 성능을 유지하고 있습니다. 사용자의 <span className="text-indigo-600">95% 이상</span>이 쾌적한 환경을 경험합니다.
										</p>
									</div>
									<div className="flex flex-wrap gap-3 pt-2">
										{[
											{ label: "이미지 최적화", icon: <Check size={14} />, color: "text-emerald-500" },
											{ label: "CDN 활성화", icon: <Check size={14} />, color: "text-emerald-500" },
											{ label: "JS 비동기 로드", icon: <Zap size={14} />, color: "text-indigo-500" },
										].map((badge, i) => (
											<div key={i} className="flex items-center gap-2 px-3.5 py-1.5 border border-slate-100 rounded-full text-[11px] font-black bg-slate-50/50">
												<span className={badge.color}>{badge.icon}</span>
												<span className="text-slate-600">{badge.label}</span>
											</div>
										))}
									</div>
								</div>
							</div>

							<div className="bg-[#111827] p-10 rounded-[3rem] text-white flex flex-col justify-between shadow-2xl relative">
								<div>
									<h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-8 flex items-center gap-2">리소스 최적화 현황</h4>
									<div className="space-y-6">
										{[
											{ label: "이미지 최적화 (WebP)", status: "GOOD", color: "text-emerald-400" },
											{ label: "서버 응답 속도 (TTFB)", status: "0.2s", color: "text-emerald-400" },
											{ label: "스크립트 압축률 (Gzip)", status: "85%", color: "text-indigo-400" },
										].map((r, i) => (
											<div key={i} className="flex justify-between items-center group cursor-default">
												<span className="text-[13px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors">{r.label}</span>
												<span className={`text-xs font-black ${r.color}`}>{r.status}</span>
											</div>
										))}
									</div>
								</div>
								<button className="w-full mt-10 bg-white/5 hover:bg-white/10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border border-white/5">상세 진단 보고서</button>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{[
								{ id: "LCP", label: "Largest Contentful Paint", val: "0.8s", status: "Good", color: "bg-emerald-500", desc: "가장 큰 이미지나 텍스트 블록이 렌더링되는 시간입니다.", icon: <Clock size={18} /> },
								{ id: "TTFB", label: "Time to First Byte", val: "185ms", status: "Good", color: "bg-emerald-500", desc: "서버가 요청을 받은 후 첫 바이트를 보내는 데 걸리는 시간입니다.", icon: <Zap size={18} /> },
								{ id: "FID", label: "First Input Delay", val: "12ms", status: "Good", color: "bg-emerald-500", desc: "사용자가 처음 클릭했을 때 브라우저가 반응을 시작하는 지연 시간입니다.", icon: <MousePointerClick size={18} /> },
								{ id: "CLS", label: "Cumulative Layout Shift", val: "0.02", status: "Good", color: "bg-emerald-500", desc: "로딩 중 예기치 않은 레이아웃 이동이 얼마나 발생하는지 측정합니다.", icon: <LayoutGrid size={18} /> },
								{ id: "FCP", label: "First Contentful Paint", val: "0.4s", status: "Good", color: "bg-emerald-500", desc: "브라우저가 DOM 콘텐츠의 첫 번째 부분을 렌더링하는 시간입니다.", icon: <Timer size={18} /> },
								{ id: "TBT", label: "Total Blocking Time", val: "80ms", status: "Good", color: "bg-emerald-500", desc: "입력 응답성이 차단되는 전체 시간의 합계입니다.", icon: <Monitor size={18} /> },
							].map((m, i) => (
								<div key={m.id} className="bg-white p-7 rounded-[2.25rem] border border-slate-200 shadow-sm hover-lift group relative overflow-hidden">
									<div className="flex justify-between items-start mb-6">
										<div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">{m.icon}</div>
										<div className="relative group/tt">
											<Info size={14} className="text-slate-300 cursor-help" />
											<div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-3 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover/tt:opacity-100 transition-all z-20 pointer-events-none font-bold leading-relaxed">{m.desc}</div>
										</div>
									</div>
									<div className="space-y-2">
										<div className="flex items-baseline gap-2">
											<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.id}</span>
											<span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-md">{m.status}</span>
										</div>
										<div className="text-3xl font-black text-slate-900 tracking-tighter">{m.val}</div>
										<div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
											<div className={`h-full ${m.color} rounded-full transition-all duration-1000`} style={{ width: "85%" }}></div>
										</div>
									</div>
								</div>
							))}
						</div>
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
				{currentView !== ViewID.ANALYTICS && (
					<button onClick={() => setCurrentView(currentView === ViewID.LOGIN ? ViewID.CONNECT : ViewID.LOGIN)} className="text-sm font-black text-slate-500 hover:text-indigo-600 transition-colors">
						{currentView === ViewID.LOGIN ? "서비스 연결" : "로그인"}
					</button>
				)}
				{currentView === ViewID.ANALYTICS && (
					<div className="flex items-center gap-4">
						<span className="text-xs font-bold text-slate-400">mason@artify.com</span>
						<div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black text-[10px]">M</div>
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
					<Sidebar activeTab={activeTab} onTabChange={handleTabChange} subscription={subscription} />
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
		</div>
	);
};

export default App;
