#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ==========================================
// CẤU HÌNH WIFI
// ==========================================
const char* WIFI_SSID = "POCO F5";
const char* WIFI_PASSWORD = "123456790";

// ==========================================
// CẤU HÌNH MQTT BROKER
// ==========================================
const char* MQTT_BROKER = "";  // IP máy tính chạy server (thay đổi theo IP)
const int MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "ESP32_001";  // ID thiết bị (phải unique)

// Garden ID - phải khớp với garden trong database
const int GARDEN_ID = 1; 
// ==========================================
// CẤU HÌNH CHÂN GPIO
// ==========================================
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

#define SOIL_PIN 32    // Cảm biến độ ẩm đất (Analog)
#define LIGHT_DO 34    // Cảm biến ánh sáng (Digital)
#define RELAY_PUMP 25  // Relay điều khiển máy bơm
#define LED_PIN 27     // LED

#define ON LOW
#define OFF HIGH
// Cấu hình logic cho Đèn LED (Đảo ngược lại: HIGH là sáng)
#define LED_ON   HIGH
#define LED_OFF  LOW

// MQTT TOPICS

char TOPIC_SENSORS[50];
char TOPIC_STATUS[50];
char TOPIC_COMMAND[50];
char TOPIC_COMMAND_ACK[50];

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Trạng thái thiết bị
bool pumpStatus = false;
bool ledStatus = false;
bool isConnected = false;

// Timing
unsigned long lastSensorSend = 0;
unsigned long lastStatusSend = 0;
unsigned long lastReconnectAttempt = 0;

const unsigned long SENSOR_INTERVAL = 3000;     // Gửi sensor mỗi 3 giây
const unsigned long STATUS_INTERVAL = 10000;    // Gửi status mỗi 10 giây
const unsigned long RECONNECT_INTERVAL = 5000;  // Thử reconnect mỗi 5 giây

// Auto pump off timer
unsigned long pumpStartTime = 0;
unsigned long pumpDuration = 0;
bool autoPumpOff = false;

// SETUP

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=================================");
  Serial.println("   SMART GARDEN ESP32 STARTING   ");
  Serial.println("=================================\n");

  // Khởi tạo GPIO
  setupGPIO();

  // Khởi tạo DHT sensor
  dht.begin();

  // Tạo MQTT topics
  setupTopics();

  // Kết nối WiFi
  connectWiFi();

  // Cấu hình MQTT
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);

  // Kết nối MQTT
  connectMQTT();

  Serial.println("\n Setup completed!");
  Serial.println("=================================\n");
}

// LOOP
void loop() {
  // Kiểm tra kết nối MQTT
  if (!mqttClient.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > RECONNECT_INTERVAL) {
      lastReconnectAttempt = now;
      connectMQTT();
    }
  } else {
    mqttClient.loop();
  }

  // Gửi dữ liệu sensor định kỳ
  unsigned long now = millis();
  if (now - lastSensorSend >= SENSOR_INTERVAL) {
    lastSensorSend = now;
    sendSensorData();
  }

  // Gửi status định kỳ
  if (now - lastStatusSend >= STATUS_INTERVAL) {
    lastStatusSend = now;
    sendDeviceStatus();
  }

  // Kiểm tra auto pump off
  checkAutoPumpOff();
}

