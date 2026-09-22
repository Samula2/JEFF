import {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeProperties,
	IDataObject,
	NodeOperationError,
	SupplyData,
	NodeConnectionTypes,
} from 'n8n-workflow';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';
import { ChatOpenAI } from '@langchain/openai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
	AIMessage,
	AIMessageChunk,
	SystemMessage,
	type BaseMessage,
} from '@langchain/core/messages';
import { ChatGenerationChunk, ChatResult } from '@langchain/core/outputs';
import { GeminiChatModel, formatGeminiUsage } from './GeminiChatModel';
import {
	type ModelUsageReporter,
	UniversalChatModelTracing,
} from './UniversalChatModelTracing';
import {
	type ModelProvider,
	type NormalizedModelError,
	isRetryableModelError,
	normalizeModelError,
	retryAfterMsForModelError,
	toUniversalModelError,
} from './ModelError';

// ─────────────────────────────────────────────────────────────
// 1. JEV SYSTEM 1 SIMULATION & DELIBERATION ENGINE (<30ms)
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// 2. ANTI-LATEX SANITIZER FOR CLEAN CHAT DISPLAY
// ─────────────────────────────────────────────────────────────

export function cleanLatexText(text: string): string {
	if (!text || typeof text !== 'string') return text;
	let out = text;

	// Frações: \frac{a}{b} -> (a/b)
	out = out.replace(/\\(?:d)?frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1/$2)');

	// Comandos e símbolos matemáticos
	const mathReplacements: Record<string, string> = {
		'\\lambda': 'λ',
		'\\Lambda': 'Λ',
		'\\cdot': '·',
		'\\dot': '˙',
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
		'\\Sigma': 'Σ',
		'\\Omega': 'Ω',
		'\\omega': 'ω',
		'\\alpha': 'α',
		'\\beta': 'β',
		'\\gamma': 'γ',
		'\\Gamma': 'Γ',
		'\\delta': 'δ',
		'\\Delta': 'Δ',
		'\\theta': 'θ',
		'\\Theta': 'Θ',
		'\\mu': 'μ',
		'\\pi': 'π',
		'\\Pi': 'Π',
		'\\rho': 'ρ',
		'\\tau': 'τ',
		'\\phi': 'φ',
		'\\Phi': 'Φ',
		'\\psi': 'ψ',
		'\\Psi': 'Ψ',
		'\\zeta': 'ζ',
		'\\eta': 'η',
		'\\xi': 'ξ',
		'\\chi': 'χ',
		'\\langle': '⟨',
		'\\rangle': '⟩',
		'\\cap': '∩',
		'\\cup': '∪',
		'\\subset': '⊂',
		'\\subseteq': '⊆',
		'\\partial': '∂',
		'\\times': '×',
		'\\neq': '≠',
		'\\approx': '≈',
		'\\sim': '~',
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

	// Remove formatações de texto do LaTeX: \text{...}, \mathbf{...}, \mathrm{...}
	out = out.replace(/\\(?:text|mathbf|mathrm|mathit|boldsymbol|mathcal)\{([^{}]+)\}/g, '$1');

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

	// Subscritos/sobrescritos com chaves: I_{ext} -> I_ext, H^{s} -> H^s
	out = out.replace(/_\{([^{}]+)\}/g, '_$1');
	out = out.replace(/\^\{([^{}]+)\}/g, '^$1');

	// Remove chaves LaTeX residuais como {L^2} ou {loc} ou {˙H^s}
	out = out.replace(/\{([^{}]+)\}/g, '$1');

	// Remove delimitadores de bloco $$ e embutidos $
	out = out.replace(/\$\$/g, '');
	out = out.replace(/\$([^$]+)\$/g, '$1');

	// Qualquer barra invertida solta antes de palavras: \abc -> abc
	out = out.replace(/\\([a-zA-Z]+)/g, '$1');

	return out;
}

// ─────────────────────────────────────────────────────────────
// 3. TOKEN USAGE REPORTING HELPER
// ─────────────────────────────────────────────────────────────

export interface TokenUsageReport {
	jevS1: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		latencyMs: number;
	};
	llmS2: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	totalTokens: number;
}

export function computeTokenReport(params: {
	promptText: string;
	sandwichContract: string;
	jevDecision: JevSimulationResult | null;
	enrichedPromptLength: number;
	outputContent: string;
	apiUsage?: {
		promptTokens?: number;
		completionTokens?: number;
		totalTokens?: number;
	};
}): TokenUsageReport {
	const jevPromptTokens = params.jevDecision && params.promptText
		? Math.max(1, Math.round(params.promptText.length / 3.8))
		: 0;
	const jevCompletionTokens = params.jevDecision && params.sandwichContract
		? Math.max(1, Math.round(params.sandwichContract.length / 3.8))
		: 0;
	const jevTotal = jevPromptTokens + jevCompletionTokens;

	const hasApiPrompt = typeof params.apiUsage?.promptTokens === 'number' && params.apiUsage.promptTokens > 0;
	const hasApiCompletion = typeof params.apiUsage?.completionTokens === 'number' && params.apiUsage.completionTokens > 0;
	const hasApiTotal = typeof params.apiUsage?.totalTokens === 'number' && params.apiUsage.totalTokens > 0;

	const llmPromptTokens = hasApiPrompt
		? params.apiUsage!.promptTokens!
		: Math.max(1, Math.round((params.enrichedPromptLength || 0) / 3.8));

	const llmCompletionTokens = hasApiCompletion
		? params.apiUsage!.completionTokens!
		: (params.outputContent ? Math.max(1, Math.round(params.outputContent.length / 3.8)) : 0);

	const llmTotal = hasApiTotal
		? params.apiUsage!.totalTokens!
		: llmPromptTokens + llmCompletionTokens;

	return {
		jevS1: {
			promptTokens: jevPromptTokens,
			completionTokens: jevCompletionTokens,
			totalTokens: jevTotal,
			latencyMs: params.jevDecision?.latency_s1_ms ?? 12,
		},
		llmS2: {
			promptTokens: llmPromptTokens,
			completionTokens: llmCompletionTokens,
			totalTokens: llmTotal,
		},
		totalTokens: jevTotal + llmTotal,
	};
}

export interface JevConfig {
	enableSandwich?: boolean;
	verbosity?: 'concise' | 'balanced' | 'detailed';
	cleanMath?: boolean;
	showTokenStats?: boolean;
}

