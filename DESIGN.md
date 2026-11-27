# Padrão de design do TaskEz

Guia obrigatório para qualquer pessoa ou IA que crie ou altere interface no TaskEz.
Este guia foi escrito a partir de uma análise do código atual (novembro de 2026).
Antes de criar algo novo, procure um componente parecido que já exista e copie o padrão dele.
Se for preciso fugir deste guia, explique o motivo no PR.

## Princípios

1. **Mobile first, com desktop em `lg:`.** O app é um PWA pensado para o celular, com conteúdo limitado a `max-w-md`. No desktop (`lg:`, ≥ 1024 px) ele ganha a sidebar e, nas telas de lista, mostra lista e detalhe lado a lado, até `max-w-6xl`.
2. **Tema escuro por padrão, com tema claro.** Use sempre os tokens de cor e nunca hexadecimal solto. A única exceção é a cor escolhida pelo usuário para projetos e workspaces, aplicada via `style={{ backgroundColor }}`.
3. **Consistência acima de criatividade.** O mesmo tipo de elemento tem o mesmo tamanho, canto e cor em todas as telas.
4. **Textos da interface em português do Brasil**, com acentuação correta e frases curtas.

## Cores (tokens em `src/index.css`, bloco `@theme`)

| Uso | Classe Tailwind |
|---|---|
| Fundo da página | `bg-base` |
| Fundo de sidebar, barra inferior, painéis | `bg-base-alt` |
| Superfícies (cards, botões redondos, chips, menus) | `bg-surface` |
| Superfície elevada (sheets) e hover dentro de `surface` | `bg-surface-alt` |
| Hover de superfície | `bg-surface-hover` |
| Bordas | `border-border` (contorno de menus, campos e sheets) · `border-border-soft` (divisórias e cards) |
| Texto | `text-text` (principal) · `text-text-muted` (secundário) · `text-text-faint` (metadados, inativo, vazio) |
| Acento (violeta `#7c5cff`) | `bg-accent` / `text-accent` · `hover:bg-accent-hover` · `bg-accent-soft` (fundo de selecionado ou ativo) |
| Estados | `success`, `warning`, `danger`, cada um com a variante `-soft` para fundo |

- **Item selecionado** (linha de lista, opção atual): `bg-accent-soft`, com `text-accent` quando couber.
- **Item ativo** (chip de filtro, segmento escolhido): `bg-accent text-white`.
- **Inativo:** `text-text-faint` ou `text-text-muted` sobre `bg-surface`.

## Tipografia

A fonte é a Inter (`font-sans`). Os ícones são do `lucide-react`.

| Elemento | Classes |
|---|---|
| Título de página (Tarefas, Projetos) | `text-2xl font-bold text-text` |
| Título de detalhe (tarefa, projeto) | `text-xl font-bold` |
| Título de sheet ou diálogo | `text-lg font-bold` |
| Título de seção (Subtarefas, Comentários) | `text-sm font-bold text-text` |
| Cabeçalho de grupo em lista | `text-xs font-bold uppercase tracking-wide text-text-faint` |
| Texto comum | `text-sm` (corpo de input: `text-[15px]`) |
| Rótulos, botões, chips | `text-sm font-semibold` |
| Título de item de lista | `text-sm font-medium` |
| Metadados (data, projeto, contagem) | `text-[11px] font-medium text-text-faint` ou `text-xs text-text-muted` |
| Concluído | `line-through text-text-faint` |

## Espaçamento

- Margem horizontal das páginas: `px-5`. Topo das páginas: `pt-[calc(env(safe-area-inset-top)+16px)]`.
- Entre blocos da página: `gap-5`. Entre itens de um grupo: `gap-3`. Entre ícone e texto: `gap-2`.
- Respeite as áreas seguras do iPhone com `env(safe-area-inset-*)` no topo e no rodapé.

## Cantos e sombras

- `rounded-full`: botões de ícone, chips de filtro, badges, avatares, controle segmentado.
- `rounded-2xl`: `Button`, campos (`Field`/`TextArea`), sheets, menus suspensos.
- `rounded-xl`: cards (`Card`), linhas de lista, itens de menu, ícone colorido de projeto.
- `rounded-lg`: quadradinhos de ícone dentro de menus e widgets.
- Sombras: `shadow-lg` em menus e popovers, `shadow-2xl` em sheets no desktop. O botão principal de criar usa sombra roxa (`shadow-accent/30`). Cards não têm sombra.

## Componentes base (use-os em vez de recriar)

Ficam em `src/components/ui/`:

