import Foundation
enum TranscriptScrollAction: Equatable {
    case latestTurnStart
    case transcriptBottom
    case finalAnswer(UUID)
    case showNewContent
}

enum TranscriptScrollPolicy {
    static func action(
        newTurnAdded: Bool,
        completedTogetherTurnID: UUID?,
        isNearBottom: Bool
    ) -> TranscriptScrollAction {
        if let completedTogetherTurnID {
            return isNearBottom ? .finalAnswer(completedTogetherTurnID) : .showNewContent
        }
        if newTurnAdded { return .latestTurnStart }
        return isNearBottom ? .transcriptBottom : .showNewContent
    }
}

func baseline(newTurnAdded:Bool,completedTogetherTurnID:UUID?,isNearBottom:Bool)->TranscriptScrollAction {
 if let completedTogetherTurnID {return isNearBottom ? .finalAnswer(completedTogetherTurnID) : .showNewContent}
 if newTurnAdded || isNearBottom {return .latestTurnStart}
 return .showNewContent
}
let id=UUID()
var total=0,differences=0
for added in [false,true] {for completed in [false,true] {for near in [false,true] {
 let old=baseline(newTurnAdded:added,completedTogetherTurnID:completed ? id : nil,isNearBottom:near)
 let new=TranscriptScrollPolicy.action(newTurnAdded:added,completedTogetherTurnID:completed ? id : nil,isNearBottom:near)
 if !added && !completed && near {precondition(old == .latestTurnStart);precondition(new == .transcriptBottom);differences+=1} else {precondition(old == new)}
 total+=1
}}}
precondition(total==8 && differences==1)
print("PASS: all8 policy combinations; only existing-turn near-bottom case changes from turn-start to transcript-bottom")