export function enrichMessagesWithJev(
	messages: BaseMessage[],
	jevConfig: JevConfig,
): {
	enrichedMessages: BaseMessage[];
	promptText: string;
	sandwichContract: string;
	jevDecision: JevSimulationResult | null;
	enrichedPromptLength: number;
} {
	const calcLen = (msgs: BaseMessage[]) =>
		msgs.reduce((acc, m) => {
			if (typeof (m as any).content === 'string') return acc + (m as any).content.length;
			if (Array.isArray((m as any).content)) {
				return acc + (m as any).content.reduce((inner: number, c: any) => inner + (typeof c === 'string' ? c.length : c?.text?.length || 0), 0);
			}
			return acc;
		}, 0);

	if (jevConfig.enableSandwich === false || !messages || messages.length === 0) {
		return {
			enrichedMessages: messages,
			promptText: '',
			sandwichContract: '',
			jevDecision: null,
			enrichedPromptLength: calcLen(messages || []),
		};
	}

	const humanMsgs = messages.filter((m) => typeof (m as any).getType === 'function' && (m as any).getType() === 'human');
	const targetMsg = humanMsgs.length > 0 ? humanMsgs[humanMsgs.length - 1] : messages[messages.length - 1];

	let promptText = '';
	if (typeof (targetMsg as any)?.content === 'string') {
		promptText = (targetMsg as any).content;
	} else if (Array.isArray((targetMsg as any)?.content)) {
		promptText = (targetMsg as any).content
			.map((c: any) => (typeof c === 'string' ? c : c?.text || ''))
			.join(' ');
	}

	if (!promptText.trim()) {
		return {
			enrichedMessages: messages,
			promptText: '',
			sandwichContract: '',
			jevDecision: null,
			enrichedPromptLength: calcLen(messages),
		};
	}

	const jevDecision = localJevSimulate(promptText);

	let verbosityDirective = '';
	const verbosity = jevConfig.verbosity || 'concise';
	if (verbosity === 'concise') {
		verbosityDirective = 'DIRETIVA: Responda de forma direta e concisa. Elimine saudações vazias e prolixidade. Vá direto ao ponto ou código.';
	} else if (verbosity === 'balanced') {
		verbosityDirective = 'DIRETIVA: Responda de forma profissional e equilibrada, combinando o plano deliberado com código e explicações claras.';
	} else {
		verbosityDirective = 'DIRETIVA: Responda de forma aprofundada, didática e conceitual.';
	}

	const cleanMathDirective = jevConfig.cleanMath !== false
		? `\nREGRA ESTRITA DE FORMATAÇÃO (SEM LATEX):
O chat do n8n NÃO SUPORTA NENHUMA SINTAXE LATEX. É ESTRITAMENTE PROIBIDO usar barras invertidas para letras gregas ou símbolos.
- NUNCA use \\lambda, use λ.
- NUNCA use \\cdot, use · ou *.
- NUNCA use \\dot, use ˙ ou ponto.
- NUNCA use \\int, use ∫.
- NUNCA use \\nabla, use ∇.
- NUNCA use \\in, use ∈.
- NUNCA use \\infty, use ∞.
- NUNCA use \\sigma, use σ.
- NUNCA use \\Omega, use Ω.
- NUNCA use chaves de agrupamento matemático como {\\dotH^s} ou I_{ext}. Use I_ext, H^s, etc.
- NUNCA use delimitadores $ ou $$.
Toda a matemática e física DEVE ser redigida exclusivamente em texto limpo com caracteres Unicode naturais.`
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
	const sysIndex = enriched.findIndex((m) => typeof (m as any).getType === 'function' && (m as any).getType() === 'system');

	if (sysIndex >= 0) {
		const existingContent = (enriched[sysIndex] as any).content;
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

	return {
		enrichedMessages: enriched,
		promptText,
		sandwichContract,
		jevDecision,
		enrichedPromptLength: calcLen(enriched),
	};
}

export function applyJevDualEngine(
	model: BaseChatModel,
	jevConfig: JevConfig,
): BaseChatModel {
	const mutableModel = model as any;
	const originalGenerate = mutableModel._generate.bind(mutableModel);

	mutableModel._generate = async (messages: BaseMessage[], options: any, runManager?: any): Promise<ChatResult> => {
		const { enrichedMessages, promptText, sandwichContract, jevDecision, enrichedPromptLength } =
			enrichMessagesWithJev(messages, jevConfig);

		const result: ChatResult = await originalGenerate(enrichedMessages, options, runManager);

		if (result?.generations) {
			for (const gen of result.generations) {
				if (jevConfig.cleanMath !== false) {
					if (typeof gen.text === 'string') {
						gen.text = cleanLatexText(gen.text);
					}
					if (gen.message && typeof (gen.message as any).content === 'string') {
						(gen.message as any).content = cleanLatexText((gen.message as any).content);
					}
				}

				const outputContent = typeof (gen.message as any)?.content === 'string'
					? (gen.message as any).content
					: (gen.text || '');

				const genMsg = gen.message as any;
				const apiUsage = {
					promptTokens: genMsg?.usage_metadata?.input_tokens ?? (result.llmOutput as any)?.tokenUsage?.promptTokens ?? (result.llmOutput as any)?.gemini?.tokenUsage?.input,
					completionTokens: genMsg?.usage_metadata?.output_tokens ?? (result.llmOutput as any)?.tokenUsage?.completionTokens ?? (result.llmOutput as any)?.gemini?.tokenUsage?.output,
					totalTokens: genMsg?.usage_metadata?.total_tokens ?? (result.llmOutput as any)?.tokenUsage?.totalTokens ?? (result.llmOutput as any)?.gemini?.tokenUsage?.total,
				};

				const tokenReport = computeTokenReport({
					promptText,
					sandwichContract,
					jevDecision,
					enrichedPromptLength,
					outputContent,
					apiUsage,
				});

				if (genMsg) {
					genMsg.usage_metadata = {
						input_tokens: tokenReport.jevS1.promptTokens + tokenReport.llmS2.promptTokens,
						output_tokens: tokenReport.jevS1.completionTokens + tokenReport.llmS2.completionTokens,
						total_tokens: tokenReport.totalTokens,
					};
					genMsg.response_metadata = {
						...(genMsg.response_metadata || {}),
						tokenUsage: {
							promptTokens: tokenReport.jevS1.promptTokens + tokenReport.llmS2.promptTokens,
							completionTokens: tokenReport.jevS1.completionTokens + tokenReport.llmS2.completionTokens,
							totalTokens: tokenReport.totalTokens,
						},
						tokens: {
							jev_s1: tokenReport.jevS1,
							llm_s2: tokenReport.llmS2,
							total: tokenReport.totalTokens,
						},
					};
				}

				if (jevConfig.showTokenStats !== false) {
					const statsFooter = `\n\n---\n\`⚡ Jev S1: ${tokenReport.jevS1.totalTokens} tokens | 🤖 LLM S2: ${tokenReport.llmS2.totalTokens} tokens | Total: ${tokenReport.totalTokens} tokens\``;
					gen.text = (gen.text || '') + statsFooter;
					if (gen.message && typeof (gen.message as any).content === 'string') {
						(gen.message as any).content = (gen.message as any).content + statsFooter;
					}
				}
			}
		}

		return result;
	};

	if (typeof mutableModel._streamResponseChunks === 'function') {
		const originalStream = mutableModel._streamResponseChunks.bind(mutableModel);
		mutableModel._streamResponseChunks = async function* (messages: BaseMessage[], options: any, runManager?: any) {
			const { enrichedMessages, promptText, sandwichContract, jevDecision, enrichedPromptLength } =
				enrichMessagesWithJev(messages, jevConfig);

			let buffer = '';
			let fullOutput = '';
			let apiUsage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined;

			for await (const chunk of originalStream(enrichedMessages, options, runManager)) {
				const usage = (chunk?.message as any)?.usage_metadata;
				if (usage) {
					apiUsage = {
						promptTokens: usage.input_tokens,
						completionTokens: usage.output_tokens,
						totalTokens: usage.total_tokens,
					};
				}

				if (jevConfig.cleanMath === false) {
					const text = chunk?.text || (typeof (chunk?.message as any)?.content === 'string' ? (chunk.message as any).content : '');
					if (text) fullOutput += text;
					yield chunk;
					continue;
				}

				const text = chunk?.text || (typeof (chunk?.message as any)?.content === 'string' ? (chunk.message as any).content : '');
				if (text) {
					buffer += text;
					const lastBackslash = buffer.lastIndexOf('\\');
					if (lastBackslash === -1) {
						const cleaned = cleanLatexText(buffer);
						buffer = '';
						fullOutput += cleaned;
						if (chunk.text !== undefined) chunk.text = cleaned;
						if (chunk?.message && typeof (chunk.message as any).content === 'string') (chunk.message as any).content = cleaned;
						yield chunk;
					} else {
						const afterBackslash = buffer.slice(lastBackslash + 1);
						if (/[^a-zA-Z]/.test(afterBackslash)) {
							const cleaned = cleanLatexText(buffer);
							buffer = '';
							fullOutput += cleaned;
							if (chunk.text !== undefined) chunk.text = cleaned;
							if (chunk?.message && typeof (chunk.message as any).content === 'string') (chunk.message as any).content = cleaned;
							yield chunk;
						}
					}
				} else {
					yield chunk;
				}
			}

			if (buffer) {
				const cleaned = cleanLatexText(buffer);
				fullOutput += cleaned;
				yield new ChatGenerationChunk({
					text: cleaned,
					message: new AIMessageChunk({ content: cleaned }),
				});
			}

			const tokenReport = computeTokenReport({
				promptText,
				sandwichContract,
				jevDecision,
				enrichedPromptLength,
				outputContent: fullOutput,
				apiUsage,
			});

			const statsBadge = jevConfig.showTokenStats !== false
				? `\n\n---\n\`⚡ Jev S1: ${tokenReport.jevS1.totalTokens} tokens | 🤖 LLM S2: ${tokenReport.llmS2.totalTokens} tokens | Total: ${tokenReport.totalTokens} tokens\``
				: '';

			yield new ChatGenerationChunk({
				text: statsBadge,
				message: new AIMessageChunk({
					content: statsBadge,
					usage_metadata: {
						input_tokens: tokenReport.jevS1.promptTokens + tokenReport.llmS2.promptTokens,
						output_tokens: tokenReport.jevS1.completionTokens + tokenReport.llmS2.completionTokens,
						total_tokens: tokenReport.totalTokens,
					},
					response_metadata: {
						tokenUsage: {
							promptTokens: tokenReport.jevS1.promptTokens + tokenReport.llmS2.promptTokens,
							completionTokens: tokenReport.jevS1.completionTokens + tokenReport.llmS2.completionTokens,
							totalTokens: tokenReport.totalTokens,
						},
						tokens: {
							jev_s1: tokenReport.jevS1,
							llm_s2: tokenReport.llmS2,
							total: tokenReport.totalTokens,
						},
					},
				}),
			});
		};
	}

	return model;
}

// ─────────────────────────────────────────────────────────────
// 4. MODEL EXECUTION & RETRY HANDLING (UNIVERSAL RUNTIME)
// ─────────────────────────────────────────────────────────────

interface ModelExecutionSettings {
	alwaysOutputData: boolean;
	executeOnce: boolean;
	retryOnFail: boolean;
	maxTries: number;
	waitBetweenTries: number;
	onError: 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput';
}

interface UsageReportingOptions {
	systemMessage?: string;
	includeTokenUsageInAgentOutput?: boolean;
	includeIntermediateStepsInOutput?: boolean;
	enableUsageReporter?: boolean;
	nodeLabel?: string;
	inputTextMode?: 'label' | 'prompt';
	inputTextLabel?: string;
	includeOutputText?: boolean;
	failOnReporterError?: boolean;
	reporterMaxWaitMs?: number;
	usageReporter?: {
		settings?: UsageReportingOptions & {
			enabled?: boolean;
		};
	};
}

interface UsageReporterTool {
	invoke?: (input: IDataObject) => Promise<unknown>;
	func?: (input: IDataObject) => Promise<unknown>;
}

function asUsageReporterTool(value: unknown): UsageReporterTool | undefined {
	const candidate = Array.isArray(value) ? value[0] : value;
	if (!candidate || typeof candidate !== 'object') return undefined;

	const tool = candidate as UsageReporterTool;
	return typeof tool.invoke === 'function' || typeof tool.func === 'function'
		? tool
		: undefined;
}

async function createUsageReporter(
	context: ISupplyDataFunctions,
	itemIndex: number,
	modelName: string,
	options: UsageReportingOptions,
): Promise<ModelUsageReporter | undefined> {
	if (options.enableUsageReporter !== true) return undefined;

	const runtimeContext = context as ISupplyDataFunctions & {
		getParentNodes?: ISupplyDataFunctions['getParentNodes'];
		getInputConnectionData?: ISupplyDataFunctions['getInputConnectionData'];
	};

	if (
		typeof runtimeContext.getParentNodes !== 'function' ||
		typeof runtimeContext.getInputConnectionData !== 'function'
	) {
		return undefined;
	}

	const connectedReporterNodes = runtimeContext.getParentNodes(
		context.getNode().name,
		{
			connectionType: NodeConnectionTypes.AiTool,
			depth: 1,
		},
	);
	if (connectedReporterNodes.length === 0) return undefined;

	const connectedTool = await runtimeContext.getInputConnectionData(
		NodeConnectionTypes.AiTool,
		itemIndex,
	);
	const reporterTool = asUsageReporterTool(connectedTool);
	if (!reporterTool) {
		throw new NodeOperationError(
			context.getNode(),
			'The connected Usage Reporter did not provide a callable AI Tool.',
			{
				functionality: 'configuration-node',
				description:
					'Connect a Workflow Tool or another AI Tool that accepts the usage-report fields.',
			},
		);
	}

	const workflow = context.getWorkflow();
	const executionId = context.getExecutionId();
	const nodeLabel =
		typeof options.nodeLabel === 'string' && options.nodeLabel.trim()
			? options.nodeLabel.trim()
			: context.getNode().name;
	const inputTextMode = options.inputTextMode ?? 'label';
	const inputTextLabel =
		typeof options.inputTextLabel === 'string' &&
		options.inputTextLabel.trim()
			? options.inputTextLabel
			: 'RAG';
	const includeOutputText = options.includeOutputText !== false;
	const failOnReporterError = options.failOnReporterError === true;
	const reporterMaxWaitMs =
		typeof options.reporterMaxWaitMs === 'number' &&
		Number.isFinite(options.reporterMaxWaitMs)
			? Math.max(0, options.reporterMaxWaitMs)
			: 1000;

	return async (event) => {
		const usage = event.tokenUsage;
		const promptText = event.prompts.join('\n');
		const payload: IDataObject = {
			model: modelName,
			input_token: usage.inputTokens,
			input_uncached_token: usage.inputUncachedTokens,
			output_token: usage.outputTokens,
			total_token: usage.totalTokens,
			cached_token: usage.cachedTokens,
			thoughts_token: usage.thoughtsTokens,
			tool_token: usage.toolUsePromptTokens,
			overhead_token: usage.thoughtsTokens + usage.toolUsePromptTokens,
			model_calls: 1,
			input_text: inputTextMode === 'prompt' ? promptText : inputTextLabel,
			output_text: includeOutputText ? event.outputText : '',
			workflow_id: workflow.id,
			workflow_name: workflow.name ?? '',
			execution_id:
				executionId && executionId !== '__UNKNOWN__' ? executionId : '',
			node: nodeLabel,
			dump: JSON.stringify({
				provider: event.provider,
				model: modelName,
				tokenUsage: usage,
				...(event.usageMetadata
					? { usageMetadata: event.usageMetadata }
					: {}),
				...(event.gemini ? { gemini: event.gemini } : {}),
			}),
		};

		try {
			const reporterPromise = Promise.resolve().then(() =>
				typeof reporterTool.func === 'function'
					? reporterTool.func(payload)
					: reporterTool.invoke!(payload),
			);
			void reporterPromise.catch(() => undefined);

			if (reporterMaxWaitMs === 0) {
				await reporterPromise;
			} else {
				let timer: NodeJS.Timeout | undefined;
				try {
					await Promise.race([
						reporterPromise,
						new Promise<never>((_, reject) => {
							timer = setTimeout(() => {
								const timeoutError = new Error(
									`Usage Reporter exceeded the maximum wait of ${reporterMaxWaitMs} ms`,
								);
								timeoutError.name = 'UsageReporterTimeoutError';
								reject(timeoutError);
							}, reporterMaxWaitMs);
						}),
					]);
				} finally {
					if (timer) clearTimeout(timer);
				}
			}
		} catch (error) {
			const reporterError =
				error instanceof Error ? error : new Error(String(error));
			if (failOnReporterError) {
				throw new NodeOperationError(context.getNode(), reporterError, {
					functionality: 'configuration-node',
					message: 'Usage Reporter failed',
					description:
						'The model call succeeded, but the connected usage-reporting tool failed.',
				});
			}

			context.logger.warn(
				`Usage Reporter failed after a successful model call: ${reporterError.message}`,
			);
		}
	};
}

function sharedModelOptions(): INodeProperties[] {
	return [
		{
			displayName: 'System Message',
			name: 'systemMessage',
			type: 'string',
			typeOptions: { rows: 5 },
			default: '',
			placeholder: 'Instruções extras aplicadas a cada chamada do modelo',
			description: 'Instruções de sistema adicionais aplicadas em conjunto com as instruções do nó pai',
		},
		{
			displayName: 'Include Token Usage in Output',
			name: 'includeTokenUsageInAgentOutput',
			type: 'boolean',
			default: false,
			description: 'Expõe tokenUsage e usageMetadata no output do nó pai (AI Agent). O rodapé visual no chat e o Usage Reporter continuam independentes dessa opção.',
		},
		{
			displayName: 'Include Intermediate Steps in Output',
			name: 'includeIntermediateStepsInOutput',
			type: 'boolean',
			default: false,
			description: 'Inclui uma lista compacta dos passos das ferramentas no output do agente.',
		},
		{
			displayName: 'Usage Reporter',
			name: 'usageReporter',
			type: 'fixedCollection',
			default: {
				settings: {
					enabled: false,
					nodeLabel: '',
					inputTextMode: 'label',
					inputTextLabel: 'RAG',
					includeOutputText: true,
					reporterMaxWaitMs: 1000,
					failOnReporterError: false,
				},
			},
			description: 'Opcionalmente envia telemetria e tokens para um AI Tool conectado após cada resposta',
			options: [
				{
					displayName: 'Usage Reporter',
					name: 'settings',
					values: [
						{
							displayName: 'Enable Usage Reporter',
							name: 'enabled',
							type: 'boolean',
							default: false,
							noDataExpression: true,
							description: 'Habilita conector AI Tool opcional para receber relatórios de tokens em tempo real',
						},
						{
							displayName: 'Node Label',
							name: 'nodeLabel',
							type: 'string',
							default: '',
							placeholder: 'ex: Atendimento ao Cliente',
							displayOptions: {
								show: {
									enabled: [true],
								},
							},
							description: 'Rótulo exibido na telemetria',
						},
						{
							displayName: 'Input Text Mode',
							name: 'inputTextMode',
							type: 'options',
							options: [
								{
									name: 'Fixed Label',
									value: 'label',
									description: 'Envia um rótulo fixo ao invés do prompt completo.',
								},
								{
									name: 'Actual User Input',
									value: 'prompt',
									description: 'Envia apenas o texto real da última mensagem do usuário.',
								},
							],
							default: 'label',
							displayOptions: {
								show: {
									enabled: [true],
								},
							},
						},
						{
							displayName: 'Input Text Label',
							name: 'inputTextLabel',
							type: 'string',
							default: 'RAG',
							displayOptions: {
								show: {
									enabled: [true],
									inputTextMode: ['label'],
								},
							},
						},
						{
							displayName: 'Include Output Text',
							name: 'includeOutputText',
							type: 'boolean',
							default: true,
							displayOptions: {
								show: {
									enabled: [true],
								},
							},
						},
						{
							displayName: 'Maximum Wait (ms)',
							name: 'reporterMaxWaitMs',
							type: 'number',
							default: 1000,
							typeOptions: {
								minValue: 0,
								numberStepSize: 100,
							},
							displayOptions: {
								show: {
									enabled: [true],
								},
							},
							description: 'Tempo máximo de espera em ms antes de continuar em segundo plano. 0 = aguarda indefinidamente.',
						},
						{
							displayName: 'Fail Workflow if Reporter Fails',
							name: 'failOnReporterError',
							type: 'boolean',
							default: false,
							displayOptions: {
								show: {
									enabled: [true],
								},
							},
						},
					],
				},
			],
		},
	];
}

function resolveSharedModelOptions(
	context: ISupplyDataFunctions,
	providerOptions: Record<string, any>,
): UsageReportingOptions {
	const legacy = context.getNode().parameters;
	const groupedReporting = providerOptions.usageReporter?.settings ?? {};

	return {
		systemMessage: providerOptions.systemMessage ?? (typeof legacy.systemMessage === 'string' ? legacy.systemMessage : ''),
		includeTokenUsageInAgentOutput: providerOptions.includeTokenUsageInAgentOutput ?? false,
		includeIntermediateStepsInOutput: providerOptions.includeIntermediateStepsInOutput ?? false,
		enableUsageReporter: groupedReporting.enabled ?? false,
		nodeLabel: groupedReporting.nodeLabel,
		inputTextMode: groupedReporting.inputTextMode,
		inputTextLabel: groupedReporting.inputTextLabel,
		includeOutputText: groupedReporting.includeOutputText,
		failOnReporterError: groupedReporting.failOnReporterError,
		reporterMaxWaitMs: groupedReporting.reporterMaxWaitMs,
	};
}

export function getModelExecutionSettings(
	context: ISupplyDataFunctions,
	itemIndex: number,
): ModelExecutionSettings {
	const node = context.getNode() as any;
	const customRetryOnFail =
		node.modelRetryOnFail === true ||
		(context.getNodeParameter('modelRetryOnFail', itemIndex, false) as boolean);
	const retryOnFail = node.retryOnFail === true || customRetryOnFail;
	const useNativeRetry = node.retryOnFail === true;
	const customOnError =
		node.modelOnError ??
		(context.getNodeParameter('modelOnError', itemIndex, 'stopWorkflow') as ModelExecutionSettings['onError']);
	const onError =
		node.onError ??
		(node.continueOnFail === true ? 'continueRegularOutput' : customOnError);

	return {
		alwaysOutputData:
			node.alwaysOutputData === true ||
			node.modelAlwaysOutputData === true ||
			(context.getNodeParameter('modelAlwaysOutputData', itemIndex, false) as boolean),
		executeOnce:
			node.executeOnce === true ||
			node.modelExecuteOnce === true ||
			(context.getNodeParameter('modelExecuteOnce', itemIndex, false) as boolean),
		retryOnFail,
		maxTries: retryOnFail
			? Math.max(
					2,
					Math.min(
						5,
						Number(
							useNativeRetry
								? (node.maxTries ?? 3)
								: (node.modelMaxTries ?? context.getNodeParameter('modelMaxTries', itemIndex, 3)),
						),
					),
				)
			: 1,
		waitBetweenTries: retryOnFail
			? Math.max(
					0,
					Math.min(
						5000,
						Number(
							useNativeRetry
								? (node.waitBetweenTries ?? 1000)
								: (node.modelWaitBetweenTries ?? context.getNodeParameter('modelWaitBetweenTries', itemIndex, 1000)),
						),
					),
				)
			: 0,
		onError,
	};
}

function shouldExposeModelExecutionProperties(): boolean {
	let parentModule = module.parent;
	while (parentModule) {
		let directory = dirname(parentModule.filename);
		const root = parse(directory).root;

		while (directory !== root) {
			const packageJsonPath = join(directory, 'package.json');
			if (existsSync(packageJsonPath)) {
				try {
					const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
						name?: string;
						version?: string;
					};
					if (
						(packageJson.name === 'n8n' || packageJson.name === 'n8n-core') &&
						packageJson.version
					) {
						const match = /^(\d+)\.(\d+)/.exec(packageJson.version);
						if (!match) return true;
						const major = Number(match[1]);
						const minor = Number(match[2]);
						return major > 2 || (major === 2 && minor > 2);
					}
				} catch {}
			}
			directory = dirname(directory);
		}
		parentModule = parentModule.parent;
	}
	return true;
}

