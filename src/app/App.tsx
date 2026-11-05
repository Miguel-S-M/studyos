import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { Dashboard } from '../features/dashboard/Dashboard'
import { NotReady } from '../components/NotReady'
import { Focus } from '../features/focus/Focus'
import { Subjects } from '../features/subjects/Subjects'
import { Tasks } from '../features/tasks/Tasks'
import { History } from '../features/history/History'
import { SettingsPage } from '../features/settings/SettingsPage'
import { Statistics } from '../features/statistics/Statistics'
import { MemoryLab } from '../features/memory-lab/MemoryLab'
import { Insights } from '../features/insights/Insights'
import { Library } from '../features/library/Library'
import { MediaHub } from '../features/media-hub/MediaHub'
import { Holo } from '../features/holo/Holo'
import { Calendar } from '../features/calendar/Calendar'
import { ROUTES } from './routes'

const PAGES: Record<string, JSX.Element> = { '/': <Dashboard />, '/foco': <Focus />, '/materias': <Subjects />, '/tarefas': <Tasks />, '/historico': <History />, '/config': <SettingsPage />, '/estatisticas': <Statistics />, '/memoria': <MemoryLab />, '/insights': <Insights />, '/biblioteca': <Library />, '/midia': <MediaHub />, '/holo': <Holo />, '/calendario': <Calendar /> }

const link = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-md px-3 py-2 text-sm ${isActive ? 'bg-graphite-700 text-ember' : 'text-mute hover:text-bone'}`

export function App() {
  return (
    <HashRouter>
      <div className="min-h-screen md:flex">
        <nav aria-label="Principal" className="hidden w-56 shrink-0 flex-col gap-1 border-r border-graphite-700 bg-graphite-900 p-4 md:flex">
          <p className="mb-4 text-lg font-semibold text-copper-soft">StudyOS</p>
          {ROUTES.map((r) => <NavLink key={r.path} to={r.path} end className={link}>{r.label}</NavLink>)}
          <p className="mt-auto text-xs text-mute">Dados salvos só neste navegador. Exporte backups com frequência.</p>
        </nav>
        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">
          <Routes>
            {ROUTES.map((r) => (
              <Route key={r.path} path={r.path} element={r.ready ? PAGES[r.path] : <NotReady label={r.label} stage={r.stage} />} />
            ))}
          </Routes>
        </main>
        <nav aria-label="Principal (celular)" className="fixed inset-x-0 bottom-0 flex gap-1 overflow-x-auto border-t border-graphite-700 bg-graphite-900 p-2 md:hidden">
          {ROUTES.map((r) => <NavLink key={r.path} to={r.path} end className={link}>{r.label}</NavLink>)}
        </nav>
      </div>
    </HashRouter>
  )
}
