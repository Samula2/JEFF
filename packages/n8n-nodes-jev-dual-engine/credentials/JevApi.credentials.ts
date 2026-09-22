import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class JevApi implements ICredentialType {
	name = 'jevApi';
	displayName = 'Jev System 1 API';
	documentationUrl = 'https://typesafe.ai';
	properties: INodeProperties[] = [
		{
			displayName: 'Modo do Jev',
			name: 'provider',
			type: 'options',
			options: [
				{
					name: 'Emulador Local (Sem Chave - Imediato)',
					value: 'local',
					description: 'Triagem lógica e heurística local em sub-30ms sem rede',
				},
				{
					name: 'TypeSafe AI Oficial (api.typesafe.ai)',
					value: 'typesafe',
					description: 'Roteador analítico TypeSafe AI oficial',
				},
				{
					name: 'OpenRouter (~typesafe/jev-latest)',
					value: 'openrouter',
					description: 'Endpoint Jev via OpenRouter',
				},
			],
			default: 'local',
		},
		{
			displayName: 'API Key do Jev',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					provider: ['typesafe', 'openrouter'],
				},
			},
			default: '',
			description: 'Chave de API para o serviço TypeSafe AI',
		},
	];
}
