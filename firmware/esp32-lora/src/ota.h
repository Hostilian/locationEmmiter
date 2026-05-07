#pragma once

#ifndef OTA_UPDATE_H
#define OTA_UPDATE_H

void ota_setup(const char* ssid, const char* password);
void ota_loop();

#endif // OTA_UPDATE_H
