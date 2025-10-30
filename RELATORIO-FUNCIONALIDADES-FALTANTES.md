# Relatório de Funcionalidades Faltantes - Editor Visual

## Resumo Executivo

Após análise completa do código atual do editor, identifiquei que **a maioria das funcionalidades solicitadas ainda não está implementada**. O editor atual possui uma estrutura básica com elementos, atores e cenas, mas precisa de implementações significativas para atender aos requisitos especificados.

## Estado Atual vs. Requisitos

### ✅ **Funcionalidades Já Implementadas**

1. **Sistema básico de cenas** - Criação, duplicação, exclusão e navegação entre cenas
2. **Sistema básico de atores** - Cadastro com nome, sigla e cor
3. **Canvas básico** - Área de trabalho para posicionar elementos
4. **Elementos básicos** - Retângulos, círculos, linhas e texto
5. **Sistema de grupos** - Agrupar e desagrupar elementos
6. **Atalhos de teclado** - Ctrl+Z/Y, Ctrl+S, Ctrl+A, Ctrl+G, etc.
7. **Auto-save** - Salvamento automático a cada 5 segundos

### ❌ **Funcionalidades Faltantes (Críticas)**

---

## 1.3 Configuração do Palco

**Status: ❌ NÃO IMPLEMENTADO**

### Faltam:
- [x] Configurações específicas do palco (tamanho, forma, cor)
- [ ] Duplo clique no palco para liberar movimentação
- [ ] Sincronização da posição do palco em todas as cenas
- [ ] Remoção da possibilidade de mover o canvas inteiro (após setar o palco)
- [ ] Canvas sempre centralizado e fixo (após setar o palco)
- [ ] Permitir atores/objetos fora dos limites do palco

### Implementação Necessária:
- Criar componente `StageConfig` para configurações do palco
- Implementar sistema de coordenadas fixas para o palco
- Adicionar controles de tamanho, forma e cor do palco
- Implementar lógica de sincronização entre cenas

---

## 1.4 Sistema de Atores - Cadastro

**Status: ⚠️ PARCIALMENTE IMPLEMENTADO**

### Já existe:
- ✅ Cadastro com nome do ator
- ✅ Sistema de sigla
- ✅ Sistema de cor

### Faltam:
- [ ] Sigla limitada a 2 caracteres alfanuméricos
- [ ] Sigla default (dois primeiros caracteres do nome)
- [ ] Validação de siglas únicas
- [ ] Menu de cor com paleta básica
- [ ] Opção "Gradiente" para mais cores

### Implementação Necessária:
- Atualizar validação de siglas no componente `ActorsTab`
- Implementar `ColorPicker` com paleta básica
- Adicionar validação de unicidade de siglas

---

## 1.5 Sistema de Atores - Interação

**Status: ⚠️ PARCIALMENTE IMPLEMENTADO**

### Já existe:
- ✅ Clique em atores na barra lateral
- ✅ Edição de propriedades básicas

### Faltam:
- [ ] Impedir inclusão duplicada do mesmo ator na cena
- [ ] Botão "editar propriedades" quando ator já está na cena
- [ ] Sincronização de propriedades entre todas as cenas
- [ ] Remoção das opções "fala" e coordenadas x/y
- [ ] Remoção da seção de propriedades lateral

### Implementação Necessária:
- Modificar lógica de clique em atores no `EditorSidebar`
- Implementar verificação de atores já presentes na cena
- Remover campos desnecessários do formulário de propriedades

---

## 1.6 Sistema de Objetos - Cadastro

**Status: ❌ NÃO IMPLEMENTADO**

### Faltam:
- [ ] Sistema completo de cadastro de objetos
- [ ] Campos: nome, sigla, cor, forma básica, dimensões
- [ ] Prévia visualizável
- [ ] Formas: triângulo, quadrado, hexágono (sem redondo)
- [ ] Contorno tracejado obrigatório
- [ ] Seção "Objetos disponíveis"

### Implementação Necessária:
- Criar componente `ObjectsTab` similar ao `ActorsTab`
- Implementar `ObjectCreationModal`
- Adicionar tipos de objeto no store do editor
- Criar renderização de formas geométricas com contorno tracejado

---

## 1.7 Sistema de Objetos - Interação

**Status: ❌ NÃO IMPLEMENTADO**

### Faltam:
- [ ] Clique em objetos na barra lateral
- [ ] Prevenção de duplicação na mesma cena
- [ ] Edição de propriedades de objetos
- [ ] Sincronização entre cenas

### Implementação Necessária:
- Implementar lógica similar aos atores para objetos
- Adicionar controles de interação no `EditorSidebar`

---

## 1.8 Sistema de Deixas

