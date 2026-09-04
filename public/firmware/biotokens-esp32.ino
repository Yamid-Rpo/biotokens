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
 *   - Preferences.h (incluida en el núcleo)
 *
 * DOS FORMAS DE CARGAR LAS CREDENCIALES:
 *   A) Descarga el firmware desde el panel con las credenciales ya pegadas
 *      (Proyecto → Panel → Dispositivos → "Descargar firmware con credenciales").
 *   B) Sube este archivo tal cual y envía las credenciales por el cable USB
 *      desde el panel ("Enviar credenciales por cable USB"). Quedan guardadas
 *      en la memoria NVS de la placa y sobreviven al reinicio.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>

// ---------- Configuración (se rellena automáticamente desde el panel) ----------
const char* DEFAULT_WIFI_SSID = "TU_WIFI";          // Red Wi-Fi 2.4 GHz
const char* DEFAULT_WIFI_PASS = "TU_CLAVE_WIFI";
const char* DEFAULT_API_URL   = "https://biotokens.lovable.app/api/public/iot-readings";
const char* DEFAULT_DEVICE_ID = "PEGAR_DEVICE_ID";  // uuid del dispositivo registrado
const char* DEFAULT_API_KEY   = "PEGAR_API_KEY";    // btk_... (mostrada una sola vez)
const char* DEFAULT_METRIC    = "soil_moisture";    // nombre de la métrica
const char* DEFAULT_UNIT      = "percent";          // unidad (opcional)

const int   SENSOR_PIN  = 34;                 // ADC1 (ej.: humedad de suelo)
const uint32_t REPORT_INTERVAL_MS = 60000;    // frecuencia de reporte: 1 min

Preferences prefs;
String wifiSsid, wifiPass, apiUrl, deviceId, apiKey, metric, unit;

// ---------- Credenciales guardadas en NVS ----------
void loadConfig() {
  prefs.begin("biotokens", true);
  wifiSsid = prefs.getString("ssid", DEFAULT_WIFI_SSID);
  wifiPass = prefs.getString("pass", DEFAULT_WIFI_PASS);
  apiUrl   = prefs.getString("url",  DEFAULT_API_URL);
  deviceId = prefs.getString("dev",  DEFAULT_DEVICE_ID);
  apiKey   = prefs.getString("key",  DEFAULT_API_KEY);
  metric   = prefs.getString("met",  DEFAULT_METRIC);
  unit     = prefs.getString("unit", DEFAULT_UNIT);
  prefs.end();
}

void saveConfig() {
  prefs.begin("biotokens", false);
  prefs.putString("ssid", wifiSsid);
  prefs.putString("pass", wifiPass);
  prefs.putString("url",  apiUrl);
  prefs.putString("dev",  deviceId);
  prefs.putString("key",  apiKey);
  prefs.putString("met",  metric);
  prefs.putString("unit", unit);
  prefs.end();
}

// Extrae un campo simple "clave":"valor" de un JSON plano.
String jsonField(const String& src, const char* name) {
  String pat = String("\"") + name + "\":\"";
  int i = src.indexOf(pat);
  if (i < 0) return "";
  i += pat.length();
  int j = src.indexOf('"', i);
  if (j < 0) return "";
  return src.substring(i, j);
}

// Aprovisionamiento por cable USB: el panel envía una línea
// PROV {"ssid":"...","pass":"...","url":"...","device":"...","key":"...","metric":"...","unit":"..."}
void handleSerialProvisioning() {
  if (!Serial.available()) return;
  String line = Serial.readStringUntil('\n');
  line.trim();

  if (line == "PING") { Serial.println("BIOTOKENS-ESP32 OK"); return; }

  if (line.startsWith("PROV ")) {
    String json = line.substring(5);
    String v;
    if ((v = jsonField(json, "ssid"))   != "") wifiSsid = v;
    if ((v = jsonField(json, "pass"))   != "") wifiPass = v;
    if ((v = jsonField(json, "url"))    != "") apiUrl   = v;
    if ((v = jsonField(json, "device")) != "") deviceId = v;
    if ((v = jsonField(json, "key"))    != "") apiKey   = v;
    if ((v = jsonField(json, "metric")) != "") metric   = v;
    if ((v = jsonField(json, "unit"))   != "") unit     = v;
    saveConfig();
    Serial.println("PROV OK");
    WiFi.disconnect();
  }
}

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
  WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
  Serial.print("Conectando a Wi-Fi");
  uint8_t tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(500);
    Serial.print(".");
    handleSerialProvisioning();
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
  http.begin(apiUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", deviceId);
  http.addHeader("X-Api-Key", apiKey);

  char payload[192];
  snprintf(payload, sizeof(payload),
           "{\"metric\":\"%s\",\"value\":%.2f,\"unit\":\"%s\"}",
           metric.c_str(), value, unit.c_str());

  int code = http.POST(payload);
  Serial.printf("POST %s -> %d  (%s)\n", payload, code,
                code > 0 ? http.getString().c_str() : "sin respuesta");
  http.end();
  return code == 200;
}

// ---------- Ciclo principal ----------
void setup() {
  Serial.begin(115200);
  delay(300);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  loadConfig();
  Serial.println("BIOTOKENS-ESP32 LISTO");
  Serial.printf("Dispositivo: %s  Endpoint: %s\n", deviceId.c_str(), apiUrl.c_str());
  connectWiFi();
}

void loop() {
  handleSerialProvisioning();
  connectWiFi();
  float value = readSensor();
  sendReading(value);

  // Ahorro de energía (coprocesador ULP / deep sleep):
  // descomenta para proyectos alimentados con batería.
  // esp_sleep_enable_timer_wakeup(REPORT_INTERVAL_MS * 1000ULL);
  // esp_deep_sleep_start();

  uint32_t t0 = millis();
  while (millis() - t0 < REPORT_INTERVAL_MS) {
    handleSerialProvisioning();
    delay(200);
  }
}
