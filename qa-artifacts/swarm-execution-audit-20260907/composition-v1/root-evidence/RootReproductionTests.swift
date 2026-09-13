

private actor HoldingWorker: SwarmWorkerExecuting {
 private var total=0
 private var released=false
 private var pending:[CheckedContinuation<Void,Never>]=[]
 func execute(_ request:SwarmWorkerRequest) async throws -> SwarmWorkerResult {
  total += 1
  if !released { await withCheckedContinuation { pending.append($0) } }
  return .init(summary:"done",files:request.task.ownedPaths.map { .init(path:$0.path,bytes:Data("new-\($0.path)".utf8)) })
 }
 func count()->Int {total}
 func release() { released=true;let saved=pending;pending=[];for c in saved {c.resume()} }
}
private func observedCalls(_ worker:HoldingWorker,atLeast:Int) async throws -> Bool {
 let clock=ContinuousClock();let deadline=clock.now.advanced(by:.seconds(2))
 while await worker.count()<atLeast && clock.now<deadline {try await Task.sleep(for:.milliseconds(5))}
 return await worker.count()>=atLeast
}
@Test func rootReproducesOverlappingExecuteDispatchingTwoTeams() async throws {
 let fixture=try Fixture();defer{fixture.cleanup()}
 let worker=HoldingWorker()
 let session=SwarmCompositionSession(plan:makePlan(),worker:worker,verifier:Verifier(),projectRoot:fixture.project,stagingParent:fixture.staging,targetSnapshot:["a.txt":Data("old-a".utf8)])
 let first=Task {await session.execute(approvedContext:"original approved context")}
 let enteredFirst=try await observedCalls(worker,atLeast:2)
 let second=Task {await session.execute(approvedContext:"different context same public run")}
 let enteredDuplicate=try await observedCalls(worker,atLeast:4)
 await worker.release()
 let a=await first.value;let b=await second.value
 #expect(enteredFirst)
 #expect(enteredDuplicate)
 #expect(await worker.count()==4)
 print("REPRODUCED duplicate team dispatch: calls=\(await worker.count()) states=\(a.state.rawValue),\(b.state.rawValue)")
}
@Test func rootReproducesAlreadyCancelledApplyWritingFiles() async throws {
 let fixture=try Fixture();defer{fixture.cleanup()}
 let session=SwarmCompositionSession(plan:makePlan(),worker:Worker(),verifier:Verifier(),projectRoot:fixture.project,stagingParent:fixture.staging,targetSnapshot:["a.txt":Data("old-a".utf8)])
 #expect(await session.execute(approvedContext:"approved").state == .staged)
 let task=Task {
  withUnsafeCurrentTask { $0?.cancel() }
  #expect(Task.isCancelled)
  return try await session.apply()
 }
 let result=try await task.value
 #expect(result.state == .complete)
 #expect(try Data(contentsOf:fixture.project.appendingPathComponent("a.txt"))==Data("new-a.txt".utf8))
 print("REPRODUCED cancelled caller still applies project changes and records complete")
}