- **`Button`**
  - Variantes: `primary` (roxo), `secondary`, `ghost`, `danger`.
  - Tamanhos: `sm` (h-9), `md` (h-12), `lg` (h-14).
  - Ações dentro de telas, como "Nova tarefa", usam `variant="secondary" size="sm"` com o ícone `Plus size={15}`.
  - Ações principais de formulário usam `primary` com `fullWidth`.
- **`Field` / `TextArea`**: inputs com rótulo (`text-sm font-medium text-text-muted`), `h-13`, `rounded-2xl`, `border-border`, `bg-surface` e `focus:border-accent`.
- **`Sheet`**: para todo formulário ou modal. Abre de baixo no celular e centralizado no desktop, com o botão fechar redondo `h-9`. Não crie modais próprios.
- **`Card`**: `rounded-xl border border-border-soft bg-surface p-4`. Use `elevated` para `bg-surface-alt`.
- **`Badge`**, `PriorityBadge` e `StatusBadge`: `rounded-full px-2.5 py-1 text-xs font-semibold` com fundo `-soft` da cor do tom.
- **`EmptyState`**: ícone dentro de um quadrado `h-16 w-16 rounded-2xl bg-surface-alt`, título em semibold e descrição em `text-sm text-text-muted`. Use em toda lista vazia e em todo painel de detalhe sem seleção.
- Também existem `Avatar`, `ProgressBar`, `Switch`, `LinksField`, `MentionTextArea`, `MessageComposer`, `SortableList` e `ReactionControl`.
- **Confirmação destrutiva:** `confirmAction()` de `@/store/confirmStore`. Nunca use `window.confirm`.
- **Avisos ao usuário:** notificações do app via `addNotification('system.alert', título, texto)` no `dataStore`. Não existe toast.

## Botões de ícone redondos

São o padrão do cabeçalho das telas de detalhe: voltar, recolher lista, editar, arquivar, reordenar e excluir.

```tsx
className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-muted"
```

- **Tamanho único no cabeçalho: `h-10 w-10` (40 px).** Todos os botões de um mesmo cabeçalho têm o mesmo tamanho.
- Ícone com `size={16}`. A seta de voltar usa `size={19}`, e os ícones de painel, `size={18}`.
- Ação destrutiva: troque `text-text-muted` por `text-danger`. Hover de destaque: `hover:text-accent`.
- Sempre com `aria-label` em português, e também `title` quando o ícone não for óbvio.
- Ações discretas dentro de linhas (copiar, remover item) usam `h-9 w-9` sem fundo (`text-text-faint hover:text-accent`, ou `hover:text-danger`).
- O botão de recolher e expandir a lista no desktop é o componente `ListCollapseButton` (`src/components/layout/`).

## Cabeçalho das telas

```tsx
<div data-detail-heading className="sticky top-0 z-20 flex flex-col gap-5 bg-base">
  <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
    <div className="flex items-center gap-2">{/* voltar + ListCollapseButton */}</div>
    <div className="flex gap-2">{/* editar, arquivar, excluir */}</div>
  </header>
```

- Nas páginas de lista, à esquerda vai o título `text-2xl font-bold`, com o nome do workspace em `text-xs text-text-muted` acima, só no celular. À direita vão os controles.
- O cabeçalho é `sticky top-0 z-20 bg-base`, para ficar fixo ao rolar.

## Navegação

- **Celular:** `TabBar` fixa no rodapé, com `bg-base-alt/90 backdrop-blur-lg` e `border-t border-border-soft`.
  - Item: ícone `size={22}` com rótulo `text-[11px] font-medium`. O ativo fica em `text-accent` com o ícone preenchido; o inativo, em `text-text-faint`.
  - No centro fica o botão de criar: `h-14 w-14 rounded-full bg-accent text-white shadow-lg shadow-accent/30`, levemente elevado.
- **Desktop:** `Sidebar` à esquerda, com `bg-base-alt border-r border-border-soft`, largura `w-64`, recolhível para `w-[76px]`.
  - No topo fica o workspace (avatar e nome) e o botão "Criar" (`rounded-xl bg-accent`).
  - Os itens são `rounded-xl` com hover em `bg-surface-alt`.

## Abas, filtros e alternadores

- **Abas dentro de detalhe** (Visão geral, Tarefas, Arquivos, Chat, Equipe): texto `text-[11px] sm:text-xs font-semibold` com `border-b-2`. A ativa usa `border-accent text-accent`; a inativa, `border-transparent text-text-faint`.
- **Chips de filtro:** linha com rolagem horizontal (`flex gap-2 overflow-x-auto px-5`). Cada chip usa `shrink-0 rounded-full px-4 py-2 text-sm font-semibold`. O ativo é `bg-accent text-white`; o inativo, `bg-surface text-text-muted`.
- **Controle segmentado** (lista ou kanban): contêiner `flex gap-1 rounded-full bg-surface p-1`, com botões `h-8 w-8 rounded-full`. O ativo é `bg-accent text-white`; o inativo, `text-text-faint`.

