// api-handler.js - Lógica compartilhada entre Vite Dev Server e Standalone Server
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, 'config.json');

export function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Erro ao ler config.json:', err);
  }
  return {
    jevApiKey: process.env.TYPESAFE_API_KEY || '',
    jevProvider: process.env.TYPESAFE_API_KEY ? 'typesafe' : 'local',
    llmApiKey: process.env.GEMINI_API_KEY || process.env.DEEPINFRA_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '',
    llmProvider: process.env.GEMINI_API_KEY ? 'gemini' : 'deepinfra', // 'gemini', 'deepinfra', 'openrouter', 'openai', 'custom'
    llmModel: process.env.GEMINI_API_KEY ? 'gemini-2.5-flash' : 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    verbosity: process.env.JEFF_VERBOSITY || 'concise', // 'concise', 'balanced', 'detailed'
    customBaseUrl: ''
  };
}

export function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Erro ao salvar config.json:', err);
    return false;
  }
}

let currentConfig = loadConfig();

// Simulação heurística local de alta fidelidade para Jev (System 1)
export function localJevSimulate(prompt) {
  const p = (prompt || '').toLowerCase();
  const startTime = Date.now();

  let intent = 'chat';
  let intentConf = 0.88;
  if (/código|função|script|bug|erro|typescript|javascript|python|api|implemente|criar|node|class|componente|css|html/.test(p)) {
    intent = 'code_engineering';
    intentConf = 0.97;
  } else if (/explique|como funciona|o que é|diferença|por que|resumo|ensine/.test(p)) {
    intent = 'explanation_learning';
    intentConf = 0.94;
  } else if (/segurança|auth|token|delete|apagar|remover|destruir|drop|formate|vazar/.test(p)) {
    intent = 'security_critical';
    intentConf = 0.99;
  } else if (/planeje|arquitetura|organize|etapas|roadmap|especifique/.test(p)) {
    intent = 'architecture_planning';
    intentConf = 0.92;
  }

  let riskAssessment = 'false';
  let riskConf = 0.95;
  if (/urgente|socorro|quebrou|produção|fora do ar|perda|asap|apagar tudo/.test(p)) {
    riskAssessment = 'true';
    riskConf = 0.98;
  } else if (/talvez|não sei|arriscar|testar em prod/.test(p)) {
    riskAssessment = 'uncertain';
    riskConf = 0.72;
  }

  let complexityScore = 2;
  let complexityLabel = 'Baixa';
  const len = prompt.length;
  if (len > 300 || /refatorar|arquitetura|distribuído|banco de dados|concorrência|fullstack|sistema/.test(p)) {
    complexityScore = 5;
    complexityLabel = 'Alta (Raciocínio Profundo)';
  } else if (len > 100 || /integração|api|classe|componente|deepinfra|vite/.test(p)) {
    complexityScore = 3;
    complexityLabel = 'Média';
  } else if (len < 40) {
    complexityScore = 1;
    complexityLabel = 'Trivial';
  }

  let route = 'direct_response';
  if (intent === 'security_critical') {
    route = 'guardrail_gate_approval';
  } else if (intent === 'code_engineering') {
    route = 'code_synthesis';
  } else if (complexityScore >= 4) {
    route = 'multi_step_reasoning';
  }

  // Dedução e Raciocínio Profundo do Jev (Motor Lógico Central)
  const isSoftware = intent === 'code_engineering' || intent === 'architecture_planning' ||
    /\b(código|codigo|função|funcao|script|bug|api|software|programa|programar|algoritmo|classe|banco|sql|endpoint|typescript|python|javascript|react|rust|node|css|html|dev|backend|frontend|git|json|docker|deploy|linux|terminal)\b/i.test(p);

  let techDomain = isSoftware ? 'Geral / Engenharia de Software' : 'Conhecimento Geral & Vida Prática';
  if (/typescript|ts/.test(p)) techDomain = 'TypeScript';
  else if (/javascript|js|node/.test(p)) techDomain = 'JavaScript / Node.js';
  else if (/python/.test(p)) techDomain = 'Python';
  else if (/rust|crossbeam/.test(p)) techDomain = 'Rust';
  else if (/sql|banco|postgres/.test(p)) techDomain = 'SQL / Databases';

  const premises = [
    `Objetivo do usuário: "${prompt.slice(0, 90)}${prompt.length > 90 ? '...' : ''}"`,
    `Domínio avaliado pelo Jev: ${techDomain}`,
    `Nível de urgência e risco: ${riskAssessment === 'true' ? 'Crítico (Produção/Falha)' : 'Controlado'}`
  ];

  let coreDeduction = '';
  let constraints = isSoftware ? [
    'Preservar padrão idiomático e manutenibilidade do código',
    'Seguir princípio YAGNI (sem dependências ou abstrações desnecessárias)',
    'Garantir tratamento defensivo de falhas e validação de tipos'
  ] : [
    'Priorizar precisão factual, viabilidade real e transparência',
    'Alertar sobre exigências legais, custos ocultos ou restrições práticas',
    'Responder em linguagem natural direta, sem criar código ou analogias computacionais desnecessárias'
  ];
  let executionSteps = [];

  if (intent === 'code_engineering') {
    coreDeduction = `A demanda exige solução modular e determinística em ${techDomain}. O Jev determinou estruturar o fluxo de dados em pipeline puro, garantindo idempotência e tipagem segura.`;
    executionSteps = [
      'Definir tipos/interfaces e contratos de entrada/saída.',
      'Implementar a lógica nuclear sem efeitos colaterais.',
      'Validar cenários de borda e exceções esperadas.',
      'Gerar exemplo prático de consumo com asserções de teste.'
    ];
  } else if (intent === 'explanation_learning') {
    if (isSoftware) {
      coreDeduction = `A dúvida envolve compreensão de causa e efeito em ${techDomain}. O Jev determinou decompor a explicação a partir do mecanismo de baixo nível para a aplicação prática, evitando jargões vazios.`;
      executionSteps = [
        'Definir o problema real que o conceito resolve.',
        'Ilustrar a mecânica interna passo a passo.',
        'Contrastar armadilhas e casos de erro comuns.',
        'Sintetizar recomendação prática de uso.'
      ];
    } else {
      coreDeduction = `A dúvida trata de uma necessidade do mundo real (${techDomain}). O Jev determinou apresentar orientações pragmáticas, alternativas viáveis e pontos críticos de atenção.`;
      executionSteps = [
        'Mapear os caminhos e programas reais aplicáveis.',
        'Explicar os critérios de elegibilidade e como funcionam na prática.',
        'Destacar custos indiretos, exigências legais e armadilhas comuns.',
        'Sintetizar o passo a passo de como começar.'
      ];
    }
  } else if (intent === 'security_critical') {
    coreDeduction = `Ação com potencial risco detectada pelo Jev. Exige barreira estrita de guardrail, sanitização de inputs e isolamento preventivo.`;
    constraints.unshift('Requer validação explícita de impacto antes de execução');
    executionSteps = [
      'Mapear permissões e raio de impacto da operação.',
      'Sanitizar parâmetros e mascarar segredos.',
      'Fornecer plano de contingência ou rollback.',
      'Exigir confirmação manual das etapas críticas.'
    ];
  } else if (intent === 'architecture_planning') {
    coreDeduction = `O sistema requer arquitetura desacoplada e escalável em ${techDomain}. O Jev deliberou segregação estrita de responsabilidades e fluxo de dados unidirecional.`;
    executionSteps = [
      'Mapear limites de contexto e fronteiras de domínio.',
      'Desenhar contrato de comunicação entre camadas.',
      'Mitigar gargalos de latência e pontos únicos de falha.',
      'Definir roadmap incremental de entrega.'
    ];
  } else {
    coreDeduction = `Interação casual ou contextual. O Jev determinou resposta direta, objetiva e amigável.`;
    executionSteps = [
      'Processar a intenção do usuário.',
      'Fornecer resposta precisa sem rodeios.'
    ];
  }

  const durationMs = Math.max(22, Date.now() - startTime + Math.floor(Math.random() * 12 + 10));

  return {
    source: 'local_engine',
    latencyMs: durationMs,
    answers: {
      intent: {
        type: 'Choice',
        value: intent,
        confidence: intentConf,
        options: ['code_engineering', 'explanation_learning', 'security_critical', 'architecture_planning', 'chat']
      },
      is_urgent_or_risky: {
        type: 'Noul',
        value: riskAssessment,
        confidence: riskConf,
        explanation: 'Avaliação instantânea de contenção e risco de execução (System 1)'
      },
      complexity: {
        type: 'Score',
        value: complexityScore,
        label: complexityLabel,
        min: 1,
        max: 5
      },
      action_route: {
        type: 'Choice',
        value: route,
        confidence: 0.94,
        options: ['direct_response', 'code_synthesis', 'multi_step_reasoning', 'guardrail_gate_approval']
      },
      premises,
      core_deduction: coreDeduction,
      constraints,
      execution_steps: executionSteps,
      code_specification: isSoftware ? {
        domain: techDomain,
        paradigm: 'modular / defensivo',
        style: 'production-ready',
        requires_code: true
      } : {
        domain: techDomain,
        paradigm: 'não aplicável (orientação conceitual/prática)',
        style: 'linguagem natural direta',
        requires_code: false
      }
    }
  };
}

