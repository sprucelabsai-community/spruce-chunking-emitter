import { MercuryClient } from '@sprucelabs/mercury-client'
import { EventName } from '@sprucelabs/mercury-types'
import { assertOptions } from '@sprucelabs/schema'

export default class ChunkingEmitter {
	private client: MercuryClient
	private chunkSize: number

	private constructor(options: ChunkingEmitterOptions) {
		const { client, chunkSize } = assertOptions(options, ['client'])
		this.client = client
		this.chunkSize = chunkSize ?? 100
	}

	public static async Emitter(options: ChunkingEmitterOptions) {
		assertOptions(options, ['client'])
		return new this(options)
	}

	public async emit(options: ChunkingEmitterEmitOptions) {
		const { eventName, items, payloadKey } = assertOptions(options, [
			'eventName',
			'items',
			'payloadKey',
		])

		const chunks = this.splitItemsIntoChunks(items)

		for (const chunk of chunks) {
			try {
				await this.client.emitAndFlattenResponses(eventName as EventName, {
					payload: {
						[payloadKey]: chunk,
					},
				})
			} catch {}
		}
	}

	private splitItemsIntoChunks(items: Record<string, unknown>[]) {
		const chunks: Record<string, unknown>[][] = []

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
		return 1
	}
}

interface ChunkingEmitterOptions {
	client: MercuryClient
	chunkSize?: number
}

type ChunkingEmitterEmitOptions = {
	eventName: EventName
	items: Record<string, unknown>[]
	payloadKey: string
}
