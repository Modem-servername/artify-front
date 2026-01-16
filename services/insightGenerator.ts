import { InsightResponse, TimeRange, TabID, CorrelationSignal, ChartDataPoint } from "../types";
import { TFunction } from 'i18next';

/**
 * ARTIFY 정보 브리핑 생성기 (실제 데이터 기반 동적 인사이트)
 */

interface MetricState {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

// 피어슨 상관계수 계산
const calculateCorrelation = (x: number[], y: number[]): number => {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100) / 100;
};

// 추세 분석
const analyzeTrend = (data: number[]): { direction: 'increasing' | 'decreasing' | 'stable'; percentage: number } => {
  if (data.length < 2) return { direction: 'stable', percentage: 0 };

  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  if (firstAvg === 0) return { direction: 'stable', percentage: 0 };

  const change = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (change > 5) return { direction: 'increasing', percentage: Math.round(change) };
  if (change < -5) return { direction: 'decreasing', percentage: Math.round(Math.abs(change)) };
  return { direction: 'stable', percentage: 0 };
};

// 기간 라벨 가져오기
const getPeriodLabel = (timeRange: TimeRange, t: TFunction): string => {
  switch (timeRange) {
    case TimeRange.DAY: return t('insights.period.today');
    case TimeRange.WEEK: return t('insights.period.thisWeek');
    case TimeRange.MONTH: return t('insights.period.thisMonth');
    default: return t('insights.period.thisYear');
  }
};

// 탭별 동적 인사이트 생성
const generateOverviewInsight = (
  metrics: MetricState[],
  chartData: ChartDataPoint[],
  timeRange: TimeRange,
  t: TFunction
): InsightResponse => {
  const visits = chartData.map(d => d.visits);
  const bounceRates = chartData.map(d => d.bounceRate || 0);
  const stayTimes = chartData.map(d => d.stayTime || 0);

  const visitTrend = analyzeTrend(visits);
  const totalVisits = visits.reduce((a, b) => a + b, 0);
  const avgBounceRate = bounceRates.length > 0 ? bounceRates.reduce((a, b) => a + b, 0) / bounceRates.length : 0;
  const avgStayTime = stayTimes.length > 0 ? stayTimes.reduce((a, b) => a + b, 0) / stayTimes.length : 0;

  // 상관관계 계산
  const visitBounceCorr = calculateCorrelation(visits, bounceRates);
  const visitStayCorr = calculateCorrelation(visits, stayTimes);

  const signals: CorrelationSignal[] = [];

  if (Math.abs(visitBounceCorr) > 0.3) {
    signals.push({
      metricA: t('insights.metrics.visitors'),
      metricB: t('insights.metrics.bounceRate'),
      coefficient: visitBounceCorr,
      direction: visitBounceCorr > 0 ? 'positive' : 'negative',
      description: visitBounceCorr > 0
        ? t('insights.correlations.visitorBouncePositive', { coefficient: visitBounceCorr })
        : t('insights.correlations.visitorBounceNegative', { coefficient: visitBounceCorr }),
      sampleSize: chartData.length
    });
  }

  if (Math.abs(visitStayCorr) > 0.3) {
    signals.push({
      metricA: t('insights.metrics.visitors'),
      metricB: t('insights.metrics.stayTime'),
      coefficient: visitStayCorr,
      direction: visitStayCorr > 0 ? 'positive' : 'negative',
      description: visitStayCorr > 0
        ? t('insights.correlations.visitorStayPositive', { coefficient: visitStayCorr })
        : t('insights.correlations.visitorStayNegative', { coefficient: visitStayCorr }),
      sampleSize: chartData.length
    });
  }

  // 기본 시그널 추가
  if (signals.length === 0) {
    signals.push({
      metricA: t('insights.metrics.data'),
      metricB: t('insights.metrics.analysis'),
      coefficient: 0,
      direction: 'neutral',
      description: t('insights.correlations.analyzingCorrelation'),
      sampleSize: chartData.length
    });
  }

  const periodLabel = getPeriodLabel(timeRange, t);

  let summary = '';
  if (totalVisits === 0) {
    summary = t('insights.overview.noData');
  } else if (visitTrend.direction === 'increasing') {
    summary = t('insights.overview.increasing', {
      period: periodLabel,
      percent: visitTrend.percentage,
      visits: totalVisits.toLocaleString(),
      bounceRate: avgBounceRate.toFixed(1),
      stayTime: Math.floor(avgStayTime)
    });
  } else if (visitTrend.direction === 'decreasing') {
    summary = t('insights.overview.decreasing', {
      period: periodLabel,
      percent: visitTrend.percentage,
      visits: totalVisits.toLocaleString(),
      bounceRate: avgBounceRate.toFixed(1),
      stayTime: Math.floor(avgStayTime)
    });
  } else {
    summary = t('insights.overview.stable', {
      period: periodLabel,
      visits: totalVisits.toLocaleString(),
      bounceRate: avgBounceRate.toFixed(1),
      stayTime: Math.floor(avgStayTime)
    });
  }

  const recommendations: string[] = [];

  if (avgBounceRate > 60) {
    recommendations.push(t('insights.recommendations.highBounceRate'));
  }
  if (avgStayTime < 60) {
    recommendations.push(t('insights.recommendations.lowStayTime'));
  }
  if (visitTrend.direction === 'decreasing') {
    recommendations.push(t('insights.recommendations.trafficDecreasing'));
  }
  if (recommendations.length === 0) {
    recommendations.push(t('insights.recommendations.goodMetrics'));
    recommendations.push(t('insights.recommendations.setKPI'));
  }
  recommendations.push(t('insights.recommendations.abTest'));

  return { summary, recommendations: recommendations.slice(0, 3), signals };
};

