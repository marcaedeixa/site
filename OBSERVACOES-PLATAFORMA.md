# Observações da Plataforma - Estado Atual e Melhorias

## 📊 Status Geral da Plataforma

A plataforma **Marca e Deixa** está em desenvolvimento avançado com funcionalidades básicas implementadas e um sistema robusto de edição visual. Este documento detalha o que já funciona e o que precisa ser implementado.

---

## ✅ Funcionalidades Já Implementadas

### 🎭 Sistema de Atores
- ✅ Criação, edição e exclusão de atores
- ✅ **Limite atual: 30 atores por projeto** (conforme solicitado)
- ✅ Interface modal para gerenciamento
- ✅ Validação de limites implementada

### 🎯 Sistema de Objetos
- ✅ Criação, edição e exclusão de objetos
- ✅ **Limite atual: 50 objetos por projeto** (precisa ajustar para 30)
- ✅ Interface modal para gerenciamento
- ✅ Validação de limites implementada

### 🎨 Editor Visual
- ✅ Canvas interativo com zoom e pan
- ✅ Ferramentas básicas de desenho
- ✅ Sistema de seleção de elementos
- ✅ Grupos e operações booleanas
- ✅ Atalhos de teclado
- ✅ Sistema de camadas (z-index)

### 💾 Sistema de Salvamento
- ✅ **Salvamento automático a cada 5 segundos** (como o Canva)
- ✅ Salvamento manual via botão
- ✅ Persistência no Supabase
- ✅ Carregamento automático de projetos

### 🔄 Sistema de Histórico (Desfazer/Refazer)
- ✅ **Botões Undo/Redo já implementados**
- ✅ Histórico limitado a 50 estados
- ✅ Funciona para todas as operações de edição
- ✅ Atalhos Ctrl+Z e Ctrl+Y funcionais

### 📁 Gerenciamento de Projetos
- ✅ **Exclusão de projetos implementada**
- ✅ Modal de confirmação com aviso
- ✅ Validação de segurança
- ✅ Projetos ilimitados por usuário

### 📤 Sistema de Exportação
- ✅ Exportação para JSON (dados do projeto)
- ✅ Exportação para SVG (vetorial)
- ✅ Exportação para PNG (imagem)
- ⚠️ **Problema**: Botões "Salvar" e "Exportar" fazem a mesma coisa

### 🎬 Sistema de Cenas/Slides
- ✅ Criação e navegação entre cenas
- ✅ Controles de reprodução (Play, Pause, Stop)
- ✅ Configuração de intervalos
- ❌ **Sem limite implementado** (precisa de 300 cenas)

### 💳 Sistema de Assinaturas
- ✅ Integração com Stripe
- ✅ Planos Premium e Free
- ✅ Verificação de limites por assinatura
- ✅ Histórico de pagamentos

---

## ❌ Funcionalidades Que Precisam Ser Implementadas

### 📏 Ajustes de Limites Necessários

#### 🎯 Objetos
- **Atual**: 50 objetos por projeto
- **Necessário**: 30 objetos por projeto
- **Arquivo**: `src/components/editor/ObjectModal.tsx` (linha ~15)

#### 🎬 Cenas/Slides
- **Atual**: Sem limite
- **Necessário**: 300 cenas por projeto
- **Implementar**: Validação no `ScenesTab.tsx`

#### 📝 Caixas de Texto
- **Atual**: Sem limite específico
- **Necessário**: 30 caixas de texto por cena/slide
- **Implementar**: Sistema de contagem e validação

#### ➡️ Setas e Linhas
- **Atual**: Sem limite específico
- **Necessário**: 60 setas/linhas por cena/slide
- **Implementar**: Sistema de contagem e validação

### 📤 Correção do Sistema de Exportação
- **Problema**: Botões "Salvar" e "Exportar" fazem a mesma coisa
- **Solução Necessária**:
  - Botão "Salvar": Apenas salva o projeto (sem download)
  - Botão "Exportar": Abre modal com opções SVG, PNG, JPG, GIF

