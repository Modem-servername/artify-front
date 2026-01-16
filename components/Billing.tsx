
import React from 'react';
import { useTranslation } from 'react-i18next';
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
    limit: '100,000',
    featuresKey: 'plans.free.features',
    color: 'bg-slate-100',
    textColor: 'text-slate-600',
    buttonColor: 'bg-slate-800',
    descriptionKey: 'plans.free.description',
    comingSoon: false
  },
  {
    id: 'pro' as PlanID,
    name: 'Pro',
    price: '5',
    limit: '5,000,000',
    featuresKey: 'plans.pro.features',
    color: 'bg-indigo-600',
    textColor: 'text-white',
    buttonColor: 'bg-white',
    buttonTextColor: 'text-indigo-600',
    isPopular: true,
    descriptionKey: 'plans.pro.description',
    comingSoon: true
  },
  {
    id: 'enterprise' as PlanID,
    name: 'Enterprise',
    price: '45',
    limit: '100,000,000',
    featuresKey: 'plans.enterprise.features',
    color: 'bg-white',
    textColor: 'text-slate-900',
    buttonColor: 'bg-slate-900',
    buttonTextColor: 'text-white',
    descriptionKey: 'plans.enterprise.description',
    comingSoon: true
  }
];

export const BillingUpgrade: React.FC<BillingViewProps> = ({ subscription, onNavigate, onSelectPlan }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-12 animate-reveal">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{t('billing.expandLimits')}</h2>
        <p className="text-slate-500 font-bold max-w-xl mx-auto text-sm">
          {t('billing.currentPlan', { plan: subscription.plan_id.toUpperCase() })}
          {' '}{t('billing.unlockFeatures')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {PLANS.map((plan) => {
          const isCurrent = subscription.plan_id === plan.id;
          const isDowngrade = (subscription.plan_id === 'enterprise' && plan.id !== 'enterprise') ||
                              (subscription.plan_id === 'pro' && plan.id === 'free');
          const isComingSoon = plan.comingSoon;

          return (
            <div
              key={plan.id}
              className={`relative rounded-[2.5rem] p-10 flex flex-col border transition-all duration-500 hover:scale-[1.02] ${
                plan.isPopular ? 'border-indigo-500 shadow-2xl shadow-indigo-100' : 'border-slate-200 shadow-sm'
              } ${plan.color} ${plan.textColor} ${isComingSoon ? 'opacity-75' : ''}`}
            >
              {isComingSoon && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full z-10">
                  {t('billing.comingSoon')}
                </div>
              )}
              {plan.isPopular && !isComingSoon && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full z-10">
                  {t('billing.popular')}
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-black mb-2 uppercase tracking-tighter">{plan.name}</h3>
                <p className={`text-[13px] font-bold opacity-70 mb-6 leading-tight`}>{t(plan.descriptionKey)}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tighter">${plan.price}</span>
                  <span className="text-sm font-bold opacity-60">{t('billing.perMonth')}</span>
                </div>
              </div>

              <div className="mb-8 p-6 bg-black/5 rounded-[1.5rem] border border-black/5">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{t('billing.monthlyLimit')}</p>
                <p className="text-2xl font-black tracking-tighter">{plan.limit} {t('billing.count')}</p>
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                {(t(plan.featuresKey, { returnObjects: true }) as string[]).map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-bold">
                    <Check size={18} className={plan.id === 'pro' ? 'text-indigo-200' : 'text-indigo-500'} />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                disabled={isCurrent || isDowngrade || isComingSoon}
                onClick={() => onSelectPlan(plan.id)}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 ${
                  plan.buttonColor
                } ${plan.buttonTextColor || 'text-white'} ${
                  (isCurrent || isDowngrade || isComingSoon) ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 shadow-xl'
                }`}
              >
                {isComingSoon ? t('billing.preparing') : isCurrent ? t('billing.currentlyUsing') : isDowngrade ? t('billing.changeInPortal') : t('billing.upgradeTo', { plan: plan.name })}
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-10 text-center shadow-sm">
        <h4 className="text-lg font-black mb-8 flex items-center justify-center gap-2">
           <ShieldCheck size={20} className="text-indigo-500" /> {t('billing.faq')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto">
          <div className="p-2">
            <p className="font-black text-slate-900 mb-2">{t('billing.canChangePlan')}</p>
            <p className="text-[13px] text-slate-500 font-bold leading-relaxed">{t('billing.canChangePlanAnswer')}</p>
          </div>
          <div className="p-2">
            <p className="font-black text-slate-900 mb-2">{t('billing.overLimit')}</p>
            <p className="text-[13px] text-slate-500 font-bold leading-relaxed">{t('billing.overLimitAnswer')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BillingSuccess: React.FC<{ onReturn: () => void }> = ({ onReturn }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-reveal text-center space-y-6">
      <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-100 animate-bounce">
        <Sparkles size={48} />
      </div>
      <div className="space-y-2">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{t('billing.upgradeComplete')}</h2>
        <p className="text-slate-500 font-bold max-w-md">{t('billing.newLimitApplied')}</p>
      </div>
      <button
        onClick={onReturn}
        className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
      >
        <ArrowLeft size={18} /> {t('billing.backToDashboard')}
      </button>
    </div>
  );
};

export const BillingCancel: React.FC<{ onReturn: () => void }> = ({ onReturn }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-reveal text-center space-y-6">
      <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-rose-100">
        <XCircle size={48} />
      </div>
      <div className="space-y-2">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{t('billing.paymentCancelled')}</h2>
        <p className="text-slate-500 font-bold max-w-md">{t('billing.paymentNotProcessed')}</p>
      </div>
      <button
        onClick={onReturn}
        className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
      >
        <ArrowLeft size={18} /> {t('billing.tryAgain')}
      </button>
    </div>
  );
};