## Listas

- **Linha de tarefa (`TaskRow`):** `flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-alt`, com `bg-accent-soft` quando selecionada.
  - À esquerda fica o círculo de conclusão, com ícone de 22 px: concluída em `text-success`, não cumprida em `text-danger` e pendente em `text-text-faint hover:text-accent`.
  - Abaixo do título vêm os metadados em `text-[11px]`: ponto colorido do projeto (`h-1.5 w-1.5 rounded-full`), data (`text-danger` se atrasada), contagem de subtarefas e ícone de recorrência.
- **Card de projeto:** ícone colorido `h-10 w-10 rounded-xl text-white` com a cor do projeto, título `font-semibold`, percentual em `text-xs font-semibold text-text-muted` e `ProgressBar`.
- **Widgets do painel:** usam `Card`, com ícone num quadrado `h-9 w-9 rounded-lg bg-accent-soft text-accent`, título `font-semibold` e número em destaque `text-lg font-bold`.

## Tabelas das tarefas

Ficam em `src/components/tasks/` (`TaskTables`, `TableCells`, `TableColumnMenu`), com a lógica pura em `src/lib/taskTables.ts`.

- Cada coluna tem um tipo: Texto, Número, Dólar, Real, Select, Multi-select, Data, Pessoa, Arquivos, Checkbox e Link. Coluna sem tipo é Texto.
- Clicar no cabeçalho abre o menu da coluna: renomear, trocar o tipo, editar opções (select), mover para os lados e excluir. Trocar o tipo converte os valores e pede confirmação quando algum se perde.
- Opções de select usam a cor escolhida pelo usuário misturada à superfície (`color-mix`, 32 %), em chips `rounded-full`.
- Em leitura, cada célula é uma `CopyableCell`: no desktop, o botão de copiar aparece ao passar o mouse; no celular, segurar o dedo copia. Os dois mostram "Copiado" sobre a célula.
- No modo edição, as linhas têm setas para subir e descer e o botão de excluir.

## Arquivos e anexos

- O quadradinho do arquivo em listas é o `FileThumbnail` (`src/components/files/`): miniatura real para imagens e ícone do tipo para o resto, em `h-11 w-11 rounded-lg bg-surface-alt`.
- Para visualizar um arquivo, use o `FilePreviewDialog`, um visualizador em tela cheia com fundo `bg-black/85`, que navega com as setas do teclado e fecha com Esc. Clicar no arquivo abre a prévia, e o botão de download baixa com o nome original.
- URLs de arquivos vêm de `getFileViewUrl` e `getFileDownloadUrl` (`src/lib/fileUrls.ts`). Não chame `createSignedUrl` direto nos componentes.
- Arquivos HTML nunca são renderizados, só baixados.

## Calendário

Inspirado no layout do Google Agenda. Os componentes ficam em `src/components/calendar/`.

- **Desktop:**
  - Barra única no topo: painel lateral, "Hoje", setas, título do período, busca e o controle segmentado Dia/Semana/Mês/Agenda.
  - Coluna lateral recolhível (`w-60`) com "Nova tarefa", minicalendário, filtros de projeto e "Tarefas sem data".
  - A grade ocupa a altura da tela, e a página usa a largura toda, sem `max-w-6xl`.
- **Celular:**
  - Título, um botão "hoje" com o número do dia, busca e filtros (em `Sheet`). Abaixo, setas com o controle segmentado.
  - No Mês, a grade compacta tem **pontinhos** com as cores dos projetos, e a lista do dia selecionado fica embaixo. Arrastar para os lados troca de mês.
- **Dia e Semana no desktop** usam a grade de horas (`TimeGrid`): faixa "Dia todo" para tarefas sem horário e 24 horas de 48 px. Tarefas com horário ficam na hora certa, com o mesmo espaço de 30 min, e há uma linha `bg-danger` marcando agora. No celular, Dia e Semana continuam em lista, ordenadas por horário.
- **Etiqueta de tarefa** (`EventChip`): `h-[22px] rounded-md text-xs` com ponto colorido.
  - Sem horário ("dia inteiro"): fundo com a cor do projeto misturada à superfície (`color-mix(in srgb, cor 24%, var(--color-surface))`).
  - Com horário: no mês, sem fundo e com o horário antes do título; na grade de horas, um bloco com borda esquerda colorida.
  - Concluída: `opacity-55 line-through`.
  - **Ocorrência futura de recorrente** (projetada por 60 dias, ainda não existe no banco): contorno tracejado na cor do projeto, sem arraste. O cartão rápido explica isso e leva à tarefa original; nas listas, ela aparece como `OccurrenceRow` com o rótulo "Prevista".
