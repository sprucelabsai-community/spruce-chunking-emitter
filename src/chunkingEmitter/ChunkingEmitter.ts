import { BatchArrayCursor, BatchCursor } from '@sprucelabs/data-stores'
import { MercuryClient } from '@sprucelabs/mercury-client'
import { EventName } from '@sprucelabs/mercury-types'
import { SchemaError, assertOptions } from '@sprucelabs/schema'
import { buildLog } from '@sprucelabs/spruce-skill-utils'

export default class ChunkingEmitterImpl {
	private client: MercuryClient
	protected chunkSize: number
	private log = buildLog('ChunkingEmitter')
	public static Class?: new (options: ChunkingEmitterOptions) => ChunkingEmitter
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
		const { eventName, items, payloadKey, target, cursor } = assertOptions(
			options,
			['eventName', 'payloadKey']
		)

		if (!items && !cursor) {
			throw new SchemaError({
				code: 'MISSING_PARAMETERS',
				parameters: ['items', 'cursor'],
				friendlyMessage: `You have to pass either 'items' or a 'cursor' to emit.`,
			})
		}

		this.totalErrors = 0

		let actualCursor = cursor ?? this.splitItemsIntoChunks(items ?? [])
		const total = await actualCursor.getTotalRecords()
		let current = 0
		for await (const chunk of actualCursor) {
			current = await this.emitChunk({
				payloadKey,
				chunk,
				current,
				total,
				target,
				eventName,
			})

			current++
		}
	}

	private async emitChunk(options: {
		payloadKey: string
		chunk: Record<string, any>[]
		current: number
		total: number
		target?: Record<string, any> | undefined
		eventName: EventName
	}) {
		const { payloadKey, chunk, current, total, target, eventName } = options

		try {
			let targetAndPayload: Record<string, any> = {
				payload: {
					[payloadKey]: chunk,
					chunk: {
						current,
						total,
					},
				},
			}

			if (target) {
				targetAndPayload.target = target
			}

			await this.client.emitAndFlattenResponses(
				eventName as EventName,
				targetAndPayload
			)
		} catch (err: any) {
			this.log.error('Failed to emit chunk', err)
			this.totalErrors++
		}
		return current
	}

	public static reset() {
		this.Class = undefined
	}

	private splitItemsIntoChunks(
		items: Record<string, any>[]
	): BatchArrayCursor<any> {
		const cursor = new BatchArrayCursor(items, { batchSize: this.chunkSize })
		return cursor
	}

	public getTotalErrors(): number {
		return this.totalErrors
	}
}

interface ChunkingEmitterOptions {
	client: MercuryClient
	chunkSize?: number
}

export type ChunkingEmitterEmitOptions = {
	eventName: EventName
	items?: Record<string, any>[]
	cursor?: BatchCursor<Record<string, any>>
	payloadKey: string
	target?: Record<string, any>
}

export interface ChunkingEmitter {
	emit(options: ChunkingEmitterEmitOptions): Promise<void>
	getTotalErrors(): number
}
