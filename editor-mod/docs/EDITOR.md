# Editor Visual — Arquitetura e Funcionamento

Este documento descreve o funcionamento do Editor Visual da plataforma Marca e Deixa, cobrindo arquitetura, componentes, estado, persistência, interações, fluxos e atalhos.

## Visão Geral
- O editor é composto por três partes: Toolbar (ações e ferramentas), Sidebar (propriedades, camadas, atores, cenas) e Canvas (renderização e interação).
- O componente orquestrador `VisualEditor` conecta tudo, carrega e salva dados do projeto e registra atalhos de teclado globais.
- O estado global é gerido por `useEditorStore` (Zustand), incluindo elementos, seleção, viewport, histórico e cenas.
- Usuários relevantes ao editor: `cliente` e `administrador` (visão e permissões variam conforme contexto do projeto e políticas).

## Componentes Principais
- `src/components/VisualEditor.tsx`: orquestrador que:
  - Recebe `projectId`, carrega dados via `loadProjectData` e aciona auto-salvamento com `saveProjectData`.
  - Registra atalhos para histórico, agrupamento, camadas e navegação de cenas.
  - Renderiza Toolbar, Sidebar e Canvas com callbacks da store.
- `src/components/editor/EditorToolbar.tsx`:
  - Seleção de ferramentas: Seleção, Retângulo, Círculo, Linha, Seta, Texto, Caneta, Borracha, Ator.
  - Ações: Desfazer/Refazer, Zoom In/Out/Reset, Exportar (JSON/SVG/PNG), Copiar, Apagar, Ordem de camadas (frente/fundo/um nível).
- `src/components/editor/EditorSidebar.tsx`:
  - Abas: Propriedades, Cores, Camadas, Atores e Cenas.
  - Edita propriedades do(s) elemento(s) selecionado(s) e propriedades específicas de atores.
- `src/components/editor/EditorCanvas.tsx`:
  - Desenha elementos e gerencia interação de mouse/teclado: seleção, arraste, redimensionamento, pan/zoom e drag-and-drop.
  - Trata snapping com `Shift` e feedback visual (seleção, grupos, slideshow, transições).

## Estado Global e Persistência
- Store (`src/hooks/useEditorStore.ts`): Tipos `Element`, `Group`, `Scene`, `Viewport`, `HistoryState`, funções de seleção, adição/atualização/exclusão, duplicação, histórico, camadas, grupos e cenas.
- Persistência (`src/lib/projectData.ts`):
  - `saveProjectData`, `loadProjectData`, `deleteProjectData`, `exportProjectData`.
  - Usa Supabase para sessão/autenticação e armazenamento dos dados.
- Carregamento inicial de projeto: `src/app/dashboard/editor/[projectId]/page.tsx` via `getProject` (`src/lib/projects.js`).

## Fluxos de Interação
- Seleção: clique simples; arraste para retângulo de seleção; `Esc` limpa seleção; `Ctrl+A` seleciona tudo.
- Desenho: com uma ferramenta ativa, arraste para criar (retângulo, círculo, linha, seta, texto, caminho). Ferramenta “Ator” cria atores com forma e propriedades.
- Redimensionamento: handles para redimensionar; handle circular verde controla raio de borda quando aplicável.
- Pan/Zoom: segure `Space` para pan; Zoom via toolbar (limites entre `0.1` e `5`).
- Camadas: trazer/enviar para frente/fundo e ajustar um nível.

## Ferramentas
- `select`, `rectangle`, `circle`, `line`, `arrow`, `text`, `pen`, `eraser`, `actor`.
- Copiar duplica seleção; Apagar remove elementos selecionados.

## Grupos e Soldagem
- Agrupar/Desagrupar organiza elementos; Soldagem (weld) aplica semântica visual/funcional (indicador pontilhado vermelho para soldado; verde para grupo regular).
- Indicadores visuais de grupo ao redor do elemento.

## Cenas e Slideshow
- `ScenesTab.tsx`: adicionar, duplicar, renomear, excluir, carregar cenas.
- Navegação: `ArrowLeft`/`ArrowRight` para cena anterior/próxima.
- Slideshow: Play/Pause/Stop com intervalo; indicador visual de execução e overlay de transição.

## Atores
- `ActorsTab.tsx`: lista/gerencia atores do projeto; criar, carregar, excluir, editar propriedades (nome, iniciais, cor, forma, notas).
- Drag-and-drop: arraste do painel de Atores para o Canvas; cria elemento “ator” centralizado no ponto de soltura.
- Desenho: forma (círculo/quadrado), iniciais centralizadas; balão de fala se houver `actorSpeech` (com estilo/cor configuráveis).

## Sidebar: Propriedades
- Edição de propriedades:
  - Gerais: `fillColor`, `strokeColor`, `strokeWidth`, `opacity`.
  - Texto: fonte, tamanho, conteúdo.
  - Atores: nome, iniciais, forma, cor, fala, notas e estilos de balão.
- Abas de Camadas e Cores auxiliam organização e ergonomia.

## Exportação
- Via Toolbar usando `exportProjectData` (JSON/SVG/PNG).
- Dispara download: `projeto.<formato>`; PNG como `Blob`, JSON/SVG como string serializada.

## Atalhos de Teclado
- Histórico: `Ctrl+Z`/`Ctrl+Y`.
- Seleção: `Ctrl+A` (todos); `Esc` limpa.
- Exclusão: `Delete`/`Backspace`.
- Camadas: `]`/`[` ajustam nível; com `Shift` traz para frente/envia para trás diretamente.
- Cenas: `ArrowLeft`/`ArrowRight`.
- Pan: segurar `Space`.
- Observação: atalhos não interferem quando o usuário está digitando em inputs/textos.

## Drag-and-Drop
- Canvas aceita `application/json` com dados do ator; converte coordenadas de tela para canvas e cria o elemento com propriedades fornecidas.
- Feedback visual ao arrastar sobre o canvas (borda/realce).

## Ergonomia e Feedback
- Seleção: borda pontilhada azul; handles visíveis para seleção única; handle verde para raio.
- Estados de UI: indicador de slideshow, overlay de transição, estado “Carregando editor...”.

## Limitações e Observações
- Persistência depende de sessão via Supabase; falhas de autenticação impedem salvamento/carga.
- Limites de Zoom (0.1–5) protegem a estabilidade da interação.
- Snapping com `Shift` melhora alinhamento e precisão.

## Referências de Código
- Toolbar: `src/components/editor/EditorToolbar.tsx`.
- Canvas: `src/components/editor/EditorCanvas.tsx`.
- Sidebar: `src/components/editor/EditorSidebar.tsx` + `ActorsTab.tsx` + `ScenesTab.tsx`.
- Orquestrador: `src/components/VisualEditor.tsx`.
- Store: `src/hooks/useEditorStore.ts`.
- Persistência e exportação: `src/lib/projectData.ts`.
- Carregamento de projeto: `src/lib/projects.js` e `src/app/dashboard/editor/[projectId]/page.tsx`.