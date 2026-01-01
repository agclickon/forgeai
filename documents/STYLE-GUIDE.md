# Guia de Estilos - ForgeAI

## Sumário
1. [Visão Geral](#visão-geral)
2. [Paleta de Cores](#paleta-de-cores)
3. [Tipografia](#tipografia)
4. [Espaçamento](#espaçamento)
5. [Componentes](#componentes)
6. [Padrões de Cor Predefinidos](#padrões-de-cor-predefinidos)
7. [Práticas Recomendadas](#práticas-recomendadas)

---

## Visão Geral

O sistema de design da plataforma ForgeAI foi desenvolvido para garantir consistência visual, acessibilidade e experiência do usuário intuitiva. Este guia documenta todos os elementos visuais e suas aplicações.

**Versão:** 1.0  
**Última atualização:** Dezembro 2025

---

## Paleta de Cores

### Cores Padrão (Tema Escuro)

| Elemento | Cor Hex | RGB | Descrição |
|----------|---------|-----|-----------|
| **Fundo** | #0a0a0f | 10, 10, 15 | Fundo principal da aplicação |
| **Primeiro Plano** | #fafafa | 250, 250, 250 | Texto e elementos principais |
| **Primária** | #de3403 | 222, 52, 3 | Cor de ação principal (botões, links) |
| **Secundária** | #fbbd23 | 251, 189, 35 | Cor complementar de ação |
| **Accent** | #1a1a2e | 26, 26, 46 | Destaques e elementos secundários |
| **Muted** | #27272a | 39, 39, 42 | Fundo de elementos desativados |
| **Muted Foreground** | #a1a1aa | 161, 161, 170 | Texto desativado ou secundário |
| **Card** | #0f0f14 | 15, 15, 20 | Fundo de cartões e painéis |
| **Card Foreground** | #fafafa | 250, 250, 250 | Texto dentro de cartões |
| **Borda** | #27272a | 39, 39, 42 | Linhas divisórias e bordas |

### Identificação da Plataforma

- **Cor Primária (Ativa):** #e23403 - Usada em abas ativas da navegação
- **Cor Secundária (Inativa):** #8B8B96 - Usada em abas inativas da navegação

Estas cores **não devem ser personalizadas** pelos usuários, pois fazem parte da identidade visual fixa da plataforma.

---

## Tipografia

### Fontes

| Tipo | Fonte | Uso |
|------|-------|-----|
| **Sans-serif** | Inter | Corpo de texto, labels, UI geral |
| **Serif** | Georgia | Títulos e destaques (opcional) |
| **Monospace** | JetBrains Mono | Código, dados técnicos |

### Tamanho Base e Escala

- **Tamanho Base:** 16px
- **Escala de Títulos:** 1.25x (h1: 20px, h2: 25px, h3: 31.25px, etc.)

### Hierarquia de Texto

```
H1 (Principal)    → 31.25px | Bold
H2 (Secundário)   → 25px    | Bold
H3 (Terciário)    → 20px    | SemiBold
Body (Regular)    → 16px    | Regular
Small (Auxiliar)  → 14px    | Regular
```

---

## Espaçamento

### Medidas Padrão

| Elemento | Valor | Uso |
|----------|-------|-----|
| **Border Radius** | 8px | Cantos de cartões, botões, inputs |
| **Card Padding** | 16px | Espaçamento interno de cartões |
| **Button Padding** | 12px | Espaçamento interno de botões |

### Escala de Espaçamento

A aplicação segue a escala de espaçamento:
- **XS:** 4px
- **S:** 8px
- **M:** 16px
- **L:** 24px
- **XL:** 32px

---

## Componentes

### Botões

#### Variantes Disponíveis
- **Primary:** Fundo em cor primária (#de3403), usado para ações principais
- **Secondary:** Fundo em cor secundária (#fbbd23)
- **Ghost:** Sem fundo, apenas texto
- **Outline:** Bordas visíveis, sem fundo

#### Comportamento
- **Estados:** Default, Hover, Active, Disabled
- **Hover:** Elevação sutil com mudança de tom
- **Active:** Elevação maior indicando atividade

### Cartões

- **Fundo:** #0f0f14
- **Borda:** Sutil com cor #27272a
- **Padding:** 16px interno
- **Border Radius:** 8px
- **Sombra:** Muito sutil para "flutuação"

### Inputs

- **Fundo:** #0f0f14 ou #1a1a2e (quando focado)
- **Borda:** #27272a
- **Texto:** #fafafa
- **Placeholder:** #a1a1aa
- **Focus:** Borda primária (#de3403)

### Badges/Tags

- **Pequeno:** altura reduzida (28px)
- **Fonte:** Inter, 12px
- **Padding:** 4px horizontal, 2px vertical
- **Background:** Tom elevado de muted

---

## Padrões de Cor Predefinidos

A plataforma oferece 8 paletas de cores predefinidas para rápida customização:

### 1. **Modern Minimal**
Simples e limpo com tons neutros e azul.
- Fundo: #FFFFFF
- Primária: #3B82F6

### 2. **Dark Elegant**
Elegância em tons escuros com ouro.
- Fundo: #0F172A
- Primária: #F59E0B

### 3. **Neon Dreams**
Futurista com cores neon vibrantes.
- Fundo: #0a0e27
- Primária: #00d9ff (ciano)

### 4. **Sunset Vibes**
Quentes e acessíveis com tons alaranjados.
- Fundo: #fef2f2
- Primária: #f87171

### 5. **Forest Green**
Sustentável e natural com verdes.
- Fundo: #0f3932
- Primária: #10b981

### 6. **Purple Passion**
Criativo e moderno com purpuras.
- Fundo: #1e1b4b
- Primária: #a855f7

### 7. **Ocean Blue**
Confiável e profissional com azuis.
- Fundo: #0c2340
- Primária: #0066cc

### 8. **Warm Beige**
Aconchegante e confortável.
- Fundo: #fdf8f3
- Primária: #d97706

---

## Práticas Recomendadas

### Acessibilidade

✅ **Faça:**
- Use contraste mínimo de 4.5:1 para textos pequenos
- Use contraste mínimo de 3:1 para textos grandes
- Não confie apenas em cor para transmitir informação
- Use ícones com textos para ações importantes

❌ **Evite:**
- Textos com baixo contraste
- Cores muito similares lado a lado
- Uso exclusivo de cor para significado

### Responsividade

- Mantenha o border-radius constante em todos os tamanhos
- Aumente o padding em telas menores se necessário
- Garanta que botões tenham mínimo 44px de altura (acessibilidade touch)

### Personalização

Quando os usuários personalizam cores:
- As cores de identificação da plataforma (#e23403, #8B8B96) permanecem **fixas**
- As cores customizadas aplicam-se apenas ao tema do projeto
- As customizações são salvas no campo `visualIdentity.customStyles` do briefing

### Escala de Fontes

Ao modificar o tamanho base:
- O fator multiplicador (headingScale) mantém a proporcionalidade
- Exemplo: Se base for 14px e escala 1.25, h1 será 43.4px
- Use 1.25 para designs equilibrados
- Use 1.5 para designs mais dramáticos

---

## Implementação no Código

### Aplicação de Cores Customizadas

As cores são armazenadas em `briefing.visualIdentity.customStyles`:

```json
{
  "colors": {
    "background": "#0a0a0f",
    "foreground": "#fafafa",
    "primary": "#de3403",
    "secondary": "#fbbd23",
    "accent": "#1a1a2e",
    "muted": "#27272a",
    "mutedForeground": "#a1a1aa",
    "card": "#0f0f14",
    "cardForeground": "#fafafa",
    "border": "#27272a"
  },
  "typography": {
    "fontFamily": "Inter",
    "serifFont": "Georgia",
    "monospaceFont": "JetBrains Mono",
    "baseFontSize": 16,
    "headingScale": 1.25
  },
  "spacing": {
    "borderRadius": 8,
    "cardPadding": 16,
    "buttonPadding": 12
  }
}
```

### CSS Variables

As cores são convertidas para variáveis CSS:

```css
:root {
  --background: 10 10 15;
  --foreground: 250 250 250;
  --primary: 222 52 3;
  --border-radius: 8px;
}
```

---

## Suporte e Consultas

Para dúvidas sobre este guia de estilos:
1. Consulte a aba **Estilos** na plataforma
2. Use os **Padrões Predefinidos** para referência rápida
3. Teste customizações na **Aba Preview** antes de salvar

---

**Documento gerado para:** ForgeAI - Plataforma de Gestão de Projetos com IA  
**Mantido por:** Equipe de Design & Desenvolvimento
