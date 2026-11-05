export type PersonalityId = 'martin' | 'lumi' | 'sage' | 'pixel' | 'atlas'
export const PERSONALITIES: { id: PersonalityId; label: string; about: string; line: string }[] = [
  { id: 'martin', label: 'Martin', about: 'Firme, direto e disciplinado, sem humilhar.', line: 'Você não precisa estar motivado. Precisa dar o primeiro passo.' },
  { id: 'lumi', label: 'Lumi', about: 'Acolhedora e paciente.', line: 'Você não precisa resolver tudo hoje. Vamos resolver a próxima coisa.' },
  { id: 'sage', label: 'Sage', about: 'Analítica e estratégica.', line: 'Qual atividade mais aproxima você da sua meta hoje?' },
  { id: 'pixel', label: 'Pixel', about: 'Descontraída e lúdica.', line: 'Missão aceita. Vamos vencer esta lista?' },
  { id: 'atlas', label: 'Atlas', about: 'Professor que estimula a recordação ativa.', line: 'Tente explicar o conceito com suas próprias palavras antes de consultar a resposta.' },
]
export interface HoloPrefs { personality: PersonalityId; motivational: boolean }
export const DEFAULT_PREFS: HoloPrefs = { personality: 'lumi', motivational: true }
