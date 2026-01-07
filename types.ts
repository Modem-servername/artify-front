
export interface MetricSummary {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface FunnelStep {
  step: string;
  count: number;
  percentage: number;
}

export enum TabID {
  OVERVIEW = 'overview',
  BEHAVIOR = 'behavior',
  ACQUISITION = 'acquisition',
  TECH = 'tech',
  CONVERSION = 'conversion',
  PERFORMANCE = 'performance',
  BILLING = 'billing',
  BILLING_UPGRADE = 'billing_upgrade',
  BILLING_SUCCESS = 'billing_success',
  BILLING_CANCEL = 'billing_cancel'
}

export enum ViewID {
  CONNECT = 'connect',
  LOGIN = 'login',
  ANALYTICS = 'analytics'
}

export enum TimeRange {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year'
}

export interface ChartDataPoint {
  name: string;
  visits: number;
  newVisitors?: number;
  returningVisitors?: number;
  stayTime?: number;
  conversions?: number;
  bounceRate?: number;
}

export interface CorrelationSignal {
  metricA: string;
  metricB: string;
  coefficient: number;
  direction: 'positive' | 'negative' | 'neutral';
  description: string;
  sampleSize: number;
}

export interface InsightResponse {
  summary: string;
  recommendations: string[];
  signals: CorrelationSignal[];
}

export type PlanID = 'free' | 'pro' | 'enterprise';

export interface UserSubscription {
  plan_id: PlanID;
  request_limit: number;
  usage_current_period: number;
  subscription_status: string;
  billing_period_end: string;
}