const generateBehaviorInsight = (
  _metrics: MetricState[],
  chartData: ChartDataPoint[],
  _timeRange: TimeRange,
  t: TFunction
): InsightResponse => {
  const stayTimes = chartData.map(d => d.stayTime || 0);
  const bounceRates = chartData.map(d => d.bounceRate || 0);
  const visits = chartData.map(d => d.visits);

  const avgStayTime = stayTimes.length > 0 ? stayTimes.reduce((a, b) => a + b, 0) / stayTimes.length : 0;
  const avgBounceRate = bounceRates.length > 0 ? bounceRates.reduce((a, b) => a + b, 0) / bounceRates.length : 0;

  const stayBounceCorr = calculateCorrelation(stayTimes, bounceRates);
  const visitStayCorr = calculateCorrelation(visits, stayTimes);

  const signals: CorrelationSignal[] = [];

  if (Math.abs(stayBounceCorr) > 0.3) {
    signals.push({
      metricA: t('insights.metrics.stayTime'),
      metricB: t('insights.metrics.bounceRate'),
      coefficient: stayBounceCorr,
      direction: stayBounceCorr > 0 ? 'positive' : 'negative',
      description: stayBounceCorr < 0
        ? t('insights.correlations.stayBounceNegative', { coefficient: stayBounceCorr })
        : t('insights.correlations.stayBouncePositive'),
      sampleSize: chartData.length
    });
  }

  if (Math.abs(visitStayCorr) > 0.3) {
    signals.push({
      metricA: t('insights.metrics.visits'),
      metricB: t('insights.metrics.stayTime'),
      coefficient: visitStayCorr,
      direction: visitStayCorr > 0 ? 'positive' : 'negative',
      description: visitStayCorr > 0
        ? t('insights.correlations.visitStayPositive')
        : t('insights.correlations.visitStayNegative'),
      sampleSize: chartData.length
    });
  }

  if (signals.length === 0) {
    signals.push({
      metricA: t('insights.metrics.sessions'),
      metricB: t('insights.metrics.behavior'),
      coefficient: 0,
      direction: 'neutral',
      description: t('insights.correlations.needMoreData'),
      sampleSize: chartData.length
    });
  }

  let summary = '';
  if (avgStayTime === 0 && avgBounceRate === 0) {
    summary = t('insights.behavior.collecting');
  } else {
    summary = t('insights.behavior.summary', {
      stayTime: Math.floor(avgStayTime),
      bounceRate: avgBounceRate.toFixed(1)
    });
    if (avgBounceRate > 50) {
      summary += t('insights.behavior.highBounce');
    } else {
      summary += t('insights.behavior.goodEngagement');
    }
  }

  const recommendations: string[] = [];
  if (avgBounceRate > 50) {
    recommendations.push(t('insights.recommendations.highBounce'));
  }
  if (avgStayTime < 90) {
    recommendations.push(t('insights.recommendations.shortStayTime'));
  }
  recommendations.push(t('insights.recommendations.heatmapAnalysis'));
  if (recommendations.length < 3) {
    recommendations.push(t('insights.recommendations.userFeedback'));
  }

  return { summary, recommendations: recommendations.slice(0, 3), signals };
};

