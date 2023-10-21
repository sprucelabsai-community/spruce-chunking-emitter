import { MercuryTestClient } from '@sprucelabs/mercury-client'
import { EventName } from '@sprucelabs/mercury-types'
import { buildSchema } from '@sprucelabs/schema'
import { buildEmitTargetAndPayloadSchema } from '@sprucelabs/spruce-event-utils'
import { eventFaker, fake } from '@sprucelabs/spruce-test-fixtures'
import { test, assert, errorAssert, generateId } from '@sprucelabs/test-utils'
import ChunkingEmitterImpl from '../../ChunkingEmitter'
import AbstractChunkingEmitterTest from '../support/AbstractChunkingEmitterTest'

@fake.login()
export default class ChunkingEmitterTest extends AbstractChunkingEmitterTest {
	private static fqen2: EventName
	private static allTargetAndPayloads: any[] = []
	private static hitCount: number

	protected static async beforeEach() {
		await super.beforeEach()

		this.hitCount = 0
		this.fqen = 'test.test::v2021_01_01' as EventName
		this.fqen2 = 'test2.test3::v2022_02_02' as EventName

		this.allTargetAndPayloads = []

		this.mixinTestContract()

		await this.resetEmitterWithChunkSize(1)

		await this.fakedClient.on(this.fqen, (targetAndPayload) => {
			this.hitCount++
			this.allTargetAndPayloads.push(targetAndPayload)
		})
	}

	@test()
	protected static async throwsWithMissing() {
		//@ts-ignore
		const err = await assert.doesThrowAsync(() => ChunkingEmitterImpl.Emitter())
		errorAssert.assertError(err, 'MISSING_PARAMETERS', {
			parameters: ['client'],
		})
	}

	@test()
	protected static async emitThrowsWithMissing() {
		//@ts-ignore
		const err = await assert.doesThrowAsync(() => this.emitter.emit())
		errorAssert.assertError(err, 'MISSING_PARAMETERS', {
			parameters: ['eventName', 'items', 'payloadKey'],
		})
	}

	@test()
	protected static async emitsNothingIfPassedNoItems() {
		await this.emitWithItems([])
		assert.isFalse(this.wasEventEmitted)
	}

	@test()
	protected static async emitsThePassedEvent() {
		await this.emitWithItems([{ id: '1' }])
		assert.isTrue(this.wasEventEmitted)
	}

	@test('passes one item to payload', [{ id: '1' }])
	@test('passes two items to payload', [{ id: '1' }, { id: '2' }])
	protected static async passesThePayloadThroughUsingTheKeyPassed(
		items: Record<string, any>[]
	) {
		await this.resetEmitterWithChunkSize(10)
		await this.emitWithItems(items)
		this.assertLastEmittedItemsEqual(items)
	}

	@test()
	protected static async canPassToDifferentPayloadKey() {
		this.payloadKey = 'items2'
		const item = await this.emitWithOneItem()
		assert.isEqualDeep(this.passedPayload?.items2, [item])
	}

	@test()
	protected static async emitsNameOfEventPassed() {
		this.fqen = this.fqen2

		let wasHit = false
		await eventFaker.on(this.fqen2, () => {
			wasHit = true
		})

		await this.emitWithOneItem()
		assert.isTrue(wasHit)
	}

	@test('emits 2 chunks', 2)
	@test('emits 3 chunks', 3)
	protected static async emitsCorrectNumberOfChunks(total: number) {
		const items = await this.emitTotalItems(total)
		this.assertTotalEmits(total)

		const expected = items.map((item) => [item])
		assert.isEqualDeep(
			this.allTargetAndPayloads.map((t) => t.payload.items),
			expected
		)
	}

	@test()
	protected static async doesNotStopIfOneFails() {
		let hitCount = 0
		await eventFaker.on(this.fqen, () => {
			hitCount++
			if (hitCount === 2) {
				throw new Error('Failed')
			}
		})

		await this.emitTotalItems(10)
		assert.isEqual(hitCount, 10)
		assert.isEqual(this.emitter.getTotalErrors(), 1)
	}

	private static assertTotalEmits(total: number) {
		assert.isEqual(this.hitCount, total)
	}

	private static async emitTotalItems(total: number) {
		const items = new Array(total).fill(0).map(() => this.generateItem())
		await this.emitWithItems(items)
		return items
	}

	private static assertLastEmittedItemsEqual(items: Record<string, any>[]) {
		assert.isEqualDeep(this.passedPayload?.items, items)
	}

	private static async resetEmitterWithChunkSize(chunkSize: number) {
		this.emitter = await ChunkingEmitterImpl.Emitter({
			client: this.fakedClient,
			chunkSize,
		})
	}

	private static async emitWithOneItem() {
		const items = [this.generateItem()]
		await this.emitWithItems(items)
		return items[0]
	}

	private static get passedPayload() {
		return this.lastTargetAndPayload?.payload
	}

	private static mixinTestContract() {
		const client = this.fakedClient as MercuryTestClient
		client.mixinContract({
			eventSignatures: {
				[this.fqen]: this.eventSignature,
				[this.fqen2]: this.eventSignature,
			},
		})
	}

	private static get eventSignature() {
		return {
			isGlobal: true,
			emitPayloadSchema: buildEmitTargetAndPayloadSchema({
				eventName: this.fqen,
				payloadSchema: buildSchema({
					id: generateId(),
					fields: {
						items: {
							type: 'raw',
							isArray: true,
							options: {
								valueType: 'any',
							},
						},
						items2: {
							type: 'raw',
							isArray: true,
							options: {
								valueType: 'any',
							},
						},
					},
				}),
			}),
		}
	}

	private static get lastTargetAndPayload() {
		return this.allTargetAndPayloads[this.allTargetAndPayloads.length - 1]
	}

	private static get wasEventEmitted() {
		return this.hitCount > 0
	}
}
