import { InsightResponse, TimeRange, TabID, CorrelationSignal, ChartDataPoint } from "../types";

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

// 탭별 동적 인사이트 생성
const generateOverviewInsight = (
  metrics: MetricState[],
  chartData: ChartDataPoint[],
  timeRange: TimeRange
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
      metricA: '방문자',
      metricB: '이탈률',
      coefficient: visitBounceCorr,
      direction: visitBounceCorr > 0 ? 'positive' : 'negative',
      description: visitBounceCorr > 0
        ? `방문자 수 증가 시 이탈률도 함께 상승하는 경향 (r=${visitBounceCorr}). 트래픽 품질 점검 필요.`
        : `방문자 수 증가에도 이탈률은 감소하는 긍정적 패턴 (r=${visitBounceCorr}).`,
      sampleSize: chartData.length
    });
  }

  if (Math.abs(visitStayCorr) > 0.3) {
    signals.push({
      metricA: '방문자',
      metricB: '체류시간',
      coefficient: visitStayCorr,
      direction: visitStayCorr > 0 ? 'positive' : 'negative',
      description: visitStayCorr > 0
        ? `방문자 수와 체류시간이 함께 증가하는 양호한 패턴 (r=${visitStayCorr}).`
        : `방문자 증가 시 체류시간 감소 경향. 콘텐츠 품질 개선 필요 (r=${visitStayCorr}).`,
      sampleSize: chartData.length
    });
  }

  // 기본 시그널 추가
  if (signals.length === 0) {
    signals.push({
      metricA: '데이터',
      metricB: '분석',
      coefficient: 0,
      direction: 'neutral',
      description: '현재 수집된 데이터로 유의미한 상관관계를 도출하는 중입니다.',
      sampleSize: chartData.length
    });
  }

  const periodLabel = timeRange === TimeRange.DAY ? '오늘' :
                      timeRange === TimeRange.WEEK ? '이번 주' :
                      timeRange === TimeRange.MONTH ? '이번 달' : '올해';

  let summary = '';
  if (totalVisits === 0) {
    summary = '아직 방문자 데이터가 수집되지 않았습니다. 트래킹 스크립트가 올바르게 설치되었는지 확인해주세요.';
  } else if (visitTrend.direction === 'increasing') {
    summary = `${periodLabel} 트래픽이 ${visitTrend.percentage}% 상승 추세입니다. 총 ${totalVisits.toLocaleString()}건의 방문이 발생했으며, 평균 이탈률 ${avgBounceRate.toFixed(1)}%, 평균 체류시간 ${Math.floor(avgStayTime)}초를 기록했습니다.`;
  } else if (visitTrend.direction === 'decreasing') {
    summary = `${periodLabel} 트래픽이 ${visitTrend.percentage}% 하락했습니다. 총 ${totalVisits.toLocaleString()}건의 방문, 평균 이탈률 ${avgBounceRate.toFixed(1)}%, 평균 체류시간 ${Math.floor(avgStayTime)}초입니다. 유입 채널 점검을 권장합니다.`;
  } else {
    summary = `${periodLabel} 트래픽이 안정적으로 유지되고 있습니다. 총 ${totalVisits.toLocaleString()}건의 방문, 평균 이탈률 ${avgBounceRate.toFixed(1)}%, 평균 체류시간 ${Math.floor(avgStayTime)}초를 기록했습니다.`;
  }

  const recommendations: string[] = [];

  if (avgBounceRate > 60) {
    recommendations.push('이탈률이 60%를 초과합니다. 랜딩 페이지의 첫인상과 로딩 속도를 개선하세요.');
  }
  if (avgStayTime < 60) {
    recommendations.push('평균 체류시간이 1분 미만입니다. 콘텐츠의 가독성과 매력도를 높이세요.');
  }
  if (visitTrend.direction === 'decreasing') {
    recommendations.push('트래픽 감소 추세입니다. 마케팅 채널별 성과를 점검하고 예산을 재배분하세요.');
  }
  if (recommendations.length === 0) {
    recommendations.push('현재 지표가 양호합니다. 지속적인 모니터링으로 성과를 유지하세요.');
    recommendations.push('핵심 KPI 목표를 설정하고 달성률을 추적하세요.');
  }
  recommendations.push('정기적인 A/B 테스트로 전환율 최적화 기회를 발굴하세요.');

  return { summary, recommendations: recommendations.slice(0, 3), signals };
};

