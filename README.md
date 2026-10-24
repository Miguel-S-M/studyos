# StudyOS

Ambiente de estudos que roda no navegador: cronômetros, Pomodoro, matérias, tarefas, histórico e estatísticas.
Os dados ficam **somente no seu navegador** (IndexedDB). Não há conta nem servidor.

> Estado atual: etapas 1 e 2 em andamento. Veja [PROGRESS.md](PROGRESS.md) para o que existe e o que falta.
> Módulos ainda não construídos (comunidade) mostram um aviso na própria página.

## O que já funciona

- Dashboard com tempo focado hoje, meta diária, sessões, foco por matéria e próximas tarefas
- Foco: cronômetro livre, Pomodoro (uma etapa de foco), contagem regressiva; pausar, retomar, finalizar, cancelar
- A sessão ativa sobrevive a recarregar a página e é compartilhada entre abas (só uma por vez)
- Sessão abandonada (nenhuma aba aberta por mais de 30 min): finalizar no último momento visto, continuar ou descartar
- Pomodoro em ciclos (pausa curta e longa configuráveis), calendário mensal, sessões manuais e edição de sessões
- Estatísticas avançadas (foco por horário, mapa de calor, metas semanais por matéria) e tarefas com tags
- Matérias (criar, editar, arquivar) e tarefas (prioridade, prazo, estimativa, subtarefas, tempo real por tarefa)
- Histórico com filtros e exportação CSV; estatísticas com gráficos e sequência de dias
- Laboratório de memória: flashcards com repetição espaçada (difícil, parcial, fácil) e insights/notas com fonte; regras em `src/features/memory-lab/srsCore.ts`
- Biblioteca em estante (capa, autor, obra, arrastar, virar o livro) e lista, com timer de leitura (separado do tempo de estudo), progresso por livro e insights ligados a livros
- Mídia: links de YouTube e Spotify guardados por matéria, com player incorporado opcional, e associáveis às sessões de foco
- Holo local: sugestões calculadas por regras com seus dados (meta do dia, tarefas vencidas, cartões para revisar, sequência), com 5 personalidades. Não é IA generativa e nada sai do navegador
- Livros com nota, comentário e meta diária de páginas; calendário em mês, semana e dia; listas de tarefas; comparação entre períodos
- Backup: exportar e importar JSON (validado; importar não apaga nem duplica)

## Rodar localmente

Requer Node 20 ou superior.

```bash
npm install
npm test          # testes (Vitest)
npm run dev       # servidor local
npm run build     # verificação de tipos + build de produção em dist/
```

## Publicar no GitHub Pages

1. Crie um repositório **público** chamado `studyos` (branch `main`). Se usar outro nome, altere `base` em `vite.config.ts` para `'/<nome>/'` e o caminho do favicon em `index.html`.
2. Envie o código (`git init`, `git add .`, `git commit`, `git remote add origin ...`, `git push -u origin main`).
3. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. A cada push na `main`, o workflow `.github/workflows/deploy.yml` instala, testa, compila e publica. Se o teste ou o build falhar, nada é publicado.
5. O site fica em `https://<seu-usuario>.github.io/studyos/`. As rotas usam `#` (HashRouter), então recarregar qualquer página funciona.

## Seus dados

- Ficam no IndexedDB do navegador. Limpar os dados do site ou perder o aparelho apaga tudo.
- **Exporte um backup JSON** em Configurações com frequência. O armazenamento local não é backup.
- Não há sincronização entre aparelhos: para trocar de computador, exporte e importe o JSON.

## Segurança

- Nada é enviado para fora do navegador. Mesmo assim, o repositório é público: nunca coloque senhas, tokens ou chaves nele. `.env` e `.env.*` estão no `.gitignore`.
- Os dados ficam no navegador, sem criptografia: quem usar o mesmo perfil do navegador no seu aparelho pode vê-los.
- O texto que você digita é exibido pelo React sem interpretar HTML, e links de mídia só aceitam http(s).

## Decisão: 100% local

O StudyOS não tem conta, login, nuvem nem servidor. Por isso não há chaves, senhas nem serviços externos para proteger, e o repositório público não precisa de nenhum segredo.
Foram removidos: sincronização com Supabase, função de servidor de IA e variáveis de ambiente.
Para usar em outro aparelho, exporte o backup JSON e importe lá.

Fora do escopo local: IA generativa (exigiria uma chave guardada em servidor) e as APIs oficiais de YouTube/Spotify (exigem credenciais). A página Mídia funciona só com links.

## Estrutura

```
src/app          navegação e rotas
src/features     um diretório por módulo (focus, subjects, tasks, history, statistics, settings, dashboard)
src/services     armazenamento (Dexie), backup e download
src/hooks        useLive (consultas reativas ao IndexedDB)
tests            testes automatizados
```

A lógica de tempo é pura e testável (`timerCore.ts`, `statsCore.ts`): o tempo focado é sempre calculado a partir de
timestamps de início, pausas e fim, e as estatísticas são recalculadas das sessões originais.
