import { MercuryClient } from '@sprucelabs/mercury-client'
import { EventName } from '@sprucelabs/mercury-types'
import { assertOptions } from '@sprucelabs/schema'
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
		const { eventName, items, payloadKey, target } = assertOptions(options, [
			'eventName',
			'items',
			'payloadKey',
		])

		this.totalErrors = 0
		const chunks = this.splitItemsIntoChunks(items)
		let current = 0

		for (const chunk of chunks) {
			try {
				let targetAndPayload: Record<string, any> = {
					payload: {
						[payloadKey]: chunk,
						chunk: {
							current: current++,
							total: chunks.length,
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
		}
	}

	public static reset() {
		this.Class = undefined
	}

	private splitItemsIntoChunks(items: Record<string, any>[]) {
		const chunks: Record<string, any>[][] = []

		let index = 0

		for (const item of items) {
			if (!chunks[index]) {
				chunks[index] = []
			}

			if (chunks[index].length === this.chunkSize) {
				index++
				chunks[index] = []
			}

			chunks[index].push(item)
		}

		return chunks
	}

	public getTotalErrors(): number {
		return this.totalErrors
	}
}

interface ChunkingEmitterOptions {
	client: MercuryClient
	chunkSize?: number
}

type ChunkingEmitterEmitOptions = {
	eventName: EventName
	items: Record<string, any>[]
	payloadKey: string
	target?: Record<string, any>
}

export interface ChunkingEmitter {
	emit(options: ChunkingEmitterEmitOptions): Promise<void>
	getTotalErrors(): number
}