const generateAcquisitionInsight = (
  _metrics: MetricState[],
  chartData: ChartDataPoint[],
  timeRange: TimeRange,
  t: TFunction
): InsightResponse => {
  const visits = chartData.map(d => d.visits);
  const totalVisits = visits.reduce((a, b) => a + b, 0);
  const visitTrend = analyzeTrend(visits);

  const periodLabel = getPeriodLabel(timeRange, t);

  let summary = '';
  if (totalVisits === 0) {
    summary = t('insights.acquisition.noData');
  } else if (visitTrend.direction === 'increasing') {
    summary = t('insights.acquisition.increasing', {
      period: periodLabel,
      percent: visitTrend.percentage
    });
  } else if (visitTrend.direction === 'decreasing') {
    summary = t('insights.acquisition.decreasing', {
      period: periodLabel,
      percent: visitTrend.percentage
    });
  } else {
    summary = t('insights.acquisition.stable', {
      period: periodLabel,
      visits: totalVisits.toLocaleString()
    });
  }

  const signals: CorrelationSignal[] = [
    {
      metricA: t('insights.metrics.inflowTrend'),
      metricB: t('insights.metrics.performance'),
      coefficient: visitTrend.direction === 'increasing' ? 0.7 : visitTrend.direction === 'decreasing' ? -0.5 : 0,
      direction: visitTrend.direction === 'increasing' ? 'positive' : visitTrend.direction === 'decreasing' ? 'negative' : 'neutral',
      description: visitTrend.direction === 'increasing'
        ? t('insights.correlations.inflowImproving')
        : visitTrend.direction === 'decreasing'
        ? t('insights.correlations.inflowDeclining')
        : t('insights.correlations.inflowStable'),
      sampleSize: chartData.length
    }
  ];

  const recommendations = [
    t('insights.recommendations.utmTracking'),
    t('insights.recommendations.focusBudget'),
    t('insights.recommendations.seoOptimize')
  ];

  return { summary, recommendations, signals };
};

const generateTechInsight = (
  _metrics: MetricState[],
  chartData: ChartDataPoint[],
  _timeRange: TimeRange,
  t: TFunction
): InsightResponse => {
  const visits = chartData.map(d => d.visits);
  const totalVisits = visits.reduce((a, b) => a + b, 0);

  const summary = totalVisits > 0
    ? t('insights.tech.analyzing')
    : t('insights.tech.collecting');

  const signals: CorrelationSignal[] = [
    {
      metricA: t('insights.metrics.mobile'),
      metricB: t('insights.metrics.desktop'),
      coefficient: 0,
      direction: 'neutral',
      description: t('insights.correlations.deviceAnalysis'),
      sampleSize: chartData.length
    }
  ];

  const recommendations = [
    t('insights.recommendations.mobileFirst'),
    t('insights.recommendations.browserTest'),
    t('insights.recommendations.lightweightOption')
  ];

  return { summary, recommendations, signals };
};

