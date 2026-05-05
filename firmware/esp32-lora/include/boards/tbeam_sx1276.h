/**
 * LilyGO TTGO T-Beam (ESP32 + SX1276/RFM95 variant, common pinout).
 * Revisions exist (SX1262 on newer boards) — this preset is for **SX1276** wiring.
 * @see https://github.com/Xinyuan-LilyGO/TTGO-T-Beam
 */
#ifndef BOARDS_TBEAM_SX1276_H
#define BOARDS_TBEAM_SX1276_H

#define LORA_CS 18
#define LORA_DIO0 26
#define LORA_DIO1 33
#define LORA_RST 23

/** Onboard u-blox NEO / AT6558 UART (typical T-Beam wiring). */
#define LEP_HAS_ONBOARD_GPS 1
#define GPS_UART_RX 34
#define GPS_UART_TX 12
#define GPS_UART_BAUD 9600

#endif
