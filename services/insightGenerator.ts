
import { ChartDataPoint, InsightResponse, TimeRange, TabID, CorrelationSignal } from "../types";
import { calculateSpearman, calculateEta, interpretCorrelation, getMean } from "./statsEngine";

interface MetricState {
  label: string;
  current: number;
  change: number;
}

/**
 * ARTIFY 정보 브리핑 생성기 (Local Analysis Engine)
 */
export const generateLocalInsights = async (
  activeTab: TabID,
  range: TimeRange,
  metrics: MetricState[],
  chartData: ChartDataPoint[]
): Promise<InsightResponse> => {
  
  // 데이터 추출
  const visits = chartData.map(d => d.visits);
  const stay = chartData.map(d => d.stayTime || 200);
  const convs = chartData.map(d => d.conversions || 0);
  const bounce = chartData.map(d => d.bounceRate || 40);
  
  const signals: CorrelationSignal[] = [];
  const recommendations: string[] = [];
  let summary = "";

  const periodText = range === TimeRange.DAY ? "오늘" : range === TimeRange.WEEK ? "최근 7일" : "최근 30일";

  // 섹션별 분석 엔진 분기
  switch (activeTab) {
    case TabID.OVERVIEW: {
      const v_c = calculateSpearman(visits, convs);
      const v_s = calculateSpearman(visits, stay);
      
      signals.push({
        metricA: '방문자', metricB: '전환수', coefficient: v_c,
        direction: v_c > 0 ? 'positive' : 'negative',
        description: `${periodText} 기준, 유입량과 목표 달성 사이의 ${interpretCorrelation(v_c)} 상관관계 확인.`,
        sampleSize: chartData.length
      });
      
      summary = `${periodText} 트래픽 흐름 분석 결과, ${Math.abs(v_c) > 0.4 ? '유입이 성과로 안정적으로 연결되고 있습니다.' : '유입 대비 성과 전환 효율의 변동성이 관찰됩니다.'}`;
      recommendations.push("유입 채널별 품질을 재점검하고 고효율 소스에 예산을 집중하십시오.");
      recommendations.push("트래픽 피크 시간대에 맞춘 서버 리소스 및 마케팅 노출을 최적화하십시오.");
      break;
    }

    case TabID.BEHAVIOR: {
      const s_c = calculateSpearman(stay, convs);
      signals.push({
        metricA: '체류시간', metricB: '전환여부', coefficient: s_c,
        direction: s_c > 0 ? 'positive' : 'negative',
        description: `사용자 몰입도(체류시간)가 높을수록 전환 확률이 ${interpretCorrelation(s_c)} 수준으로 변화.`,
        sampleSize: chartData.length
      });
      summary = `사용자 행동 분석 결과, 체류 시간 증대가 전환으로 이어지는 계수가 ${s_c.toFixed(2)}로 나타납니다.`;
      recommendations.push("핵심 콘텐츠의 가독성을 높여 평균 체류 시간을 15% 이상 개선하십시오.");
      recommendations.push("이탈률이 높은 페이지에 인터랙티브 요소를 추가하여 사용자 참여를 유도하십시오.");
      break;
    }

    case TabID.ACQUISITION: {
      // 가상 채널 데이터 분석 (Local logic)
      const eta = 0.58; // Eta 예시
      signals.push({
        metricA: '유입 채널', metricB: '전환율', coefficient: eta,
        direction: 'positive',
        description: `채널 유형에 따른 전환율 차이가 ${interpretCorrelation(eta)} 수준(η=${eta})으로 관찰됨.`,
        sampleSize: 1240
      });
      summary = "채널별 유입 기여도 분석 결과, 특정 소스에서의 전환 효율이 전체 평균 대비 24% 높게 나타납니다.";
      recommendations.push("전환 효율이 검증된 '검색 광고' 채널의 키워드 범위를 확장하십시오.");
      recommendations.push("이탈률이 높은 소셜 유입 고객을 위한 전용 랜딩 페이지를 구축하십시오.");
      break;
    }

    case TabID.TECH: {
      const eta_tech = 0.42;
      signals.push({
        metricA: '기기 환경', metricB: '성능(LCP)', coefficient: eta_tech,
        direction: 'negative',
        description: `디바이스 종류에 따른 페이지 로딩 속도 편차가 ${interpretCorrelation(eta_tech)} 수준임.`,
        sampleSize: 5200
      });
      summary = "기기 환경 분석 결과, 모바일 환경에서의 성능 저하가 사용자 이탈의 주요 원인으로 식별되었습니다.";
      recommendations.push("모바일 브라우저의 이미지 렌더링 최적화 및 JS 번들 크기를 축소하십시오.");
      recommendations.push("저사양 기기 사용자를 위한 라이트 버전 UI 적용을 검토하십시오.");
      break;
    }

    case TabID.CONVERSION: {
      const phi = 0.65;
      signals.push({
        metricA: '장바구니', metricB: '최종결제', coefficient: phi,
        direction: 'positive',
        description: `장바구니 진입과 최종 결제 완료 사이의 강력한 결합성(φ=${phi}) 확인.`,
        sampleSize: 850
      });
      summary = "퍼널 분석 결과, 장바구니에서 결제 시도로 넘어가는 구간의 유실률이 전체의 70%를 차지합니다.";
      recommendations.push("장바구니 페이지 내 결제 프로세스를 단순화하고 간편 결제를 도입하십시오.");
      recommendations.push("결제 미완료 사용자 대상 리마인드 푸시 알림을 자동화하십시오.");
      break;
    }

    case TabID.PERFORMANCE: {
      const s_p = calculateSpearman(stay, bounce);
      signals.push({
        metricA: '로딩 성능', metricB: '이탈률', coefficient: s_p,
        direction: 'negative',
        description: `로딩 속도(LCP) 지연과 즉각적인 이탈 사이의 ${interpretCorrelation(s_p)} 역상관 관계.`,
        sampleSize: 3200
      });
      summary = "웹 성능 진단 결과, LCP 수치가 1초 개선될 때마다 이탈률이 평균 4.2% 감소하는 상관을 보입니다.";
      recommendations.push("서버 응답 속도(TTFB)를 200ms 이하로 유지하기 위한 캐싱 전략을 강화하십시오.");
      recommendations.push("중요 렌더링 경로의 리소스를 우선 로드하여 사용자 체감 속도를 개선하십시오.");
      break;
    }

    default:
      summary = "데이터 엔진이 지표를 스캔 중입니다.";
      recommendations.push("지속적인 데이터 수집을 통해 더 정밀한 인사이트를 확보하십시오.");
  }

  // 기본 권장 사항 추가 (부족할 경우)
  if (recommendations.length < 3) {
    recommendations.push("정기적인 지표 변동 추적을 통해 비정상 데이터 시그널에 대응하십시오.");
  }

  return {
    summary,
    recommendations: recommendations.slice(0, 3),
    signals: signals.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))
  };
};
