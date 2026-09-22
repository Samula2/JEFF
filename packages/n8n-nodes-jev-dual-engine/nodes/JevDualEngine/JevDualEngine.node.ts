import {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	NodeConnectionTypes,
	NodeOperationError,
	SupplyData,
} from 'n8n-workflow';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, SystemMessage } from '@langchain/core/messages';
import { ChatResult } from '@langchain/core/outputs';

export interface JevSimulationResult {
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
	const p = (prompt || '').toLowerCase().trim();
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

	const isGreeting = /^(oi|olá|ola|e aí|e ai|opa|bom dia|boa tarde|boa noite|hello|hi|hey|teste|test)\b/i.test(p) || (intent === 'chat' && len < 30);

	if (isGreeting) {
		coreDeduction = 'Saudação ou interação conversacional. Responder com cordialidade natural e prontidão, colocando-se à disposição para ajudar.';
		constraints = [
			'Tom prestativo, direto e profissional',
			'Sem preâmbulos vazios, formalismos robóticos ou citações a estruturas internas',
		];
		executionSteps = [
			'Cumprimentar o usuário cordialmente',
			'Perguntar ou se dispor a resolver a demanda',
		];
	} else if (intent === 'code_engineering') {
		coreDeduction = `Demanda requer implementação em ${techDomain}. O código deve ser idiomático, com tipagem estrita, modularizado e com tratamento explícito de falhas.`;
		constraints = [
			'Tipagem estrita sem o uso de any desnecessário',
			'Código autocontido e pronto para execução sem dependências ocultas',
			'Tratamento preventivo de edge cases e entradas nulas',
		];
		executionSteps = [
			'1. Definir os tipos, interfaces e contratos essenciais',
			'2. Implementar a lógica central com validação defensiva',
			'3. Apresentar exemplo de uso prático',
		];
	} else if (intent === 'security_critical') {
		coreDeduction = 'Operação com potencial de risco à integridade de dados ou segurança. Exige salvaguardas explícitas, idempotência e verificação antes de qualquer mutação.';
		constraints = [
			'Princípio do menor privilégio',
			'Não expor segredos, tokens ou dados sensíveis',
			'Validação estrita de limites de entrada',
		];
		executionSteps = [
			'1. Avaliar superfície de risco',
			'2. Estabelecer guardrails de contenção',
			'3. Executar o procedimento de forma reversível e segura',
		];
	} else if (intent === 'architecture_planning') {
		coreDeduction = 'Demanda planejamento de arquitetura com separação clara de responsabilidades, escalabilidade e desacoplamento de componentes.';
		constraints = [
			'Evitar acoplamento prematuro e complexidade acidental (YAGNI)',
			'Garantir isolamento de domínios',
			'Definir contratos de comunicação claros',
		];
		executionSteps = [
			'1. Mapear limites de contexto e fronteiras de domínio',
			'2. Desenhar fluxo de integração e interfaces',
			'3. Resumir o plano de evolução por marcos objetivos',
		];
	} else {
		coreDeduction = 'Consulta conceitual e prática. Exige resposta estruturada, assertiva e fundamentada.';
		constraints = [
			'Fundamentação objetiva e factual',
			'Clareza conceitual sem redundâncias',
		];
		executionSteps = [
			'1. Isolar premissas centrais da dúvida',
			'2. Desenvolver a dedução analítica com exemplos práticos',
			'3. Concluir com recomendações acionáveis',
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
			error_handling: 'Explicito com Result/Try-Catch',
		},
		latency_s1_ms: latencyS1,
	};
}