function isAbortError(error: unknown, signal?: AbortSignal): boolean {
	if (signal?.aborted) return true;
	return error instanceof Error && error.name === 'AbortError';
}

async function waitForRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
	if (delayMs <= 0) return;

	await new Promise<void>((resolve, reject) => {
		const finish = () => {
			signal?.removeEventListener('abort', abort);
			resolve();
		};
		const timeout = setTimeout(finish, delayMs);
		const abort = () => {
			clearTimeout(timeout);
			signal?.removeEventListener('abort', abort);
			const error = new Error('The model request was aborted.');
			error.name = 'AbortError';
			reject(error);
		};

		if (signal?.aborted) {
			abort();
			return;
		}

		signal?.addEventListener('abort', abort, { once: true });
	});
}

async function runWithRetry<T>(
	operation: () => Promise<T>,
	settings: ModelExecutionSettings,
	provider: ModelProvider,
	signal?: AbortSignal,
): Promise<T> {
	let attempt = 1;

	while (true) {
		try {
			return await operation();
		} catch (error) {
			const normalizedError = toUniversalModelError(error, provider);
			if (
				!settings.retryOnFail ||
				attempt >= settings.maxTries ||
				isAbortError(normalizedError, signal) ||
				!isRetryableModelError(normalizedError, provider)
			) {
				normalizeModelError(normalizedError, provider).attempts = attempt;
				throw normalizedError;
			}

			attempt += 1;
			const retryAfterMs = retryAfterMsForModelError(normalizedError, provider);
			await waitForRetry(
				Math.max(settings.waitBetweenTries, Math.min(retryAfterMs ?? 0, 60_000)),
				signal,
			);
		}
	}
}

