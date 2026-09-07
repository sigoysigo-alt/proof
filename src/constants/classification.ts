import { colors } from './theme';
import type { RiskClassification } from '../types/analysis';

export const classificationLabels: Record<RiskClassification, string> = {
  likely_legitimate: 'Parece legítimo',
  caution: 'Precaución',
  high_risk: 'Alto riesgo',
  unverifiable: 'No se puede verificar',
};

export const classificationEmoji: Record<RiskClassification, string> = {
  likely_legitimate: '🟢',
  caution: '🟡',
  high_risk: '🔴',
  unverifiable: '⚪',
};

export const classificationColors: Record<
  RiskClassification,
  { text: string; background: string }
> = {
  likely_legitimate: {
    text: colors.riskLegitimate,
    background: colors.riskLegitimateBg,
  },
  caution: {
    text: colors.riskCaution,
    background: colors.riskCautionBg,
  },
  high_risk: {
    text: colors.riskHigh,
    background: colors.riskHighBg,
  },
  unverifiable: {
    text: colors.riskUnverifiable,
    background: colors.riskUnverifiableBg,
  },
};
