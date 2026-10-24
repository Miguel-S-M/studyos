export interface RouteDef { path: string; label: string; stage: number; ready: boolean }
// ready=false: módulo ainda não implementado; a página diz isso claramente.
export const ROUTES: RouteDef[] = [
  { path: '/', label: 'Dashboard', stage: 1, ready: true },
  { path: '/foco', label: 'Foco', stage: 2, ready: true },
  { path: '/materias', label: 'Matérias', stage: 2, ready: true },
  { path: '/tarefas', label: 'Tarefas', stage: 2, ready: true },
  { path: '/calendario', label: 'Calendário', stage: 2, ready: true },
  { path: '/historico', label: 'Histórico', stage: 2, ready: true },
  { path: '/estatisticas', label: 'Estatísticas', stage: 2, ready: true },
  { path: '/memoria', label: 'Memória', stage: 3, ready: true },
  { path: '/biblioteca', label: 'Biblioteca', stage: 3, ready: true },
  { path: '/insights', label: 'Insights', stage: 3, ready: true },
  { path: '/midia', label: 'Mídia', stage: 6, ready: true },
  { path: '/holo', label: 'Holo', stage: 5, ready: true },
  { path: '/comunidade', label: 'Comunidade', stage: 7, ready: false },
  { path: '/config', label: 'Configurações', stage: 1, ready: true },
]