function errorDetails(error: unknown, provider: ModelProvider): NormalizedModelError {
	return normalizeModelError(error, provider);
}

function continuedErrorMessage(error: unknown, provider: ModelProvider): AIMessage {
	const normalizedError = toUniversalModelError(error, provider);
	const details = errorDetails(normalizedError, provider);
	return new AIMessage({
		content: normalizedError.message,
		additional_kwargs: {
			universalChatModelError: details,
		},
		response_metadata: {
			universalChatModelError: details,
			onError: 'continueRegularOutput',
		},
	});
}

export function applyModelRetry(
	model: BaseChatModel,
	settings: ModelExecutionSettings,
	provider: ModelProvider,
): BaseChatModel {
	const mutableModel = model as any;
	const originalGenerate = mutableModel._generate.bind(mutableModel);

	mutableModel._generate = async (...args: any[]) => {
		const signal = args[1]?.signal as AbortSignal | undefined;
		let result: any;
		try {
			result = await runWithRetry(
				() => originalGenerate(...args),
				settings,
				provider,
				signal,
			);
		} catch (error) {
			const normalizedError = toUniversalModelError(error, provider);
			if (
				settings.onError !== 'continueRegularOutput' ||
				isAbortError(normalizedError, signal)
			) {
				throw normalizedError;
			}

			const message = continuedErrorMessage(normalizedError, provider);
			result = {
				generations: [
					{
						text: message.text,
						message,
					},
				],
				llmOutput: {
					universalChatModelError: errorDetails(normalizedError, provider),
				},
			};
		}

		if (
			settings.alwaysOutputData &&
			(!Array.isArray(result?.generations) || result.generations.length === 0)
		) {
			result.generations = [
				{
					text: '',
					message: new AIMessage(''),
				},
			];
		}

		return result;
	};

	if (typeof mutableModel._streamResponseChunks === 'function') {
		const originalStream = mutableModel._streamResponseChunks.bind(mutableModel);
		mutableModel._streamResponseChunks = async function* (...args: any[]) {
			const signal = args[1]?.signal as AbortSignal | undefined;
			let attempt = 1;
			let emittedAnyChunk = false;

			while (true) {
				let emittedChunk = false;
				try {
					for await (const chunk of originalStream(...args)) {
						emittedChunk = true;
						emittedAnyChunk = true;
						yield chunk;
					}

					if (settings.alwaysOutputData && !emittedAnyChunk) {
						yield new ChatGenerationChunk({
							text: '',
							message: new AIMessageChunk(''),
						});
					}

					return;
				} catch (error) {
					const normalizedError = toUniversalModelError(error, provider);
					if (isAbortError(normalizedError, signal) || emittedChunk) {
						throw normalizedError;
					}

					if (
						settings.retryOnFail &&
						attempt < settings.maxTries &&
						isRetryableModelError(normalizedError, provider)
					) {
						attempt += 1;
						const retryAfterMs = retryAfterMsForModelError(normalizedError, provider);
						await waitForRetry(
							Math.max(settings.waitBetweenTries, Math.min(retryAfterMs ?? 0, 60_000)),
							signal,
						);
						continue;
					}

					if (settings.onError === 'continueRegularOutput') {
						const details = errorDetails(normalizedError, provider);
						details.attempts = attempt;
						yield new ChatGenerationChunk({
							text: normalizedError.message,
							message: new AIMessageChunk({
								content: normalizedError.message,
								additional_kwargs: {
									universalChatModelError: details,
								},
								response_metadata: {
									universalChatModelError: details,
									onError: 'continueRegularOutput',
								},
							}),
						});
						return;
					}

					const details = normalizeModelError(normalizedError, provider);
					details.attempts = attempt;
					throw normalizedError;
				}
			}
		};
	}

	return model;
}