export function formatJevPayload(rawResponse, prompt, source, latencyMs) {
  const answers = rawResponse.answers || rawResponse;
  const p = (prompt || '').toLowerCase();

  const intentChoice = answers.intent?.choice || answers.intent?.value || answers.intent || 'code_engineering';
  const intentConf = answers.intent?.confidence || 0.95;

  const noulVal = answers.is_urgent_or_risky?.noul !== undefined
    ? answers.is_urgent_or_risky.noul
    : (answers.is_urgent_or_risky?.value !== undefined ? answers.is_urgent_or_risky.value : 0.1);
  const isRisky = typeof noulVal === 'boolean' ? noulVal : (Number(noulVal) >= 0.5);
  const riskAssessment = isRisky ? 'true' : 'false';
  const riskConf = answers.is_urgent_or_risky?.confidence || (typeof noulVal === 'number' ? noulVal : 0.9);

  const rawScore = answers.complexity?.score !== undefined ? Number(answers.complexity.score) : 2;
  const complexityScore = Math.min(5, Math.max(1, Math.round(rawScore + 1)));
  const labels = ['Trivial', 'Baixa', 'Média', 'Alta', 'Crítica / Raciocínio Profundo'];
  const complexityLabel = labels[Math.min(labels.length - 1, Math.max(0, Math.round(rawScore)))];

  const routeChoice = answers.action_route?.choice || answers.action_route?.value || 'code_synthesis';
  const routeConf = answers.action_route?.confidence || 0.9;

  const isSoftware = intentChoice === 'code_engineering' || intentChoice === 'architecture_planning' ||
    /\b(código|codigo|função|funcao|script|bug|api|software|programa|programar|algoritmo|classe|banco|sql|endpoint|typescript|python|javascript|react|rust|node|css|html|dev|backend|frontend|git|json|docker|deploy|linux|terminal)\b/i.test(p);

  let techDomain = isSoftware ? 'Geral / Engenharia de Software' : 'Conhecimento Geral & Vida Prática';
  if (/redis|lua/.test(p)) techDomain = 'Redis / Lua / Sistemas Distribuídos';
  else if (/postgres|sql|banco/.test(p)) techDomain = 'PostgreSQL / Bancos Relacionais';
  else if (/typescript|ts/.test(p)) techDomain = 'TypeScript';
  else if (/javascript|js|node/.test(p)) techDomain = 'Node.js / JavaScript';
  else if (/python/.test(p)) techDomain = 'Python';
  else if (/react|vue|frontend/.test(p)) techDomain = 'Frontend / Web UI';

  const premises = [
    `Objetivo do usuário: "${prompt.slice(0, 95)}${prompt.length > 95 ? '...' : ''}"`,
    `Domínio avaliado pelo Jev: ${techDomain}`,
    `Risco / Concorrência calculados pelo Jev: ${isRisky ? 'Crítico (Alta Concorrência / Produção)' : 'Controlado'}`
  ];

  let coreDeduction = '';
  let constraints = isSoftware ? [
    'Preservar padrão idiomático e manutenibilidade do código',
    'Seguir princípio YAGNI (sem dependências ou abstrações desnecessárias)',
    'Garantir tratamento defensivo de falhas e validação de tipos'
  ] : [
    'Priorizar precisão factual, viabilidade real e transparência',
    'Alertar sobre exigências legais, custos ocultos ou restrições práticas',
    'Responder em linguagem natural direta, sem criar código ou analogias computacionais desnecessárias'
  ];
  let executionSteps = [];

  if (intentChoice === 'code_engineering' || intentChoice === 'architecture_planning') {
    if (/concorrência|flash sale|lock|deadlock|redis|postgres|race condition/.test(p)) {
      coreDeduction = `O Jev deliberou que concorrência massiva inviabiliza locks pessimistas no banco relacional. A dedução exige desacoplar reserva em memória atômica (Redis Lua) e descarregar persistência via Outbox assíncrono com idempotência estrita.`;
      executionSteps = [
        'Validar chave de idempotência do usuário antes de processamento.',
        'Executar script Lua atômico no Redis para validação e decremento de estoque.',
        'Inserir evento na tabela outbox do PostgreSQL em transação atômica e rápida.',
        'Retornar confirmação imediata (HTTP 200/201) para o cliente e delegar despacho a worker assíncrono.'
      ];
    } else {
      coreDeduction = `A demanda exige solução modular e determinística em ${techDomain}. O Jev determinou estruturar o fluxo de dados em pipeline puro, garantindo idempotência e tipagem segura.`;
      executionSteps = [
        'Definir tipos/interfaces e contratos de entrada/saída.',
        'Implementar a lógica nuclear sem efeitos colaterais.',
        'Validar cenários de borda e exceções esperadas.',
        'Gerar exemplo prático de consumo com asserções de teste.'
      ];
    }
  } else if (intentChoice === 'explanation_learning') {
    if (isSoftware) {
      coreDeduction = `A dúvida envolve compreensão de causa e efeito em ${techDomain}. O Jev determinou decompor a explicação a partir do mecanismo de baixo nível para a aplicação prática, evitando jargões vazios.`;
      executionSteps = [
        'Definir o problema real que o conceito resolve.',
        'Ilustrar a mecânica interna passo a passo.',
        'Contrastar armadilhas e casos de erro comuns.',
        'Sintetizar recomendação prática de uso.'
      ];
    } else {
      coreDeduction = `A dúvida trata de uma necessidade do mundo real (${techDomain}). O Jev determinou apresentar orientações pragmáticas, alternativas viáveis e pontos críticos de atenção.`;
      executionSteps = [
        'Mapear os caminhos e programas reais aplicáveis.',
        'Explicar os critérios de elegibilidade e como funcionam na prática.',
        'Destacar custos indiretos, exigências legais e armadilhas comuns.',
        'Sintetizar o passo a passo de como começar.'
      ];
    }
  } else if (intentChoice === 'security_critical') {
    coreDeduction = `Ação com potencial risco detectada pelo Jev. Exige barreira estrita de guardrail, sanitização de inputs e isolamento preventivo.`;
    constraints.unshift('Requer validação explícita de impacto antes de execução');
    executionSteps = [
      'Mapear permissões e raio de impacto da operação.',
      'Sanitizar parâmetros e mascarar segredos.',
      'Fornecer plano de contingência ou rollback.',
      'Exigir confirmação manual das etapas críticas.'
    ];
  } else {
    coreDeduction = `Interação casual ou contextual. O Jev determinou resposta direta, objetiva e amigável.`;
    executionSteps = [
      'Processar a intenção do usuário.',
      'Fornecer resposta precisa sem rodeios.'
    ];
  }

  return {
    source,
    latencyMs,
    answers: {
      intent: {
        type: 'choice',
        value: intentChoice,
        confidence: intentConf,
        probabilities: answers.intent?.probabilities
      },
      is_urgent_or_risky: {
        type: 'noul',
        value: riskAssessment,
        confidence: riskConf,
        explanation: 'Probabilidade calculada pelo Jev: ' + Math.round((typeof noulVal === 'number' ? noulVal : 0.95) * 100) + '%'
      },
      complexity: {
        type: 'score',
        value: complexityScore,
        label: complexityLabel,
        score: rawScore,
        min: 1,
        max: 5
      },
      action_route: {
        type: 'choice',
        value: routeChoice,
        confidence: routeConf,
        probabilities: answers.action_route?.probabilities
      },
      premises,
      core_deduction: coreDeduction,
      constraints,
      execution_steps: executionSteps,
      code_specification: isSoftware ? {
        domain: techDomain,
        paradigm: 'modular / defensivo',
        style: 'production-ready',
        requires_code: true
      } : {
        domain: techDomain,
        paradigm: 'não aplicável (orientação conceitual/prática)',
        style: 'linguagem natural direta',
        requires_code: false
      },
      raw_typesafe: answers
    }
  };
}

