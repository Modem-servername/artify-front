
import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, HelpCircle } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  description: string;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, description, prefix, suffix, icon }) => {
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <div className="bg-white p-5 rounded-[1.75rem] border border-slate-200 shadow-sm hover-lift group cursor-default">
      <div className="flex justify-between items-start mb-3.5">
        <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-300 transform group-hover:rotate-6">
          {icon}
        </div>
        <div className="flex items-center gap-1.5">
           <div className="relative group/tooltip">
            <HelpCircle size={13} className="text-slate-300 hover:text-indigo-400 transition-colors cursor-help" />
            <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 w-48 p-2.5 bg-slate-900 text-white text-[10px] font-medium rounded-xl shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none z-50 text-center scale-95 group-hover/tooltip:scale-100">
              {description}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
            </div>
          </div>
          <div className={`flex items-center text-[10px] font-black px-2 py-0.5 rounded-full transition-colors duration-300 ${
            isNeutral ? 'bg-slate-100 text-slate-500' :
            isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}>
            {isNeutral ? <Minus size={10} className="mr-1" /> :
             isPositive ? <ArrowUpRight size={10} className="mr-1 animate-bounce-subtle" /> : <ArrowDownRight size={10} className="mr-1" />}
            {Math.abs(change)}%
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 group-hover:text-slate-500 transition-colors">{title}</h3>
        <p className="text-2xl font-black text-slate-900 tracking-tighter group-hover:text-indigo-900 transition-colors">
          {prefix}{value}{suffix}
        </p>
      </div>
      
      <div className="mt-3.5 w-full h-1 bg-slate-50 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ease-out delay-300 ${isPositive ? 'bg-emerald-400' : 'bg-rose-400'}`}
          style={{ width: isNeutral ? '0%' : '100%', transform: 'translateX(-100%)', animation: 'slide-right 1s forwards' }}
        ></div>
      </div>
    </div>
  );
};

export default MetricCard;