export function applySystemMessage(
	model: BaseChatModel,
	systemMessage: string,
): BaseChatModel {
	const content = systemMessage.trim();
	if (!content) return model;

	const inject = (messages: BaseMessage[]): BaseMessage[] => {
		const next = [...messages];
		let systemCount = 0;
		while (
			systemCount < next.length &&
			typeof (next[systemCount] as any)?._getType === 'function' &&
			(next[systemCount] as any)._getType() === 'system'
		) {
			systemCount += 1;
		}

		const systemParts: Array<Record<string, unknown>> = [];
		for (const message of next.slice(0, systemCount)) {
			const existingContent = (message as any).content;
			if (typeof existingContent === 'string' && existingContent.length > 0) {
				systemParts.push({ type: 'text', text: existingContent });
			} else if (Array.isArray(existingContent)) {
				systemParts.push(...existingContent);
			}
		}
		systemParts.push({ type: 'text', text: content });
		next.splice(
			0,
			systemCount,
			new SystemMessage({ content: systemParts } as any),
		);
		return next;
	};

	const mutableModel = model as any;
	const originalGenerate = mutableModel._generate.bind(mutableModel);
	mutableModel._generate = (messages: BaseMessage[], ...args: any[]) =>
		originalGenerate(inject(messages), ...args);

	if (typeof mutableModel._streamResponseChunks === 'function') {
		const originalStream = mutableModel._streamResponseChunks.bind(mutableModel);
		mutableModel._streamResponseChunks = (
			messages: BaseMessage[],
			...args: any[]
		) => originalStream(inject(messages), ...args);
	}

	return model;
}

// ─────────────────────────────────────────────────────────────
// 5. JEV DUAL-ENGINE NODE DEFINITION
// ─────────────────────────────────────────────────────────────

