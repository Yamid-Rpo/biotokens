/*
 * Bio Tokens — Firmware ESP32 (Panel de verificación)
 * ---------------------------------------------------
 * Envía lecturas de sensores al endpoint de ingesta de Bio Tokens.
 *
 * Hardware: ESP32 (Wi-Fi 2.4 GHz, Bluetooth, núcleos Xtensa LX6 32-bit,
 * coprocesador de ultra bajo consumo, múltiples periféricos ADC/I2C/UART).
 *
 * Librerías (Arduino IDE / PlatformIO, núcleo esp32 de Espressif):
 *   - WiFi.h        (incluida en el núcleo)
 *   - HTTPClient.h  (incluida en el núcleo)
 *
 * Pasos:
 *   1. Registra el dispositivo en Bio Tokens: Proyecto → Panel → Dispositivos.
 *   2. Copia el DEVICE_ID y el API_KEY (se muestran una sola vez).
 *   3. Ajusta WIFI_SSID / WIFI_PASS y el pin del sensor.
 *   4. Compila y sube al ESP32.
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ---------- Configuración ----------
const char* WIFI_SSID   = "TU_WIFI";          // Red Wi-Fi 2.4 GHz
const char* WIFI_PASS   = "TU_CLAVE_WIFI";
const char* API_URL     = "https://biotokens.lovable.app/api/public/iot-readings";
const char* DEVICE_ID   = "PEGAR_DEVICE_ID";  // uuid del dispositivo registrado
const char* API_KEY     = "PEGAR_API_KEY";    // btk_... (mostrada una sola vez)

const char* METRIC      = "soil_moisture";    // nombre de la métrica
const char* UNIT        = "percent";          // unidad (opcional)
const int   SENSOR_PIN  = 34;                 // ADC1 (ej.: humedad de suelo)
const uint32_t REPORT_INTERVAL_MS = 60000;    // frecuencia de reporte: 1 min

// ---------- Lectura del sensor ----------
float readSensor() {
  // ADC de 12 bits (0-4095). Ejemplo: humedad de suelo capacitiva.
  int raw = analogRead(SENSOR_PIN);
  float pct = 100.0f - (raw / 4095.0f) * 100.0f;  // ajusta la calibración a tu sensor
  return pct;
}

// ---------- Wi-Fi ----------
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Conectando a Wi-Fi");
  uint8_t tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  Serial.println();
  Serial.printf("Wi-Fi: %s  IP: %s  RSSI: %d dBm\n",
                WiFi.status() == WL_CONNECTED ? "OK" : "FALLO",
                WiFi.localIP().toString().c_str(), WiFi.RSSI());
}

// ---------- Envío de lectura ----------
bool sendReading(float value) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Api-Key", API_KEY);

  char payload[192];
  snprintf(payload, sizeof(payload),
           "{\"metric\":\"%s\",\"value\":%.2f,\"unit\":\"%s\"}",
           METRIC, value, UNIT);

  int code = http.POST(payload);
  Serial.printf("POST %s -> %d  (%s)\n", payload, code,
                code > 0 ? http.getString().c_str() : "sin respuesta");
  http.end();
  return code == 200;
}

// ---------- Ciclo principal ----------
void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  connectWiFi();
}

void loop() {
  connectWiFi();
  float value = readSensor();
  sendReading(value);

  // Ahorro de energía (coprocesador ULP / deep sleep):
  // descomenta para proyectos alimentados con batería.
  // esp_sleep_enable_timer_wakeup(REPORT_INTERVAL_MS * 1000ULL);
  // esp_deep_sleep_start();

  delay(REPORT_INTERVAL_MS);
}
