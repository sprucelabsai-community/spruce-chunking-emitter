import { FieldDefinitions } from '@sprucelabs/schema'
import chunkPagingSchema from '#spruce/schemas/mercuryChunkingEmitter/v2023_10_21/chunkPaging.schema'

export function chunkFieldDefinition() {
	return {
		type: 'schema',
		isRequired: true,
		options: {
			schema: chunkPagingSchema,
		},
	} as FieldDefinitions
}
