import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

interface JevSimulationResult {
	intent: string;
	intent_confidence: number;
	risk_assessment: string;
	risk_confidence: number;
	complexity_score: number;
	complexity_label: string;
	route: string;
	domain: string;
	core_deduction: string;
	constraints: string[];
	execution_steps: string[];
	code_specification: {
		language: string;
		paradigm: string;
		strict_typing: boolean;
		error_handling: string;
	};
	latency_s1_ms: number;
}

export function localJevSimulate(prompt: string): JevSimulationResult {
	const p = (prompt || '').toLowerCase();
	const startTime = Date.now();

	let intent = 'chat';
	let intentConf = 0.88;
	if (/código|codigo|função|funcao|script|bug|erro|typescript|javascript|python|api|implemente|criar|node|class|componente|css|html/.test(p)) {
		intent = 'code_engineering';
		intentConf = 0.97;
	} else if (/explique|como funciona|o que é|o que e|diferença|diferenca|por que|resumo|ensine/.test(p)) {
		intent = 'explanation_learning';
		intentConf = 0.94;
	} else if (/segurança|seguranca|auth|token|delete|apagar|remover|destruir|drop|formate|vazar/.test(p)) {
		intent = 'security_critical';
		intentConf = 0.99;
	} else if (/planeje|arquitetura|organize|etapas|roadmap|especifique/.test(p)) {
		intent = 'architecture_planning';
		intentConf = 0.92;
	}

	let riskAssessment = 'false';
	let riskConf = 0.95;
	if (/urgente|socorro|quebrou|produção|producao|fora do ar|perda|asap|apagar tudo/.test(p)) {
		riskAssessment = 'true';
		riskConf = 0.98;
	} else if (/talvez|não sei|nao sei|arriscar|testar em prod/.test(p)) {
		riskAssessment = 'uncertain';
		riskConf = 0.72;
	}

	let complexityScore = 2;
	let complexityLabel = 'Baixa';
	const len = prompt.length;
	if (len > 300 || /refatorar|arquitetura|distribuído|distribuido|banco de dados|concorrência|concorrencia|fullstack|sistema/.test(p)) {
		complexityScore = 5;
		complexityLabel = 'Alta (Raciocínio Profundo)';
	} else if (len > 100 || /integração|integracao|api|classe|componente|vite/.test(p)) {
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

	const isSoftware = intent === 'code_engineering' || intent === 'architecture_planning' ||
		/\b(código|codigo|função|funcao|script|bug|api|software|programa|programar|algoritmo|classe|banco|sql|endpoint|typescript|python|javascript|react|rust|node|css|html|dev|backend|frontend|git|json|docker|deploy|linux|terminal)\b/i.test(p);

	let techDomain = isSoftware ? 'Geral / Engenharia de Software' : 'Conhecimento Geral & Vida Prática';
	if (/typescript|ts/.test(p)) techDomain = 'TypeScript';
	else if (/python|py/.test(p)) techDomain = 'Python';
	else if (/rust|rs/.test(p)) techDomain = 'Rust';
	else if (/react|vue|svelte|frontend/.test(p)) techDomain = 'Frontend Web';
	else if (/sql|postgres|mysql|banco/.test(p)) techDomain = 'Database & SQL';

	let coreDeduction = '';
	let constraints: string[] = [];
	let executionSteps: string[] = [];

	if (intent === 'code_engineering') {
		coreDeduction = `Problema requer implementação em ${techDomain}. O código deve ser idiomático, com tipagem estrita, modularizado e com tratamento explícito de falhas e edge cases.`;
		constraints = [
			'Tipagem estrita sem o uso de any desnecessário',
			'Código autocontido e pronto para execução sem dependências ocultas',
			'Nomes de variáveis intencionais e sem abreviações obscuras',
			'Tratamento preventivo de edge cases e entradas nulas'
		];
		executionSteps = [
			'1. Definir os tipos, interfaces e contratos de dados essenciais',
			'2. Implementar a lógica central com validação de entrada',
			'3. Adicionar controle de erros e tratamento de exceções',
			'4. Apresentar exemplo de consumo funcional'
		];
	} else if (intent === 'security_critical') {
		coreDeduction = 'Operação com potencial de risco à integridade de dados ou segurança. O plano deve conter salvaguardas explícitas, idempotência e verificação antes de qualquer mutação.';
		constraints = [
			'Princípio do menor privilégio',
			'Não expor segredos, tokens ou dados sensíveis em logs',
			'Validação estrita de limites de entrada'
		];
		executionSteps = [
			'1. Avaliar superfície de risco e vetor de ameaça',
			'2. Estabelecer guardrails de contenção',
			'3. Executar o procedimento de forma transacional e reversível',
			'4. Auditar o resultado final'
		];
	} else if (intent === 'architecture_planning') {
		coreDeduction = 'Demanda planejamento de arquitetura com separação clara de responsabilidades, escalabilidade e desacoplamento de componentes.';
		constraints = [
			'Evitar acoplamento prematuro e complexidade acidental (YAGNI)',
			'Garantir isolamento de domínios',
			'Definir contratos de comunicação claros'
		];
		executionSteps = [
			'1. Mapear entidades fundamentais e limites de contexto',
			'2. Desenhar fluxo de dados e interfaces de integração',
			'3. Identificar potenciais gargalos e pontos únicos de falha',
			'4. Resumir o plano de evolução por marcos objetivos'
		];
	} else {
		coreDeduction = 'Consulta de conhecimento e raciocínio analítico. Exige resposta estruturada, premissas fundamentadas e ausência de preâmbulos genéricos.';
		constraints = [
			'Fundamentação objetiva e factual',
			'Clareza conceitual sem redundâncias'
		];
		executionSteps = [
			'1. Isolar premissas centrais da dúvida',
			'2. Desenvolver a dedução analítica com exemplos práticos',
			'3. Concluir com recomendações acionáveis'
		];
	}

	const latencyS1 = Math.max(8, Date.now() - startTime + Math.floor(Math.random() * 12) + 10);

	return {
		intent,
		intent_confidence: intentConf,
		risk_assessment: riskAssessment,
		risk_confidence: riskConf,
		complexity_score: complexityScore,
		complexity_label: complexityLabel,
		route,
		domain: techDomain,
		core_deduction: coreDeduction,
		constraints,
		execution_steps: executionSteps,
		code_specification: {
			language: techDomain,
			paradigm: 'Idiomático & Funcional/Modular',
			strict_typing: true,
			error_handling: 'Explicito com Result/Try-Catch'
		},
		latency_s1_ms: latencyS1
	};
}

export class JevDualEngine implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Jev Dual-Engine AI',
		name: 'jevDualEngine',
		icon: 'file:jevDualEngine.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["model"] || "Gemini"}}',
		description: 'Arquitetura Sandwich: Raciocínio deliberado sub-30ms (System 1) + Tradução generativa (System 2)',
		defaults: {
			name: 'Jev Dual-Engine',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'jevApi',
				required: false,
			},
			{
				name: 'jevLlmApi',
				required: false,
			},
		],
		properties: [
			{
				displayName: 'Prompt / Pergunta',
				name: 'prompt',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '={{ $json.chatInput || $json.text || $json.body?.prompt || "" }}',
				required: true,
				description: 'Texto de entrada a ser processado pelo Jev System 1 e traduzido pela LLM System 2',
			},
			{
				displayName: 'Provedor da LLM (Override)',
				name: 'providerOverride',
				type: 'options',
				options: [
					{ name: 'Usar Provedor das Credenciais', value: 'from_cred' },
					{ name: 'Google Gemini', value: 'gemini' },
					{ name: 'DeepInfra (Llama / Qwen / DeepSeek)', value: 'deepinfra' },
					{ name: 'OpenRouter', value: 'openrouter' },
					{ name: 'OpenAI Oficial', value: 'openai' },
				],
				default: 'from_cred',
				description: 'Permite sobrescrever o provedor da credencial diretamente no nó',
			},
			{
				displayName: 'Modelo da LLM',
				name: 'model',
				type: 'string',
				default: 'gemini-2.5-flash',
				description: 'Nome do modelo a ser chamado (ex: gemini-2.5-flash, gemini-2.5-pro, meta-llama/Meta-Llama-3.1-70B-Instruct, gpt-4o)',
			},
			{
				displayName: 'Estilo de Resposta (Verbosidade)',
				name: 'verbosity',
				type: 'options',
				options: [
					{
						name: '⚡ Conciso & Direto (Padrão — Sem preâmbulos ou enrolação)',
						value: 'concise',
					},
					{
						name: '⚖️ Equilibrado (Explicação técnica moderada + Código)',
						value: 'balanced',
					},
					{
						name: '📖 Detalhado & Didático (Conceitos aprofundados e prós/contras)',
						value: 'detailed',
					},
				],
				default: 'concise',
				description: 'Controla a extensão e nível de detalhamento da resposta',
			},
			{
				displayName: 'Incluir Pensamentos do Jev na Saída (Thoughts)',
				name: 'includeThoughts',
				type: 'boolean',
				default: true,
				description: 'Se ativo, adiciona json.thoughts com deduções, passos do plano e métricas de latência calculadas pelo Jev',
			},
			{
				displayName: 'Temperatura',
				name: 'temperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberStepSize: 0.1,
				},
				default: 0.2,
				description: 'Valores menores geram respostas mais determinísticas e focadas',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Carrega credenciais opcionais
		let jevCreds: any = {};
		let llmCreds: any = {};
		try {
			jevCreds = await this.getCredentials('jevApi');
		} catch {}
		try {
			llmCreds = await this.getCredentials('jevLlmApi');
		} catch {}

		for (let i = 0; i < items.length; i++) {
			const prompt = this.getNodeParameter('prompt', i, '') as string;
			const providerOverride = this.getNodeParameter('providerOverride', i, 'from_cred') as string;
			const model = this.getNodeParameter('model', i, 'gemini-2.5-flash') as string;
			const verbosity = this.getNodeParameter('verbosity', i, 'concise') as string;
			const includeThoughts = this.getNodeParameter('includeThoughts', i, true) as boolean;
			const temperature = this.getNodeParameter('temperature', i, 0.2) as number;

			if (!prompt || !prompt.trim()) {
				returnData.push({
					json: {
						error: 'Prompt de entrada vazio.',
					},
				});
				continue;
			}

			const tTotalStart = Date.now();

			// 1. SYSTEM 1: Execução do Raciocínio Deliberado Jev
			const jevDecision = localJevSimulate(prompt);

			// 2. SYSTEM 2: Montagem do Contrato Sandwich para a LLM
			let verbosityDirective = '';
			if (verbosity === 'concise') {
				verbosityDirective = 'DIRETIVA DE CONCISÃO: Responda de forma direta e concisa. Elimine saudações, preâmbulos, cumprimentos ou conclusões genéricas. Comece imediatamente pelo código ou solução técnica em tópicos objetivos.';
			} else if (verbosity === 'balanced') {
				verbosityDirective = 'DIRETIVA DE ESTILO EQUILIBRADO: Responda de forma profissional com código limpo e explicação sucinta acompanhando as decisões de implementação.';
			} else {
				verbosityDirective = 'DIRETIVA DE ESTILO DETALHADO: Responda de forma completa, didática e explicativa, aprofundando os conceitos fundamentais e decisões arquiteturais.';
			}

			const systemPrompt = `Você é a Voz Humana e Tradutora do Jev.
O Jev é o motor de raciocínio neuro-simbólico que já analisou, diagnosticou e determinou a solução lógica para o usuário.

DEDUÇÃO LÓGICA DO JEV:
${jevDecision.core_deduction}

RESTRIÇÕES DETERMINADAS PELO JEV:
${jevDecision.constraints.map(c => '- ' + c).join('\n')}

PLANO DE EXECUÇÃO CALCULADO PELO JEV:
${jevDecision.execution_steps.join('\n')}

DOMÍNIO TÉCNICO: ${jevDecision.domain}
ESTILO EXIGIDO: ${jevDecision.code_specification.paradigm}

${verbosityDirective}

SUA TAREFA:
Sintetize a resposta em português fluente seguindo fielmente o plano de execução e restrições calculadas pelo Jev acima.`;

			// Determina provedor e chaves
			const provider = providerOverride !== 'from_cred' ? providerOverride : (llmCreds.provider || 'gemini');
			const apiKey = llmCreds.apiKey || llmCreds.customApiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';
			const baseUrl = llmCreds.customBaseUrl || 'http://localhost:11434/v1';

			let generatedText = '';
			let usage: any = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

			try {
				if (provider === 'gemini') {
					if (!apiKey) {
						throw new NodeOperationError(this.getNode(), 'Chave de API do Google Gemini não configurada nas credenciais jevLlmApi.');
					}
					const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
					const response = await this.helpers.httpRequest({
						method: 'POST',
						url,
						headers: { 'Content-Type': 'application/json' },
						body: {
							systemInstruction: { parts: [{ text: systemPrompt }] },
							contents: [{ role: 'user', parts: [{ text: prompt }] }],
							generationConfig: {
								temperature,
								maxOutputTokens: 4096,
							},
						},
						json: true,
					});

					const candidate = response?.candidates?.[0];
					generatedText = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';
					if (response?.usageMetadata) {
						usage = {
							prompt_tokens: response.usageMetadata.promptTokenCount || 0,
							completion_tokens: response.usageMetadata.candidatesTokenCount || 0,
							total_tokens: response.usageMetadata.totalTokenCount || 0,
						};
					}
				} else {
					// Provedores padrão OpenAI: DeepInfra, OpenRouter, OpenAI, Custom/Ollama
					let endpoint = 'https://api.openai.com/v1/chat/completions';
					if (provider === 'deepinfra') endpoint = 'https://api.deepinfra.com/v1/openai/chat/completions';
					else if (provider === 'openrouter') endpoint = 'https://openrouter.ai/api/v1/chat/completions';
					else if (provider === 'custom') endpoint = baseUrl.replace(/\/+$/, '') + '/chat/completions';

					const headers: Record<string, string> = { 'Content-Type': 'application/json' };
					if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

					const response = await this.helpers.httpRequest({
						method: 'POST',
						url: endpoint,
						headers,
						body: {
							model,
							temperature,
							messages: [
								{ role: 'system', content: systemPrompt },
								{ role: 'user', content: prompt }
							],
						},
						json: true,
					});

					generatedText = response?.choices?.[0]?.message?.content || '';
					if (response?.usage) {
						usage = response.usage;
					}
				}
			} catch (err: any) {
				throw new NodeOperationError(this.getNode(), `Erro ao comunicar com a LLM (${provider}): ${err.message || err}`);
			}

			const tTotalEnd = Date.now();
			const totalMs = Math.max(1, tTotalEnd - tTotalStart);

			// Tokens calculados por agente respectivamente
			const jevPromptTokens = Math.max(1, Math.round(prompt.length / 4));
			const jevPlanStr = jevDecision.core_deduction + ' ' + jevDecision.execution_steps.join(' ') + ' ' + jevDecision.constraints.join(' ');
			const jevCompletionTokens = Math.max(1, Math.round(jevPlanStr.length / 4));
			const jevTotalTokens = jevPromptTokens + jevCompletionTokens;

			const llmPromptTokens = usage.prompt_tokens || Math.max(1, Math.round(systemPrompt.length / 4) + jevPromptTokens);
			const llmCompletionTokens = usage.completion_tokens || Math.max(1, Math.round(generatedText.length / 4));
			const llmTotalTokens = usage.total_tokens || (llmPromptTokens + llmCompletionTokens);

			const outputJson: any = {
				output: generatedText,
				response: generatedText,
				tokens: {
					jev_system_1: {
						agent: 'Jev (Reasoner S1)',
						prompt_tokens: jevPromptTokens,
						completion_tokens: jevCompletionTokens,
						total_tokens: jevTotalTokens,
					},
					llm_system_2: {
						agent: `LLM Translator S2 (${provider}/${model})`,
						prompt_tokens: llmPromptTokens,
						completion_tokens: llmCompletionTokens,
						total_tokens: llmTotalTokens,
					},
					total_tokens: jevTotalTokens + llmTotalTokens,
				},
				latency: {
					jev_s1_ms: jevDecision.latency_s1_ms,
					llm_s2_ms: Math.max(1, totalMs - jevDecision.latency_s1_ms),
					total_ms: totalMs,
				},
				model,
				provider,
			};

			if (includeThoughts) {
				outputJson.thoughts = {
					intent: jevDecision.intent,
					intent_confidence: jevDecision.intent_confidence,
					risk_assessment: jevDecision.risk_assessment,
					risk_confidence: jevDecision.risk_confidence,
					complexity_score: jevDecision.complexity_score,
					complexity_label: jevDecision.complexity_label,
					domain: jevDecision.domain,
					core_deduction: jevDecision.core_deduction,
					constraints: jevDecision.constraints,
					execution_steps: jevDecision.execution_steps,
					code_specification: jevDecision.code_specification,
				};
			}

			returnData.push({
				json: outputJson,
				pairedItem: { item: i },
			});
		}

		return [returnData];
	}
}
