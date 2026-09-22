# n8n-nodes-jev-dual-engine

[![npm version](https://badge.fury.io/js/n8n-nodes-jev-dual-engine.svg)](https://badge.fury.io/js/n8n-nodes-jev-dual-engine)
[![n8n Community Node](https://img.shields.io/badge/n8n-Community%20Node-EA4B71.svg)](https://n8n.io)

Nó de comunidade oficial para **n8n** implementando a arquitetura **Sandwich Neuro-Simbólica** do **Jev Dual-Engine**:
- **System 1 (Jev Reasoner - sub-30ms)**: Triagem lógica imediata, detecção de intenção, contenção de riscos, deduções analíticas e plano de execução estruturado passo a passo.
- **System 2 (LLM Translator)**: Síntese em linguagem natural e código com fidelidade estrita ao plano do Jev (suporta **Google Gemini**, **DeepInfra**, **OpenRouter**, **OpenAI** ou **Ollama local**).

---

## ⚡ O que o nó faz?

Diferente de chamar uma LLM pura (que muitas vezes alucina ou dá voltas), o **Jev Dual-Engine**:
1. **Pensa antes de falar**: O Jev calcula a dedução lógica central, restrições e passos numerados em milissegundos.
2. **Controla o modelo**: A LLM atua estritamente como tradutora e sintetizadora do plano do Jev.
3. **Entrega Pensamentos Estruturados (`thoughts`)**: Retorna no JSON os passos detalhados, o domínio técnico, a intenção detectada e a latência de cada camada para observabilidade total.

---

## 📦 Instalação no n8n

### Método 1: Pelo Painel do n8n (Recomendado após publicação)
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

## 🚀 Como Publicar este Nó no npm (Passo a Passo)

Para disponibilizar o pacote publicamente para qualquer usuário do n8n instalar:

### 1. Pré-requisitos
- Ter uma conta gratuita criada em [npmjs.com](https://www.npmjs.com/).
- Node.js versão 18+ ou 20+ instalada no seu terminal.

### 2. Compilar o Pacote
No terminal, dentro da pasta `packages/n8n-nodes-jev-dual-engine`:
```bash
cd packages/n8n-nodes-jev-dual-engine
npm install
npm run build
```
Isso vai compilar os arquivos TypeScript para a pasta `dist/` e copiar os ícones SVG.

### 3. Fazer Login no npm
```bash
npm login
```
O terminal solicitará seu **username**, **password** e um código enviado por e-mail (2FA).

### 4. Testar o Pacote (Dry Run)
Para conferir o que será empacotado sem enviar nada ainda:
```bash
npm pack --dry-run
```

### 5. Publicar Oficialmente
```bash
npm publish --access public
```

> **Dica**: Se o nome `n8n-nodes-jev-dual-engine` já estiver em uso por outra pessoa no npm, você pode renomear no seu `package.json` para usar o seu escopo de usuário, por exemplo:
> `@seu-usuario/n8n-nodes-jev-dual-engine`
> E publicar normalmente com `npm publish --access public`.

---

## ⚙️ Configuração das Credenciais no n8n

### 1. `Jev System 1 API`
- **Modo do Jev**:
  - **Emulador Local (Sem Chave - Imediato)**: Roda 100% no próprio n8n sem depender de rede externa (latência sub-30ms).
  - **TypeSafe AI Oficial**: Requer `apiKey` da TypeSafe.
  - **OpenRouter**: Para invocar Jev via roteador.

### 2. `LLM System 2 API`
- **Provedor**:
  - **Google Gemini**: Insira sua chave gratuita de [aistudio.google.com](https://aistudio.google.com).
  - **DeepInfra**: Para Llama 3.1 70B, Qwen 2.5 ou DeepSeek V3.
  - **OpenRouter**: Para dezenas de modelos de terceiros.
  - **Custom Endpoint**: Para Ollama local (`http://localhost:11434/v1`) ou gateways internos.

---

## 📊 Estrutura de Saída do Nó

Ao executar o nó em um workflow, você recebe:

```json
{
  "response": "Código ou resposta final gerada...",
  "model": "gemini-2.5-flash",
  "provider": "gemini",
  "latency_total_ms": 520,
  "thoughts": {
    "intent": "code_engineering",
    "intent_confidence": 0.97,
    "risk_assessment": "false",
    "complexity_score": 4,
    "complexity_label": "Alta (Raciocínio Profundo)",
    "domain": "TypeScript",
    "core_deduction": "Problema requer implementação em TypeScript com tipagem estrita...",
    "constraints": [
      "Tipagem estrita sem o uso de any desnecessário",
      "Código autocontido e pronto para execução",
      "Tratamento preventivo de edge cases"
    ],
    "execution_steps": [
      "1. Definir os tipos, interfaces e contratos de dados essenciais",
      "2. Implementar a lógica central com validação de entrada",
      "3. Adicionar controle de erros e tratamento de exceções",
      "4. Apresentar exemplo de consumo funcional"
    ],
    "latency_s1_ms": 18,
    "latency_s2_ms": 502
  },
  "usage": {
    "prompt_tokens": 210,
    "completion_tokens": 340,
    "total_tokens": 550
  }
}
```

---

## 📝 Licença
MIT © Jev AI Team
