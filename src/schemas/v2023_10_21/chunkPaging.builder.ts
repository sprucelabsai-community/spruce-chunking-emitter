import { buildSchema } from '@sprucelabs/schema'

export default buildSchema({
    id: 'chunkPaging',
    name: 'Chunk Paging',
    fields: {
        total: {
            type: 'number',
            isRequired: true,
        },
        current: {
            type: 'number',
            isRequired: true,
        },
    },
})
