import { EventName } from '@sprucelabs/mercury-types'
import { assert } from '@sprucelabs/test-utils'
import { ChunkingEmitter } from './ChunkingEmitter'

export default class MockChunkingEmitter implements ChunkingEmitter {
	private didEmit = false
	private emittedEventName?: EventName
	private emittedItems?: Record<string, unknown>[]
	private emittedPayloadKey?: string

	public async emit(options: {
		eventName: EventName
		items: Record<string, unknown>[]
		payloadKey: string
	}): Promise<void> {
		const { eventName, items, payloadKey } = options
		this.didEmit = true
		this.emittedEventName = eventName
		this.emittedItems = items
		this.emittedPayloadKey = payloadKey
	}

	public assertDidEmitPayloadKey(payloadKey: string) {
		this.assertDidEmit()
		assert.isEqual(
			this.emittedPayloadKey,
			payloadKey,
			`I expected chunkingEmitter.emit() with payloadKey '${payloadKey}'! But you emitted ${
				this.emittedPayloadKey || 'nothing'
			}`
		)
	}

	public getTotalErrors(): number {
		return 0
	}

	public assertEmittedItems(items: Record<string, any>[]) {
		this.assertDidEmit()
		assert.isEqualDeep(
			this.emittedItems,
			items,
			'You did not chunkingEmitter.emit(...) the expected items!!'
		)
	}

	public assertDidEmit() {
		assert.isTrue(
			this.didEmit,
			`You did not ever call chunkingEmitter.emit(...). That is your next step!`
		)
	}

	public assertDidEmitEventNamed(fqen: EventName) {
		this.assertDidEmit()
		assert.isEqual(
			this.emittedEventName,
			fqen,
			`I expected chunkingEmitter to emit '${fqen}'! But you emitted ${
				this.emittedEventName || 'nothing'
			}`
		)
	}
}
