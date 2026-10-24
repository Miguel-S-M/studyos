# StudyOS — progresso

## Feito (Etapa 1, parcial)
- [x] package.json, vite.config.ts (base /studyos/), tsconfig, .gitignore, .env.example (sem segredos)
- [x] Workflow GitHub Actions: npm ci → test → build → deploy no Pages
- [x] Núcleo dos cronômetros (src/features/focus/timerCore.ts) + testes (tests/timerCore.test.ts)

## Feito (Etapa 1, código escrito, NÃO compilado)
- [x] index.html, Tailwind/PostCSS com paleta preto/grafite/cobre/laranja, HashRouter, navegação lateral (PC) e inferior (celular)
- [x] Camada Dexie (src/services/storage/db.ts): matérias, sessões, configurações
- [x] Dashboard real: tempo focado hoje, meta, sessões, estados de carregamento/erro/vazio (statsCore.ts testado com Node)
- [x] Testes: statsCore (meia-noite, pausas) e persistência com fake-indexeddb (escritos, ainda não executados no Vitest)
- [x] Páginas dos módulos futuros avisam que ainda não existem

## Feito (Etapa 2a, código escrito, NÃO compilado)
- [x] Foco: cronômetro livre, Pomodoro (25 min) e contagem regressiva; pausar/retomar/finalizar/cancelar; notas; matéria
- [x] Sessão ativa guardada no IndexedDB: sobrevive a recarregar, sincroniza entre abas, só uma ativa por vez, id estável evita duplicar ao salvar
- [x] Sessão abandonada (sem aba aberta >30 min): finalizar no último momento visto, continuar ou descartar
- [x] Matérias: criar, editar nome, arquivar/reativar (histórico preservado)
- [x] tests/active.test.ts (Vitest, não executado); activeCore verificado com Node

## Feito (Etapa 2b, código escrito, NÃO compilado)
- [x] Tarefas: prioridade, prazo, matéria, estimativa, subtarefas, filtros, vencidas destacadas, tempo real somado das sessões ligadas à tarefa (escolhida na tela Foco)
- [x] Histórico: filtros por período/matéria/tipo, pausas visíveis, apagar com confirmação, exportação CSV (com proteção contra fórmulas)
- [x] Backup: exportar/importar JSON validado com Zod; importar mescla por id sem apagar nem duplicar
- [x] Configurações: meta diária, backup, apagar tudo (com confirmação)
- [x] Banco versão 2 (tabela tasks). Testes: csv.test.ts (csv verificado com Node), backup.test.ts (não executado)

## Feito (Etapa 2c, código escrito, NÃO compilado)
- [x] Estatísticas (Recharts): total, média diária, dias com meta cumprida, sequência, minutos por dia e por matéria (7/14/30/90 dias)
- [x] Dashboard: foco de hoje por matéria e próximas tarefas
- [x] README com instalação, publicação no Pages, segurança e integrações futuras
- [x] tests/statsRange.test.ts (cálculos verificados com Node; Vitest não executado)

## Feito (Etapa 3a, código escrito, NÃO compilado)
- [x] Laboratório de memória: criar/editar/apagar/pesquisar cartões, fila de revisão do dia, resposta oculta até revelar, avaliação difícil/parcial/fácil, estatísticas (para hoje, atrasados, difíceis, intervalo ≥ 21 dias)
- [x] Repetição espaçada com regras documentadas em srsCore.ts (verificada com Node) + tests/srs.test.ts (Vitest, não executado)
- [x] Insights e notas: 7 tipos, fonte obrigatória em citações literais, tags, favoritos, pesquisa e filtros, criar flashcard a partir de um insight
- [x] Banco versão 3 (flashcards, reviewEvents, insights); backup JSON inclui as novas tabelas (backups antigos continuam válidos)

## Feito (Etapa 3b, código escrito, NÃO compilado)
- [x] Biblioteca: livros com título, autor, formato, total de páginas, página atual, estado e progresso; entrada manual (sem consulta online)
- [x] Timer de leitura separado do estudo (tabela e cálculos próprios): pausa fora do tempo, página inicial e final, nota, páginas lidas só quando os dados permitem, livro concluído ao chegar na última página, uma leitura ativa por vez entre abas
- [x] Insights podem ser ligados a um livro (a fonte da citação vem do título)
- [x] Banco versão 4 (books, readingSessions); backup inclui livros e leituras (backups antigos continuam válidos)
- [x] tests/reading.test.ts (Vitest, não executado); readingCore verificado com Node

## Feito (Etapas 6a e 4a, código escrito, NÃO compilado)
- [x] Media Hub por links, sem credenciais: guardar YouTube/Spotify/outros, matéria, notas, concluído, pesquisa, abrir no site, player incorporado só sob demanda; links não-http(s) rejeitados (parser verificado com Node)
- [x] Mídia associável à sessão de foco (aparece como link na sessão)
- [x] Banco versão 5 (media); backup inclui mídia
- [x] Supabase PREPARADO, não implementado: supabase/migrations/0001_records.sql (RLS por dono, chave que impede duplicar) e supabase/README.md; Configurações mostra o estado real da sincronização; workflow repassa só variáveis públicas VITE_*
- [ ] SQL e RLS NÃO foram testados (sem Postgres/Supabase aqui)

