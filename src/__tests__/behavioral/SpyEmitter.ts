import ChunkingEmitterImpl from '../../chunkingEmitter/ChunkingEmitter'

export default class SpyEmitter extends ChunkingEmitterImpl {
    public constructor(options: any) {
        super(options)
    }
    public getChunkSize() {
        return this.chunkSize
    }
}
