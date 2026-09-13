import Foundation
import Testing
@testable import SessionRuntime

@Test func independentConversationCannotAdoptExistingProviderSession() async throws {
    let runtime = try ConversationSessionRuntime(storage: MemoryStore())
    let first = request(); _ = try await runtime.begin(first)
    try await ack(runtime,first,session:"private-session-A",turn:"turn-1")
    try await complete(runtime,first,session:"private-session-A",turn:"turn-1")
    let unrelated = request(); _ = try await runtime.begin(unrelated)
    await #expect(throws:SessionError.foreignEvent) {
        try await ack(runtime,unrelated,session:"private-session-A",turn:"turn-2")
    }
}
@Test func resetMustNotRebindArchivedProviderHistory() async throws {
    let runtime = try ConversationSessionRuntime(storage: MemoryStore())
    let first = request(); _ = try await runtime.begin(first)
    try await ack(runtime,first,session:"old-sensitive-history",turn:"turn-1")
    try await complete(runtime,first,session:"old-sensitive-history",turn:"turn-1")
    try await runtime.reset(key:first.key)
    let fresh = request(first.key,seed:[.init(.user,"Fresh approved history")]); _ = try await runtime.begin(fresh)
    await #expect(throws:SessionError.foreignEvent) {
        try await ack(runtime,fresh,session:"old-sensitive-history",turn:"turn-2")
    }
}
