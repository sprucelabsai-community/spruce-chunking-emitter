import { EventName } from '@sprucelabs/mercury-types'
import { AbstractSpruceFixtureTest } from '@sprucelabs/spruce-test-fixtures'
import { generateId } from '@sprucelabs/test-utils'
import { ChunkingEmitter } from '../../ChunkingEmitter'

export default abstract class AbstractChunkingEmitterTest extends AbstractSpruceFixtureTest {
	protected static emitter: ChunkingEmitter
	protected static fqen: EventName
	protected static payloadKey: string

	protected static async beforeEach() {
		await super.beforeEach()
		this.payloadKey = 'items'
	}

	protected static async emitWithItems(items: Record<string, unknown>[]) {
		await this.emitter.emit({
			eventName: this.fqen,
			items,
			payloadKey: this.payloadKey,
		})
	}

	protected static generateItem() {
		return { id: generateId() }
	}
}