const generateBehaviorInsight = (
  _metrics: MetricState[],
  chartData: ChartDataPoint[],
  _timeRange: TimeRange
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
      metricA: '체류시간',
      metricB: '이탈률',
      coefficient: stayBounceCorr,
      direction: stayBounceCorr > 0 ? 'positive' : 'negative',
      description: stayBounceCorr < 0
        ? `체류시간이 길수록 이탈률이 낮아지는 패턴 (r=${stayBounceCorr}). 콘텐츠 품질이 양호합니다.`
        : `체류시간 증가에도 이탈률이 높은 비정상 패턴. 사용자 의도 분석 필요.`,
      sampleSize: chartData.length
    });
  }

  if (Math.abs(visitStayCorr) > 0.3) {
    signals.push({
      metricA: '방문수',
      metricB: '체류시간',
      coefficient: visitStayCorr,
      direction: visitStayCorr > 0 ? 'positive' : 'negative',
      description: visitStayCorr > 0
        ? `방문자 증가와 함께 체류시간도 증가하는 긍정적 패턴입니다.`
        : `방문자가 늘어날수록 체류시간이 줄어드는 경향. 트래픽 품질 검토 필요.`,
      sampleSize: chartData.length
    });
  }

  if (signals.length === 0) {
    signals.push({
      metricA: '세션',
      metricB: '행동',
      coefficient: 0,
      direction: 'neutral',
      description: '더 많은 데이터가 수집되면 행동 패턴 분석이 가능합니다.',
      sampleSize: chartData.length
    });
  }

  let summary = '';
  if (avgStayTime === 0 && avgBounceRate === 0) {
    summary = '사용자 행동 데이터를 수집하고 있습니다. 충분한 데이터가 쌓이면 상세 분석을 제공합니다.';
  } else {
    summary = `사용자 평균 체류시간은 ${Math.floor(avgStayTime)}초이며, 이탈률은 ${avgBounceRate.toFixed(1)}%입니다. `;
    if (avgBounceRate > 50) {
      summary += '이탈률이 높은 편이니 주요 랜딩 페이지를 점검하세요.';
    } else {
      summary += '이탈률이 적정 수준이며 사용자 참여도가 양호합니다.';
    }
  }

  const recommendations: string[] = [];
  if (avgBounceRate > 50) {
    recommendations.push('이탈률이 높습니다. 랜딩 페이지의 콘텐츠와 CTA를 개선하세요.');
  }
  if (avgStayTime < 90) {
    recommendations.push('체류시간이 짧습니다. 관련 콘텐츠 추천 기능을 추가하세요.');
  }
  recommendations.push('히트맵과 세션 녹화를 분석하여 UX 병목을 파악하세요.');
  if (recommendations.length < 3) {
    recommendations.push('사용자 피드백을 수집하여 개선점을 발굴하세요.');
  }

  return { summary, recommendations: recommendations.slice(0, 3), signals };
};