**Status: ❌ NÃO IMPLEMENTADO**

### Faltam:
- [ ] Seção "Deixa" na barra lateral
- [ ] Campo "nome da cena"
- [ ] Campo "deixa" (frase/ação)
- [ ] Sincronização automática entre cenas consecutivas
- [ ] Preenchimento bidirecional (Cena 1 → Cena 2 e vice-versa)

### Implementação Necessária:
- Criar componente `CueSection`
- Implementar lógica de sincronização de deixas
- Adicionar campos ao modelo de dados das cenas

---

## 1.9 Anotações

**Status: ❌ NÃO IMPLEMENTADO**

### Faltam:
- [ ] Seção de anotações gerais embaixo do canvas

### Implementação Necessária:
- Criar componente `SceneNotes`
- Adicionar campo de anotações ao modelo de cena
- Posicionar componente abaixo do canvas

---

## 1.10 Sistema de Caixas de Texto

**Status: ⚠️ PARCIALMENTE IMPLEMENTADO**

### Já existe:
- ✅ Sistema básico de texto
- ✅ Configurações de largura e tamanho da fonte

### Faltam:
- [ ] Remoção da opção "Adicionar fala" vinculada a ator
- [ ] Botão [...] na barra direita
- [ ] Caixas de texto não vinculadas a atores
- [ ] Remoção de especificações de ator e estilo de fala
- [ ] Opções de prévia (completo, início, final, início+final)
- [ ] Hover para ver texto completo
- [ ] Otimização de espaço no canvas

### Implementação Necessária:
- Modificar sistema atual de texto
- Criar `TextBoxTool` independente de atores
- Implementar opções de visualização de prévia
- Adicionar tooltip com texto completo

---

## 1.11 Sistema de Setas

**Status: ❌ NÃO IMPLEMENTADO**

### Faltam:
- [ ] Opção de desenho de setas no botão [...]
- [ ] Ferramenta para indicar movimentação na cena

### Implementação Necessária:
- Criar `ArrowTool`
- Implementar desenho de setas no canvas
- Adicionar ao menu de ferramentas

---

## 1.12 Organização de Barras e Seções

**Status: ❌ NÃO IMPLEMENTADO**

### Faltam:
- [ ] Remoção da barra esquerda
- [ ] Controles para ocultar/mostrar barra direita
- [ ] Controles para ocultar/mostrar topo (cadastro de ator)
- [ ] Controles para ocultar/mostrar rodapé (comentários)
- [ ] Seções colapsáveis na barra direita:
  - [ ] "Cenas"
  - [ ] "Deixas"
  - [ ] "Atores"
  - [ ] "Objetos"
  - [ ] "..."

### Implementação Necessária:
- Remover `EditorToolbar` (barra esquerda)
- Implementar `CollapsibleSection` component
- Adicionar controles de visibilidade no layout
- Criar sistema de preferências de UI

---

## Priorização de Implementação

### **Fase 1 - Crítica (Implementar primeiro)**
1. Sistema de Objetos (1.6 + 1.7)
2. Configuração do Palco (1.3)
3. Sistema de Deixas (1.8)
4. Melhorias no Sistema de Atores (1.4 + 1.5)

### **Fase 2 - Importante**
1. Sistema de Caixas de Texto (1.10)
2. Sistema de Setas (1.11)
3. Anotações (1.9)

### **Fase 3 - UX/UI**
1. Organização de Barras e Seções (1.12)

---

## Estimativa de Esforço

- **Fase 1**: ~40-50 horas de desenvolvimento
- **Fase 2**: ~20-25 horas de desenvolvimento  
- **Fase 3**: ~15-20 horas de desenvolvimento

**Total estimado**: 75-95 horas de desenvolvimento

---

## Arquivos Principais a Modificar

1. `src/components/VisualEditor.tsx` - Componente principal
2. `src/components/editor/EditorSidebar.tsx` - Barra lateral
3. `src/components/editor/ActorsTab.tsx` - Sistema de atores
4. `src/stores/editorStore.ts` - Estado global do editor
5. `src/types/editor.ts` - Tipos TypeScript

## Novos Arquivos a Criar

1. `src/components/editor/ObjectsTab.tsx`
2. `src/components/editor/CueSection.tsx`
3. `src/components/editor/SceneNotes.tsx`
4. `src/components/editor/StageConfig.tsx`
5. `src/components/editor/TextBoxTool.tsx`
6. `src/components/editor/ArrowTool.tsx`
7. `src/components/ui/ColorPicker.tsx`
8. `src/components/ui/CollapsibleSection.tsx`

---

*Relatório gerado em: ${new Date().toLocaleDateString('pt-BR')}*