import { EventName } from '@sprucelabs/mercury-types'
import { FieldDefinitions, buildSchema } from '@sprucelabs/schema'
import { eventFaker, fake } from '@sprucelabs/spruce-test-fixtures'
import { test, assert, errorAssert, generateId } from '@sprucelabs/test-utils'
import { chunkFieldDefinition } from '../../chunkingEmitter/chunkFieldDefinition'
import ChunkingEmitterImpl from '../../chunkingEmitter/ChunkingEmitter'
import AbstractChunkingEmitterTest from '../support/AbstractChunkingEmitterTest'

@fake.login()
export default class ChunkingEmitterTest extends AbstractChunkingEmitterTest {
	private static fqen2: EventName
	private static allTargetAndPayloads: any[] = []
	private static hitCount: number
	protected static emitter: SpyEmitter
	private static readonly itemFieldDefinition: FieldDefinitions = {
		type: 'raw',
		isArray: true,
		options: {
			valueType: 'any',
		},
	}

	protected static async beforeEach() {
		await super.beforeEach()

		ChunkingEmitterImpl.Class = SpyEmitter

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
		assert.isEqualDeep(this.lastEmittedPayload?.items2, [item])
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
		const items = await this.emitWithTotalItems(total)
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

		await this.emitWithTotalItems(10)
		assert.isEqual(hitCount, 10)
		this.assertTotalErrors(1)
	}

	@test()
	protected static async accuratelyTracksTotalErrors() {
		await this.makeEventThrow()
		await this.assertEveryEmitErrors()
		await this.assertEveryEmitErrors()
	}

	@test()
	protected static async includesChuckingPlacementInPayloadForOneItem() {
		await this.emitWithOneItem()
		assert.isEqualDeep(this.lastEmittedPayload?.chunk, {
			total: 1,
			current: 0,
		})
	}

	@test()
	protected static async includesChuckingPlacementInPayloadForTwoItems() {
		await this.emitWithTotalItems(2)
		const expected = [
			{ total: 2, current: 0 },
			{ total: 2, current: 1 },
		]
		assert.isEqualDeep(
			this.allTargetAndPayloads.map((t) => t.payload.chunk),
			expected
		)
	}

	@test()
	protected static async includesTargetInEmit() {
		this.fqen = generateId() as EventName

		const payloadSchema = buildSchema({
			id: generateId(),
			fields: {
				items: this.itemFieldDefinition,
				chunk: chunkFieldDefinition(),
			},
		})

		const targetSchema = buildSchema({
			id: generateId(),
			fields: {
				personId: {
					type: 'id',
				},
			},
		})

		this.mixinEventSignatures({
			[this.fqen]: this.buildSignature(payloadSchema, targetSchema),
		})

		let passedTarget: Record<string, any> | undefined

		//@ts-ignore
		await eventFaker.on(this.fqen, ({ target }) => {
			passedTarget = target
		})

		const target = { personId: generateId() }
		await this.emitWithOneItem(target)
		assert.isEqualDeep(passedTarget, target)
	}

	@test()
	protected static async defaultsToChunkSizeOfTen() {
		this.emitter = (await ChunkingEmitterImpl.Emitter({
			client: this.fakedClient,
		})) as SpyEmitter

		assert.isEqualDeep(this.emitter.getChunkSize(), 10)
	}

	private static async makeEventThrow() {
		await eventFaker.on(this.fqen, () => {
			throw new Error('Failed')
		})
	}

	private static assertTotalErrors(expected: number) {
		assert.isEqual(this.emitter.getTotalErrors(), expected)
	}

	private static assertTotalEmits(total: number) {
		assert.isEqual(this.hitCount, total)
	}

	private static async emitWithTotalItems(total: number) {
		const items = new Array(total).fill(0).map(() => this.generateItem())
		await this.emitWithItems(items)
		return items
	}

	private static assertLastEmittedItemsEqual(items: Record<string, any>[]) {
		assert.isEqualDeep(this.lastEmittedPayload?.items, items)
	}

	private static async resetEmitterWithChunkSize(chunkSize: number) {
		this.emitter = (await ChunkingEmitterImpl.Emitter({
			client: this.fakedClient,
			chunkSize,
		})) as SpyEmitter
	}

	private static async emitWithOneItem(target?: Record<string, any>) {
		const items = [this.generateItem()]
		await this.emitWithItems(items, target)
		return items[0]
	}

	private static get lastEmittedPayload() {
		return this.lastTargetAndPayload?.payload
	}

	private static mixinTestContract() {
		const eventSignatures = {
			[this.fqen]: this.eventSignature,
			[this.fqen2]: this.eventSignature,
		}
		this.mixinEventSignatures(eventSignatures)
	}

	private static get eventSignature() {
		const payload = buildSchema({
			id: generateId(),
			fields: {
				items: this.itemFieldDefinition,
				items2: this.itemFieldDefinition,
				chunk: chunkFieldDefinition(),
			},
		})

		return this.buildSignature(payload)
	}

	private static async assertEveryEmitErrors() {
		await this.emitWithTotalItems(10)
		this.assertTotalErrors(10)
	}

	private static get lastTargetAndPayload() {
		return this.allTargetAndPayloads[this.allTargetAndPayloads.length - 1]
	}

	private static get wasEventEmitted() {
		return this.hitCount > 0
	}
}

class SpyEmitter extends ChunkingEmitterImpl {
	public constructor(options: any) {
		super(options)
	}
	public getChunkSize() {
		return this.chunkSize
	}
}
