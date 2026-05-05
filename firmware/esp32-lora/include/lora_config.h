/**
 * Radio parameters and pins. Board pinouts override defaults when
 * `LEP_BOARD_TBEAM`, `LEP_BOARD_TBEAM_SX1262`, `LEP_BOARD_HELTEC_V2`, or `LEP_BOARD_HELTEC_V3_SX1262`.
 */
#ifndef LORA_CONFIG_H
#define LORA_CONFIG_H

#if defined(LEP_BOARD_TBEAM_SX1262)
#include "boards/tbeam_sx1262.h"
#elif defined(LEP_BOARD_TBEAM)
#include "boards/tbeam_sx1276.h"
#elif defined(LEP_BOARD_HELTEC_V3_SX1262)
#include "boards/heltec_wifi_lora_32_v3_sx1262.h"
#elif defined(LEP_BOARD_HELTEC_V2)
#include "boards/heltec_wifi_lora_32_v2.h"
#else
#define LORA_CS 18
#define LORA_DIO0 26
#define LORA_DIO1 33
#define LORA_RST 14
#endif

#ifndef LEP_USE_SX1262
#define LEP_USE_SX1262 0
#endif

#ifndef LORA_FREQ
#define LORA_FREQ 868.0f
#endif
#ifndef LORA_BW
#define LORA_BW 125.0f
#endif
#ifndef LORA_SF
#define LORA_SF 9
#endif
#ifndef LORA_CR
#define LORA_CR 7
#endif
#ifndef LORA_POWER
#define LORA_POWER 17
#endif

#endif
