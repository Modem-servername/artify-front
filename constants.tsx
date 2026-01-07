import React from "react";
import { LayoutDashboard, MousePointer2, Globe, Smartphone, Target, Zap, Clock, Users } from "lucide-react";
import { TabID } from "./types";

export const NAVIGATION_ITEMS = [
	{ id: TabID.OVERVIEW, label: "한눈에 보기", icon: <LayoutDashboard size={18} /> },
	{ id: TabID.BEHAVIOR, label: "행동 분석", icon: <MousePointer2 size={18} /> },
	{ id: TabID.ACQUISITION, label: "유입 경로", icon: <Globe size={18} /> },
	{ id: TabID.TECH, label: "기기 환경", icon: <Smartphone size={18} /> },
	{ id: TabID.CONVERSION, label: "목표 달성", icon: <Target size={18} /> },
	{ id: TabID.PERFORMANCE, label: "속도 및 성능", icon: <Zap size={18} /> },
];

export const MOCK_TRAFFIC_DATA = [
	{ name: "월", visits: 4000, bounce: 2400 },
	{ name: "화", visits: 3000, bounce: 1398 },
	{ name: "수", visits: 5500, bounce: 1800 },
	{ name: "목", visits: 2780, bounce: 1908 },
	{ name: "금", visits: 1890, bounce: 800 },
	{ name: "토", visits: 2390, bounce: 1200 },
	{ name: "일", visits: 3490, bounce: 1100 },
];

export const MOCK_KEYWORDS = [
	{ text: "아트 갤러리", value: 240 },
	{ text: "신진 아티스트", value: 180 },
	{ text: "그림 전시", value: 150 },
	{ text: "현대미술", value: 120 },
	{ text: "서울 갤러리", value: 100 },
];

export const MOCK_FUNNEL = [
	{ step: "방문객", count: 5000, percentage: 100 },
	{ step: "상품 조회", count: 3200, percentage: 64 },
	{ step: "장바구니", count: 800, percentage: 16 },
	{ step: "결제 시도", count: 450, percentage: 9 },
	{ step: "구매 완료", count: 250, percentage: 5 },
];

export const MOCK_CHANNELS = [
	{ name: "직접 방문", value: 40, color: "#3b82f6" },
	{ name: "구글 검색", value: 35, color: "#10b981" },
	{ name: "인스타그램", value: 15, color: "#f59e0b" },
	{ name: "이메일", value: 10, color: "#ef4444" },
];

export const MOCK_COUNTRIES = [
	{ name: "대한민국", code: "KR", value: 8500, percentage: 65 },
	{ name: "미국", code: "US", value: 2100, percentage: 16 },
	{ name: "일본", code: "JP", value: 1100, percentage: 8 },
	{ name: "중국", code: "CN", value: 700, percentage: 5 },
	{ name: "독일", code: "DE", value: 400, percentage: 3 },
	{ name: "기타", code: "OTH", value: 300, percentage: 3 },
];

export const MOCK_PAGE_VIEWS = [
	{ name: "/home", views: 12500, time: "2:30", exit: 32 },
	{ name: "/pricing", views: 8200, time: "1:45", exit: 18 },
	{ name: "/blog/ai-future", views: 4300, time: "5:12", exit: 45 },
	{ name: "/docs", views: 3900, time: "4:20", exit: 12 },
	{ name: "/contact", views: 1200, time: "0:55", exit: 55 },
];

export const MOCK_HEATMAP_DATA: Record<string, any[]> = {
	"/home": [
		{ id: 1, x: 82, y: 15, label: "로그인 버튼", clicks: 1240, color: "bg-rose-500" },
		{ id: 2, x: 25, y: 45, label: "메인 배너 CTA", clicks: 3500, color: "bg-rose-600" },
		{ id: 3, x: 50, y: 85, label: "자세히 보기 링크", clicks: 2100, color: "bg-rose-500" },
		{ id: 4, x: 15, y: 12, label: "로고 (홈 이동)", clicks: 850, color: "bg-rose-400" },
		{ id: 5, x: 70, y: 55, label: "추천 작가 카드", clicks: 1800, color: "bg-rose-500" },
	],
	"/pricing": [
		{ id: 6, x: 50, y: 50, label: "Pro 요금제 선택", clicks: 4200, color: "bg-rose-600" },
		{ id: 7, x: 20, y: 50, label: "Basic 요금제 선택", clicks: 1500, color: "bg-rose-400" },
		{ id: 8, x: 80, y: 50, label: "Enterprise 상담", clicks: 900, color: "bg-rose-400" },
	],
	"/blog/ai-future": [
		{ id: 9, x: 10, y: 30, label: "사이드바 검색", clicks: 600, color: "bg-rose-400" },
		{ id: 10, x: 50, y: 90, label: "뉴스레터 구독", clicks: 2800, color: "bg-rose-500" },
		{ id: 11, x: 90, y: 20, label: "공유하기 버튼", clicks: 1100, color: "bg-rose-400" },
	],
	"/docs": [
		{ id: 12, x: 20, y: 15, label: "Quick Start 가이드", clicks: 3100, color: "bg-rose-600" },
		{ id: 13, x: 20, y: 40, label: "API 레퍼런스", clicks: 2400, color: "bg-rose-500" },
		{ id: 14, x: 80, y: 10, label: "버전 선택기", clicks: 500, color: "bg-rose-300" },
	],
	"/contact": [
		{ id: 15, x: 50, y: 60, label: "문의 제출 버튼", clicks: 950, color: "bg-rose-500" },
		{ id: 16, x: 50, y: 20, label: "이메일 주소 클릭", clicks: 300, color: "bg-rose-300" },
	],
};
