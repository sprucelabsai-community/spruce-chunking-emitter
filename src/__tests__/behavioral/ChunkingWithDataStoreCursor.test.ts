import { fake } from '@sprucelabs/spruce-test-fixtures'
import { assert, generateId, test } from '@sprucelabs/test-utils'
import AbstractChunkingEmitterTest from '../support/AbstractChunkingEmitterTest'
import SimpleStore from '../support/SimpleStore'

@fake.login()
export default class ChunkingWithDataStoreCursorTest extends AbstractChunkingEmitterTest {
	private static simple: SimpleStore
	private static hitCount = 0
	private static passedPayload?: {
		items: Record<string, any>[]
	}
	private static batchSize = 10

	protected static async beforeEach() {
		await super.beforeEach()
		this.mixinTestContract()

		this.hitCount = 0
		this.batchSize = 10

		delete this.passedPayload

		const stores = await this.stores.getStoreFactory()
		stores.setStoreClass('simple', SimpleStore)

		this.simple = await this.stores.getStore('simple')

		await this.resetEmitter()

		//@ts-ignore
		await this.fakedClient.on(this.fqen, ({ payload }) => {
			this.passedPayload = payload
			this.hitCount++
		})
	}

	@test()
	protected static async passingEmptyBatchCursorDoesNotEmit() {
		await this.findAndEmit()
	}

	@test()
	protected static async firstEmitIncludesFirstBatch() {
		const expected = await this.seedItemsFindAndEmit(1)

		this.assertTotalEmits(1)
		this.assertLastEmittedItems(expected)
	}

	@test()
	protected static async firstEmitIncludesFirstBatchEvenIfManyItems() {
		const expected = await this.seedItemsFindAndEmit(2)
		this.assertTotalEmits(1)
		this.assertLastEmittedItems(expected)
	}

	@test()
	protected static async emitsForEachBatch() {
		this.batchSize = 1
		await this.seedItemsFindAndEmit(2)
		this.assertTotalEmits(2)
	}

	private static async seedItemsFindAndEmit(total: number) {
		const expected = await this.seedItems(total)
		await this.findAndEmit()
		return expected
	}

	private static assertLastEmittedItems(expected: Record<string, any>[]) {
		assert.isEqualDeep(this.passedPayload?.items, expected)
	}

	private static assertTotalEmits(expected: number) {
		assert.isEqual(
			this.hitCount,
			expected,
			`Expected ${expected} emits but got ${this.hitCount}`
		)
	}

	private static async seedItems(total: number) {
		const values = new Array(total)
			.fill(0)
			.map(() => this.generateSensorValues())
		const items = await this.simple.create(values)
		return items
	}

	private static generateSensorValues() {
		return {
			sensorName: generateId(),
		}
	}

	private static async findBatch() {
		return await this.simple.findBatch(
			{},
			{
				batchSize: this.batchSize,
			}
		)
	}

	private static async findAndEmit() {
		const cursor = await this.findBatch()
		await this.emitter.emit({
			eventName: this.fqen,
			batchCursor: cursor,
			payloadKey: 'items',
		})
	}
}
