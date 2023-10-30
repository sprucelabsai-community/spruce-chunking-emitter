import { BatchArrayCursor, BatchCursor } from '@sprucelabs/data-stores'
import { MercuryClient } from '@sprucelabs/mercury-client'
import { EventName } from '@sprucelabs/mercury-types'
import { SchemaError, assertOptions } from '@sprucelabs/schema'
import { Log, buildLog } from '@sprucelabs/spruce-skill-utils'

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
		const { eventName, items, payloadKey, target, cursor, unqiueKey } =
			assertOptions(options, ['eventName', 'payloadKey'])

		if (!items && !cursor) {
			throw new SchemaError({
				code: 'MISSING_PARAMETERS',
				parameters: ['items', 'cursor'],
				friendlyMessage: `You have to pass either 'items' or a 'cursor' to emit.`,
			})
		}

		this.totalErrors = 0

		let current = 0
		let actualCursor = cursor ?? this.Cursor(items ?? [])
		const total = await actualCursor.getTotalRecords()

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

	private Cursor(items: Record<string, any>[]): BatchArrayCursor<any> {
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
	/** will stop any running operations that match the key */
	unqiueKey?: string
}

export interface ChunkingEmitter {
	emit(options: ChunkingEmitterEmitOptions): Promise<void>
	getTotalErrors(): number
}

class Emitter {
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
	public totalErrors: number = 0

	public constructor(options: {
		cursor?: BatchCursor<Record<string, any>>
		items?: Record<string, any>[]
		payloadKey: string
		target?: Record<string, any>
		eventName: EventName
		chunkSize: number
		client: MercuryClient
		uniqueKey?: string
		log: Log
	}) {
		const {
			cursor,
			items,
			payloadKey,
			target,
			eventName,
			chunkSize,
			client,
			uniqueKey,
			log,
		} = options

		this.cursor = cursor
		this.uniqueKey = uniqueKey
		this.items = items
		this.payloadKey = payloadKey
		this.target = target
		this.eventName = eventName
		this.chunkSize = chunkSize
		this.client = client
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
		let actualCursor = this.cursor ?? this.Cursor(this.items ?? [])
		this.total = await actualCursor.getTotalRecords()

		for await (const chunk of actualCursor) {
			try {
				current = await this.emitChunk({
					chunk,
					current,
				})
			} catch (err: any) {
				this.log.error('Failed to emit chunk', err)
				this.totalErrors++
			}
			current++
		}
	}

	private async emitChunk(options: {
		chunk: Record<string, any>[]
		current: number
	}) {
		const { chunk, current } = options

		let targetAndPayload: Record<string, any> = {
			payload: {
				[this.payloadKey]: chunk,
				chunk: {
					current,
					total: this.total,
				},
			},
		}

		if (this.target) {
			targetAndPayload.target = this.target
		}

		await this.client.emitAndFlattenResponses(this.eventName, targetAndPayload)

		return current
	}

	private Cursor(items: Record<string, any>[]): BatchArrayCursor<any> {
		const cursor = new BatchArrayCursor(items, { batchSize: this.chunkSize })
		return cursor
	}
}
