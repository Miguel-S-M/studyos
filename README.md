# StudyOS

Sistema de estudos que roda 100% no navegador: foco (cronômetro livre, Pomodoro com pausas, contagem regressiva), matérias, tarefas, histórico, calendário, estatísticas, memória (flashcards com repetição espaçada), insights, biblioteca (estante com capas), mídia e Holo local.

Não precisa de instalação, build, conta nem servidor. São só arquivos estáticos.

## Publicar no GitHub Pages (pela raiz)

1. Crie um repositório (qualquer nome) e envie **todos os arquivos desta pasta** para a raiz dele (`index.html`, `sw.js`, `icon.svg`, pastas `css` e `js`).
2. No GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
3. Em 1 a 2 minutos o site abre em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

Não há workflow nem passo de build. Para atualizar, basta enviar os arquivos alterados.

## Seus dados

- Ficam no IndexedDB **deste navegador, neste aparelho**. Nada é enviado para fora.
- Celular e computador **não** compartilham dados. Para levar de um para o outro: Configurações → Exportar JSON, e Importar JSON no outro aparelho.
- Limpar os dados do site ou perder o aparelho apaga tudo. Exporte backups com frequência.
- O backup do projeto anterior (versão React) é compatível e pode ser importado.

## Observações

- Precisa de um navegador atual (Chrome, Edge, Firefox, Safari). Abrir `index.html` com duplo clique pode não funcionar em alguns navegadores (módulos JavaScript exigem `http`); use o Pages ou um servidor local (`python3 -m http.server`).
- Depois da primeira visita o site abre sem internet (service worker). Quando há internet, sempre carrega a versão mais nova.
- Avisos de "tempo concluído" só aparecem com a aba aberta. O navegador pede permissão.
- Capas de livros são reduzidas no próprio navegador (JPG, PNG ou WebP) e entram no backup.
- Sem IA generativa: o Holo é local e calcula sugestões por regras. Sem integração com YouTube/Spotify além de links e player incorporado.

## Estrutura

```
index.html        página única
css/style.css     visual (preto, grafite, cobre e laranja), responsivo
js/main.js        rotas e atualização das telas
js/db.js          IndexedDB sem bibliotecas
js/services.js    sessões de foco, pausas do Pomodoro, leitura, avisos
js/backup.js      exportar/importar; js/validate.js valida o arquivo importado
js/core/          lógica pura (tempo, estatísticas, repetição espaçada, estante...)
js/views/         uma página por arquivo
docs/             documento mestre do projeto
```

Todo texto é inserido como texto (nunca como HTML) e links de mídia só aceitam http(s).
