import Foundation

@objc public class HealthFitness: NSObject {
    @objc public func echo(_ value: String) -> String {
        print(value)
        return value
    }
}
