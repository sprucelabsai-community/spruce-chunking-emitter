import { eventFaker, fake } from '@sprucelabs/spruce-test-fixtures'
import { test, assert } from '@sprucelabs/test-utils'
import AbstractChunkingEmitterTest from '../support/AbstractChunkingEmitterTest'

@fake.login()
export default class UsingKeysToCancelRunningEmittersTest extends AbstractChunkingEmitterTest {
	@test()
	protected static async canCreateUsingKeysToCancelRunningEmitters() {
		await this.resetEmitter(2)
		this.mixinTestContract()

		let hitCount = 0
		await eventFaker.on(this.fqen, () => {
			hitCount++
		})

		this.uniqueKey = '1'

		const items = this.generateTotalItemValues(4)

		await Promise.all([this.emitWithItems(items), this.emitWithItems(items)])

		assert.isEqual(hitCount, 3)
	}
}
