import { BatchArrayCursor } from '@sprucelabs/data-stores'
import { EventName } from '@sprucelabs/mercury-types'
import {
	FieldDefinitions,
	SchemaFieldsByName,
	buildSchema,
} from '@sprucelabs/schema'
import { fake } from '@sprucelabs/spruce-test-fixtures'
import { test, assert, generateId } from '@sprucelabs/test-utils'
import { chunkFieldDefinition } from '../../chunkingEmitter/chunkFieldDefinition'
import ChunkingEmitterImpl, {
	ChunkingEmitterEmitOptions,
} from '../../chunkingEmitter/ChunkingEmitter'
import MockChunkingEmitter from '../../chunkingEmitter/MockChunkingEmitter'
import AbstractChunkingEmitterTest from '../support/AbstractChunkingEmitterTest'

@fake.login()
export default class TestingChunkingEmitterTest extends AbstractChunkingEmitterTest {
	protected static emitter: MockChunkingEmitter
	private static readonly itemsField: FieldDefinitions = {
		type: 'raw',
		isArray: true,
		options: {
			valueType: 'any',
		},
	}

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
		this.emitter.assertDidNotEmit()
		await this.emit()
		this.emitter.assertDidEmit()
		assert.doesThrow(() => this.emitter.assertDidNotEmit())
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
		const items = [this.generateItemValues(), this.generateItemValues()]
		this.assertDidEmitItemsThrows(items)
		await this.emitWithItems(items)
		this.emitter.assertEmittedItems(items)
		this.assertDidEmitItemsThrows([])
		this.assertDidEmitItemsThrows([this.generateItemValues()])
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

	@test()
	protected static async throwsIfEventSignatureIsBad() {
		const sigWithoutChunking = this.buildSignatureWithPayloadFields({
			items: this.itemsField,
		})

		const sigWithChunking = this.buildSignatureWithPayloadFields({
			items: this.itemsField,
			chunk: chunkFieldDefinition(),
		})

		const fqenWithChunk = generateId() as EventName
		this.mixinEventSignatures({
			[this.fqen]: sigWithoutChunking,
			[fqenWithChunk]: sigWithChunking,
		})

		const fqen = this.fqen
		this.assertSignatureDoesNotConformToChunk(fqen)
		this.assertSignatureDoesConfirmToChunk(fqenWithChunk)
	}

	@test()
	protected static async throwsIfChunkIsThereButBad() {
		this.assertChunkFieldThrowsWithBadMatch({
			type: 'number',
		})
		this.assertChunkFieldThrowsWithBadMatch({
			type: 'schema',
			options: {
				schema: buildSchema({
					id: generateId(),
					fields: {
						test: {
							type: 'number',
						},
					},
				}),
			},
		})
	}

	@test()
	protected static async canGetMockInstance() {
		assert.isEqual(MockChunkingEmitter.getLastInstance(), this.emitter)
	}

	@test()
	protected static async throwsIfNoInstance() {
		MockChunkingEmitter.reset()
		assert.doesThrow(() => MockChunkingEmitter.getLastInstance())
	}

	@test()
	protected static async assertsTarget() {
		const target = {
			organizationId: generateId(),
			userId: generateId(),
		}

		this.assertDidNotEmitWithTarget(target)
		await this.emit(target)
		this.emitter.assertDidEmitTarget(target)
		this.assertDidNotEmitWithTarget({
			organizationId: generateId(),
			userId: generateId(),
		})
	}

	@test()
	protected static async canAssertWasSentCursor() {
		assert.doesThrow(() => this.emitter.assertDidReceiveCursor())
		const cursor = new BatchArrayCursor([])
		await this.emit({}, { batchCursor: cursor })
		this.emitter.assertDidReceiveCursor()
	}

	@test()
	protected static async canAssertLastPayload() {
		const payload = {
			id: generateId(),
		}
		assert.doesThrow(() => this.emitter.assertEmittedPayloadIncludes({}))

		await this.emit(undefined, { payload })

		this.emitter.assertEmittedPayloadIncludes(payload)

		assert.doesThrow(() => this.emitter.assertEmittedPayloadIncludes({}))
	}

	private static assertDidNotEmitWithTarget(target: Record<string, any>) {
		assert.doesThrow(() => this.emitter.assertDidEmitTarget(target))
	}

	private static assertChunkFieldThrowsWithBadMatch(
		chunkSig: FieldDefinitions
	) {
		const fqen = generateId() as EventName
		const sig = this.buildSignatureWithPayloadFields({
			items: this.itemsField,
			chunk: chunkSig,
		})

		this.mixinEventSignatures({
			[fqen]: sig,
		})

		this.assertSignatureDoesNotConformToChunk(fqen)
	}

	private static assertSignatureDoesConfirmToChunk(fqenWithChunk: EventName) {
		this.emitter.assertEventHonorsChunkingSignature(fqenWithChunk)
	}

	private static assertSignatureDoesNotConformToChunk(fqen: EventName) {
		assert.doesThrow(() =>
			this.emitter.assertEventHonorsChunkingSignature(fqen)
		)
	}

	private static buildSignatureWithPayloadFields(fields: SchemaFieldsByName) {
		return this.buildSignature(
			buildSchema({
				id: generateId(),
				fields,
			})
		)
	}

	private static assertDidEmitItemsThrows(items: { id: string }[]) {
		assert.doesThrow(() => this.emitter.assertEmittedItems(items))
	}

	private static async emit(
		target?: Record<string, any>,
		options?: Partial<ChunkingEmitterEmitOptions>
	) {
		return this.emitWithItems([this.generateItemValues()], {
			target,
			...options,
		})
	}
}
