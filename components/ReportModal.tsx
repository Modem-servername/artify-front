
import React, { useState } from 'react';
import { X, Printer, Download, FileText, CheckCircle2, TrendingUp, TrendingDown, Globe, Activity, Sparkles, Loader2 } from 'lucide-react';
import { TabID, InsightResponse, TimeRange, CorrelationSignal } from '../types';
import { NAVIGATION_ITEMS } from '../constants';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabID;
  periodLabel: string;
  insights: InsightResponse | null;
  getScaledValue: (val: number) => number;
}

const ReportModal: React.FC<ReportModalProps> = ({ 
  isOpen, 
  onClose, 
  activeTab, 
  periodLabel, 
  insights,
  getScaledValue
}) => {
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    setIsExporting(true);
    // 짧은 지연을 주어 애니메이션이나 레이아웃이 확정된 후 인쇄 다이얼로그를 띄웁니다.
    setTimeout(() => {
      window.print();
      setIsExporting(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-7 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-500 print:bg-white print:p-0">
      <div className="bg-white w-full max-w-4xl max-h-[88vh] rounded-[2.5rem] shadow-[0_35px_90px_-15px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-scale-in print:shadow-none print:max-h-none print:rounded-none">
        
        {/* Header - Hidden in Print */}
        <div className="px-9 py-5 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50 print:hidden">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <FileText size={22} />
            </div>
            <div>
                <h3 className="font-black text-slate-900 text-base tracking-tight">지능형 리포트 미리보기</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">상태: 통계 보고서 생성됨</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            <button 
              onClick={handlePrint}
              disabled={isExporting}
              className="group flex items-center gap-2.5 bg-indigo-600 text-white px-7 py-3 rounded-[1.25rem] text-xs font-black hover:bg-indigo-700 transition-all shadow-xl active:scale-95 disabled:opacity-70"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} className="group-hover:rotate-12 transition-transform" />}
              {isExporting ? '준비 중...' : 'PDF 내보내기'}
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-900 active:scale-90"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div id="printable-report" className="flex-1 overflow-y-auto p-14 md:p-20 bg-white print:p-0 print:overflow-visible selection:bg-indigo-100">
          <div className="max-w-3xl mx-auto space-y-14">
            
            <div className="flex justify-between items-end border-b-4 border-slate-900 pb-10 print:border-slate-900">
              <div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-3.5">ARTIFY</h1>
                <p className="text-indigo-600 font-black uppercase tracking-[0.4em] text-[10px]">통계 지능 분석 유닛</p>
              </div>
              <div className="text-right">
                <div className="text-base font-black text-slate-900 uppercase tracking-tighter">분석 브리핑 (Analytical Briefing)</div>
                <div className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">기간: {periodLabel}</div>
              </div>
            </div>

            <section className="space-y-7">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3.5 tracking-tight">
                <Activity size={22} className="text-indigo-600" />
                1. 주요 성과 지표 (Performance Metrics)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[
                  { label: '총 방문자 수', val: getScaledValue(124532).toLocaleString() },
                  { label: '목표 전환율', val: '4.8%' },
                  { label: '평균 체류 시간', val: '04:22' },
                  { label: '이탈률', val: '42.3%' }
                ].map((item, i) => (
                  <div key={i} className="p-7 bg-slate-50 rounded-[1.75rem] border border-slate-100 group hover:bg-indigo-50 transition-colors duration-500 print:bg-slate-50 print:border-slate-100">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 group-hover:text-indigo-400 transition-colors">{item.label}</div>
                    <div className="text-2xl font-black text-slate-900 tracking-tighter">{item.val}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-7">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3.5 tracking-tight">
                <Sparkles size={22} className="text-indigo-600" />
                2. 통계적 상관관계 분석 (Statistical Correlations)
              </h2>
              <div className="p-9 bg-indigo-50/50 rounded-[2.25rem] border border-indigo-100 space-y-7 print:bg-indigo-50/50 print:border-indigo-100">
                <p className="text-lg text-slate-800 leading-relaxed font-semibold tracking-tight">
                  {insights?.summary}
                </p>
                <div className="grid grid-cols-1 gap-6 pt-9 border-t border-indigo-100/50">
                  <div className="space-y-4">
                    <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">유의미한 분석 신호</h4>
                    {insights?.signals.map((signal, i) => (
                      <div key={i} className="flex gap-4 p-4 bg-white/60 rounded-2xl border border-indigo-50 print:bg-white print:border-indigo-50">
                        <div className={`shrink-0 mt-1`}>
                          {signal.direction === 'positive' ? 
                            <TrendingUp size={16} className="text-emerald-500" /> : 
                            <TrendingDown size={16} className="text-rose-500" />
                          }
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-800">{signal.description}</p>
                          <p className="text-[10px] font-black text-indigo-400 mt-1 uppercase">상관계수 r = {signal.coefficient.toFixed(2)} • 표본 n = {signal.sampleSize}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-7">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3.5 tracking-tight">
                <CheckCircle2 size={22} className="text-indigo-600" />
                3. 전략적 권장 사항 (Strategic Recommendations)
              </h2>
              <div className="grid grid-cols-1 gap-3.5">
                {insights?.recommendations.map((rec, i) => (
                  <div key={i} className="flex gap-5 p-7 bg-white border border-slate-100 shadow-sm rounded-[1.75rem] items-center hover:border-indigo-200 transition-colors print:shadow-none print:border-slate-100">
                    <div className="w-10 h-10 rounded-[1.25rem] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm print:bg-emerald-50">
                      <CheckCircle2 size={20} />
                    </div>
                    <p className="text-base font-bold text-slate-800 tracking-tight">{rec}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="pt-14 border-t-2 border-slate-100 text-center print:border-slate-100">
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] mb-3.5">
                ARTIFY Stats Engine v4.2 • 분석번호: NX-{Math.floor(Math.random()*100000)}
              </p>
              <div className="flex justify-center gap-10 opacity-30">
                 <div className="w-20 h-px bg-slate-400"></div>
                 <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                 <div className="w-20 h-px bg-slate-400"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