## Feito (Etapa 5a, código escrito, NÃO compilado)
- [x] Holo (interface): 5 personalidades com exemplos, intensidade, mensagens motivacionais, privacidade (padrão: nada é enviado além da mensagem; histórico não guardado), prévia do que será enviado, apagar histórico
- [x] Contexto mínimo (contextCore.ts): só estatísticas e/ou tarefas abertas, se você autorizar; notas, insights e livros nunca saem
- [x] Cliente (holoClient.ts): só fala com a função de servidor, erros claros (sem configuração, sem login, limite, rede, servidor); verificado com Node
- [x] Função de servidor PREPARADA (supabase/functions/holo/index.ts) e limite diário (migração 0002): chave de IA só como segredo do servidor, CORS restrito, validação de entrada; NÃO testada nem implantada
- [x] A página Holo mostra "indisponível" com o motivo real (sem função configurada, ou login ainda não implementado); nenhuma resposta é simulada

## Mudança de rumo: 100% local (decisão do usuário)
- [x] Removidos: supabase/ (SQL, função do Holo), cliente/config de sincronização, cliente de IA, variáveis VITE_*, seção de nuvem em Configurações
- [x] Holo agora é LOCAL: sugestões por regras sobre os dados (coachCore.ts, verificado com Node), 5 personalidades; rotulado como não-IA
- [x] Etapa 4 (sincronização) e a função de servidor do Holo foram canceladas; levar dados a outro aparelho = backup JSON

## Feito (rodada de completar faltas, código escrito, NÃO compilado)
- [x] Pomodoro em ciclos: ao finalizar um pomodoro, inicia pausa curta ou longa (a cada N pomodoros do dia); a pausa persiste ao recarregar e NÃO conta como estudo; durações configuráveis em Configurações
- [x] Histórico: adicionar sessão manual e editar sessões (validação: fim depois do início, não no futuro, máx. 24 h; alterar horários remove as pausas); marcadas como "manual"
- [x] Calendário mensal: minutos por dia com cor relativa à meta, navegação entre meses, sessões do dia selecionado
- [x] Lógica verificada com Node (pomodoroCore, manualCore, calendarCore); tests/p3.test.ts para o Vitest (não executado)

## Feito (estatísticas avançadas e organização, código escrito, NÃO compilado)
- [x] Metas semanais por matéria (definidas em Matérias) com progresso dos últimos 7 dias nas Estatísticas
- [x] Foco por horário do dia, mapa de calor das últimas 12 semanas e observação com explicação de como foi calculada (só com 10+ sessões concluídas)
- [x] Tarefas com tags e filtro por tag
- [x] hourDistribution verificado com Node; tests/p4.test.ts para o Vitest (não executado)

## Build real do usuário: npm install, testes e dev server funcionaram (corrigidos 1 erro de tipo e 1 teste)

## Feito (estante e avisos, código escrito, NÃO compilado)
- [x] Biblioteca em modo estante: capa por upload (JPG/PNG/WebP, reduzida no navegador), organizar por minhas estantes, autor, obra/coleção ou estado; arrastar para reordenar e mover entre estantes; clicar para virar o livro (verso com editar autor/obra, mover, capa, ler); setas e seletor como alternativa ao arrastar (celular/teclado)
- [x] Livros ganharam capa, obra/coleção, estante e posição; backup valida a capa (só imagem JPG/PNG/WebP)
- [x] Avisos do navegador quando o tempo definido termina (opcional, aba aberta)
- [x] shelfCore e coverUtil verificados com Node; tests/shelf.test.ts para o Vitest

## Feito (rodada "o que faltou", código escrito, NÃO compilado)
- [x] Livros: nota (1 a 5), comentário e meta de páginas por dia (com progresso de hoje); recuperar leitura abandonada (finalizar no último momento visto, continuar ou descartar)
- [x] Calendário: visões de dia e semana além do mês
- [x] Tarefas: listas nomeadas (com filtro)
- [x] Estatísticas: comparação com o período anterior e tempo por tarefa
- [x] Cartões: ligados a livros (também a partir de insights), resumo das revisões dos últimos 30 dias, exportar só os cartões (importar pelo mesmo botão de backup)
- [x] tests/p5.test.ts para o Vitest; cálculos verificados com Node

## Falta
- [ ] Rodar npm install/test/build e corrigir erros (tsc estrito não foi executado)
- [ ] Lembretes de revisão de insights; vários exemplares por livro; buscar dados do livro online (exigiria API externa, fora do escopo local)
- [ ] Mídia: controles de reprodução e marcar progresso dependem das APIs oficiais (credenciais) e ficam fora do escopo local
- [ ] Etapa 7: inteligência de estudos, comunidade, notificações, auditorias
