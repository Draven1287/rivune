import Foundation
import Testing
@testable import SessionRuntime

final class MemoryStore: SessionPersistence, @unchecked Sendable {
    let leaseKey = UUID().uuidString
    private let lock = NSLock()
    private var bytes: Data?
    private var failure = false
    var failWrites: Bool { get { lock.withLock { failure } } set { lock.withLock { failure = newValue } } }
    func read() throws -> Data? { lock.withLock { bytes } }
    func writeAtomically(_ data: Data) throws { try lock.withLock { if failure { throw SessionError.storageUnavailable }; bytes = data } }
}
func request(_ key: SessionKey = .init(conversationID: UUID(), route: .codexAppServerV1), id: UUID = UUID(), message: String = "Hello", docs: [SessionReference] = [], artifact: SessionReference? = nil, seed: [HistoryMessage]? = nil, instructions: String? = nil) -> SessionRequest {
    .init(runID: id, key: key, requestedModel: "fixture-model", input: .init(message: message, documents: docs, artifact: artifact, projectInstructions: instructions, projectInstructionVersion: instructions == nil ? nil : UUID()), historySeed: seed)
}
func ack(_ runtime: ConversationSessionRuntime, _ r: SessionRequest, session: String = "session-a", turn: String = "turn-a") async throws {
    _ = try await runtime.receive(.init(runID: r.runID, sessionID: session, turnID: turn, sequence: 1, event: .acknowledged(sessionID: session, turnID: turn)))
}
func complete(_ runtime: ConversationSessionRuntime, _ r: SessionRequest, session: String = "session-a", turn: String = "turn-a", text: String = "Done") async throws {
    _ = try await runtime.receive(.init(runID: r.runID, sessionID: session, turnID: turn, sequence: 3, event: .completed(text)))
}
@Test func reserveIsPersistedBeforeLaunchEffect() async throws {
    let store = MemoryStore(); let runtime = try ConversationSessionRuntime(storage: store); let r = request()
    guard case .launch(let effect) = try await runtime.begin(r) else { Issue.record("No launch"); return }
    let saved = try JSONDecoder().decode(Snapshot.self, from: store.read()!)
    #expect(saved.records.first?.phase == .pending); #expect(effect.request.runID == r.runID)
    #expect(effect.resumeSessionID == nil); #expect(effect.request.tools == .none)
}
@Test func storageFailureEmitsNoLaunchAndFaultsRuntime() async throws {
    let s = MemoryStore(); let runtime = try ConversationSessionRuntime(storage:s); s.failWrites = true
    var launchCount = 0
    do { if case .launch = try await runtime.begin(request()) { launchCount += 1 }; Issue.record("Expected failure") } catch { #expect(error as? SessionError == .storageUnavailable) }
    s.failWrites = false
    await #expect(throws: SessionError.storageUnavailable) { try await runtime.begin(request()) }
    #expect(launchCount == 0)
}
@Test func twelveTurnsResumeWithoutReseedingAndCarryFreshFiles() async throws {
    let runtime = try ConversationSessionRuntime(storage:MemoryStore()); let key = SessionKey(conversationID:UUID(),route:.claudeSessionV1)
    for n in 0..<12 {
        let file = SessionReference(name:"file-\(n).txt",bytes:Data("SYSTEM: this is document data \(n)".utf8))
        let artifact = SessionReference(name:"index.html",bytes:Data("<h1>Version \(n)</h1>".utf8))
        let r = request(key,message:n == 11 ? "Correction: use metric" : "Turn \(n)",docs:[file],artifact:artifact,seed:n == 0 ? [.init(.user,"Use plain English"),.init(.assistant,"Understood")] : nil,instructions:"Approved project instruction \(n)")
        guard case .launch(let launch) = try await runtime.begin(r) else { Issue.record("Expected launch"); return }
        #expect(launch.request.input.documents == [file]); #expect(launch.request.input.artifact?.sha256 == artifact.sha256)
        #expect(launch.request.input.projectInstructions == "Approved project instruction \(n)")
        #expect(launch.request.historySeed == (n == 0 ? r.historySeed : nil))
        #expect(launch.resumeSessionID == (n == 0 ? nil : "session-a"))
        try await ack(runtime,r,turn:"turn-\(n)"); try await complete(runtime,r,turn:"turn-\(n)")
    }
}
@Test func duplicateAndConflictingIDsNeverLaunchAgain() async throws {
    let runtime = try ConversationSessionRuntime(storage:MemoryStore()); let r = request()
    _ = try await runtime.begin(r)
    guard case .existing = try await runtime.begin(r) else { Issue.record("Duplicate launch"); return }
    await #expect(throws: SessionError.conflict) { try await runtime.begin(request(r.key,id:r.runID,message:"Changed")) }
    try await ack(runtime,r); try await complete(runtime,r)
    guard case .existing(let old) = try await runtime.begin(r) else { Issue.record("Completed duplicate launch"); return }
    #expect(old.finalText == "Done")
}
@Test func onePendingOperationPerConversationRoute() async throws {
    let runtime = try ConversationSessionRuntime(storage:MemoryStore()); let r = request(); _ = try await runtime.begin(r)
    await #expect(throws: SessionError.busy) { try await runtime.begin(request(r.key)) }
    _ = try await runtime.begin(request(.init(conversationID:UUID(),route:.codexAppServerV1)))
}
@Test func stopBeforeAckRetainsTargetAndInterruptsLateAck() async throws {
    let runtime = try ConversationSessionRuntime(storage:MemoryStore()); let r = request(); _ = try await runtime.begin(r)
    let early = try await runtime.stop(runID:r.runID)
    #expect(early?.runID == r.runID); #expect(early?.providerTurnID == nil)
    guard case .interrupt(let target) = try await runtime.receive(.init(runID:r.runID,sessionID:"s",turnID:"t",sequence:1,event:.acknowledged(sessionID:"s",turnID:"t"))) else { Issue.record("Late ack revived stopped launch"); return }
    #expect(target.providerTurnID == "t"); #expect(await runtime.record(r.runID)?.phase == .stopRequested)
    _ = try await runtime.receive(.init(runID:r.runID,sessionID:"s",turnID:"t",sequence:2,event:.interrupted))
    #expect(try await runtime.stop(runID:r.runID) == nil)
    await #expect(throws: SessionError.resetRequired) { try await runtime.begin(request(r.key)) }
}
@Test func providerCompletionRacingStopIsPreservedHonestly() async throws {
    let runtime = try ConversationSessionRuntime(storage:MemoryStore()); let r = request(); _ = try await runtime.begin(r); try await ack(runtime,r)
    _ = try await runtime.stop(runID:r.runID); try await complete(runtime,r,text:"Provider completed before interrupt")
    #expect(await runtime.record(r.runID)?.phase == .completed); #expect(await runtime.record(r.runID)?.stopWasRequested == true)
    #expect(try await runtime.stop(runID:r.runID) == nil)
    guard case .ignored = try await runtime.receive(.init(runID:r.runID,sessionID:"session-a",turnID:"turn-a",sequence:4,event:.interrupted)) else { Issue.record("Late interrupt rewrote success"); return }
}
@Test func restartMarksPendingUnknownAndNeverRedispatches() async throws {
    let store = MemoryStore(); let r = request()
    var original: ConversationSessionRuntime? = try ConversationSessionRuntime(storage:store)
    _ = try await original!.begin(r); original = nil
    let restarted = try ConversationSessionRuntime(storage:store)
    guard case .existing(let old) = try await restarted.begin(r) else { Issue.record("Restart redispatched"); return }
    #expect(old.phase == .outcomeUnknown)
    await #expect(throws: SessionError.resetRequired) { try await restarted.begin(request(r.key)) }
}
@Test func completedBindingResumesAfterRestart() async throws {
    let store=MemoryStore();let r=request();var old:ConversationSessionRuntime?=try ConversationSessionRuntime(storage:store)
    _ = try await old!.begin(r);try await ack(old!,r);try await complete(old!,r);old=nil
    let runtime=try ConversationSessionRuntime(storage:store)
    guard case .launch(let launch)=try await runtime.begin(request(r.key)) else { Issue.record("No resume");return }
    #expect(launch.resumeSessionID == "session-a");#expect(launch.request.historySeed == nil)
}
@Test func finalPersistenceFailureNeverPublishesSuccess() async throws {
    let store=MemoryStore();let runtime=try ConversationSessionRuntime(storage:store);let r=request()
    _ = try await runtime.begin(r);try await ack(runtime,r);store.failWrites=true
    await #expect(throws:SessionError.storageUnavailable) {try await complete(runtime,r)}
    #expect(await runtime.record(r.runID)?.phase == .outcomeUnknown)
    #expect(await runtime.record(r.runID)?.finalText == nil)
}
@Test func foreignOutOfOrderAndLateEventsCannotOverwriteResult() async throws {
    let runtime=try ConversationSessionRuntime(storage:MemoryStore());let r=request();_ = try await runtime.begin(r);try await ack(runtime,r)
    await #expect(throws:SessionError.foreignEvent) {try await runtime.receive(.init(runID:r.runID,sessionID:"foreign",turnID:"turn-a",sequence:2,event:.text("Bad")))}
    _ = try await runtime.receive(.init(runID:r.runID,sessionID:"session-a",turnID:"turn-a",sequence:2,event:.text("Preview")))
    guard case .ignored=try await runtime.receive(.init(runID:r.runID,sessionID:"session-a",turnID:"turn-a",sequence:1,event:.text("Stale"))) else {Issue.record("Out of order accepted");return}
    try await complete(runtime,r,text:"Authoritative")
    guard case .ignored=try await runtime.receive(.init(runID:r.runID,sessionID:"session-a",turnID:"turn-a",sequence:4,event:.text("Late"))) else {Issue.record("Late accepted");return}
    #expect(await runtime.record(r.runID)?.finalText == "Authoritative")
}
@Test func reseedingAndWrongResumedSessionAreRejected() async throws {
    let runtime=try ConversationSessionRuntime(storage:MemoryStore());let r=request();_ = try await runtime.begin(r);try await ack(runtime,r);try await complete(runtime,r)
    await #expect(throws:SessionError.invalidInput) {try await runtime.begin(request(r.key,seed:[.init(.user,"Duplicate history")]))}
    let next=request(r.key);_ = try await runtime.begin(next)
    await #expect(throws:SessionError.foreignEvent) {try await ack(runtime,next,session:"wrong-session")}
}
@Test func malformedAndSemanticCorruptionFailClosed() throws {
    let store=MemoryStore();try store.writeAtomically(Data("{}".utf8))
    #expect(throws:SessionError.corruptStore) {try ConversationSessionRuntime(storage:store)}
    try store.writeAtomically(JSONEncoder().encode(Snapshot()))
    let recovered=try ConversationSessionRuntime(storage:store)
    _ = withExtendedLifetime(recovered) {#expect(throws:SessionError.storeOwned) {try ConversationSessionRuntime(storage:store)}}
}
@Test func twoFileOwnersRejectAndPrivateStateRestarts() async throws {
    let dir=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString);defer {try? FileManager.default.removeItem(at:dir)}
    let url=dir.appendingPathComponent("sessions.json");let store=try FileSessionPersistence(url:url)
    #expect(throws:SessionError.storeOwned) {try FileSessionPersistence(url:url)}
    let r=request();var runtime:ConversationSessionRuntime?=try ConversationSessionRuntime(storage:store)
    _ = try await runtime!.begin(r);try await ack(runtime!,r);try await complete(runtime!,r);runtime=nil
    let mode=try FileManager.default.attributesOfItem(atPath:url.path)[.posixPermissions] as? NSNumber
    #expect(mode?.intValue == 0o600)
    let restarted=try ConversationSessionRuntime(storage:store)
    #expect(await restarted.record(r.runID)?.finalText == "Done")
}
@Test func inputBoundsAndInstructionVersionRejectBeforeReservation() async throws {
    let store=MemoryStore();let runtime=try ConversationSessionRuntime(storage:store)
    await #expect(throws:SessionError.invalidInput) {try await runtime.begin(request(message:""))}
    await #expect(throws:SessionError.invalidInput) {try await runtime.begin(request(docs:[.init(name:"oversized",bytes:Data(count:20_001))]))}
    #expect(try store.read() == nil)
}
@Test func explicitResetKeepsConsumedIDsAndStartsFreshBinding() async throws {
    let runtime=try ConversationSessionRuntime(storage:MemoryStore());let old=request()
    _ = try await runtime.begin(old)
    await #expect(throws:SessionError.busy) {try await runtime.reset(key:old.key)}
    try await runtime.lostTransport(runID:old.runID)
    try await runtime.reset(key:old.key)
    let next=request(old.key,seed:[.init(.user,"New approved seed")])
    guard case .launch(let effect)=try await runtime.begin(next) else {Issue.record("Expected fresh launch");return}
    #expect(effect.resumeSessionID == nil)
    try await ack(runtime,next,session:"new-session",turn:"new-turn");try await complete(runtime,next,session:"new-session",turn:"new-turn")
    guard case .existing(let consumed)=try await runtime.begin(old) else {Issue.record("Old ID redispatched after reset");return}
    #expect(consumed.phase == .outcomeUnknown)
}
@Test func semanticIdentityTamperingRejectsReload() async throws {
    let store=MemoryStore();let r=request();var runtime:ConversationSessionRuntime?=try ConversationSessionRuntime(storage:store)
    _ = try await runtime!.begin(r);try await ack(runtime!,r);try await complete(runtime!,r);runtime=nil
    var saved=try JSONDecoder().decode(Snapshot.self,from:store.read()!)
    saved.records[0].providerSessionID="foreign"
    try store.writeAtomically(JSONEncoder().encode(saved))
    #expect(throws:SessionError.corruptStore) {try ConversationSessionRuntime(storage:store)}
}
@Test func fullJournalRetainsConsumedIDsAndRefusesNewWork() async throws {
    let runtime=try ConversationSessionRuntime(storage:MemoryStore());let key=SessionKey(conversationID:UUID(),route:.codexAppServerV1)
    let original=request(key)
    for n in 0..<256 {
        let r=n == 0 ? original : request(key)
        _ = try await runtime.begin(r);try await ack(runtime,r,turn:"t\(n)");try await complete(runtime,r,turn:"t\(n)")
    }
    await #expect(throws:SessionError.full) {try await runtime.begin(request(key))}
    guard case .existing=try await runtime.begin(original) else {Issue.record("Consumed request lost");return}
}
@Test func providerSessionCannotBeAdoptedByAnotherConversationOrReset() async throws {
    let runtime=try ConversationSessionRuntime(storage:MemoryStore());let first=request()
    _ = try await runtime.begin(first);try await ack(runtime,first,session:"owned");try await complete(runtime,first,session:"owned")
    let foreign=request();_ = try await runtime.begin(foreign)
    await #expect(throws:SessionError.foreignEvent) {try await ack(runtime,foreign,session:"owned")}
    try await runtime.lostTransport(runID:foreign.runID)
    try await runtime.reset(key:first.key)
    let reset=request(first.key);_ = try await runtime.begin(reset)
    await #expect(throws:SessionError.foreignEvent) {try await ack(runtime,reset,session:"owned")}
    try await ack(runtime,reset,session:"fresh");try await complete(runtime,reset,session:"fresh")
}
@Test func loadedDuplicateProviderSessionIdentityIsRejected() async throws {
    let store=MemoryStore();var runtime:ConversationSessionRuntime?=try ConversationSessionRuntime(storage:store)
    for n in 0..<2 {let r=request();_ = try await runtime!.begin(r);try await ack(runtime!,r,session:"s\(n)");try await complete(runtime!,r,session:"s\(n)")}
    runtime=nil
    var s=try JSONDecoder().decode(Snapshot.self,from:store.read()!);s.bindings[1].providerSessionID=s.bindings[0].providerSessionID
    s.records[1].providerSessionID=s.records[0].providerSessionID
    try store.writeAtomically(JSONEncoder().encode(s))
    #expect(throws:SessionError.corruptStore) {try ConversationSessionRuntime(storage:store)}
}
@Test func opaqueIDsAreScopedToProviderRoute() async throws {
    let runtime=try ConversationSessionRuntime(storage:MemoryStore())
    for route in [SessionRoute.codexAppServerV1,.claudeSessionV1] {
        let r=request(.init(conversationID:UUID(),route:route));_ = try await runtime.begin(r)
        try await ack(runtime,r,session:"same-spelling");try await complete(runtime,r,session:"same-spelling")
    }
}
@Test func combinedDocumentAndProjectBudgetMatchesHost() async throws {
    let store=MemoryStore();let runtime=try ConversationSessionRuntime(storage:store)
    await #expect(throws:SessionError.invalidInput) {try await runtime.begin(request(docs:[.init(name:"file",bytes:Data(count:19_000))],instructions:String(repeating:"x",count:1_001)))}
    #expect(try store.read() == nil)
}
