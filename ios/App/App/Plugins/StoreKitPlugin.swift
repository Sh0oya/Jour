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
                var products: [[String: Any]] = []
                for product in storeProducts {
                    var dict: [String: Any] = [
                        "id": product.id,
                        "title": product.displayName,
                        "description": product.description,
                        "price": product.displayPrice,
                        "priceValue": NSDecimalNumber(decimal: product.price).doubleValue,
                    ]
                    if #available(iOS 16.0, *) {
                        dict["currencyCode"] = product.priceFormatStyle.currencyCode
                    }
                    products.append(dict)
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
                        await transaction.finish()

                        var response: [String: Any] = [
                            "success": true,
                            "transactionId": "\(transaction.id)",
                            "productId": transaction.productID,
                            "originalTransactionId": "\(transaction.originalID)",
                        ]
                        if let expDate = transaction.expirationDate {
                            let formatter = ISO8601DateFormatter()
                            response["expirationDate"] = formatter.string(from: expDate)
                        }
                        if let token = transaction.appAccountToken {
                            response["appAccountToken"] = token.uuidString
                        }
                        call.resolve(response)

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

                for await verificationResult in Transaction.currentEntitlements {
                    if case .verified(let transaction) = verificationResult {
                        if transaction.productType == .autoRenewable {
                            var sub: [String: Any] = [
                                "productId": transaction.productID,
                                "transactionId": "\(transaction.id)",
                                "originalTransactionId": "\(transaction.originalID)",
                            ]
                            if let expDate = transaction.expirationDate {
                                let formatter = ISO8601DateFormatter()
                                sub["expirationDate"] = formatter.string(from: expDate)
                            }
                            activeSubscriptions.append(sub)
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

            for await verificationResult in Transaction.currentEntitlements {
                if case .verified(let transaction) = verificationResult {
                    var entry: [String: Any] = [
                        "productId": transaction.productID,
                        "productType": "\(transaction.productType)",
                        "transactionId": "\(transaction.id)",
                        "isUpgraded": transaction.isUpgraded,
                    ]
                    if let expDate = transaction.expirationDate {
                        let formatter = ISO8601DateFormatter()
                        entry["expirationDate"] = formatter.string(from: expDate)
                    }
                    entitlements.append(entry)
                }
            }

            call.resolve(["entitlements": entitlements])
        }
    }
}
