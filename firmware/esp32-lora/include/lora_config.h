/**
 * Radio parameters and pins. Board pinouts override defaults when
 * `LEP_BOARD_TBEAM`, `LEP_BOARD_TBEAM_SX1262`, `LEP_BOARD_HELTEC_V2`, or `LEP_BOARD_HELTEC_V3_SX1262`.
 */
#ifndef LORA_CONFIG_H
#define LORA_CONFIG_H

/**
 * Regulatory Regions
 */
typedef enum {
  REG_EU868, // EU 868MHz (ETSI 1% Duty Cycle, 14dBm)
  REG_US915, // US 915MHz (FCC Part 15, 30dBm)
  REG_AU915, // AU 915MHz (ACMA, 30dBm)
  REG_JP920, // JP 920MHz (MIC/TELEC, LBT required, 13dBm/20mW)
} RegulatoryRegion;

// Default region if not overridden by build flags
#ifndef LORA_REGION
#define LORA_REGION REG_EU868
#endif

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

// Region-specific defaults
#if LORA_REGION == REG_EU868
  #define LORA_FREQ 868.0f
  #define LORA_POWER 14
  #define LORA_DUTY_LIMIT 0.01f
  #define LORA_LBT_REQUIRED 0
#elif LORA_REGION == REG_US915
  #define LORA_FREQ 915.0f
  #define LORA_POWER 30
  #define LORA_DUTY_LIMIT 1.0f // No strict duty cycle, but FHSS/DTS rules apply
  #define LORA_LBT_REQUIRED 0
#elif LORA_REGION == REG_AU915
  #define LORA_FREQ 915.0f
  #define LORA_POWER 30
  #define LORA_DUTY_LIMIT 1.0f
  #define LORA_LBT_REQUIRED 0
#elif LORA_REGION == REG_JP920
  #define LORA_FREQ 920.8f
  #define LORA_POWER 13
  #define LORA_DUTY_LIMIT 0.1f // Simplified for JP
  #define LORA_LBT_REQUIRED 1
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

#endif
