import { BatchArrayCursor, BatchCursor } from '@sprucelabs/data-stores'
import { MercuryClient } from '@sprucelabs/mercury-client'
import { EventName } from '@sprucelabs/mercury-types'
import { Log } from '@sprucelabs/spruce-skill-utils'

export default class SingleChunkEmitter {
    private cursor?: BatchCursor<Record<string, any>>
    private items?: Record<string, any>[]
    private payloadKey: string
    private target?: Record<string, any>
    private eventName: EventName
    private chunkSize: number
    private client: MercuryClient
    private total!: number
    private uniqueKey?: string
    private log: Log
    public totalErrors = 0
    private isKilled = false
    private payload?: Record<string, any>

    public constructor(options: SingleChunkEmitterOptions) {
        const {
            batchCursor: cursor,
            items,
            payloadKey,
            target,
            eventName,
            chunkSize,
            client,
            uniqueKey,
            log,
            payload,
        } = options

        this.cursor = cursor
        this.uniqueKey = uniqueKey
        this.items = items
        this.payloadKey = payloadKey
        this.target = target
        this.eventName = eventName
        this.chunkSize = chunkSize
        this.client = client
        this.payload = payload
        this.log = log.buildLog('Emitter')
    }

    public matchesKey(key: string) {
        return this.uniqueKey === key
    }

    public getTotalErrors() {
        return this.totalErrors
    }

    public async emit() {
        let current = 0
        const actualCursor = this.cursor ?? this.Cursor(this.items ?? [])
        this.total = await actualCursor.getTotalRecords()

        for await (const chunk of actualCursor) {
            try {
                current = await this.emitChunk({
                    chunk,
                    current,
                })
                if (this.isKilled) {
                    return
                }
            } catch (err: any) {
                this.log.error('Failed to emit chunk', err)
                this.totalErrors++
            }
            current++
        }
    }

    public async kill() {
        this.isKilled = true
    }

    private async emitChunk(options: {
        chunk: Record<string, any>[]
        current: number
    }) {
        const { chunk, current } = options

        let targetAndPayload: Record<string, any> = {
            payload: {
                [this.payloadKey]: chunk,
                ...this.payload,
                chunk: {
                    current,
                    total: this.total,
                },
            },
        }

        if (this.target) {
            targetAndPayload.target = this.target
        }

        await this.client.emitAndFlattenResponses(
            this.eventName,
            targetAndPayload
        )

        return current
    }

    private Cursor(items: Record<string, any>[]): BatchArrayCursor<any> {
        const cursor = new BatchArrayCursor(items, {
            batchSize: this.chunkSize,
        })
        return cursor
    }
}

interface SingleChunkEmitterOptions {
    batchCursor?: BatchCursor<Record<string, any>>
    items?: Record<string, any>[]
    payloadKey: string
    payload?: Record<string, any>
    target?: Record<string, any>
    eventName: EventName
    chunkSize: number
    client: MercuryClient
    uniqueKey?: string
    log: Log
}
