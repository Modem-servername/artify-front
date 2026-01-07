
import React from 'react';
import { Check, ArrowRight, Zap, ShieldCheck, CreditCard, Sparkles, XCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import { PlanID, UserSubscription, TabID } from '../types';

interface BillingViewProps {
  subscription: UserSubscription;
  onNavigate: (tab: TabID) => void;
  onSelectPlan: (planId: PlanID) => void;
}

const PLANS = [
  {
    id: 'free' as PlanID,
    name: 'Free',
    price: '0',
    limit: '1,000,000',
    features: ['기본 분석 도구', '표준 기술 지원', '일간 요약 리포트', '커뮤니티 액세스'],
    color: 'bg-slate-100',
    textColor: 'text-slate-600',
    buttonColor: 'bg-slate-800',
    description: '개인 프로젝트와 학습을 위한 완벽한 시작'
  },
  {
    id: 'pro' as PlanID,
    name: 'Pro',
    price: '5',
    limit: '5,000,000',
    features: ['심화 분석 엔진', '우선 기술 지원', '시간 단위 실시간 리포트', '맞춤형 대시보드', 'API 연동 액세스'],
    color: 'bg-indigo-600',
    textColor: 'text-white',
    buttonColor: 'bg-white',
    buttonTextColor: 'text-indigo-600',
    isPopular: true,
    description: '성장하는 비즈니스를 위한 업계 표준 선택'
  },
  {
    id: 'enterprise' as PlanID,
    name: 'Enterprise',
    price: '45',
    limit: '100,000,000',
    features: ['AI 예측 분석', '24/7 전담 유선 지원', '실시간 웹훅 연동', '기업 맞춤형 교육', 'SLA 품질 보증'],
    color: 'bg-white',
    textColor: 'text-slate-900',
    buttonColor: 'bg-slate-900',
    buttonTextColor: 'text-white',
    description: '대규모 트래픽과 보안이 필요한 조직을 위한 솔루션'
  }
];

export const BillingUpgrade: React.FC<BillingViewProps> = ({ subscription, onNavigate, onSelectPlan }) => {
  return (
    <div className="space-y-12 animate-reveal">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">데이터 분석의 한계를 넓히세요</h2>
        <p className="text-slate-500 font-bold max-w-xl mx-auto text-sm">
          현재 <span className="text-indigo-600 font-black">{subscription.plan_id.toUpperCase()}</span> 플랜을 이용 중입니다.
          비즈니스 성장에 맞춰 더 높은 한도와 고도화된 지능형 분석 기능을 잠금 해제하세요.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {PLANS.map((plan) => {
          const isCurrent = subscription.plan_id === plan.id;
          const isDowngrade = (subscription.plan_id === 'enterprise' && plan.id !== 'enterprise') || 
                              (subscription.plan_id === 'pro' && plan.id === 'free');

          return (
            <div 
              key={plan.id} 
              className={`relative rounded-[2.5rem] p-10 flex flex-col border transition-all duration-500 hover:scale-[1.02] ${
                plan.isPopular ? 'border-indigo-500 shadow-2xl shadow-indigo-100' : 'border-slate-200 shadow-sm'
              } ${plan.color} ${plan.textColor}`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full z-10">
                  인기 플랜
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-black mb-2 uppercase tracking-tighter">{plan.name}</h3>
                <p className={`text-[13px] font-bold opacity-70 mb-6 leading-tight`}>{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tighter">${plan.price}</span>
                  <span className="text-sm font-bold opacity-60">/월</span>
                </div>
              </div>

              <div className="mb-8 p-6 bg-black/5 rounded-[1.5rem] border border-black/5">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">월간 요청 한도</p>
                <p className="text-2xl font-black tracking-tighter">{plan.limit}건</p>
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-bold">
                    <Check size={18} className={plan.id === 'pro' ? 'text-indigo-200' : 'text-indigo-500'} />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                disabled={isCurrent || isDowngrade}
                onClick={() => onSelectPlan(plan.id)}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 ${
                  plan.buttonColor
                } ${plan.buttonTextColor || 'text-white'} ${
                  (isCurrent || isDowngrade) ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 shadow-xl'
                }`}
              >
                {isCurrent ? '현재 이용 중인 플랜' : isDowngrade ? '관리 포털에서 변경' : `${plan.name}로 업그레이드`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-10 text-center shadow-sm">
        <h4 className="text-lg font-black mb-8 flex items-center justify-center gap-2">
           <ShieldCheck size={20} className="text-indigo-500" /> 자주 묻는 질문
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto">
          <div className="p-2">
            <p className="font-black text-slate-900 mb-2">플랜을 언제든지 변경할 수 있나요?</p>
            <p className="text-[13px] text-slate-500 font-bold leading-relaxed">네, 언제든지 업그레이드 또는 다운그레이드가 가능합니다. 결제 주기 중간에 업그레이드하는 경우, 사용한 일수만큼 일할 계산되어 청구됩니다.</p>
          </div>
          <div className="p-2">
            <p className="font-black text-slate-900 mb-2">요청 한도를 초과하면 어떻게 되나요?</p>
            <p className="text-[13px] text-slate-500 font-bold leading-relaxed">데이터 수집이 즉시 중단되지는 않습니다. 한도 초과 전 알림을 보내드리며, 성능 제한이 적용되기 전에 플랜을 업그레이드하실 수 있는 충분한 시간을 드립니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BillingSuccess: React.FC<{ onReturn: () => void }> = ({ onReturn }) => (
  <div className="flex flex-col items-center justify-center py-20 animate-reveal text-center space-y-6">
    <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-100 animate-bounce">
      <Sparkles size={48} />
    </div>
    <div className="space-y-2">
      <h2 className="text-4xl font-black text-slate-900 tracking-tighter">플랜 업그레이드가 완료되었습니다!</h2>
      <p className="text-slate-500 font-bold max-w-md">새로운 요청 한도가 즉시 적용되었습니다. 이제 ARTIFY Intelligence Suite의 모든 강력한 기능을 마음껏 활용해 보세요.</p>
    </div>
    <button 
      onClick={onReturn}
      className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
    >
      <ArrowLeft size={18} /> 대시보드로 돌아가기
    </button>
  </div>
);

export const BillingCancel: React.FC<{ onReturn: () => void }> = ({ onReturn }) => (
  <div className="flex flex-col items-center justify-center py-20 animate-reveal text-center space-y-6">
    <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-rose-100">
      <XCircle size={48} />
    </div>
    <div className="space-y-2">
      <h2 className="text-4xl font-black text-slate-900 tracking-tighter">결제가 취소되었습니다</h2>
      <p className="text-slate-500 font-bold max-w-md">결제가 진행되지 않았습니다. 결제 과정에서 문제가 발생했다면 고객 지원 팀에 문의해 주세요.</p>
    </div>
    <button 
      onClick={onReturn}
      className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
    >
      <ArrowLeft size={18} /> 다시 시도하기
    </button>
  </div>
);
