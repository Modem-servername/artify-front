
/**
 * Nexus Statistics Engine
 * 외부 API 없이 클라이언트 사이드에서 상관관계 및 통계 분석을 수행합니다.
 */

// 평균 계산
export const getMean = (data: number[]) => data.reduce((a, b) => a + b, 0) / data.length;

// 표준편차 계산
export const getStdDev = (data: number[], mean: number) => {
  const sqDiffs = data.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(getMean(sqDiffs));
};

/**
 * Pearson 상관계수 (Numeric-Numeric)
 */
export const calculatePearson = (x: number[], y: number[]): number => {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;
  const meanX = getMean(x);
  const meanY = getMean(y);
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX) * Math.sqrt(denY);
  return den === 0 ? 0 : num / den;
};

/**
 * Spearman 순위 상관계수
 */
export const calculateSpearman = (x: number[], y: number[]): number => {
  const getRanks = (data: number[]) => {
    const sorted = [...data].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(data.length);
    sorted.forEach((item, index) => { ranks[item.i] = index + 1; });
    return ranks;
  };
  return calculatePearson(getRanks(x), getRanks(y));
};

/**
 * Correlation Ratio η (Eta) (Category-Numeric)
 */
export const calculateEta = (categories: string[], values: number[]): number => {
  const n = values.length;
  if (n === 0) return 0;
  const overallMean = getMean(values);
  const groups: Record<string, number[]> = {};
  categories.forEach((cat, i) => {
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(values[i]);
  });
  let ssBetween = 0, ssTotal = 0;
  Object.values(groups).forEach(groupValues => {
    const groupMean = getMean(groupValues);
    ssBetween += groupValues.length * Math.pow(groupMean - overallMean, 2);
  });
  values.forEach(v => { ssTotal += Math.pow(v - overallMean, 2); });
  return ssTotal === 0 ? 0 : Math.sqrt(ssBetween / ssTotal);
};

/**
 * Phi Coefficient φ (Binary-Binary)
 */
export const calculatePhi = (x: (0|1)[], y: (0|1)[]): number => {
  let n11=0, n10=0, n01=0, n00=0;
  for(let i=0; i<x.length; i++) {
    if(x[i]===1 && y[i]===1) n11++;
    else if(x[i]===1 && y[i]===0) n10++;
    else if(x[i]===0 && y[i]===1) n01++;
    else n00++;
  }
  const n1_ = n11 + n10, n0_ = n01 + n00, n_1 = n11 + n01, n_0 = n10 + n00;
  const den = Math.sqrt(n1_ * n0_ * n_1 * n_0);
  return den === 0 ? 0 : (n11 * n00 - n10 * n01) / den;
};

/**
 * 상관계수 해석 도우미
 */
export const interpretCorrelation = (coef: number): string => {
  const abs = Math.abs(coef);
  if (abs >= 0.7) return '매우 강한';
  if (abs >= 0.4) return '뚜렷한';
  if (abs >= 0.2) return '약한';
  return '미미한';
};
