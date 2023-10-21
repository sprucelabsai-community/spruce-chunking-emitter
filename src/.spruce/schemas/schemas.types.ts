/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable no-redeclare */

export { SpruceSchemas } from '@sprucelabs/spruce-core-schemas/build/.spruce/schemas/core.schemas.types'

import { default as SchemaEntity } from '@sprucelabs/schema'



import * as SpruceSchema from '@sprucelabs/schema'


declare module '@sprucelabs/spruce-core-schemas/build/.spruce/schemas/core.schemas.types' {


	namespace SpruceSchemas.MercuryChunkingEmitter.v2023_10_21 {

		
		interface ChunkPaging {
			
				
				'total': number
				
				'current': number
		}

		interface ChunkPagingSchema extends SpruceSchema.Schema {
			id: 'chunkPaging',
			version: 'v2023_10_21',
			namespace: 'MercuryChunkingEmitter',
			name: 'Chunk Paging',
			    fields: {
			            /** . */
			            'total': {
			                type: 'number',
			                isRequired: true,
			                options: undefined
			            },
			            /** . */
			            'current': {
			                type: 'number',
			                isRequired: true,
			                options: undefined
			            },
			    }
		}

		interface ChunkPagingEntity extends SchemaEntity<SpruceSchemas.MercuryChunkingEmitter.v2023_10_21.ChunkPagingSchema> {}

	}

}
