import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class JevLlmApi implements ICredentialType {
	name = 'jevLlmApi';
	displayName = 'LLM System 2 API';
	documentationUrl = 'https://aistudio.google.com';
	properties: INodeProperties[] = [
		{
			displayName: 'Provedor da LLM',
			name: 'provider',
			type: 'options',
			options: [
				{
					name: 'Google Gemini Oficial (AI Studio)',
					value: 'gemini',
					description: 'Gemini 2.5 Flash, 2.0 Flash, 1.5 Pro',
				},
				{
					name: 'DeepInfra (Llama 3.1, Qwen 2.5, DeepSeek)',
					value: 'deepinfra',
					description: 'Modelos open-weights de alta velocidade',
				},
				{
					name: 'OpenRouter (Claude, GPT-4o, Gemini)',
					value: 'openrouter',
					description: 'Acesso unificado a dezenas de provedores',
				},
				{
					name: 'OpenAI Oficial (GPT-4o, o3-mini)',
					value: 'openai',
					description: 'Endpoint oficial da OpenAI',
				},
				{
					name: 'Custom Endpoint / Mac mini / Ollama Local (Padrão OpenAI)',
					value: 'custom',
					description: 'Qualquer API compatível com o padrão OpenAI (Mac mini, Ollama, LM Studio, vLLM)',
				},
			],
			default: 'gemini',
		},
		{
			displayName: 'API Key / Token',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				hide: {
					provider: ['custom'],
				},
			},
			default: '',
			description: 'Chave de API do provedor configurado',
		},
		{
			displayName: 'Custom Base URL',
			name: 'customBaseUrl',
			type: 'string',
			displayOptions: {
				show: {
					provider: ['custom'],
				},
			},
			default: 'http://localhost:11434/v1',
			description: 'URL base da API (ex: http://localhost:11434/v1 para Ollama)',
		},
		{
			displayName: 'Custom API Key (Opcional)',
			name: 'customApiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					provider: ['custom'],
				},
			},
			default: '',
			description: 'Chave de API se o endpoint customizado exigir autenticação Bearer',
		},
	];
}
