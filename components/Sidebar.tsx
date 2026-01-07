
import React from 'react';
import { NAVIGATION_ITEMS } from '../constants';
import { TabID, UserSubscription } from '../types';
import { BarChart3 } from 'lucide-react';

interface SidebarProps {
  activeTab: TabID;
  onTabChange: (tab: TabID) => void;
  subscription: UserSubscription;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, subscription }) => {
  const usagePercent = Math.min(100, (subscription.usage_current_period / subscription.request_limit) * 100);
  const isBillingTab = activeTab.startsWith('billing');

  // 사용량에 따른 색상 결정 (초록 < 50% < 파랑 < 85% < 빨강)
  const getUsageColorClass = () => {
    if (usagePercent >= 85) return 'bg-rose-500';
    if (usagePercent >= 50) return 'bg-indigo-500';
    return 'bg-emerald-500';
  };

  const getUsageTextColorClass = () => {
    if (usagePercent >= 85) return 'text-rose-400';
    if (usagePercent >= 50) return 'text-indigo-400';
    return 'text-emerald-400';
  };

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 z-[80]">
      <div className="p-7 flex items-center gap-3.5 group cursor-pointer" onClick={() => onTabChange(TabID.OVERVIEW)}>
        <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 transform group-hover:rotate-12 transition-transform duration-300">
          <BarChart3 size={24} />
        </div>
        <div>
          <h1 className="font-black text-xl tracking-tighter text-slate-900">ARTIFY</h1>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{subscription.plan_id}</p>
        </div>
      </div>

      <nav className="flex-1 px-3.5 py-4 space-y-1.5">
        <p className="px-3.5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3.5">Analytics Engine</p>
        {NAVIGATION_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as TabID)}
              className={`w-full group relative flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-300 active:scale-[0.97] ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={`transition-transform duration-300 ${isActive ? 'scale-105' : 'group-hover:scale-105 group-hover:text-indigo-500'}`}>
                {item.icon}
              </span>
              {item.label}
              
              {isActive && (
                <div className="absolute right-3 w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse"></div>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-5">
        <div className="bg-slate-900 rounded-[1.75rem] p-5 text-white relative overflow-hidden group/card shadow-xl">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-3xl group-hover/card:scale-150 transition-transform duration-1000"></div>
          
          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">요청 사용량</p>
          <p className="text-sm font-black mb-3.5 tracking-tight uppercase">
            {subscription.plan_id} {subscription.plan_id === 'free' ? '' : 'Plus'}
          </p>
          
          <div className="space-y-2.5">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${getUsageColorClass()}`} 
                style={{ width: `${usagePercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-slate-400">
                {(subscription.usage_current_period / 1000000).toFixed(1)}M / {(subscription.request_limit / 1000000).toFixed(0)}M 건
              </span>
              <span className={`text-[9px] font-black ${getUsageTextColorClass()}`}>{usagePercent.toFixed(0)}%</span>
            </div>
          </div>
          
          <button 
            onClick={() => onTabChange(TabID.BILLING_UPGRADE)}
            className={`mt-5 w-full py-2.5 transition-all rounded-lg text-[11px] font-black uppercase tracking-widest active:scale-95 ${
              isBillingTab ? 'bg-indigo-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {subscription.plan_id === 'enterprise' ? '플랜 관리' : '플랜 업그레이드'}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
