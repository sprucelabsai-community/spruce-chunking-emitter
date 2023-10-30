import { fake } from '@sprucelabs/spruce-test-fixtures'
import { assert, generateId, test } from '@sprucelabs/test-utils'
import AbstractChunkingEmitterTest from '../support/AbstractChunkingEmitterTest'
import SimpleStore from '../support/SimpleStore'

@fake.login()
export default class ChunkingWithDataStoreCursorTest extends AbstractChunkingEmitterTest {
	private static simple: SimpleStore
	private static hitCount = 0

	protected static async beforeEach() {
		await super.beforeEach()
		this.mixinTestContract()

		this.hitCount = 0

		const stores = await this.stores.getStoreFactory()
		stores.setStoreClass('simple', SimpleStore)

		this.simple = await this.stores.getStore('simple')

		await this.resetEmitter()

		await this.fakedClient.on(this.fqen, ({ payload }) => {
			this.hitCount++
		})
	}

	@test()
	protected static async passingEmptyBatchCursorDoesNotEmit() {
		await this.findAndEmit()
	}

	@test()
	protected static async firstEmitIncludesFirstBatch() {
		const created = {
			sensorName: generateId(),
		}

		await this.simple.createOne(created)
		await this.findAndEmit()

		assert.isEqual(this.hitCount, 1)
	}

	private static async findBatch() {
		return await this.simple.findBatch({})
	}

	private static async findAndEmit() {
		const cursor = await this.findBatch()
		await this.emitter.emit({
			eventName: this.fqen,
			cursor,
			payloadKey: 'items',
		})
	}
}