const generateConversionInsight = (
  _metrics: MetricState[],
  chartData: ChartDataPoint[],
  _timeRange: TimeRange,
  t: TFunction
): InsightResponse => {
  const conversions = chartData.map(d => d.conversions || 0);
  const visits = chartData.map(d => d.visits);

  const totalConversions = conversions.reduce((a, b) => a + b, 0);
  const totalVisits = visits.reduce((a, b) => a + b, 0);
  const conversionRate = totalVisits > 0 ? (totalConversions / totalVisits) * 100 : 0;

  const convTrend = analyzeTrend(conversions);

  let summary = '';
  if (totalVisits === 0) {
    summary = t('insights.conversion.collecting');
  } else {
    summary = t('insights.conversion.summary', {
      rate: conversionRate.toFixed(2),
      conversions: totalConversions.toLocaleString()
    });
    if (convTrend.direction === 'increasing') {
      summary += t('insights.conversion.increasing', { percent: convTrend.percentage });
    } else if (convTrend.direction === 'decreasing') {
      summary += t('insights.conversion.decreasing', { percent: convTrend.percentage });
    }
  }

  const visitConvCorr = calculateCorrelation(visits, conversions);

  const signals: CorrelationSignal[] = [];
  if (Math.abs(visitConvCorr) > 0.3) {
    signals.push({
      metricA: t('insights.metrics.visits'),
      metricB: t('insights.metrics.conversions'),
      coefficient: visitConvCorr,
      direction: visitConvCorr > 0 ? 'positive' : 'negative',
      description: visitConvCorr > 0
        ? t('insights.correlations.visitConversionPositive', { coefficient: visitConvCorr })
        : t('insights.correlations.visitConversionNegative'),
      sampleSize: chartData.length
    });
  } else {
    signals.push({
      metricA: t('insights.metrics.conversions'),
      metricB: t('insights.metrics.analysis'),
      coefficient: 0,
      direction: 'neutral',
      description: t('insights.correlations.conversionNeedData'),
      sampleSize: chartData.length
    });
  }

  const recommendations = [
    t('insights.recommendations.simplifyProcess'),
    t('insights.recommendations.reminderEmail'),
    t('insights.recommendations.ctaAbTest')
  ];

  return { summary, recommendations, signals };
};

const generatePerformanceInsight = (
  _metrics: MetricState[],
  _chartData: ChartDataPoint[],
  _timeRange: TimeRange,
  t: TFunction
): InsightResponse => {
  const summary = t('insights.performanceTab.summary');

  const signals: CorrelationSignal[] = [
    {
      metricA: 'LCP',
      metricB: t('insights.metrics.bounceRate'),
      coefficient: -0.6,
      direction: 'negative',
      description: t('insights.correlations.lcpBounceRate'),
      sampleSize: 0
    }
  ];

  const recommendations = [
    t('insights.recommendations.optimizeImages'),
    t('insights.recommendations.codeSplitting'),
    t('insights.recommendations.fixedSizes')
  ];

  return { summary, recommendations, signals };
};

// 기본 브리핑 (탭에 해당하는 데이터가 없을 경우)
const generateDefaultInsight = (t: TFunction): InsightResponse => ({
  summary: t('insights.default.summary'),
  recommendations: [
    t('insights.default.monitoring'),
    t('insights.default.trackChanges'),
    t('insights.default.setAndTrack')
  ],
  signals: [{
    metricA: t('insights.metrics.data'),
    metricB: t('insights.metrics.collection'),
    coefficient: 0,
    direction: 'neutral',
    description: t('insights.default.collectingSamples'),
    sampleSize: 0
  }]
});

export const generateLocalInsights = async (
  activeTab: TabID,
  timeRange: TimeRange,
  metrics: unknown[],
  chartData: unknown[],
  t: TFunction
): Promise<InsightResponse> => {
  const metricStates = metrics as MetricState[];
  const chartPoints = chartData as ChartDataPoint[];

  switch (activeTab) {
    case TabID.OVERVIEW:
      return generateOverviewInsight(metricStates, chartPoints, timeRange, t);
    case TabID.BEHAVIOR:
      return generateBehaviorInsight(metricStates, chartPoints, timeRange, t);
    case TabID.ACQUISITION:
      return generateAcquisitionInsight(metricStates, chartPoints, timeRange, t);
    case TabID.TECH:
      return generateTechInsight(metricStates, chartPoints, timeRange, t);
    case TabID.CONVERSION:
      return generateConversionInsight(metricStates, chartPoints, timeRange, t);
    case TabID.PERFORMANCE:
      return generatePerformanceInsight(metricStates, chartPoints, timeRange, t);
    default:
      return generateDefaultInsight(t);
  }
};
