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
        .package(url: "https://github.com/ionic-team/ion-ios-healthfitness.git", from: "1.0.1")
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
