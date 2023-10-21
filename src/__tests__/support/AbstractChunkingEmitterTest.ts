import { MercuryTestClient } from '@sprucelabs/mercury-client'
import { EventName, EventSignaturesByName } from '@sprucelabs/mercury-types'
import { Schema } from '@sprucelabs/schema'
import { buildEmitTargetAndPayloadSchema } from '@sprucelabs/spruce-event-utils'
import { AbstractSpruceFixtureTest } from '@sprucelabs/spruce-test-fixtures'
import { generateId } from '@sprucelabs/test-utils'
import { ChunkingEmitter } from '../../chunkingEmitter/ChunkingEmitter'

export default abstract class AbstractChunkingEmitterTest extends AbstractSpruceFixtureTest {
	protected static emitter: ChunkingEmitter
	protected static fqen: EventName
	protected static payloadKey: string

	protected static async beforeEach() {
		await super.beforeEach()
		this.payloadKey = 'items'
	}

	protected static mixinEventSignatures(
		eventSignatures: EventSignaturesByName
	) {
		const client = this.fakedClient as MercuryTestClient
		client.mixinContract({
			eventSignatures,
		})
	}

	protected static buildSignature(payload: Schema, target?: Schema) {
		return {
			isGlobal: true,
			emitPayloadSchema: buildEmitTargetAndPayloadSchema({
				eventName: this.fqen,
				payloadSchema: payload,
				targetSchema: target,
			}),
		}
	}

	protected static async emitWithItems(
		items: Record<string, unknown>[],
		target?: Record<string, any>
	) {
		await this.emitter.emit({
			eventName: this.fqen,
			items,
			payloadKey: this.payloadKey,
			target,
		})
	}

	protected static generateItem() {
		return { id: generateId() }
	}
}