const generateAcquisitionInsight = (
  _metrics: MetricState[],
  chartData: ChartDataPoint[],
  timeRange: TimeRange
): InsightResponse => {
  const visits = chartData.map(d => d.visits);
  const totalVisits = visits.reduce((a, b) => a + b, 0);
  const visitTrend = analyzeTrend(visits);

  const periodLabel = timeRange === TimeRange.DAY ? '오늘' :
                      timeRange === TimeRange.WEEK ? '이번 주' :
                      timeRange === TimeRange.MONTH ? '이번 달' : '올해';

  let summary = '';
  if (totalVisits === 0) {
    summary = '유입 데이터가 수집되지 않았습니다. 마케팅 캠페인을 시작하거나 UTM 파라미터를 확인하세요.';
  } else if (visitTrend.direction === 'increasing') {
    summary = `${periodLabel} 유입이 ${visitTrend.percentage}% 증가했습니다. 현재 마케팅 전략이 효과적으로 작동하고 있습니다.`;
  } else if (visitTrend.direction === 'decreasing') {
    summary = `${periodLabel} 유입이 ${visitTrend.percentage}% 감소했습니다. 채널별 성과를 분석하고 예산을 재배분하세요.`;
  } else {
    summary = `${periodLabel} 유입이 안정적입니다. 총 ${totalVisits.toLocaleString()}건의 방문이 발생했습니다.`;
  }

  const signals: CorrelationSignal[] = [
    {
      metricA: '유입추세',
      metricB: '성과',
      coefficient: visitTrend.direction === 'increasing' ? 0.7 : visitTrend.direction === 'decreasing' ? -0.5 : 0,
      direction: visitTrend.direction === 'increasing' ? 'positive' : visitTrend.direction === 'decreasing' ? 'negative' : 'neutral',
      description: visitTrend.direction === 'increasing'
        ? '유입 채널 성과가 개선되고 있습니다.'
        : visitTrend.direction === 'decreasing'
        ? '유입 효율이 낮아지고 있어 채널 점검이 필요합니다.'
        : '유입이 안정적으로 유지되고 있습니다.',
      sampleSize: chartData.length
    }
  ];

  const recommendations = [
    'UTM 파라미터를 활용하여 캠페인별 성과를 정밀하게 추적하세요.',
    '전환율이 높은 채널에 마케팅 예산을 집중하세요.',
    '검색 엔진 최적화(SEO)를 통해 오가닉 트래픽을 늘리세요.'
  ];

  return { summary, recommendations, signals };
};

const generateTechInsight = (
  _metrics: MetricState[],
  chartData: ChartDataPoint[],
  _timeRange: TimeRange
): InsightResponse => {
  const visits = chartData.map(d => d.visits);
  const totalVisits = visits.reduce((a, b) => a + b, 0);

  const summary = totalVisits > 0
    ? `기술 환경 데이터를 분석 중입니다. 디바이스별, 브라우저별 상세 분석을 통해 최적화 기회를 발견하세요.`
    : '기술 환경 데이터 수집 중입니다. 충분한 샘플이 모이면 분석을 시작합니다.';

  const signals: CorrelationSignal[] = [
    {
      metricA: '모바일',
      metricB: '데스크톱',
      coefficient: 0,
      direction: 'neutral',
      description: '디바이스별 방문 비율과 전환율 차이를 분석 중입니다.',
      sampleSize: chartData.length
    }
  ];

  const recommendations = [
    '모바일 퍼스트 전략으로 반응형 디자인을 최적화하세요.',
    '주요 브라우저별 렌더링 테스트를 정기적으로 수행하세요.',
    '저사양 기기 사용자를 위한 경량화 옵션을 고려하세요.'
  ];

  return { summary, recommendations, signals };
};

const generateConversionInsight = (
  _metrics: MetricState[],
  chartData: ChartDataPoint[],
  _timeRange: TimeRange
): InsightResponse => {
  const conversions = chartData.map(d => d.conversions || 0);
  const visits = chartData.map(d => d.visits);

  const totalConversions = conversions.reduce((a, b) => a + b, 0);
  const totalVisits = visits.reduce((a, b) => a + b, 0);
  const conversionRate = totalVisits > 0 ? (totalConversions / totalVisits) * 100 : 0;

  const convTrend = analyzeTrend(conversions);

  let summary = '';
  if (totalVisits === 0) {
    summary = '전환 데이터 수집 중입니다. 전환 이벤트를 설정하고 목표를 정의하세요.';
  } else {
    summary = `전환율 ${conversionRate.toFixed(2)}%를 기록했습니다. 총 ${totalConversions.toLocaleString()}건의 전환이 발생했습니다. `;
    if (convTrend.direction === 'increasing') {
      summary += `전환이 ${convTrend.percentage}% 상승 추세입니다.`;
    } else if (convTrend.direction === 'decreasing') {
      summary += `전환이 ${convTrend.percentage}% 하락했습니다. 퍼널 분석을 통해 이탈 구간을 확인하세요.`;
    }
  }

  const visitConvCorr = calculateCorrelation(visits, conversions);

  const signals: CorrelationSignal[] = [];
  if (Math.abs(visitConvCorr) > 0.3) {
    signals.push({
      metricA: '방문수',
      metricB: '전환수',
      coefficient: visitConvCorr,
      direction: visitConvCorr > 0 ? 'positive' : 'negative',
      description: visitConvCorr > 0
        ? `방문자 증가와 전환 증가가 비례하는 건강한 패턴입니다 (r=${visitConvCorr}).`
        : `방문자가 증가해도 전환이 따라오지 않습니다. 전환 경로 최적화가 필요합니다.`,
      sampleSize: chartData.length
    });
  } else {
    signals.push({
      metricA: '전환',
      metricB: '분석',
      coefficient: 0,
      direction: 'neutral',
      description: '전환 패턴 분석을 위해 더 많은 데이터가 필요합니다.',
      sampleSize: chartData.length
    });
  }

  const recommendations = [
    '결제/가입 프로세스를 3단계 이내로 간소화하세요.',
    '장바구니/폼 이탈자에게 리마인드 이메일을 발송하세요.',
    'CTA 버튼의 문구와 색상을 A/B 테스트하세요.'
  ];

  return { summary, recommendations, signals };
};

