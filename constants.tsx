import React from "react";
import { LayoutDashboard, MousePointer2, Globe, Smartphone, Target, Zap } from "lucide-react";
import { TabID } from "./types";

export const NAVIGATION_ITEMS = [
	{ id: TabID.OVERVIEW, label: "한눈에 보기", icon: <LayoutDashboard size={18} /> },
	{ id: TabID.BEHAVIOR, label: "행동 분석", icon: <MousePointer2 size={18} /> },
	{ id: TabID.ACQUISITION, label: "유입 경로", icon: <Globe size={18} /> },
	{ id: TabID.TECH, label: "기기 환경", icon: <Smartphone size={18} /> },
	{ id: TabID.CONVERSION, label: "목표 달성", icon: <Target size={18} /> },
	{ id: TabID.PERFORMANCE, label: "속도 및 성능", icon: <Zap size={18} /> },
];
