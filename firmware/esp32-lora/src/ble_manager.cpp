#include "ble_manager.h"
#include <Arduino.h>

#if defined(ESP32)
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLESecurity.h>
#include <BLE2902.h>

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

static BLECharacteristic* pCharacteristic = nullptr;

class MySecurity : public BLESecurityCallbacks {
  uint32_t onPassKeyRequest() {
    Serial.println("BLE: PassKeyRequest");
    return 123456;
  }
  void onPassKeyNotify(uint32_t pass_key) {
    Serial.printf("BLE: The passkey is %06d\n", pass_key);
  }
  bool onConfirmPIN(uint32_t pass_key) {
    Serial.printf("BLE: Confirm PIN %06d\n", pass_key);
    return true;
  }
  bool onSecurityRequest() {
    Serial.println("BLE: Security Request");
    return true;
  }
  void onAuthenticationComplete(esp_ble_auth_cmpl_t auth_cmpl) {
    if (auth_cmpl.success) {
      Serial.println("BLE: Authentication Success");
    } else {
      Serial.println("BLE: Authentication Failed");
    }
  }
};

void ble_manager_setup(const uint8_t* device_id) {
  char ble_name[32];
  snprintf(ble_name, sizeof(ble_name), "LEP Node %02X%02X", device_id[6], device_id[7]);
  
  BLEDevice::init(ble_name);
  BLEDevice::setEncryptionLevel(ESP_BLE_SEC_ENCRYPT);
  BLEDevice::setSecurityCallbacks(new MySecurity());

  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_WRITE  |
                      BLECharacteristic::PROPERTY_NOTIFY |
                      BLECharacteristic::PROPERTY_INDICATE
                    );

  // Require Security (Secure Connections + MITM Bonding)
  pCharacteristic->setAccessPermissions(ESP_GATT_PERM_READ_ENCRYPTED | ESP_GATT_PERM_WRITE_ENCRYPTED);
  
  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  
  pAdvertising->setMinPreferred(0x12);
  
  BLESecurity *pSecurity = new BLESecurity();
  pSecurity->setAuthenticationMode(ESP_LE_AUTH_REQ_SC_MITM_BOND);
  pSecurity->setCapability(ESP_IO_CAP_OUT);
  pSecurity->setInitEncryptionKey(ESP_BLE_ENC_KEY_MASK | ESP_BLE_ID_KEY_MASK);

  BLEDevice::startAdvertising();
  Serial.printf("BLE: Advertising started as '%s' with Secure Connections\n", ble_name);
}

void ble_manager_update_payload(const uint8_t* payload, size_t len) {
  if (pCharacteristic) {
    pCharacteristic->setValue((uint8_t*)payload, len);
    pCharacteristic->notify();
  }
}
#else
void ble_manager_setup(const uint8_t* device_id) {}
void ble_manager_update_payload(const uint8_t* payload, size_t len) {}
#endif