### 🎬 Melhorias no Sistema de Reprodução
- **Atual**: Botões Play, Pause, Stop na barra
- **Necessário**: 
  - Apenas botão "Reproduzir" na barra principal
  - Ao clicar: Abre apresentação em tela cheia
  - Controles na apresentação: Pause, Stop, Continuar (barra inferior)

---

## 🚀 Implementação de Versões Premium/Gratuita

### 📋 Plano de Implementação

#### Versão Gratuita (Limites Reduzidos)
- **Atores**: 10 por projeto
- **Objetos**: 10 por projeto  
- **Cenas**: 50 por projeto
- **Caixas de texto**: 10 por cena
- **Setas/linhas**: 20 por cena
- **Barra de propaganda**: Lateral direita ou esquerda

#### Versão Premium (Limites Atuais Solicitados)
- **Atores**: 30 por projeto
- **Objetos**: 30 por projeto
- **Cenas**: 300 por projeto
- **Caixas de texto**: 30 por cena
- **Setas/linhas**: 60 por cena
- **Sem propaganda**

### 💰 Sistema de Pagamento
- ✅ **Já implementado**: Integração com Stripe
- ✅ **Já implementado**: Verificação de assinaturas
- ✅ **Já implementado**: Páginas de assinatura
- 🔧 **Necessário**: Ajustar limites por plano
- 🔧 **Necessário**: Implementar barra de propaganda

---

## 📊 Estimativa de Esforço para Implementações

### 🟢 Baixo Esforço (1-2 dias)
1. **Ajustar limite de objetos** (30 em vez de 50)
2. **Implementar limite de cenas** (300 por projeto)
3. **Corrigir botões Salvar/Exportar**

### 🟡 Médio Esforço (3-5 dias)
1. **Implementar limites por cena** (caixas de texto e setas/linhas)
2. **Sistema de contagem de elementos por cena**
3. **Melhorar apresentação em tela cheia**

### 🔴 Alto Esforço (1-2 semanas)
1. **Sistema de versões Premium/Gratuita**
2. **Barra de propaganda**
3. **Ajuste dinâmico de limites por assinatura**

---

## 🎯 Prioridades Recomendadas

### Fase 1 - Correções Imediatas
1. Ajustar limite de objetos para 30
2. Corrigir funcionalidade dos botões Salvar/Exportar
3. Implementar limite de 300 cenas

### Fase 2 - Limites por Cena
1. Sistema de contagem de elementos por cena
2. Validação de limites para caixas de texto (30)
3. Validação de limites para setas/linhas (60)

### Fase 3 - Sistema Premium/Gratuito
1. Definir limites por tipo de assinatura
2. Implementar barra de propaganda
3. Ajustar interface baseada no plano

---

## 💡 Observações Técnicas

### Arquivos Principais a Modificar
- `src/components/editor/ObjectModal.tsx` - Ajustar limite de objetos
- `src/components/editor/ScenesTab.tsx` - Implementar limite de cenas
- `src/app/dashboard/editor/[projectId]/page.tsx` - Corrigir botões
- `src/hooks/useEditorStore.ts` - Adicionar contadores por cena
- `src/hooks/useSubscription.ts` - Ajustar limites por plano

### Considerações de Performance
- Os limites propostos são adequados para a maioria dos casos de uso
- O sistema atual já suporta bem esses volumes
- Salvamento automático funciona eficientemente

### Monetização
- Sistema de pagamento já funcional
- Possibilidade de implementar plano gratuito com propaganda
- Estrutura preparada para diferentes níveis de assinatura

---

## ✅ Conclusão

A plataforma está em excelente estado de desenvolvimento, com a maioria das funcionalidades core já implementadas. As principais necessidades são:

1. **Ajustes de limites** (esforço baixo)
2. **Correção de UX** nos botões (esforço baixo)  
3. **Sistema de versões** (esforço médio-alto)

O sistema de pagamento e assinaturas já está robusto, facilitando a implementação de versões premium/gratuita quando necessário.