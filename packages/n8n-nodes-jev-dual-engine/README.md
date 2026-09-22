# n8n-nodes-jev-dual-engine

[![npm version](https://badge.fury.io/js/n8n-nodes-jev-dual-engine.svg)](https://badge.fury.io/js/n8n-nodes-jev-dual-engine)
[![n8n Community Node](https://img.shields.io/badge/n8n-Community%20Node-EA4B71.svg)](https://n8n.io)

Nó de modelo de linguagem (**AI Language Model**) oficial para **n8n**, pronto para ser conectado diretamente na porta roxa (**Model**) de **AI Agents** e **Basic LLM Chains**!

Implementa a arquitetura **Sandwich Neuro-Simbólica**:
- **System 1 (Jev Reasoner - sub-30ms)**: Raciocínio deliberado prévio, detecção de intenção, avaliação de risco, deduções analíticas e plano de execução estruturado passo a passo.
- **System 2 (LLM Translator & Tool Caller)**: Executa as chamadas de ferramentas e síntese com fidelidade estrita ao plano do Jev (suporta **Google Gemini**, **DeepInfra**, **OpenRouter**, **OpenAI** ou **Ollama local**).

---

## ⚡ Conectando ao AI Agent

No canvas do n8n:
1. Adicione um nó de **AI Agent** (ou **Basic LLM Chain**).
2. Adicione o nó **Jev Dual-Engine Model** (categoria `AI > Language Models`).
3. Conecte a saída roxa **Model** do Jev na entrada **Model** do AI Agent.
4. Conecte suas ferramentas (**Tools**) normalmente no AI Agent.
5. Pronto! O Jev intercepta cada mensagem do usuário, delibera o plano lógico em menos de 30ms e guia o AI Agent na execução das tools e respostas.

```
+--------------------------+
|  Jev Dual-Engine Model   |  (System 1 Deliberation sub-30ms)
+--------------------------+
            | (Model / roxo)
            v
     +--------------+
     |   AI Agent   | <--- Tools (Code, HTTP Request, Calculadora...)
     +--------------+
            |
            v
     (Resposta Final)
```

---

## 📦 Instalação no n8n

### Método 1: Pelo Painel do n8n (Interface Web)
1. No seu n8n, acesse **Settings > Community Nodes**.
2. Clique em **Install a community node**.
3. No campo *Enter npm package name*, digite:
   ```
   n8n-nodes-jev-dual-engine
   ```
4. Marque a caixa de aceite e clique em **Install**.

---

### Método 2: Instalação Manual via Docker / CLI
Se você roda o n8n via Docker ou self-hosted:
```bash
# No diretório de dados do seu n8n (~/.n8n)
npm install n8n-nodes-jev-dual-engine
```

---

## ⚙️ Configuração das Credenciais

### `LLM System 2 API` (`jevLlmApi`)
- **Provedor**:
  - **Google Gemini**: Insira sua chave gratuita de [aistudio.google.com](https://aistudio.google.com). O nó conecta nativamente via endpoint compatível OpenAI com suporte a Function Calling/Tools.
  - **DeepInfra**: Para Llama 3.1 70B, Qwen 2.5 ou DeepSeek V3.
  - **OpenRouter**: Para dezenas de modelos de terceiros.
  - **OpenAI Oficial**: Para GPT-4o, o3-mini.
  - **Custom Endpoint**: Para Ollama local (`http://localhost:11434/v1`) ou gateways internos.

---

## 📝 Licença
MIT © Jev AI Team
