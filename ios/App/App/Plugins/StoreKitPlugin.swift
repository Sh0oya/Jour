import Foundation
import Capacitor
import StoreKit

@available(iOS 15.0, *)
@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKitPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentEntitlements", returnType: CAPPluginReturnPromise),
    ]

    // MARK: - Get Products

    @objc func getProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self) else {
            call.reject("Missing productIds")
            return
        }

        Task {
            do {
                let storeProducts = try await Product.products(for: Set(productIds))
                let products = storeProducts.map { product -> [String: Any] in
                    return [
                        "id": product.id,
                        "title": product.displayName,
                        "description": product.description,
                        "price": product.displayPrice,
                        "priceValue": NSDecimalNumber(decimal: product.price).doubleValue,
                        "currencyCode": product.priceFormatStyle.currencyCode ?? "USD"
                    ]
                }
                call.resolve(["products": products])
            } catch {
                call.reject("Failed to load products: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Purchase

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("Missing productId")
            return
        }

        Task {
            do {
                let storeProducts = try await Product.products(for: [productId])
                guard let product = storeProducts.first else {
                    call.reject("Product not found")
                    return
                }

                let result = try await product.purchase()

                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        // Finish the transaction
                        await transaction.finish()

                        call.resolve([
                            "success": true,
                            "transactionId": String(transaction.id),
                            "productId": transaction.productID,
                            "expirationDate": transaction.expirationDate?.ISO8601Format() ?? "",
                            "originalTransactionId": String(transaction.originalID),
                            "appAccountToken": transaction.appAccountToken?.uuidString ?? ""
                        ])

                    case .unverified(_, let error):
                        call.reject("Transaction unverified: \(error.localizedDescription)")
                    }

                case .userCancelled:
                    call.resolve([
                        "success": false,
                        "cancelled": true
                    ])

                case .pending:
                    call.resolve([
                        "success": false,
                        "pending": true
                    ])

                @unknown default:
                    call.reject("Unknown purchase result")
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Restore Purchases

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()

                var activeSubscriptions: [[String: Any]] = []

                for await result in Transaction.currentEntitlements {
                    if case .verified(let transaction) = result {
                        if transaction.productType == .autoRenewable {
                            activeSubscriptions.append([
                                "productId": transaction.productID,
                                "expirationDate": transaction.expirationDate?.ISO8601Format() ?? "",
                                "transactionId": String(transaction.id),
                                "originalTransactionId": String(transaction.originalID)
                            ])
                        }
                    }
                }

                call.resolve([
                    "success": true,
                    "subscriptions": activeSubscriptions
                ])
            } catch {
                call.reject("Restore failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Get Current Entitlements

    @objc func getCurrentEntitlements(_ call: CAPPluginCall) {
        Task {
            var entitlements: [[String: Any]] = []

            for await result in Transaction.currentEntitlements {
                if case .verified(let transaction) = result {
                    entitlements.append([
                        "productId": transaction.productID,
                        "productType": String(describing: transaction.productType),
                        "expirationDate": transaction.expirationDate?.ISO8601Format() ?? "",
                        "transactionId": String(transaction.id),
                        "isUpgraded": transaction.isUpgraded
                    ])
                }
            }

            call.resolve(["entitlements": entitlements])
        }
    }
}
