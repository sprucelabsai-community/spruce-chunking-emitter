import { EventName } from '@sprucelabs/mercury-types'
import { fake } from '@sprucelabs/spruce-test-fixtures'
import { test, assert, generateId } from '@sprucelabs/test-utils'
import ChunkingEmitterImpl from '../../ChunkingEmitter'
import MockChunkingEmitter from '../../MockChunkingEmitter'
import AbstractChunkingEmitterTest from '../support/AbstractChunkingEmitterTest'

@fake.login()
export default class TestingChunkingEmitterTest extends AbstractChunkingEmitterTest {
	protected static emitter: MockChunkingEmitter
	protected static async beforeEach(): Promise<void> {
		await super.beforeEach()
		ChunkingEmitterImpl.Class = MockChunkingEmitter
		this.fqen = generateId() as EventName
		this.emitter = (await ChunkingEmitterImpl.Emitter({
			client: this.fakedClient,
		})) as MockChunkingEmitter
	}

	@test()
	protected static async canSetSpyClass() {
		assert.isInstanceOf(this.emitter, MockChunkingEmitter)
	}

	@test()
	protected static async knowsIfWasHit() {
		assert.doesThrow(() => this.emitter.assertDidEmit())
		await this.emit()
		this.emitter.assertDidEmit()
	}

	@test()
	protected static async knowsEventNamePassedToIt() {
		await this.emit()
		assert.doesThrow(() =>
			this.emitter.assertDidEmitEventNamed(generateId() as EventName)
		)
		this.emitter.assertDidEmitEventNamed(this.fqen)
	}

	@test()
	protected static async knowsItemsEmitted() {
		const items = [this.generateItem(), this.generateItem()]
		this.assertDidEmitItemsThrows(items)
		await this.emitWithItems(items)
		this.emitter.assertEmittedItems(items)
		this.assertDidEmitItemsThrows([])
		this.assertDidEmitItemsThrows([this.generateItem()])
	}

	@test()
	protected static async canResetFactoryClassReference() {
		ChunkingEmitterImpl.reset()
		assert.isFalsy(ChunkingEmitterImpl.Class)
	}

	@test()
	protected static async canAssertPayloadKey() {
		this.payloadKey = generateId()
		await this.emit()
		assert.doesThrow(() => this.emitter.assertDidEmitPayloadKey('wrong'))
		this.emitter.assertDidEmitPayloadKey(this.payloadKey)
	}

	private static assertDidEmitItemsThrows(items: { id: string }[]) {
		assert.doesThrow(() => this.emitter.assertEmittedItems(items))
	}

	private static async emit() {
		return this.emitWithItems([this.generateItem()])
	}
}
