#include <WiFi.h>
#include <WebSocketMCP.h>

#define FAN 2
#define LIGHT1 4
#define LIGHT2 18
#define LIGHT3 19

// Cấu hình WiFi
const char* ssid = "your_account";          // Thay bằng tên Wi-Fi của bạn
const char* password = "your_password";  // Thay bằng mật khẩu Wi-Fi

// Cấu hình MCP Server (lấy từ chatbot Xiaozhi)
const char* mcpEndpoint = "wss://api.xiaozhi.me/mcp/?token=xxxx ( your_endpoint)";

// Tạo đối tượng MCP client
WebSocketMCP mcpClient;

// Hàm callback khi kết nối/thất bại
void onConnectionStatus(bool connected) {
    if (connected) {
        Serial.println("[MCP] ✅ Đã kết nối tới máy chủ");
        registerMcpTools();
    } else {
        Serial.println("[MCP] ⚠️ Mất kết nối với máy chủ MCP");
    }
}

// Hàm đăng ký MCP Tools
void registerMcpTools() {

    // Tool điều khiển quạt
    mcpClient.registerTool(
        "fan_control",
        "Điều khiển quạt",
        R"({
            "type": "object",
            "properties": {
                "state": {
                    "type": "string",
                    "enum": ["on", "off"]
                }
            },
            "required": ["state"]
        })",
        [](const String& args) {
            DynamicJsonDocument doc(256);
            deserializeJson(doc, args);
            String state = doc["state"].as<String>();

            if (state == "on") digitalWrite(FAN, HIGH);
            else if (state == "off") digitalWrite(FAN, LOW);

            return WebSocketMCP::ToolResponse("{\"success\":true,\"state\":\"" + state + "\"}");
        }
    );
    Serial.println("[MCP] 🛠️ Đã đăng ký tool điều khiển Quạt");

    // Tool điều khiển đèn phòng khách
    mcpClient.registerTool(
        "living_room_lights_control",
        "Điều khiển đèn phòng khách",
        R"({
            "type": "object",
            "properties": {
                "state": {
                    "type": "string",
                    "enum": ["on", "off"]
                }
            },
            "required": ["state"]
        })",
        [](const String& args) {
            DynamicJsonDocument doc(256);
            deserializeJson(doc, args);
            String state = doc["state"].as<String>();

            if (state == "on") digitalWrite(LIGHT1, HIGH);
            else if (state == "off") digitalWrite(LIGHT1, LOW);

            return WebSocketMCP::ToolResponse("{\"success\":true,\"state\":\"" + state + "\"}");
        }
    );
    Serial.println("[MCP] 🛠️ Đã đăng ký tool điều khiển Đèn phòng khách");

    // Tool điều khiển đèn phòng ngủ
    mcpClient.registerTool(
        "bedroom_lights_control",
        "Điều khiển đèn phòng ngủ",
        R"({
            "type": "object",
            "properties": {
                "state": {
                    "type": "string",
                    "enum": ["on", "off"]
                }
            },
            "required": ["state"]
        })",
        [](const String& args) {
            DynamicJsonDocument doc(256);
            deserializeJson(doc, args);
            String state = doc["state"].as<String>();

            if (state == "on") digitalWrite(LIGHT2, HIGH);
            else if (state == "off") digitalWrite(LIGHT2, LOW);

            return WebSocketMCP::ToolResponse("{\"success\":true,\"state\":\"" + state + "\"}");
        }
    );
    Serial.println("[MCP] 🛠️ Đã đăng ký tool điều khiển Đèn phòng ngủ");

    // Tool điều khiển đèn phòng bếp
    mcpClient.registerTool(
        "kitchen_lights_control",
        "Điều khiển đèn phòng bếp",
        R"({
            "type": "object",
            "properties": {
                "state": {
                    "type": "string",
                    "enum": ["on", "off"]
                }
            },
            "required": ["state"]
        })",
        [](const String& args) {
            DynamicJsonDocument doc(256);
            deserializeJson(doc, args);
            String state = doc["state"].as<String>();

            if (state == "on") digitalWrite(LIGHT3, HIGH);
            else if (state == "off") digitalWrite(LIGHT3, LOW);

            return WebSocketMCP::ToolResponse("{\"success\":true,\"state\":\"" + state + "\"}");
        }
    );
    Serial.println("[MCP] 🛠️ Đã đăng ký tool điều khiển Đèn phòng bếp");

    // Tool điều khiển tất cả thiết bị
    mcpClient.registerTool(
        "all_devices_control",
        "Điều khiển tất cả các thiết bị",
        R"({
            "type": "object",
            "properties": {
                "state": {
                    "type": "string",
                    "enum": ["on", "off"]
                }
            },
            "required": ["state"]
        })",
        [](const String& args) {
            DynamicJsonDocument doc(256);
            deserializeJson(doc, args);
            String state = doc["state"].as<String>();

            if (state == "on") {
                digitalWrite(FAN, HIGH);
                digitalWrite(LIGHT1, HIGH);
                digitalWrite(LIGHT2, HIGH);
                digitalWrite(LIGHT3, HIGH);
            } else if (state == "off") {
                digitalWrite(FAN, LOW);
                digitalWrite(LIGHT1, LOW);
                digitalWrite(LIGHT2, LOW);
                digitalWrite(LIGHT3, LOW);
            }

            return WebSocketMCP::ToolResponse("{\"success\":true,\"state\":\"" + state + "\"}");
        }
    );
    Serial.println("[MCP] 🛠️ Đã đăng ký tool điều khiển tất cả thiết bị");
}

void setup() {
    Serial.begin(115200);

    pinMode(FAN, OUTPUT);
    pinMode(LIGHT1, OUTPUT);
    pinMode(LIGHT2, OUTPUT);
    pinMode(LIGHT3, OUTPUT);

    digitalWrite(FAN, LOW);
    digitalWrite(LIGHT1, LOW);
    digitalWrite(LIGHT2, LOW);
    digitalWrite(LIGHT3, LOW);

    // Kết nối Wi-Fi
    Serial.print("Đang kết nối Wi-Fi: ");
    Serial.println(ssid);
    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }

    Serial.println("\n✅ Wi-Fi đã kết nối");
    Serial.println("IP thiết bị: " + WiFi.localIP().toString());

    // Bắt đầu MCP
    mcpClient.begin(mcpEndpoint, onConnectionStatus);
}

void loop() {
    mcpClient.loop();
    delay(10);
}
