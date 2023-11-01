import { SchemaFieldFieldDefinition } from '@sprucelabs/schema'

export default function chunkFieldDefinition() {
	return {
		type: 'schema',
		isRequired: true,
		options: {
			schema: {
				id: 'chunkPaging',
				version: 'v2023_10_21',
				namespace: 'MercuryChunkingEmitter',
				name: 'Chunk Paging',
				fields: {
					total: {
						type: 'number',
						isRequired: true,
						options: undefined,
					},
					current: {
						type: 'number',
						isRequired: true,
						options: undefined,
					},
				},
			},
		},
	} as SchemaFieldFieldDefinition
}
