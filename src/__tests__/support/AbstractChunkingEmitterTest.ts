import { MercuryTestClient } from '@sprucelabs/mercury-client'
import { EventName, EventSignaturesByName } from '@sprucelabs/mercury-types'
import { FieldDefinitions, Schema, buildSchema } from '@sprucelabs/schema'
import { buildEmitTargetAndPayloadSchema } from '@sprucelabs/spruce-event-utils'
import { AbstractSpruceFixtureTest } from '@sprucelabs/spruce-test-fixtures'
import { generateId } from '@sprucelabs/test-utils'
import chunkFieldDefinition from '../../chunkingEmitter/chunkFieldDefinition'
import ChunkingEmitterImpl, {
    ChunkingEmitter,
    ChunkingEmitterEmitOptions,
} from '../../chunkingEmitter/ChunkingEmitter'
import SpyEmitter from '../behavioral/SpyEmitter'

export default abstract class AbstractChunkingEmitterTest extends AbstractSpruceFixtureTest {
    protected static emitter: ChunkingEmitter
    protected static fqen: EventName
    protected static fqen2: EventName
    protected static payloadKey: string
    protected static customPayload?: Record<string, any>
    protected static readonly itemFieldDefinition: FieldDefinitions = {
        type: 'raw',
        isArray: true,
        options: {
            valueType: 'any',
        },
    }

    protected static async beforeEach() {
        await super.beforeEach()

        delete this.customPayload
        this.payloadKey = 'items'
        this.fqen = 'test.test::v2021_01_01' as EventName
        this.fqen2 = 'test2.test3::v2022_02_02' as EventName
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
        options?: Partial<ChunkingEmitterEmitOptions>
    ) {
        await this.emitter.emit({
            eventName: this.fqen,
            items,
            payloadKey: this.payloadKey,
            payload: this.customPayload,
            ...options,
        })
    }

    protected static generateItemValues() {
        return { id: generateId() }
    }

    protected static mixinTestContract() {
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
                id: {
                    type: 'id',
                },
                taco: {
                    type: 'text',
                },
            },
        })

        return this.buildSignature(payload)
    }

    protected static async emitWithTotalItems(total: number) {
        const items = this.generateTotalItemValues(total)
        await this.emitWithItems(items)
        return items
    }

    protected static generateTotalItemValues(total: number) {
        return new Array(total).fill(0).map(() => this.generateItemValues())
    }

    protected static async resetEmitter(chunkSize = 10) {
        this.emitter = (await ChunkingEmitterImpl.Emitter({
            client: this.fakedClient,
            chunkSize,
        })) as SpyEmitter
    }
}
