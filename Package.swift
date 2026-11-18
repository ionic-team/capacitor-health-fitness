// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorHealthFitness",
    platforms: [.iOS(.v16)],
    products: [
        .library(
            name: "CapacitorHealthFitness",
            targets: ["HealthFitnessPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor.git", from: "9.0.0-rc.0"),
        .package(url: "https://github.com/ionic-team/ion-ios-healthfitness.git", from: "2.0.0")
    ],
    targets: [
        .target(
            name: "HealthFitnessPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor"),
                .product(name: "IONHealthFitnessLib", package: "ion-ios-healthfitness")
            ],
            path: "ios/Sources/HealthFitnessPlugin")
    ]
)
