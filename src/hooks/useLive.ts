import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

/** Consulta reativa ao IndexedDB (atualiza também quando outra aba altera os dados). */
export function useLive<T>(query: () => Promise<T>, deps: unknown[] = []): { data?: T; error?: string } {
  const [state, setState] = useState<{ data?: T; error?: string }>({})
  useEffect(() => {
    const sub = liveQuery(query).subscribe({
      next: (data) => setState({ data }),
      error: (e) => setState({ error: String(e?.message ?? e) }),
    })
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}
