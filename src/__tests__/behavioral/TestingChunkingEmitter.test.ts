import { EventName } from '@sprucelabs/mercury-types'
import {
	FieldDefinitions,
	SchemaFieldsByName,
	buildSchema,
} from '@sprucelabs/schema'
import { fake } from '@sprucelabs/spruce-test-fixtures'
import { test, assert, generateId } from '@sprucelabs/test-utils'
import { chunkFieldDefinition } from '../../chunkingEmitter/chunkFieldDefinition'
import ChunkingEmitterImpl from '../../chunkingEmitter/ChunkingEmitter'
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

	private static async emit() {
		return this.emitWithItems([this.generateItem()])
	}
}
