# Antigravity // Jev (System 1 Decision UI)

Interface visual inspirada no **Google Antigravity**, integrando o modelo de decisão **Jev** (TypeSafe AI / Eve) como camada de pensamento rápido ("System 1") e **LLMs generativas** (OpenRouter, OpenAI, Gemini) como "System 2".

---

## 🧠 O que é o Jev e por que ele é diferente?

Modelos de linguagem convencionais (GPT-4, Claude, Gemini) são "System 2": pensam de forma lenta, geram texto livre prolixo e custam centenas de tokens até tomarem uma decisão.

O **Jev** (lançado pela **TypeSafe AI**) é um modelo **System 1**:
1. **Velocidade extrema**: Retorna decisões em 30ms a 70ms (até 200x mais rápido).
2. **Zero alucinação em tipos**: Não gera texto solto; ele responde apenas **estruturas tipadas**:
   - **`Choice`**: Escolha categórica entre opções pré-definidas (ex: intenção, rota, departamento).
   - **`Noul`**: Decisão booleana probabilística calibrada (`Sim` / `Não` / `Incerto` com percentual de confiança).
   - **`Score`**: Avaliação em escala quantitativa (ex: 1 a 5, Trivial a Crítico).
3. **Padrão no Framework Eve (Vercel)**:
   - No framework **Eve** (`eve.dev`), o Jev é utilizado no fluxo `auto()` de aprovação para determinar se uma ação de ferramenta é segura ou se precisa de intervenção humana (guardrail).

---

## 🚀 Como Executar

Não precisa rodar `npm install`! O projeto foi construído usando recursos nativos do **Node.js 24** (`node:http`, `fetch`, `streams`).

### Opção 1: Via Dois Cliques
Dê um duplo clique no arquivo [`start.bat`](file:///c:/Users/samuel.pinton/Desktop/jev%20testes/start.bat).

### Opção 2: Via Terminal
```bash
node server.mjs
```
Acesse no seu navegador: **`http://localhost:3000`**

---

## ⚙️ Configurando suas Chaves

Acesse o botão **Configurações** (ícone de engrenagem no topo da tela):

1. **Jev (System 1)**:
   - *Modo Local (Padrão)*: Funciona imediatamente sem chave nenhuma com o motor heurístico embutido.
   - *TypeSafe AI Oficial*: Insira sua chave `TYPESAFE_API_KEY` (obtida no console da TypeSafe AI).
   - *OpenRouter*: Insira sua chave OpenRouter para acessar o modelo `typesafe-ai/jev`.

2. **LLM de Fundo (System 2)**:
   - *OpenRouter (Recomendado)*: Acesse centenas de modelos como `google/gemini-2.5-flash`, `anthropic/claude-3.5-sonnet`, `meta-llama/llama-3.3-70b-instruct`.
   - *OpenAI*: Insira sua chave para `gpt-4o` ou `gpt-4o-mini`.
   - *Custom / Local*: Conecte ao Ollama, LM Studio ou qualquer endpoint compatível com a API da OpenAI.