- **Hoje:** círculo `bg-accent text-white`. **Dia selecionado** (minicalendário e celular): `bg-accent-soft text-accent`.
- **Cliques (mesma regra em todas as visualizações):**
  - Espaço vazio de um dia: cria uma tarefa nesse dia.
  - Número do dia: abre a visualização Dia.
  - Tarefa: abre o cartão rápido (`TaskQuickView`), e "Abrir detalhes" abre a gaveta lateral.
  - "+N mais": abre um popover com o dia inteiro.
  - Arrastar a etiqueta muda o prazo (desktop): no mês, muda só o dia; na grade de horas, define dia e horário (de 15 em 15 min); na faixa "Dia todo", remove o horário.
  - Clicar num horário vazio da grade cria a tarefa já com dia e hora.
- Popovers do calendário usam `AnchoredPopover`: abrem abaixo do elemento (ou acima, se não couber) e fecham ao clicar fora, com Esc ou ao rolar.
- Grades com arraste levam `select-none`, para não selecionar texto.
- **Atalhos:** `T` (hoje), `D`/`W`/`M`/`A` (visualização), `J`/`K` ou as setas (período), `C` (criar), `/` (buscar).

## Menus suspensos (dropdowns)

Use o componente `DropdownMenu` com `MenuItem` (`src/components/ui/DropdownMenu.tsx`). Ele já segue todas as regras abaixo e é usado no `AddSubItemMenu`, no `SubtaskMenu` e no menu das tabelas. O visual original vem do `WorkspaceDropdown`.

- **Abre para baixo.** O painel é desenhado por cima de tudo (portal com posição fixa), então não é cortado por cards. Só abre para cima quando não cabe embaixo nem rolando a página, como no fim da tela do celular. Para seletores tipo campo, use `width="full"`, e escolha o item atual com `MenuItem selected`.
- Contêiner: `z-30 w-60 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-lg`, com `role="menu"`.
- Item: `flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left text-text transition-colors hover:bg-surface-alt hover:text-accent`, com `role="menuitem"`.
- O ícone do item vai num quadradinho `flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-alt`, com ícone `size={14}`. O texto usa `text-sm font-semibold`.
- Item destrutivo: `text-danger hover:bg-danger-soft`.
- O menu fecha ao clicar fora (`mousedown` no `document`) e com Esc.
- O botão que abre o menu tem `aria-haspopup="menu"` e `aria-expanded`.

## Layout lista + detalhe no desktop

Seguem este padrão `ProjectsLayout` e `TasksLayout`:

- A lista fica à esquerda com `lg:w-[380px] lg:border-r lg:border-border-soft lg:pr-8`, e o detalhe ocupa o resto (`flex-1`).
- Cada painel rola sozinho (`lg:h-full lg:overflow-y-auto lg:overscroll-contain`) e é marcado com `data-scroll-pane`.
- Sem nada selecionado, o detalhe mostra um `EmptyState` ("Selecione um …"). No celular, a lista e o detalhe são telas separadas.
- O layout passa ao detalhe, por `Outlet context`, o `DetailListLayout` (`toggleList`, `listCollapsed`, `listName`) que o `ListCollapseButton` usa.

## Acessibilidade e toque

- Alvo de toque mínimo de 40 px (`h-10`). Linhas, itens de menu e campos usam 44 px ou mais (`min-h-11`).
- Foco visível: `focus-visible:outline-2 focus-visible:outline-accent`.
- Todo botão só com ícone precisa de `aria-label` em português.

## Animação

- Use `framer-motion` (veja `Sheet` e `AppShell`), com transições curtas (0,2 a 0,3 s, `easeOut`).
- Feedback de toque: `active:scale-[0.98]` em botões e `active:scale-90` em botões redondos de destaque.
- Respeite `prefers-reduced-motion`.

## Armadilhas conhecidas

- **`cn()` é só `clsx`, sem `tailwind-merge`.** Passar `className="h-10"` para um componente que já tem `h-11` **não sobrescreve**: as duas classes ficam e vence a que vem depois no CSS. Defina o tamanho certo no próprio componente em vez de tentar sobrescrever.
- Não use hexadecimal nem `bg-white`/`text-black` diretamente: o tema claro quebra. Branco só como `text-white` sobre `bg-accent` ou sobre a cor do projeto.
- Não crie um menu, modal ou botão com visual próprio se já existe um equivalente.
- Dados do usuário (preferências, timers, layouts) ficam na conta, no Supabase, e não só no `localStorage`.
