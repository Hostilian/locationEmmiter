#pragma once

#ifndef BLE_MANAGER_H
#define BLE_MANAGER_H

#include <stdint.h>
#include <stddef.h>

void ble_manager_setup(const uint8_t* device_id);
void ble_manager_update_payload(const uint8_t* payload, size_t len);

#endif // BLE_MANAGER_H
