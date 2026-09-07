import type { DemoAnalysisResult } from '../types/analysis';

/**
 * Casos DEMO fijos (docs/PRODUCT_SPEC.md, sección 38).
 * Ningún dato aquí proviene de una verificación real: no hay providers,
 * RDAP ni IA todavía. Se muestran únicamente para probar la navegación
 * y el diseño de la pantalla de resultado.
 */
export const demoResults: DemoAnalysisResult[] = [
  {
    id: 'demo-phishing-paqueteria',
    isDemo: true,
    classification: 'high_risk',
    score: 82,
    headline: 'No realices el pago.',
    recommendedAction:
      'No abras el enlace ni introduzcas datos bancarios. Accede a la empresa de paquetería desde su app o web oficial.',
    reasons: [
      'El dominio tiene pocos días de antigüedad.',
      'No coincide con el dominio oficial de la empresa de paquetería.',
      'Solicita datos de pago mediante un enlace externo.',
      'Existen señales técnicas asociadas a phishing.',
    ],
    sourcesChecked: ['RDAP', 'Reputación de URL', 'Identidad oficial'],
    sourcesNotApplicable: ['Registro financiero'],
    notVerified: ['No se ha podido confirmar quién envió el mensaje original.'],
  },
  {
    id: 'demo-web-legitima',
    isDemo: true,
    classification: 'likely_legitimate',
    score: 8,
    headline: 'No hemos encontrado señales relevantes de fraude.',
    recommendedAction:
      'Aun así, verifica siempre los datos de pago antes de una compra importante.',
    reasons: [
      'El dominio coincide con el dominio oficial conocido.',
      'No aparece en listas de reputación negativa consultadas.',
      'El registro del dominio es consistente con una empresa establecida.',
    ],
    sourcesChecked: ['RDAP', 'Reputación de URL', 'Identidad oficial'],
    sourcesNotApplicable: [],
    notVerified: [
      'PROOF no garantiza la seguridad de transacciones futuras en esta web.',
    ],
  },
  {
    id: 'demo-marketplace-sospechoso',
    isDemo: true,
    classification: 'caution',
    score: 55,
    headline: 'Ten cuidado antes de continuar.',
    recommendedAction:
      'Evita pagar fuera de la plataforma del marketplace. Usa siempre sus métodos de pago oficiales.',
    reasons: [
      'El vendedor pide completar el pago fuera de la plataforma.',
      'El anuncio usa lenguaje de urgencia poco habitual.',
    ],
    sourcesChecked: ['Análisis de texto'],
    sourcesNotApplicable: ['RDAP', 'Identidad oficial'],
    notVerified: ['No se ha podido verificar la identidad real del vendedor.'],
  },
  {
    id: 'demo-inversion-dudosa',
    isDemo: true,
    classification: 'unverifiable',
    score: null,
    headline: 'No podemos verificarlo con la información disponible.',
    recommendedAction:
      'No inviertas basándote únicamente en este mensaje. Busca la entidad en los registros oficiales antes de confiar en ella.',
    reasons: [
      'El mensaje promete rentabilidades muy por encima del mercado.',
      'No se ha podido identificar una entidad regulada asociada.',
    ],
    sourcesChecked: ['Análisis de texto'],
    sourcesNotApplicable: [],
    notVerified: [
      'Registro de la CNMV — no consultado todavía en esta fase.',
      'No se ha podido confirmar la identidad de la entidad que ofrece la inversión.',
    ],
  },
  {
    id: 'demo-nuevo-numero-familiar',
    isDemo: true,
    classification: 'caution',
    score: 48,
    headline: 'Confírmalo por otra vía antes de actuar.',
    recommendedAction:
      'Llama a tu familiar al número que ya tenías guardado antes de enviar dinero o datos.',
    reasons: [
      'El mensaje afirma ser un familiar escribiendo desde un número nuevo.',
      'Se solicita una transferencia o pago urgente.',
    ],
    sourcesChecked: ['Análisis de texto'],
    sourcesNotApplicable: ['RDAP', 'Reputación de URL'],
    notVerified: ['No se ha podido verificar la identidad del remitente.'],
  },
];

export function pickDemoResult(seed: string): DemoAnalysisResult {
  const normalized = seed.trim();
  if (normalized.length === 0) {
    return demoResults[0];
  }
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return demoResults[hash % demoResults.length];
}
