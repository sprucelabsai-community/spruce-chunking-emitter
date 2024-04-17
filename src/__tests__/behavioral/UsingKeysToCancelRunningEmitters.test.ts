import { eventFaker, fake } from '@sprucelabs/spruce-test-fixtures'
import { test, assert } from '@sprucelabs/test-utils'
import AbstractChunkingEmitterTest from '../support/AbstractChunkingEmitterTest'

@fake.login()
export default class UsingKeysToCancelRunningEmittersTest extends AbstractChunkingEmitterTest {
    private static hitCount: number
    private static items: { id: string }[]
    protected static async beforeEach() {
        await super.beforeEach()

        await this.resetEmitter(2)
        this.mixinTestContract()
        this.hitCount = 0

        await eventFaker.on(this.fqen, () => {
            this.hitCount++
        })
        this.items = this.generateTotalItemValues(4)
    }

    @test()
    protected static async canCreateUsingKeysToCancelRunningEmitters() {
        const key = '1'
        await Promise.all([this.emitWithKey(key), this.emitWithKey(key)])
        this.assertTotalHits(3)
    }

    @test()
    protected static async honorsUniqueKey() {
        await Promise.all([this.emitWithKey('1'), this.emitWithKey('2')])
        this.assertTotalHits(4)
    }

    @test()
    protected static async clearsOutEmittersWhenTheyAreDone() {
        await Promise.all([this.emitWithKey('1'), this.emitWithKey('2')])
        this.assertTotalHits(4)
        //@ts-ignore
        assert.isLength(this.emitter.emitters, 0)
    }

    private static emitWithKey(key: string): Promise<void> {
        return this.emitWithItems(this.items, {
            uniqueKey: key,
        })
    }

    private static assertTotalHits(expected: number) {
        assert.isEqual(this.hitCount, expected)
    }
}
