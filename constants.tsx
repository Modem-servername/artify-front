import React from "react";
import { LayoutDashboard, MousePointer2, Globe, Smartphone, Target, Zap } from "lucide-react";
import { TabID } from "./types";

export const NAVIGATION_ITEMS = [
	{ id: TabID.OVERVIEW, labelKey: "nav.overview", icon: <LayoutDashboard size={18} /> },
	{ id: TabID.BEHAVIOR, labelKey: "nav.behavior", icon: <MousePointer2 size={18} /> },
	{ id: TabID.ACQUISITION, labelKey: "nav.acquisition", icon: <Globe size={18} /> },
	{ id: TabID.TECH, labelKey: "nav.tech", icon: <Smartphone size={18} /> },
	{ id: TabID.CONVERSION, labelKey: "nav.conversion", icon: <Target size={18} /> },
	{ id: TabID.PERFORMANCE, labelKey: "nav.performance", icon: <Zap size={18} /> },
];