const generatePerformanceInsight = (
  _metrics: MetricState[],
  _chartData: ChartDataPoint[],
  _timeRange: TimeRange
): InsightResponse => {
  const summary = '웹 성능 지표(Core Web Vitals)를 모니터링하세요. LCP < 2.5s, FID < 100ms, CLS < 0.1을 목표로 최적화하세요.';

  const signals: CorrelationSignal[] = [
    {
      metricA: 'LCP',
      metricB: '이탈률',
      coefficient: -0.6,
      direction: 'negative',
      description: '로딩 속도가 1초 개선될 때마다 이탈률이 약 4% 감소하는 것으로 알려져 있습니다.',
      sampleSize: 0
    }
  ];

  const recommendations = [
    '이미지 최적화(WebP, lazy loading)로 LCP를 개선하세요.',
    'JavaScript 번들을 코드 스플리팅하여 초기 로딩을 줄이세요.',
    'CLS 방지를 위해 이미지와 광고 영역에 고정 크기를 지정하세요.'
  ];

  return { summary, recommendations, signals };
};

// 기본 브리핑 (탭에 해당하는 데이터가 없을 경우)
const generateDefaultInsight = (): InsightResponse => ({
  summary: '데이터를 분석 중입니다. 충분한 데이터가 수집되면 더 정확한 인사이트를 제공합니다.',
  recommendations: [
    '지속적인 데이터 수집을 통해 정밀한 인사이트를 확보하세요.',
    '주요 지표의 변동 추이를 정기적으로 모니터링하세요.',
    '목표를 설정하고 달성률을 추적하세요.'
  ],
  signals: [{
    metricA: '데이터',
    metricB: '수집',
    coefficient: 0,
    direction: 'neutral',
    description: '분석에 필요한 샘플을 수집하고 있습니다.',
    sampleSize: 0
  }]
});

export const generateLocalInsights = async (
  activeTab: TabID,
  timeRange: TimeRange,
  metrics: unknown[],
  chartData: unknown[]
): Promise<InsightResponse> => {
  const metricStates = metrics as MetricState[];
  const chartPoints = chartData as ChartDataPoint[];

  switch (activeTab) {
    case TabID.OVERVIEW:
      return generateOverviewInsight(metricStates, chartPoints, timeRange);
    case TabID.BEHAVIOR:
      return generateBehaviorInsight(metricStates, chartPoints, timeRange);
    case TabID.ACQUISITION:
      return generateAcquisitionInsight(metricStates, chartPoints, timeRange);
    case TabID.TECH:
      return generateTechInsight(metricStates, chartPoints, timeRange);
    case TabID.CONVERSION:
      return generateConversionInsight(metricStates, chartPoints, timeRange);
    case TabID.PERFORMANCE:
      return generatePerformanceInsight(metricStates, chartPoints, timeRange);
    default:
      return generateDefaultInsight();
  }
};
