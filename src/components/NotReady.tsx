export function NotReady({ label, stage }: { label: string; stage: number }) {
  return (
    <section className="rounded-lg border border-graphite-600 bg-graphite-900 p-6">
      <h1 className="text-xl font-semibold">{label}</h1>
      <p className="mt-2 max-w-prose text-mute">
        Este módulo ainda não foi construído. Ele está previsto para a etapa {stage} do roadmap.
      </p>
    </section>
  )
}