// SETUP FUNCTIONS
void setupGPIO() {
  // Output pins
  pinMode(RELAY_PUMP, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  // Tắt tất cả relay khi khởi động
  digitalWrite(RELAY_PUMP, OFF);
  digitalWrite(LED_PIN, LED_OFF);

  // Input pins
  pinMode(SOIL_PIN, INPUT);
  pinMode(LIGHT_DO, INPUT);

  Serial.println(" GPIO initialized");
}

void setupTopics() {
  sprintf(TOPIC_SENSORS, "garden/%d/sensors", GARDEN_ID);
  sprintf(TOPIC_STATUS, "garden/%d/status", GARDEN_ID);
  sprintf(TOPIC_COMMAND, "garden/%d/command", GARDEN_ID);
  sprintf(TOPIC_COMMAND_ACK, "garden/%d/command/ack", GARDEN_ID);

  Serial.println("📡 MQTT Topics:");
  Serial.printf("   Sensors: %s\n", TOPIC_SENSORS);
  Serial.printf("   Status:  %s\n", TOPIC_STATUS);
  Serial.printf("   Command:  %s\n", TOPIC_COMMAND);
  Serial.printf("   ACK:     %s\n", TOPIC_COMMAND_ACK);
}

// WIFI FUNCTIONS

void connectWiFi() {
  Serial.printf(" Connecting to WiFi:  %s", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" Connected!");
    Serial.printf("   IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("   Signal Strength: %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println(" Failed!");
    Serial.println("<!> Restarting in 5 seconds.. .");
    delay(5000);
    ESP.restart();
  }
}

// MQTT FUNCTIONS
void connectMQTT() {
  Serial.printf("🔌 Connecting to MQTT Broker: %s:%d\n", MQTT_BROKER, MQTT_PORT);

  if (mqttClient.connect(MQTT_CLIENT_ID)) {
    Serial.println("MQTT Connected!");
    isConnected = true;

    // Subscribe to command topic
    mqttClient.subscribe(TOPIC_COMMAND);
    Serial.printf(" Subscribed to: %s\n", TOPIC_COMMAND);

    // Gửi status ngay khi kết nối
    sendDeviceStatus();
  } else {
    Serial.printf(" MQTT Connection failed, rc=%d\n", mqttClient.state());
    isConnected = false;
  }
}

// Callback khi nhận message từ MQTT
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Convert payload to string
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';

  Serial.println("\n ====== MESSAGE RECEIVED ======");
  Serial.printf("   Topic: %s\n", topic);
  Serial.printf("   Payload: %s\n", message);

  // Parse JSON
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.printf(" JSON parse error: %s\n", error.c_str());
    return;
  }

  // Xử lý command
  const char* commandId = doc["command_id"];
  const char* action = doc["action"];

  if (commandId && action) {
    processCommand(commandId, action, doc);
  }

  Serial.println("=================================\n");
}

void processCommand(const char* commandId, const char* action, StaticJsonDocument<256>& doc) {
  Serial.printf("🎮 Processing command: %s - %s\n", commandId, action);

  bool success = false;
  String resultMessage = "";

  // PUMP ON
  if (strcmp(action, "pump_on") == 0) {
    // Lấy duration nếu có
    int duration = 60;  // default 60 giây
    if (doc.containsKey("parameters") && doc["parameters"].containsKey("duration_seconds")) {
      duration = doc["parameters"]["duration_seconds"];
    }

    digitalWrite(RELAY_PUMP, ON);
    pumpStatus = true;

    // Set auto off timer
    pumpStartTime = millis();
    pumpDuration = duration * 1000UL;
    autoPumpOff = true;

    success = true;
    resultMessage = "Pump turned ON for " + String(duration) + " seconds";
    Serial.printf(" Pump ON (duration: %d seconds)\n", duration);
  }
  // PUMP OFF
  else if (strcmp(action, "pump_off") == 0) {
    digitalWrite(RELAY_PUMP, OFF);
    pumpStatus = false;
    autoPumpOff = false;

    success = true;
    resultMessage = "Pump turned OFF";
    Serial.println(" Pump OFF");
  }
  // LED ON
  else if (strcmp(action, "led_on") == 0) {
    digitalWrite(LED_PIN, LED_ON);
    ledStatus = true;

    success = true;
    resultMessage = "LED turned ON";
    Serial.println("LED ON");
  }
  // LED OFF
  else if (strcmp(action, "led_off") == 0) {
    digitalWrite(LED_PIN, LED_OFF);
    ledStatus = false;

    success = true;
    resultMessage = "LED turned OFF";
    Serial.println(" LED OFF");
  }
  // Unknown action
  else {
    resultMessage = "Unknown action: " + String(action);
    Serial.printf("Unknown action: %s\n", action);
  }

  // Gửi ACK
  sendCommandAck(commandId, success, resultMessage.c_str());

  // Gửi status update ngay lập tức
  sendDeviceStatus();
}