export async function executeJevDecision(prompt, keys = {}) {
  const jevKey = keys.jevApiKey || currentConfig.jevApiKey;
  const jevProvider = keys.jevProvider || currentConfig.jevProvider;

  if (!jevKey || jevProvider === 'local') {
    return localJevSimulate(prompt);
  }

  const startTime = Date.now();

  try {
    if (jevProvider === 'typesafe') {
      const response = await fetch('https://api.typesafe.ai/v1/systemone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jevKey}`
        },
        body: JSON.stringify({
          model: 'jev-latest',
          state: prompt,
          questions: {
            intent: {
              type: 'choice',
              instructions: 'Determinar a intenção principal do usuário',
              criteria: {
                code_engineering: 'Criar, consertar ou debugar código',
                explanation_learning: 'Explicar conceitos, tirar dúvidas ou tutorial',
                security_critical: 'Ação crítica com chaves, deleção ou risco',
                architecture_planning: 'Planejamento e estruturação de software',
                chat: 'Conversa casual'
              }
            },
            is_urgent_or_risky: {
              type: 'noul',
              instructions: 'A solicitação envolve ambiente de produção crítico, alta concorrência ou risco de falha?'
            },
            complexity: {
              type: 'score',
              instructions: 'Nível de complexidade para resolução técnica',
              criteria: [
                'Trivial',
                'Baixa',
                'Média',
                'Alta',
                'Crítica'
              ]
            },
            action_route: {
              type: 'choice',
              instructions: 'Melhor rota de execução deliberada',
              criteria: {
                direct_response: 'Resposta direta em texto',
                code_synthesis: 'Gerar bloco de código com testes',
                multi_step_reasoning: 'Ativar raciocínio em etapas',
                guardrail_gate_approval: 'Pedir confirmação do usuário antes de rodar'
              }
            }
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn('TypeSafe API retornou erro, caindo para local:', response.status, errText);
        const fallback = localJevSimulate(prompt);
        fallback.apiError = `TypeSafe API HTTP ${response.status}: ${errText}`;
        return fallback;
      }

      const data = await response.json();
      return formatJevPayload(data, prompt, 'typesafe_api', Date.now() - startTime);
    } else if (jevProvider === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jevKey}`
        },
        body: JSON.stringify({
          model: 'typesafe-ai/jev',
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn('OpenRouter Jev erro, caindo para local:', response.status, errText);
        const fallback = localJevSimulate(prompt);
        fallback.apiError = `OpenRouter Jev HTTP ${response.status}: ${errText}`;
        return fallback;
      }

      const data = await response.json();
      return {
        source: 'openrouter_jev',
        latencyMs: Date.now() - startTime,
        answers: data
      };
    }
  } catch (err) {
    console.error('Falha ao chamar Jev API remota:', err);
    const fallback = localJevSimulate(prompt);
    fallback.apiError = err.message;
    return fallback;
  }

  return localJevSimulate(prompt);
}

export async function streamLLMResponse(reqBody, res) {
  const { messages, jevDecision, keys = {}, verbosity: reqVerbosity, isDirect, direct, provider: forcedProvider, model: forcedModel } = reqBody;
  const isDirectMode = Boolean(isDirect || direct);

  const llmProvider = forcedProvider || keys.llmProvider || currentConfig.llmProvider || 'gemini';
  const llmKey = keys.llmApiKey || currentConfig.llmApiKey;
  const llmModel = forcedModel || keys.llmModel || currentConfig.llmModel || (llmProvider === 'gemini' ? 'gemini-2.5-flash' : 'meta-llama/Meta-Llama-3.1-70B-Instruct');
  const customBaseUrl = keys.customBaseUrl || currentConfig.customBaseUrl;
  const verbosity = keys.verbosity || reqVerbosity || currentConfig.verbosity || 'concise';

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const answers = jevDecision?.answers || {};
  const premises = answers.premises || [];
  const coreDeduction = answers.core_deduction || '';
  const constraints = answers.constraints || [];
  const steps = answers.execution_steps || [];
  const codeSpec = answers.code_specification || {};
  const intent = answers.intent?.value || answers.intent || 'chat';
  const risk = answers.is_urgent_or_risky?.value || 'false';
  const complexity = answers.complexity?.label || 'Média';
  const route = answers.action_route?.value || 'direct_response';

  // Se não houver chave LLM e não for endpoint local/custom
  if (!llmKey && llmProvider !== 'custom') {
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const providerName = llmProvider === 'gemini' ? 'Google Gemini' : (llmProvider === 'deepinfra' ? 'DeepInfra' : (llmProvider === 'openrouter' ? 'OpenRouter' : 'OpenAI'));

    const setupGuide = llmProvider === 'gemini'
      ? `**Para ativar sua LLM no Google Gemini:**
1. Abra **Configurações** no canto superior direito.
2. Selecione o provedor **Google Gemini Oficial**.
3. Cole sua API Key gratuita de \`aistudio.google.com/apikey\` (modelo: \`${llmModel}\`).`
      : `**Para ativar sua LLM no ${providerName}:**
1. Abra **Configurações** no canto superior direito.
2. Selecione o provedor **${providerName}**.
3. Cole sua chave de API e selecione o modelo desejado (ex: \`${llmModel}\`).`;

    const demoResponse = isDirectMode
      ? `### [Resposta Direta do ${providerName}]
*(Modo de Demonstração Direto — sem intermediação ou deliberação do Jev).*

Resposta simulada do modelo **${llmModel}** para:
> "${lastUserMsg}"

Esta resposta foi gerada em canal direto sem pré-processamento de intenções, deduções analíticas ou guardrails de System 1.

${setupGuide}`
      : `### [Tradução Humana da Deliberação do Jev]
*(Modo de Demonstração — configure sua chave do **${providerName}** no botão **⚙️ Configurações** para geração em tempo real pelo modelo ${llmModel}).*

---
#### **1. O que o Jev Pensou e Deliberou (Raciocínio Central):**
> 💡 **Dedução:** ${coreDeduction || 'Análise lógica do pedido e isolamento de escopo.'}

**Premissas mapeadas pelo Jev:**
${premises.map(p => `- ${p}`).join('\n') || '- Entradas do usuário validadas'}

**Restrições e Guardrails do Jev:**
${constraints.map(c => `- ${c}`).join('\n') || '- Segurança e transparência mantidas'}

---
#### **2. Tradução da Solução Planejada pelo Jev:**
${steps.map((st, i) => `**Passo ${i + 1}:** ${st}`).join('\n\n')}

${setupGuide}`;

    const chunks = demoResponse.split(/(?<=\n|\. )/);
    for (const chunk of chunks) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      await new Promise(r => setTimeout(r, 20));
    }
    const pChars = JSON.stringify([systemPrompt, ...messages]).length;
    const cChars = demoResponse.length;
    const pTokens = Math.max(1, Math.round(pChars / 3.8));
    const cTokens = Math.max(1, Math.round(cChars / 3.8));
    res.write(`data: ${JSON.stringify({
      usage: {
        prompt_tokens: pTokens,
        completion_tokens: cTokens,
        total_tokens: pTokens + cTokens,
        estimated: true
      }
    })}\n\n`);

    res.write(`data: [DONE]\n\n`);
    res.end();
    return;
  }

  // Define o endpoint conforme o provedor
  let endpoint = 'https://api.deepinfra.com/v1/openai/chat/completions';
  let authHeader = `Bearer ${llmKey}`;

  if (llmProvider === 'gemini') {
    endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    authHeader = `Bearer ${llmKey}`;
  } else if (llmProvider === 'openrouter') {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  } else if (llmProvider === 'openai') {
    endpoint = 'https://api.openai.com/v1/chat/completions';
  } else if (llmProvider === 'deepinfra') {
    endpoint = 'https://api.deepinfra.com/v1/openai/chat/completions';
  } else if (llmProvider === 'custom' && customBaseUrl) {
    endpoint = customBaseUrl.endsWith('/chat/completions')
      ? customBaseUrl
      : `${customBaseUrl.replace(/\/$/, '')}/chat/completions`;
  }

  const targetModel = (llmProvider === 'gemini' && llmModel.startsWith('models/'))
    ? llmModel.replace('models/', '')
    : llmModel;

  let verbosityDirectives = '';
  if (verbosity === 'concise') {
    verbosityDirectives = `DIRETRIZ DE EXTENSÃO OBRIGATÓRIA: MÁXIMA CONCISÃO E OBJETIVIDADE.
- NÃO use introduções, saudações, nem frases de abertura como "Como tradutor do Jev..." ou "Apresento a solução a seguir:".
- Se for dúvida de programação/software: comece IMEDIATAMENTE pelo código correto e bem estruturado, com explicações mínimas e diretas em tópicos.
- Se NÃO for dúvida de programação (perguntas gerais, viagens, finanças, cotidiano): responda DIRETAMENTE em tópicos objetivos e realistas. NUNCA gere blocos de código nem metáforas computacionais forçadas.
- Elimine todo e qualquer texto de preenchimento, preâmbulo ou prolixidade.`;
  } else if (verbosity === 'detailed') {
    verbosityDirectives = `DIRETRIZ DE EXTENSÃO: DETALHADO E DIDÁTICO.
- Explique o raciocínio completo com profundidade conceitual e passos acionáveis.
- Forneça código apenas se a pergunta for de desenvolvimento de software. Se for assunto geral, aprofunde em texto humano sem inventar código.`;
  } else {
    verbosityDirectives = `DIRETRIZ DE EXTENSÃO: EQUILIBRADO.
- Resposta limpa, profissional e equilibrada sem introduções vazias. Gere código apenas quando o assunto for desenvolvimento.`;
  }

  const systemPrompt = isDirectMode ? {
    role: 'system',
    content: 'Você é o Google Gemini, um assistente de inteligência artificial de alta velocidade e precisão. Responda à dúvida do usuário com objetividade, clareza e sem enrolação em português.'
  } : {
    role: 'system',
    content: `Você é a inteligência tradutora e sintetizadora (System 2 Translator) do motor de raciocínio Jev (System 1 Reasoner).
TODO O PENSAMENTO, DIAGNÓSTICO E PLANO DE EXECUÇÃO JÁ FORAM PROCESSADOS PELO JEV.

Deliberação oficial do Jev:
- Dedução Central do Jev: "${coreDeduction}"
- Premissas e Fatos Mapeados: ${JSON.stringify(premises)}
- Restrições Obrigatórias: ${JSON.stringify(constraints)}
- Plano de Passos Calculados pelo Jev: ${JSON.stringify(steps)}
- Especificação Técnica: ${JSON.stringify(codeSpec)}
- Intenção: ${intent} | Risco: ${risk} | Complexidade: ${complexity} | Rota: ${route}

${verbosityDirectives}

SUA FUNÇÃO COMO TRADUTOR:
1. Traduza o raciocínio analítico do Jev para uma resposta humana em português, seguindo estritamente a DIRETRIZ DE EXTENSÃO acima.
2. SE a pergunta for sobre desenvolvimento de software ou código: gere a solução técnica e o código correspondente seguindo estritamente os passos e restrições planejados pelo Jev.
3. SE a pergunta for sobre conhecimentos gerais, viagens, finanças, cotidiano ou temas não computacionais: NUNCA crie código, scripts ou metáforas de programação. Responda diretamente com orientações factuais e práticas da vida real.
4. Não mude a rota nem contradiga as deliberações do Jev. Seja direto e assertivo.`
  };

  try {
    const upstreamRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [systemPrompt, ...messages],
        stream: true,
        stream_options: { include_usage: true }
      })
    });

    if (!upstreamRes.ok) {
      const errBody = await upstreamRes.text();
      res.write(`data: ${JSON.stringify({ error: `Erro ${llmProvider} HTTP ${upstreamRes.status}: ${errBody}` })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }

    const reader = upstreamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedText = '';
    let finalUsage = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') {
          continue;
        }
        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            if (json.usage) {
              finalUsage = json.usage;
            }
            const deltaText = json.choices?.[0]?.delta?.content || '';
            if (deltaText) {
              accumulatedText += deltaText;
              res.write(`data: ${JSON.stringify({ text: deltaText })}\n\n`);
            }
          } catch {
            // ignora chunks de controle
          }
        }
      }
    }

    if (!finalUsage) {
      const pChars = JSON.stringify([systemPrompt, ...messages]).length;
      const cChars = accumulatedText.length;
      const pTokens = Math.max(1, Math.round(pChars / 3.8));
      const cTokens = Math.max(1, Math.round(cChars / 3.8));
      finalUsage = {
        prompt_tokens: pTokens,
        completion_tokens: cTokens,
        total_tokens: pTokens + cTokens,
        estimated: true
      };
    }

    res.write(`data: ${JSON.stringify({ usage: finalUsage })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    console.error('Erro no streaming LLM:', err);
    res.write(`data: ${JSON.stringify({ error: `Falha de conexão: ${err.message}` })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
}
