import { BatchCursor } from '@sprucelabs/data-stores'
import { MercuryClient } from '@sprucelabs/mercury-client'
import { EventName } from '@sprucelabs/mercury-types'
import { SchemaError, assertOptions } from '@sprucelabs/schema'
import { buildLog } from '@sprucelabs/spruce-skill-utils'
import SingleChunkEmitter from './SingleChunkEmitter'

export default class ChunkingEmitterImpl {
    private client: MercuryClient
    protected chunkSize: number
    private log = buildLog('ChunkingEmitter')
    public static Class?: new (
        options: ChunkingEmitterOptions
    ) => ChunkingEmitter
    private emitters: SingleChunkEmitter[] = []
    private totalErrors = 0

    protected constructor(options: ChunkingEmitterOptions) {
        const { client, chunkSize } = assertOptions(options, ['client'])
        this.client = client
        this.chunkSize = chunkSize ?? 10
    }

    public static async Emitter(options: ChunkingEmitterOptions) {
        assertOptions(options, ['client'])
        return new (this.Class ?? this)(options)
    }

    public async emit(options: ChunkingEmitterEmitOptions) {
        const {
            items,
            batchCursor: cursor,
            uniqueKey: unqiueKey,
        } = assertOptions(options, ['eventName', 'payloadKey'])

        this.totalErrors = 0

        if (!items && !cursor) {
            throw new SchemaError({
                code: 'MISSING_PARAMETERS',
                parameters: ['items', 'batchCursor'],
                friendlyMessage: `You have to pass either 'items' or a 'batchCursor' to emit.`,
            })
        } else if (items && cursor) {
            throw new SchemaError({
                code: 'INVALID_PARAMETERS',
                parameters: ['items', 'batchCursor'],
                friendlyMessage: `You can only pass either 'items' or a 'batchCursor' to emit, not both.`,
            })
        }

        const match = this.emitters.find(
            (e) => unqiueKey && e.matchesKey(unqiueKey)
        )

        if (match) {
            await match.kill()
        }

        const emitter = new SingleChunkEmitter({
            ...options,
            chunkSize: this.chunkSize,
            client: this.client,
            log: this.log,
        })

        this.emitters.push(emitter)

        await emitter.emit()

        this.totalErrors += emitter.getTotalErrors()
        this.emitters = this.emitters.filter((e) => e !== emitter)

        return
    }

    public static reset() {
        this.Class = undefined
    }

    public getTotalErrors(): number {
        return this.totalErrors
    }
}

interface ChunkingEmitterOptions {
    client: MercuryClient
    chunkSize?: number
}

export interface ChunkingEmitterEmitOptions {
    eventName: EventName
    items?: Record<string, any>[]
    batchCursor?: BatchCursor<Record<string, any>>
    payloadKey: string
    payload?: Record<string, any>
    target?: Record<string, any>
    /** will kill any running operations that match the key */
    uniqueKey?: string
}

export interface ChunkingEmitter {
    emit(options: ChunkingEmitterEmitOptions): Promise<void>
    getTotalErrors(): number
}
