/**
 * Tipos provisionales para la ITERACIÓN 1.
 * En esta fase no existe verificación real: todo resultado es DEMO
 * (ver docs/PRODUCT_SPEC.md, secciones 5, 9 y 38).
 */

export type RiskClassification =
  | 'likely_legitimate'
  | 'caution'
  | 'high_risk'
  | 'unverifiable';

export type InputKind = 'text' | 'url' | 'image';

export interface PendingInput {
  kind: InputKind;
  /** Texto o URL pegado por el usuario. Vacío cuando kind === 'image'. */
  value: string;
  /** URI local de la imagen seleccionada, cuando kind === 'image'. */
  imageUri?: string;
}

export interface DemoAnalysisResult {
  id: string;
  isDemo: true;
  classification: RiskClassification;
  score: number | null;
  headline: string;
  recommendedAction: string;
  reasons: string[];
  sourcesChecked: string[];
  sourcesNotApplicable: string[];
  notVerified: string[];
}