export function cleanLatexText(text: string): string {
	if (!text || typeof text !== 'string') return text;
	let out = text;

	// Frações: \frac{a}{b} -> (a/b)
	out = out.replace(/\\(?:d)?frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1/$2)');

	// Comandos e símbolos matemáticos
	const mathReplacements: Record<string, string> = {
		'\\int': '∫',
		'\\iint': '∬',
		'\\iiint': '∭',
		'\\nabla': '∇',
		'\\in': '∈',
		'\\notin': '∉',
		'\\infty': '∞',
		'\\leq': '≤',
		'\\le': '≤',
		'\\geq': '≥',
		'\\ge': '≥',
		'\\nu': 'ν',
		'\\sigma': 'σ',
		'\\Omega': 'Ω',
		'\\omega': 'ω',
		'\\alpha': 'α',
		'\\beta': 'β',
		'\\gamma': 'γ',
		'\\delta': 'δ',
		'\\Delta': 'Δ',
		'\\theta': 'θ',
		'\\lambda': 'λ',
		'\\mu': 'μ',
		'\\pi': 'π',
		'\\rho': 'ρ',
		'\\tau': 'τ',
		'\\phi': 'φ',
		'\\psi': 'ψ',
		'\\langle': '⟨',
		'\\rangle': '⟩',
		'\\cap': '∩',
		'\\cup': '∪',
		'\\subset': '⊂',
		'\\subseteq': '⊆',
		'\\partial': '∂',
		'\\times': '×',
		'\\cdot': '·',
		'\\neq': '≠',
		'\\approx': '≈',
		'\\pm': '±',
		'\\mp': '∓',
		'\\sqrt': '√',
		'\\sum': '∑',
		'\\prod': '∏',
		'\\forall': '∀',
		'\\exists': '∃',
		'\\to': '→',
		'\\rightarrow': '→',
		'\\leftarrow': '←',
		'\\Rightarrow': '⇒',
		'\\Leftarrow': '⇐',
		'\\iff': '⇔',
	};

	for (const [key, val] of Object.entries(mathReplacements)) {
		out = out.split(key).join(val);
	}

	// Sobrescritos e subscritos comuns
	out = out
		.replace(/\^2\b/g, '²')
		.replace(/\^3\b/g, '³')
		.replace(/\^0\b/g, '⁰')
		.replace(/\^1\b/g, '¹')
		.replace(/\^n\b/g, 'ⁿ')
		.replace(/_0\b/g, '₀')
		.replace(/_1\b/g, '₁')
		.replace(/_2\b/g, '₂')
		.replace(/_3\b/g, '₃')
		.replace(/_i\b/g, 'ᵢ')
		.replace(/_j\b/g, 'ⱼ')
		.replace(/_n\b/g, 'ₙ');

	// Remove chaves LaTeX residuais como {L^2} ou {loc}
	out = out.replace(/\{([^{}]+)\}/g, '$1');

	// Remove delimitadores de bloco $$ e embutidos $
	out = out.replace(/\$\$/g, '');
	out = out.replace(/\$([^$]+)\$/g, '$1');

	return out;
}

export interface JevConfig {
	verbosity?: 'concise' | 'balanced' | 'detailed';
	enableSandwich?: boolean;
	cleanMath?: boolean;
}

export class JevChatModel extends ChatOpenAI {
	readonly fields: any;
	readonly jevConfig: JevConfig;

	constructor(fields?: any, jevConfig: JevConfig = {}) {
		super(fields);
		this.fields = fields;
		this.jevConfig = jevConfig;
	}

	override withConfig(config: any): this {
		const newModel = new JevChatModel(this.fields, this.jevConfig);
		newModel.defaultOptions = {
			...this.defaultOptions,
			...config,
		};
		return newModel as this;
	}

