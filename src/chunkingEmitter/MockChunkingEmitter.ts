import { MercuryTestClient } from '@sprucelabs/mercury-client'
import { EventName } from '@sprucelabs/mercury-types'
import { assert } from '@sprucelabs/test-utils'
import { chunkFieldDefinition } from './chunkFieldDefinition'
import { ChunkingEmitter } from './ChunkingEmitter'

export default class MockChunkingEmitter implements ChunkingEmitter {
	private didEmit = false
	private emittedEventName?: EventName
	private emittedItems?: Record<string, unknown>[]
	private emittedPayloadKey?: string
	public static lastInstance?: MockChunkingEmitter

	public constructor() {
		MockChunkingEmitter.lastInstance = this
	}

	public static getLastInstance() {
		assert.isTruthy(
			this.lastInstance,
			'You have not constructed a ChunkingEmitter! Try ChunkingEmitterImpl.Emitter({})'
		)
		return this.lastInstance
	}

	public static reset() {
		this.lastInstance = undefined
	}

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

	public assertEventHonorsChunkingSignature(fqen: EventName) {
		const emitter = MercuryTestClient.getInternalEmitter()
		const contract = emitter.getContract()
		const payload = contract.eventSignatures[fqen]?.emitPayloadSchema?.fields
		// @ts-ignore
		const chunkField = payload?.payload?.options?.schema?.fields?.chunk
		assert.isTruthy(
			chunkField,
			'Your event does not conform to the chunking signature. Please add a chunk field to your event payload. Add a field to your payload called chunk: chunkFieldDefinition()'
		)

		assert.isEqualDeep(
			chunkField,
			chunkFieldDefinition(),
			'Your chunk field is there but not properly formed. Use chunkFieldDefinition() to define it.'
		)
	}
}
