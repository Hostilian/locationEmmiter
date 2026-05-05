/**
 * LilyGO TTGO T-Beam **V1.1+** with **SX1262** (USB-C variants common).
 * RadioLib: `SX1262 = Module(CS, DIO1, RST, BUSY)` — BUSY must be correct or init fails (-705).
 * @see https://github.com/jgromes/RadioLib/discussions/580
 */
#ifndef BOARDS_TBEAM_SX1262_H
#define BOARDS_TBEAM_SX1262_H

#define LEP_USE_SX1262 1
#define LORA_CS 18
#define LORA_DIO1 33
#define LORA_RST 23
#define LORA_BUSY 32

#define LEP_HAS_ONBOARD_GPS 1
#define GPS_UART_RX 34
#define GPS_UART_TX 12
#define GPS_UART_BAUD 9600

#ifndef LORA_SX1262_TCXO_V
#define LORA_SX1262_TCXO_V 1.6f
#endif

#endif
