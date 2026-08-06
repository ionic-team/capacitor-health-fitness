// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorHealthFitness",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapacitorHealthFitness",
            targets: ["HealthFitnessPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(path: "../ion-ios-healthfitness") // TEMP: local checkout has the representedClassName fix, not yet published to ionic-team/ion-ios-healthfitness - revert to the remote dependency once that's pushed/re-tagged
    ],
    targets: [
        .target(
            name: "HealthFitnessPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "IONHealthFitnessLib", package: "ion-ios-healthfitness")
            ],
            path: "ios/Sources/HealthFitnessPlugin")
    ]
)