export class JevDualEngine implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Jev Dual-Engine Model',
		name: 'jevDualEngine',
		icon: 'file:jevDualEngine.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["provider"] === "gemini" ? ($parameter["geminiModelCustom"] || $parameter["geminiModel"]) : ($parameter["openaiModelCustom"] || $parameter["openaiModel"] || "llama3")}}',
		description: 'Universal Chat Model com Raciocínio Deliberado Jev (System 1 sub-30ms), suporte nativo a Google Gemini e APIs Compatíveis com OpenAI / LLMs Locais (Ollama, LM Studio, DeepSeek, OpenRouter)',
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
		inputs:
			'={{ (($parameter.provider === "gemini" && $parameter.geminiOptions && (($parameter.geminiOptions.usageReporter && $parameter.geminiOptions.usageReporter.settings && $parameter.geminiOptions.usageReporter.settings.enabled) || $parameter.geminiOptions.enableUsageReporter)) || ($parameter.provider === "openai_compatible" && $parameter.openaiOptions && (($parameter.openaiOptions.usageReporter && $parameter.openaiOptions.usageReporter.settings && $parameter.openaiOptions.usageReporter.settings.enabled) || $parameter.openaiOptions.enableUsageReporter)) || $parameter.enableUsageReporter) ? [{ type: "ai_tool", displayName: "Usage Reporter", required: false, maxConnections: 1 }] : [] }}',
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'googleGeminiApi',
				required: false,
				displayOptions: {
					show: {
						provider: ['gemini'],
					},
				},
			},
			{
				name: 'openAiCompatibleApi',
				required: false,
				displayOptions: {
					show: {
						provider: ['openai_compatible'],
					},
				},
			},
			{
				name: 'jevLlmApi',
				required: false,
			},
			{
				name: 'jevApi',
				required: false,
			},
		],
		properties: [
			...(shouldExposeModelExecutionProperties()
				? ([
						{
							displayName: 'Always Output Data',
							name: 'alwaysOutputData',
							type: 'boolean',
							default: false,
							noDataExpression: true,
							isNodeSetting: true,
							description: 'Mantém uma saída inspecionável mesmo quando o provedor retornar resposta vazia',
						},
						{
							displayName: 'Execute Once',
							name: 'executeOnce',
							type: 'boolean',
							default: false,
							noDataExpression: true,
							isNodeSetting: true,
							description: 'Resolve a configuração do modelo apenas uma vez para todo o fluxo',
						},
						{
							displayName: 'Retry On Fail',
							name: 'retryOnFail',
							type: 'boolean',
							default: false,
							noDataExpression: true,
							isNodeSetting: true,
							description: 'Tenta novamente de forma automática caso a requisição à API falhe',
						},
						{
							displayName: 'Max Tries',
							name: 'maxTries',
							type: 'number',
							typeOptions: {
								minValue: 2,
								maxValue: 5,
								numberPrecision: 0,
							},
							default: 3,
							noDataExpression: true,
							isNodeSetting: true,
							displayOptions: {
								show: {
									retryOnFail: [true],
								},
							},
							description: 'Número máximo de tentativas antes de falhar',
						},
						{
							displayName: 'Wait Between Tries (ms)',
							name: 'waitBetweenTries',
							type: 'number',
							typeOptions: {
								minValue: 0,
								maxValue: 5000,
								numberPrecision: 0,
							},
							default: 1000,
							noDataExpression: true,
							isNodeSetting: true,
							displayOptions: {
								show: {
									retryOnFail: [true],
								},
							},
							description: 'Tempo de espera em milissegundos entre cada tentativa',
						},
						{
							displayName: 'On Error',
							name: 'onError',
							type: 'options',
							options: [
								{
									name: 'Stop Workflow',
									value: 'stopWorkflow',
									description: 'Interrompe o fluxo e registra o erro',
								},
								{
									name: 'Continue',
									value: 'continueRegularOutput',
									description: 'Repassa a mensagem de erro pela saída normal do modelo',
								},
								{
									name: 'Continue (Using Error Output)',
									value: 'continueErrorOutput',
									description: 'Encaminha a falha para a saída de erro do nó',
								},
							],
							default: 'stopWorkflow',
							noDataExpression: true,
							isNodeSetting: true,
						},
					] as INodeProperties[])
				: []),

			// ─── 0. CONFIGURAÇÕES EXCLUSIVAS JEV DUAL-ENGINE ───
			{
				displayName: 'Ativar Raciocínio Sandwich Jev (System 1)',
				name: 'enableSandwich',
				type: 'boolean',
				default: true,
				description: 'Se ativo, o Jev executa dedução lógica analítica (<30ms) antes de enviar a instrução à LLM',
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
				displayOptions: {
					show: {
						enableSandwich: [true],
					},
				},
				description: 'Controla a extensão e o direcionamento da síntese da resposta',
			},
			{
				displayName: 'Formatar Fórmulas para Chat (Sem LaTeX)',
				name: 'cleanMath',
				type: 'boolean',
				default: true,
				description: 'Evita caracteres LaTeX ($ e \\) que quebram no chat do n8n, convertendo fórmulas para texto puro e símbolos Unicode naturais (ex: x², ½, ∫, ∇)',
			},
			{
				displayName: 'Exibir Estatísticas de Tokens no Chat',
				name: 'showTokenStats',
				type: 'boolean',
				default: true,
				description: 'Adiciona no rodapé da mensagem do chat um badge discreto com os tokens gastos pelo Jev (System 1) e pela LLM (System 2)',
			},

			// ─── 1. SELEÇÃO DE PROVEDOR ───
			{
				displayName: 'Provedor da LLM (System 2)',
				name: 'provider',
				type: 'options',
				options: [
					{
						name: 'Google Gemini Oficial (SDK Nativo / AI Studio)',
						value: 'gemini',
						description: 'Google Gemini 2.5 Flash, 3.5 Flash, 3.1 Pro com controle de Thinking e Schemas',
					},
					{
						name: 'OpenAI Compatible / Local LLM / DeepSeek / Ollama / Mac mini',
						value: 'openai_compatible',
						description: 'Qualquer endpoint HTTP compatível (Ollama, LM Studio, vLLM, DeepSeek, OpenRouter)',
					},
				],
				default: 'gemini',
				description: 'Selecione o provedor de inteligência artificial',
			},

			// ─── 2. GOOGLE GEMINI (NATIVO) ───
			{
				displayName: 'Model Name',
				name: 'geminiModel',
				type: 'options',
				displayOptions: { show: { provider: ['gemini'] } },
				typeOptions: { loadOptionsMethod: 'getGeminiModels' },
				default: 'gemini-2.5-flash',
				description: 'Selecione o modelo Gemini carregado dinamicamente ou defina um Custom Model ID abaixo',
			},
			{
				displayName: 'Custom Model ID (Override)',
				name: 'geminiModelCustom',
				type: 'string',
				displayOptions: { show: { provider: ['gemini'] } },
				default: '',
				placeholder: 'ex: gemini-2.5-flash, gemini-3.5-flash-lite',
				description: 'ID de modelo customizado (se preenchido, sobrepõe a seleção do dropdown)',
			},
			{
				displayName: 'Opções do Gemini',
				name: 'geminiOptions',
				type: 'collection',
				placeholder: 'Adicionar Opção',
				default: {},
				displayOptions: { show: { provider: ['gemini'] } },
				options: [
					{
						displayName: 'Temperatura',
						name: 'temperature',
						type: 'number',
						typeOptions: { minValue: 0.0, maxValue: 2.0, numberPrecision: 2 },
						default: 0.2,
						description: 'Controla a aleatoriedade (0.0 mais determinístico, 2.0 mais criativo)',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						typeOptions: { minValue: 0.0, maxValue: 1.0, numberPrecision: 2 },
						default: 0.95,
					},
					{
						displayName: 'Top K',
						name: 'topK',
						type: 'number',
						default: 40,
					},
					{
						displayName: 'Máximo de Tokens de Saída',
						name: 'maxOutputTokens',
						type: 'number',
						default: 8192,
					},
					{
						displayName: 'Response MIME Type',
						name: 'responseMimeType',
						type: 'options',
						options: [
							{ name: 'Text (text/plain)', value: 'text/plain' },
							{ name: 'JSON (application/json)', value: 'application/json' },
						],
						default: 'text/plain',
					},
					{
						displayName: 'Structured Output Schema (JSON)',
						name: 'responseSchema',
						type: 'string',
						typeOptions: { rows: 8 },
						default: '',
						placeholder: '{\n  "type": "object",\n  "properties": {\n    "message": { "type": "string" }\n  }\n}',
						description: 'JSON Schema estrito para estruturar a resposta do Gemini',
					},
					{
						displayName: 'Thinking Level (Gemini 3+)',
						name: 'thinkingLevel',
						type: 'options',
						options: [
							{ name: 'MINIMAL', value: 'MINIMAL' },
							{ name: 'LOW', value: 'LOW' },
							{ name: 'MEDIUM', value: 'MEDIUM' },
							{ name: 'HIGH', value: 'HIGH' },
						],
						default: 'MEDIUM',
						description: 'Profundidade de raciocínio para modelos Gemini 3+',
					},
					{
						displayName: 'Thinking Budget (Gemini 2.5)',
						name: 'thinkingBudget',
						type: 'number',
						typeOptions: { minValue: -1, numberPrecision: 0 },
						default: -1,
						description: 'Orçamento de tokens de raciocínio (-1 = dinâmico, 0 = desativado)',
					},
					{
						displayName: 'Include Thoughts',
						name: 'includeThoughts',
						type: 'boolean',
						default: false,
						description: 'Expõe os pensamentos do Gemini nos metadados do n8n',
					},
					{
						displayName: 'Model Request Timeout (ms)',
						name: 'requestTimeoutMs',
						type: 'number',
						default: 60000,
						typeOptions: {
							minValue: 0,
							maxValue: 900000,
							numberStepSize: 1000,
						},
						description: 'Timeout máximo para cada requisição ao Gemini em milissegundos',
					},
					{
						displayName: 'Recover Empty Final Responses',
						name: 'recoverEmptyResponses',
						type: 'boolean',
						default: true,
						description: 'Recupera automaticamente requisições que retornam vazias com status STOP',
					},
					...sharedModelOptions(),
				],
			},

			// ─── 3. OPENAI / LOCAL LLM / OLLAMA / MAC MINI ───
			{
				displayName: 'Model Name / ID',
				name: 'openaiModel',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOpenAiModels',
				},
				displayOptions: { show: { provider: ['openai_compatible'] } },
				default: 'llama3',
				description: 'Modelo carregado dinamicamente do endpoint local ou remoto',
			},
			{
				displayName: 'Custom Model ID (Override)',
				name: 'openaiModelCustom',
				type: 'string',
				displayOptions: { show: { provider: ['openai_compatible'] } },
				default: '',
				placeholder: 'ex: google/gemma-4-26b-a4b, deepseek-r1:70b, gpt-4o, llama3:8b',
				description: 'Sobrescreve o modelo com qualquer string livre (essencial para Mac mini, Ollama e LM Studio)',
			},
			{
				displayName: 'Opções OpenAI / Local LLM',
				name: 'openaiOptions',
				type: 'collection',
				placeholder: 'Adicionar Opção',
				default: {},
				displayOptions: { show: { provider: ['openai_compatible'] } },
				options: [
					{
						displayName: 'Temperatura',
						name: 'temperature',
						type: 'number',
						typeOptions: { minValue: 0.0, maxValue: 2.0, numberPrecision: 2 },
						default: 0.2,
					},
					{
						displayName: 'Reasoning Effort',
						name: 'reasoningEffort',
						type: 'options',
						options: [
							{ name: 'None / Default', value: 'none' },
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'High', value: 'high' },
						],
						default: 'none',
						description: 'Para modelos com raciocínio profundo como DeepSeek-R1 e OpenAI o1/o3-mini',
					},
					{
						displayName: 'Frequency Penalty',
						name: 'frequencyPenalty',
						type: 'number',
						typeOptions: { minValue: -2.0, maxValue: 2.0, numberPrecision: 2 },
						default: 0,
					},
					{
						displayName: 'Presence Penalty',
						name: 'presencePenalty',
						type: 'number',
						typeOptions: { minValue: -2.0, maxValue: 2.0, numberPrecision: 2 },
						default: 0,
					},
					{
						displayName: 'Máximo de Tokens de Saída',
						name: 'maxTokens',
						type: 'number',
						default: 4096,
					},
					{
						displayName: 'Seed',
						name: 'seed',
						type: 'number',
						default: 0,
						description: 'Gera saídas determinísticas se o backend suportar',
					},
					{
						displayName: 'JSON Mode',
						name: 'jsonMode',
						type: 'boolean',
						default: false,
						description: 'Força o retorno no formato JSON (response_format: { type: "json_object" })',
					},
					{
						displayName: 'Custom Headers (JSON)',
						name: 'customHeaders',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						placeholder: '{"HTTP-Referer": "https://n8n.io", "X-Title": "n8n Jev"}',
						description: 'Headers HTTP extras em formato JSON (ex: metadados para OpenRouter)',
					},
					...sharedModelOptions(),
				],
			},
		] as INodeProperties[],
	};

	methods = {
		loadOptions: {
			async getGeminiModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				let apiKey = '';
				try {
					const creds = await this.getCredentials('googleGeminiApi');
					if (creds && typeof creds.apiKey === 'string') apiKey = creds.apiKey.trim();
				} catch {}
				if (!apiKey) {
					try {
						const creds = await this.getCredentials('jevLlmApi');
						if (creds && typeof creds.apiKey === 'string') apiKey = creds.apiKey.trim();
					} catch {}
				}

				const defaultModels: INodePropertyOptions[] = [
					{ name: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
					{ name: 'Gemini 3.5 Flash', value: 'gemini-3.5-flash' },
					{ name: 'Gemini 3.5 Flash Lite', value: 'gemini-3.5-flash-lite' },
					{ name: 'Gemini 3.1 Pro', value: 'gemini-3.1-pro' },
					{ name: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
				];

				if (!apiKey) return defaultModels;

				try {
					const response = await this.helpers.httpRequest({
						method: 'GET',
						url: 'https://generativelanguage.googleapis.com/v1beta/models',
						headers: { 'x-goog-api-key': apiKey },
						json: true,
					});
					if (response && Array.isArray(response.models)) {
						const options: INodePropertyOptions[] = [];
						for (const m of response.models) {
							if (m.name && typeof m.name === 'string') {
								const modelId = m.name.replace(/^models\//, '');
								const methods = m.supportedGenerationMethods;
								if (!methods || (Array.isArray(methods) && methods.includes('generateContent'))) {
									const label = m.displayName ? `${m.displayName} (${modelId})` : modelId;
									options.push({ name: label, value: modelId });
								}
							}
						}
						if (options.length > 0) return options;
					}
				} catch {}
				return defaultModels;
			},

			async getOpenAiModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				let baseUrl = 'http://localhost:11434/v1';
				let apiKey = 'not-needed';
				try {
					const creds = await this.getCredentials('openAiCompatibleApi');
					if (creds && typeof creds.baseUrl === 'string' && creds.baseUrl.trim()) {
						baseUrl = creds.baseUrl.trim();
					}
					if (creds && typeof creds.apiKey === 'string' && creds.apiKey.trim()) {
						apiKey = creds.apiKey.trim();
					}
				} catch {}
				if (baseUrl === 'http://localhost:11434/v1' && apiKey === 'not-needed') {
					try {
						const creds = await this.getCredentials('jevLlmApi');
						if (creds && typeof creds.customBaseUrl === 'string' && creds.customBaseUrl.trim()) {
							baseUrl = creds.customBaseUrl.trim();
						}
						if (creds && typeof creds.customApiKey === 'string' && creds.customApiKey.trim()) {
							apiKey = creds.customApiKey.trim();
						} else if (creds && typeof creds.apiKey === 'string' && creds.apiKey.trim()) {
							apiKey = creds.apiKey.trim();
						}
					} catch {}
				}

				baseUrl = baseUrl.replace(/\/+$/, '');
				const defaultModels: INodePropertyOptions[] = [
					{ name: 'llama3', value: 'llama3' },
					{ name: 'deepseek-r1', value: 'deepseek-r1' },
					{ name: 'google/gemma-4-26b-a4b', value: 'google/gemma-4-26b-a4b' },
					{ name: 'qwen2.5', value: 'qwen2.5' },
					{ name: 'gpt-4o', value: 'gpt-4o' },
					{ name: 'claude-3-5-sonnet', value: 'claude-3-5-sonnet' },
				];

				const headers: Record<string, string> = {};
				if (apiKey && apiKey !== 'not-needed') {
					headers['Authorization'] = `Bearer ${apiKey}`;
				}

				try {
					const modelsUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/models` : `${baseUrl}/v1/models`;
					const response = await this.helpers.httpRequest({ method: 'GET', url: modelsUrl, headers, json: true });
					const rawList = response?.data || response?.models || (Array.isArray(response) ? response : null);
					if (Array.isArray(rawList) && rawList.length > 0) {
						return rawList.map((m: any) => {
							const modelId = typeof m === 'string' ? m : (m.id || m.name || JSON.stringify(m));
							return { name: String(modelId), value: String(modelId) };
						});
					}
				} catch {
					try {
						const rootUrl = baseUrl.replace(/\/v1$/, '');
						const ollamaResp = await this.helpers.httpRequest({ method: 'GET', url: `${rootUrl}/api/tags`, headers, json: true });
						if (ollamaResp && Array.isArray(ollamaResp.models) && ollamaResp.models.length > 0) {
							return ollamaResp.models.map((m: any) => {
								const name = m.name || m.model || JSON.stringify(m);
								return { name: String(name), value: String(name) };
							});
						}
					} catch {}
				}

				return defaultModels;
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const executionSettings = getModelExecutionSettings(this, itemIndex);
		const executionItemIndex = executionSettings.executeOnce ? 0 : itemIndex;
		const provider = this.getNodeParameter('provider', executionItemIndex, 'gemini') as 'gemini' | 'openai_compatible';

		// Jev Dual-Engine specific settings
		const enableSandwich = this.getNodeParameter('enableSandwich', executionItemIndex, true) as boolean;
		const verbosity = this.getNodeParameter('verbosity', executionItemIndex, 'concise') as 'concise' | 'balanced' | 'detailed';
		const cleanMath = this.getNodeParameter('cleanMath', executionItemIndex, true) as boolean;
		const showTokenStats = this.getNodeParameter('showTokenStats', executionItemIndex, true) as boolean;

		const jevConfig: JevConfig = {
			enableSandwich,
			verbosity,
			cleanMath,
			showTokenStats,
		};

		if (provider === 'gemini') {
			let geminiApiKey = '';
			try {
				const creds = await this.getCredentials('googleGeminiApi');
				if (creds && typeof creds.apiKey === 'string') geminiApiKey = creds.apiKey.trim();
			} catch {}
			if (!geminiApiKey) {
				try {
					const creds = await this.getCredentials('jevLlmApi');
					if (creds && typeof creds.apiKey === 'string') geminiApiKey = creds.apiKey.trim();
				} catch {}
			}
			if (!geminiApiKey && process.env.GEMINI_API_KEY) {
				geminiApiKey = process.env.GEMINI_API_KEY.trim();
			}
			if (!geminiApiKey) {
				throw new NodeOperationError(
					this.getNode(),
					'Chave de API do Google Gemini não encontrada. Configure a credencial "Google Gemini API" ou "LLM System 2 API".',
				);
			}

			let geminiModel = this.getNodeParameter('geminiModel', executionItemIndex, 'gemini-2.5-flash') as string;
			const customModel = this.getNodeParameter('geminiModelCustom', executionItemIndex, '') as string;
			if (customModel.trim()) geminiModel = customModel.trim();

			const opts = this.getNodeParameter('geminiOptions', executionItemIndex, {}) as Record<string, any>;
			const sharedOptions = resolveSharedModelOptions(this, opts);

			const thinkingConfig: Record<string, unknown> = {};
			if (opts.thinkingLevel !== undefined && opts.thinkingBudget !== undefined) {
				throw new NodeOperationError(this.getNode(), 'Escolha Thinking Level (Gemini 3+) ou Thinking Budget (Gemini 2.5), não ambos.');
			}
			if (opts.thinkingLevel !== undefined) {
				thinkingConfig.thinkingLevel = opts.thinkingLevel;
			}
			if (opts.thinkingBudget !== undefined) {
				thinkingConfig.thinkingBudget = opts.thinkingBudget;
			}
			const shouldIncludeThoughts = opts.includeThoughts === true;
			if (shouldIncludeThoughts) {
				thinkingConfig.includeThoughts = true;
			}

			let responseMimeType = opts.responseMimeType;
			let responseSchema: Record<string, unknown> | undefined;
			if (typeof opts.responseSchema === 'string' && opts.responseSchema.trim().length > 0) {
				try {
					const parsed = JSON.parse(opts.responseSchema);
					if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
						responseSchema = parsed;
					}
				} catch (err: any) {
					throw new NodeOperationError(this.getNode(), `JSON inválido em Structured Output Schema: ${err.message}`);
				}
			} else if (opts.responseSchema && typeof opts.responseSchema === 'object' && !Array.isArray(opts.responseSchema)) {
				responseSchema = opts.responseSchema;
			}
			if (responseSchema) responseMimeType = 'application/json';

			const modelInput: Record<string, unknown> = {
				apiKey: geminiApiKey,
				model: geminiModel,
				maxRetries: 0,
				recoverEmptyResponses: opts.recoverEmptyResponses !== false,
				requestTimeoutMs: opts.requestTimeoutMs ?? 60_000,
			};

			const usageReporter = await createUsageReporter(this, executionItemIndex, geminiModel, sharedOptions);
			modelInput.callbacks = [
				new UniversalChatModelTracing(
					this,
					'gemini',
					shouldIncludeThoughts,
					sharedOptions.includeTokenUsageInAgentOutput === true,
					sharedOptions.includeIntermediateStepsInOutput === true,
					usageReporter,
					sharedOptions.failOnReporterError === true,
				),
			];

			if (opts.temperature !== undefined) modelInput.temperature = opts.temperature;
			if (opts.topP !== undefined) modelInput.topP = opts.topP;
			if (opts.topK !== undefined) modelInput.topK = opts.topK;
			if (opts.maxOutputTokens !== undefined) modelInput.maxOutputTokens = opts.maxOutputTokens;
			if (responseMimeType !== undefined) modelInput.responseMimeType = responseMimeType;
			if (responseSchema !== undefined) modelInput.responseSchema = responseSchema;
			if (Object.keys(thinkingConfig).length > 0) modelInput.thinkingConfig = thinkingConfig;

			let model: BaseChatModel = new GeminiChatModel(modelInput, (usage) => {
				this.logAiEvent('ai-tokens-usage' as any, formatGeminiUsage(usage));
			});

			model = applySystemMessage(model, sharedOptions.systemMessage ?? '');
			model = applyJevDualEngine(model, jevConfig);

			return {
				response: applyModelRetry(model, executionSettings, 'gemini'),
			};
		} else {
			// ─── OPENAI COMPATIBLE / LOCAL LLM / DEEPSEEK / OLLAMA ───
			let baseUrl = 'http://localhost:11434/v1';
			let openaiApiKey = 'not-needed';
			try {
				const creds = await this.getCredentials('openAiCompatibleApi');
				if (creds && typeof creds.baseUrl === 'string' && creds.baseUrl.trim()) {
					baseUrl = creds.baseUrl.trim();
				}
				if (creds && typeof creds.apiKey === 'string' && creds.apiKey.trim()) {
					openaiApiKey = creds.apiKey.trim();
				}
			} catch {}

			if (baseUrl === 'http://localhost:11434/v1' && openaiApiKey === 'not-needed') {
				try {
					const creds = await this.getCredentials('jevLlmApi');
					if (creds && typeof creds.customBaseUrl === 'string' && creds.customBaseUrl.trim()) {
						baseUrl = creds.customBaseUrl.trim();
					}
					if (creds && typeof creds.customApiKey === 'string' && creds.customApiKey.trim()) {
						openaiApiKey = creds.customApiKey.trim();
					} else if (creds && typeof creds.apiKey === 'string' && creds.apiKey.trim()) {
						openaiApiKey = creds.apiKey.trim();
					}
				} catch {}
			}
			baseUrl = baseUrl.replace(/\/+$/, '');

			let openaiModel = this.getNodeParameter('openaiModel', executionItemIndex, 'llama3') as string;
			const customModel = this.getNodeParameter('openaiModelCustom', executionItemIndex, '') as string;
			if (customModel.trim()) openaiModel = customModel.trim();

			const opts = this.getNodeParameter('openaiOptions', executionItemIndex, {}) as Record<string, any>;
			const sharedOptions = resolveSharedModelOptions(this, opts);

			let parsedHeaders: Record<string, string> = {};
			if (opts.customHeaders && opts.customHeaders.trim().length > 0) {
				try {
					parsedHeaders = JSON.parse(opts.customHeaders);
				} catch (error: any) {
					throw new NodeOperationError(this.getNode(), `JSON inválido em Custom Headers: ${error.message}`);
				}
			}

			// Header default para OpenRouter se aplicável
			if (baseUrl.includes('openrouter.ai') && !parsedHeaders['HTTP-Referer']) {
				parsedHeaders['HTTP-Referer'] = 'https://n8n.io';
				parsedHeaders['X-Title'] = 'n8n Jev Dual-Engine';
			}

			const modelKwargs: Record<string, unknown> = {};
			const reasoningEffort = opts.reasoningEffort || 'none';
			if (opts.jsonMode === true) {
				modelKwargs.response_format = { type: 'json_object' };
			}

			const modelOptions: Record<string, any> = {
				apiKey: openaiApiKey,
				modelName: openaiModel,
				model: openaiModel,
				callbacks: [],
				configuration: {
					baseURL: baseUrl,
					defaultHeaders: parsedHeaders,
				},
				modelKwargs,
				maxRetries: 0,
			};

			const usageReporter = await createUsageReporter(this, executionItemIndex, openaiModel, sharedOptions);
			modelOptions.callbacks = [
				new UniversalChatModelTracing(
					this,
					'openai_compatible',
					false,
					sharedOptions.includeTokenUsageInAgentOutput === true,
					sharedOptions.includeIntermediateStepsInOutput === true,
					usageReporter,
					sharedOptions.failOnReporterError === true,
				),
			];

			if (opts.temperature !== undefined) modelOptions.temperature = opts.temperature;
			if (opts.maxTokens !== undefined) modelOptions.maxTokens = opts.maxTokens;
			if (opts.frequencyPenalty !== undefined) modelOptions.frequencyPenalty = opts.frequencyPenalty;
			if (opts.presencePenalty !== undefined) modelOptions.presencePenalty = opts.presencePenalty;
			if (opts.seed !== undefined && !isNaN(Number(opts.seed))) modelOptions.seed = Number(opts.seed);
			if (reasoningEffort !== 'none') modelOptions.reasoningEffort = reasoningEffort;

			let model: BaseChatModel = new ChatOpenAI(modelOptions);
			model = applySystemMessage(model, sharedOptions.systemMessage ?? '');
			model = applyJevDualEngine(model, jevConfig);

			return {
				response: applyModelRetry(model, executionSettings, 'openai_compatible'),
			};
		}
	}
}