void sendCommandAck(const char* commandId, bool success, const char* message) {
  StaticJsonDocument<256> doc;

  doc["command_id"] = commandId;
  doc["device_id"] = MQTT_CLIENT_ID;
  doc["status"] = success ? "success" : "failed";
  doc["message"] = message;
  doc["timestamp"] = millis();

  char buffer[256];
  serializeJson(doc, buffer);

  mqttClient.publish(TOPIC_COMMAND_ACK, buffer);

  Serial.printf(" ACK sent: %s - %s\n", commandId, success ? "success" : "failed");
}

// SENSOR FUNCTIONS
float readTemperature() {
  float temp = dht.readTemperature();
  if (isnan(temp)) {
    Serial.println("Failed to read temperature!");
    return -999;
  }
  return temp;
}

float readHumidity() {
  float hum = dht.readHumidity();
  if (isnan(hum)) {
    Serial.println("Failed to read humidity!");
    return -999;
  }
  return hum;
}

float readSoilMoisture() {
  int rawValue = analogRead(SOIL_PIN);

  // Chuyển đổi giá trị analog (0-4095) sang phần trăm
  // Lưu ý: Cảm biến độ ẩm đất thường có giá trị cao khi khô, thấp khi ướt
  // Điều chỉnh MIN/MAX theo cảm biến thực tế của bạn
  const int DRY_VALUE = 4095;  // Giá trị khi đất khô hoàn toàn
  const int WET_VALUE = 1500;  // Giá trị khi đất ướt hoàn toàn

  float moisture = map(rawValue, DRY_VALUE, WET_VALUE, 0, 100);
  moisture = constrain(moisture, 0, 100);

  return moisture;
}

bool readLightSensor() {
  // Digital output:  HIGH = sáng, LOW = tối (hoặc ngược lại tùy module)
  // Kiểm tra module của bạn và điều chỉnh logic phù hợp
  int value = digitalRead(LIGHT_DO);

  // Giả sử:  LOW = tối (is_dark = true), HIGH = sáng (is_dark = false)
  return (value == HIGH);
}

void sendSensorData() {
  float temperature = readTemperature();
  float airHumidity = readHumidity();
  float soilMoisture = readSoilMoisture();
  bool isDark = readLightSensor();

  // Kiểm tra giá trị hợp lệ
  if (temperature == -999 || airHumidity == -999) {
    Serial.println("Skipping sensor data (invalid readings)");
    return;
  }

  StaticJsonDocument<256> doc;

  doc["device_id"] = MQTT_CLIENT_ID;
  doc["timestamp"] = millis();

  JsonObject sensors = doc.createNestedObject("sensors");
  sensors["temperature"] = round(temperature * 10) / 10.0;     // 1 decimal
  sensors["air_humidity"] = round(airHumidity * 10) / 10.0;    // 1 decimal
  sensors["soil_moisture"] = round(soilMoisture * 10) / 10.0;  // 1 decimal
  sensors["is_dark"] = isDark;

  char buffer[256];
  serializeJson(doc, buffer);

  if (mqttClient.publish(TOPIC_SENSORS, buffer)) {
    Serial.printf("Sensor:  T=%.1f°C, H=%.1f%%, Soil=%.1f%%, Dark=%s\n",
                  temperature, airHumidity, soilMoisture, isDark ?"Yes":"No");
  } else {
    Serial.println("Failed to publish sensor data");
  }
}

void sendDeviceStatus() {
  StaticJsonDocument<256> doc;

  doc["device_id"] = MQTT_CLIENT_ID;
  doc["timestamp"] = millis();
  doc["pump_status"] = pumpStatus;
  doc["led_status"] = ledStatus;
  doc["is_connected"] = true;

  char buffer[256];
  serializeJson(doc, buffer);

  if (mqttClient.publish(TOPIC_STATUS, buffer)) {
    Serial.printf("📡 Status:  Pump=%s, LED=%s\n",
                  pumpStatus ? "ON" : "OFF",
                  ledStatus ? "ON" : "OFF");
  } else {
    Serial.println("Failed to publish status");
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
void checkAutoPumpOff() {
  if (autoPumpOff && pumpStatus) {
    unsigned long elapsed = millis() - pumpStartTime;
    if (elapsed >= pumpDuration) {
      Serial.println("Auto pump off triggered");

      digitalWrite(RELAY_PUMP, OFF);
      pumpStatus = false;
      autoPumpOff = false;

      // Gửi status update
      sendDeviceStatus();
    }
  }
}