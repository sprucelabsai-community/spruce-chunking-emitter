import { SchemaRegistry } from '@sprucelabs/schema'
import { SpruceSchemas } from '../../schemas.types'



const chunkPagingSchema: SpruceSchemas.MercuryChunkingEmitter.v2023_10_21.ChunkPagingSchema  = {
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

SchemaRegistry.getInstance().trackSchema(chunkPagingSchema)

export default chunkPagingSchema