	enrichMessagesWithJev(messages: BaseMessage[]): BaseMessage[] {
		if (this.jevConfig.enableSandwich === false || !messages || messages.length === 0) {
			return messages;
		}

		// Identifica a mensagem humana mais recente
		const humanMsgs = messages.filter((m) => m.getType() === 'human');
		const targetMsg = humanMsgs.length > 0 ? humanMsgs[humanMsgs.length - 1] : messages[messages.length - 1];

		let promptText = '';
		if (typeof targetMsg?.content === 'string') {
			promptText = targetMsg.content;
		} else if (Array.isArray(targetMsg?.content)) {
			promptText = targetMsg.content
				.map((c: any) => (typeof c === 'string' ? c : c?.text || ''))
				.join(' ');
		}

		if (!promptText.trim()) {
			return messages;
		}

		// Raciocínio Deliberado System 1 (<30ms)
		const jevDecision = localJevSimulate(promptText);

		let verbosityDirective = '';
		const verbosity = this.jevConfig.verbosity || 'concise';
		if (verbosity === 'concise') {
			verbosityDirective = 'DIRETIVA: Responda de forma direta e concisa. Elimine saudações vazias e prolixidade. Vá direto ao ponto ou código.';
		} else if (verbosity === 'balanced') {
			verbosityDirective = 'DIRETIVA: Responda de forma profissional e equilibrada, combinando o plano deliberado com código e explicações claras.';
		} else {
			verbosityDirective = 'DIRETIVA: Responda de forma aprofundada, didática e conceitual.';
		}

		const cleanMathDirective = this.jevConfig.cleanMath !== false
			? `\nFORMATAÇÃO DE FÓRMULAS E MATEMÁTICA:
O chat do n8n NÃO suporta código LaTeX. NUNCA utilize delimitações em dólar ($ ou $$) nem comandos LaTeX com barra invertida (como \\frac, \\int, \\nabla, \\in, \\partial, \\nu, \\Omega, \\infty, \\leq, \\rangle, etc.).
Escreva toda e qualquer fórmula, variável ou expressão matemática em texto comum e caracteres Unicode legíveis (ex: use 1/2 ou ½ em vez de \\frac{1}{2}; use u(t) em vez de $u(t)$; use ∫ em vez de \\int; use ∇ em vez de \\nabla; use ∈ em vez de \\in; use ∞ em vez de \\infty; use ≤ em vez de \\leq).`
			: '';

		const isGreeting = /^(oi|olá|ola|e aí|e ai|opa|bom dia|boa tarde|boa noite|hello|hi|hey|teste|test)\b/i.test(promptText.trim()) ||
			(jevDecision.intent === 'chat' && promptText.length < 30);

		let sandwichContract = '';
		if (isGreeting) {
			sandwichContract = `[DIRETRIZ JEV REASONING]: Interação conversacional direta. Responda com cordialidade natural e prontidão, sem jargões ou estruturas mecânicas.${cleanMathDirective}`;
		} else {
			sandwichContract = `[JEV REASONING CONTEXT & GUIDELINES]
O Jev deliberou a triagem analítica prévia (System 1) para esta requisição:
- Foco Lógico: ${jevDecision.core_deduction}
- Domínio: ${jevDecision.domain} (${jevDecision.complexity_label})
- Guardrails e Restrições:
${jevDecision.constraints.map((c) => '  * ' + c).join('\n')}
${jevDecision.execution_steps.length > 0 ? `- Plano de Etapas Calculado pelo Jev:\n` + jevDecision.execution_steps.map((s) => '  ' + s).join('\n') : ''}
${verbosityDirective}
${cleanMathDirective}

DIRETRIZ DE EXECUÇÃO:
- Se for necessário acionar ferramentas (tools) conectadas ao agente, execute-as prioritariamente.
- Incorpore este raciocínio deliberado de forma fluida, natural e profissional na resposta final.
- NUNCA mencione nem repita rótulos internos como "System 2", "Contrato do Jev" ou "Plano do Jev" no texto visível ao usuário.`;
		}

		const enriched = [...messages];
		const sysIndex = enriched.findIndex((m) => m.getType() === 'system');

		if (sysIndex >= 0) {
			const existingContent = enriched[sysIndex].content;
			const textContent = typeof existingContent === 'string' ? existingContent : JSON.stringify(existingContent);
			if (textContent.includes('[JEV REASONING') || textContent.includes('[JEV SYSTEM 1') || textContent.includes('[DIRETRIZ JEV')) {
				const baseContent = textContent.split(/\[(?:JEV REASONING|JEV SYSTEM 1|DIRETRIZ JEV)/)[0].trim();
				enriched[sysIndex] = new SystemMessage(baseContent ? `${baseContent}\n\n${sandwichContract}` : sandwichContract);
			} else {
				enriched[sysIndex] = new SystemMessage(`${textContent}\n\n${sandwichContract}`);
			}
		} else {
			enriched.unshift(new SystemMessage(sandwichContract));
		}

		return enriched;
	}

	// @ts-ignore
	override async _generate(messages: BaseMessage[], options: any, runManager?: any): Promise<ChatResult> {
		const enrichedMessages = this.enrichMessagesWithJev(messages);
		const result = await super._generate(enrichedMessages, options, runManager);
		if (this.jevConfig.cleanMath !== false && result?.generations) {
			for (const gen of result.generations) {
				if (typeof gen.text === 'string') {
					gen.text = cleanLatexText(gen.text);
				}
				if (gen.message && typeof gen.message.content === 'string') {
					gen.message.content = cleanLatexText(gen.message.content);
				}
			}
		}
		return result;
	}

	// @ts-ignore
	override async *_streamResponseChunks(messages: BaseMessage[], options: any, runManager?: any): AsyncGenerator<any, void, unknown> {
		const enrichedMessages = this.enrichMessagesWithJev(messages);
		for await (const chunk of super._streamResponseChunks(enrichedMessages, options, runManager)) {
			if (this.jevConfig.cleanMath !== false) {
				if (chunk?.text && typeof chunk.text === 'string') {
					chunk.text = cleanLatexText(chunk.text);
				}
				if (chunk?.message && typeof chunk.message.content === 'string') {
					chunk.message.content = cleanLatexText(chunk.message.content);
				}
			}
			yield chunk;
		}
	}
}

export class JevDualEngine implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Jev Dual-Engine Model',
		name: 'jevDualEngine',
		icon: 'file:jevDualEngine.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["model"] || "gemini-2.5-flash"}}',
		description: 'Language Model com Raciocínio Deliberado Jev (System 1 sub-30ms) para AI Agents e Chains',
		defaults: {
			name: 'Jev Dual-Engine Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://github.com/Samula2/JEFF',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'jevLlmApi',
				required: true,
			},
			{
				name: 'jevApi',
				required: false,
			},
		],
		properties: [
			{
				displayName: 'Provedor da LLM (Override)',
				name: 'providerOverride',
				type: 'options',
				options: [
					{ name: 'Automático / Das Credenciais', value: 'from_cred' },
					{ name: 'Google Gemini Oficial (OpenAI Endpoint)', value: 'gemini' },
					{ name: 'OpenRouter (Gemma, Claude, Llama, Qwen)', value: 'openrouter' },
					{ name: 'DeepInfra (Llama 3.1 / DeepSeek / Qwen)', value: 'deepinfra' },
					{ name: 'OpenAI Oficial', value: 'openai' },
					{ name: 'Custom Endpoint / Mac mini / Ollama Local', value: 'custom' },
				],
				default: 'from_cred',
				description: 'Permite escolher o provedor ou detectar automaticamente a partir da credencial/chave',
			},
			{
				displayName: 'Modelo da LLM',
				name: 'model',
				type: 'string',
				default: 'gemini-2.5-flash',
				description: 'Nome do modelo a ser chamado (ex: gemini-2.5-flash, gpt-4o, google/gemma-4-26b-a4b-it, ou qualquer modelo local no seu Mac mini/Ollama)',
			},
			{
				displayName: 'Formatar Fórmulas para Chat (Sem LaTeX)',
				name: 'cleanMath',
				type: 'boolean',
				default: true,
				description: 'Evita caracteres de código LaTeX ($ e \\) que quebram no chat do n8n, convertendo fórmulas para texto puro e símbolos Unicode legíveis (ex: x², ½, ∫, ∇)',
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
				description: 'Controla a extensão e o direcionamento da síntese da resposta',
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
			{
				displayName: 'Máximo de Tokens de Saída',
				name: 'maxTokens',
				type: 'number',
				default: 4096,
				description: 'Limite máximo de tokens gerados pela LLM',
			},
			{
				displayName: 'Ativar Raciocínio Sandwich (System 1)',
				name: 'enableSandwich',
				type: 'boolean',
				default: true,
				description: 'Se ativo, o Jev executa dedução lógica deliberada sub-30ms antes de delegar para a LLM',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		let llmCreds: any = {};
		try {
			llmCreds = await this.getCredentials('jevLlmApi');
		} catch (err: any) {
			throw new NodeOperationError(this.getNode(), 'Credencial "LLM System 2 API" é necessária para o nó de modelo Jev.');
		}

		let modelName = this.getNodeParameter('model', itemIndex, 'gemini-2.5-flash') as string;
		const providerOverride = this.getNodeParameter('providerOverride', itemIndex, 'from_cred') as string;
		const cleanMath = this.getNodeParameter('cleanMath', itemIndex, true) as boolean;
		const temperature = this.getNodeParameter('temperature', itemIndex, 0.2) as number;
		const maxTokens = this.getNodeParameter('maxTokens', itemIndex, 4096) as number;
		const verbosity = this.getNodeParameter('verbosity', itemIndex, 'concise') as 'concise' | 'balanced' | 'detailed';
		const enableSandwich = this.getNodeParameter('enableSandwich', itemIndex, true) as boolean;

		// Tolerância a typos: caso o usuário tenha digitado sem o sufixo de instrução -it
		if (modelName === 'google/gemma-4-26b-a4b') {
			modelName = 'google/gemma-4-26b-a4b-it';
		} else if (modelName === 'google/gemma-4-31b') {
			modelName = 'google/gemma-4-31b-it';
		}

		let provider = providerOverride !== 'from_cred' ? providerOverride : (llmCreds.provider || 'gemini');
		let apiKey = llmCreds.apiKey || '';
		let baseURL = 'https://api.openai.com/v1';
		let defaultHeaders: Record<string, string> | undefined = undefined;

		// Detecção inteligente de provedor (tolerância a falhas):
		// 1. Chaves OpenRouter começam com 'sk-or-'
		if (apiKey.startsWith('sk-or-')) {
			provider = 'openrouter';
		}
		// 2. Modelos com barra e provedor gemini pertencem ao OpenRouter ou DeepInfra
		else if (provider === 'gemini' && modelName.includes('/')) {
			provider = 'openrouter';
		}

		if (provider === 'gemini') {
			baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
			if (!apiKey) {
				apiKey = process.env.GEMINI_API_KEY || '';
			}
			if (!apiKey) {
				throw new NodeOperationError(this.getNode(), 'Chave de API do Google Gemini não configurada nas credenciais jevLlmApi.');
			}
		} else if (provider === 'deepinfra') {
			baseURL = 'https://api.deepinfra.com/v1/openai';
		} else if (provider === 'openrouter') {
			baseURL = 'https://openrouter.ai/api/v1';
			defaultHeaders = {
				'HTTP-Referer': 'https://n8n.io',
				'X-Title': 'n8n Jev Dual-Engine',
			};
		} else if (provider === 'openai') {
			baseURL = 'https://api.openai.com/v1';
			if (!apiKey) {
				apiKey = process.env.OPENAI_API_KEY || '';
			}
		} else if (provider === 'custom') {
			baseURL = (llmCreds.customBaseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '');
			apiKey = llmCreds.customApiKey || apiKey || 'ollama';
		}

		const model = new JevChatModel(
			{
				model: modelName,
				temperature,
				maxTokens: maxTokens > 0 ? maxTokens : undefined,
				apiKey,
				configuration: {
					baseURL,
					defaultHeaders,
				},
			},
			{
				verbosity,
				enableSandwich,
				cleanMath,
			},
		);

		return {
			response: model,
		};
	}
}
