import PocketBase from 'pocketbase'

const pb = new PocketBase('/combustivel')
pb.autoCancellation(false)

export default pb
