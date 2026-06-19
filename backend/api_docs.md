# Tài liệu Hướng dẫn API - Smart Garden IoT

Tài liệu này cung cấp chi tiết về danh sách các API endpoints (GET/POST/PUT/DELETE) và cấu trúc dữ liệu JSON trả về cho các thực thể: **User & Auth**, **Plant**, **Garden**, và **Logs** (bao gồm Sensor Logs & Irrigation Logs).

## 🛠️ Thông tin chung

*   **Base URL**: `http://localhost:3000/api`
*   **Tài liệu Swagger UI**: `http://localhost:3000/docs`
*   **Phương thức Xác thực**: JWT Token (Bearer Token). Khi gọi các API yêu cầu xác thực (ngoại trừ các endpoint Public), client cần đính kèm header:
    ```http
    Authorization: Bearer <your_access_token>
    ```

---

## 📦 Định dạng Phản hồi Hệ thống (Global Response Format)

Hệ thống sử dụng các Interceptor và Exception Filter để chuẩn hóa định dạng dữ liệu trả về cho mọi API.

### 1. Phản hồi Thành công (Success Response)
```json
{
  "success": true,
  "data": { ... }, // Dữ liệu trả về cụ thể của từng API
  "timestamp": "2026-05-26T14:30:00.000Z"
}
```

### 2. Phản hồi Thất bại (Error Response)
```json
{
  "success": false,
  "statusCode": 400, // Mã lỗi HTTP (400, 401, 403, 404, 409, 500,...)
  "message": "Thông điệp lỗi chi tiết",
  "errors": [ ... ], // Danh sách các lỗi kiểm định (nếu có, ví dụ lỗi DTO validation)
  "timestamp": "2026-05-26T14:30:05.000Z",
  "path": "/api/auth/register" // Đường dẫn API gây ra lỗi
}
```

---

## 1. Người dùng & Xác thực (User & Auth)

Quản lý đăng ký, đăng nhập và thông tin tài khoản người dùng (`User`).

### Danh sách API chính

| Phương thức | Endpoint | Yêu cầu Auth | Mô tả |
| :--- | :--- | :---: | :--- |
| **POST** | `/api/auth/register` | ❌ | Đăng ký tài khoản người dùng mới |
| **POST** | `/api/auth/login` | ❌ | Đăng nhập hệ thống |
| **POST** | `/api/auth/refresh` | ❌ | Làm mới Access Token bằng Refresh Token |
| **GET** | `/api/auth/me` |  | Lấy thông tin user hiện tại từ Token |
| **GET** | `/api/users/profile` |  | Lấy chi tiết profile cá nhân |
| **PUT** | `/api/users/profile` |  | Cập nhật thông tin profile cá nhân |
| **POST** | `/api/users/change-password` |  | Đổi mật khẩu tài khoản |
| **GET** | `/api/users` |  (Admin) | Lấy danh sách tất cả users (Chỉ Admin) |
| **POST** | `/api/users` |  (Admin) | Tạo user mới và gán Role (Chỉ Admin) |
| **GET** | `/api/users/statistics` |  (Admin) | Xem thống kê số lượng và phân bố users |
| **GET** | `/api/users/:id` |  (Admin) | Lấy thông tin user theo ID |
| **PUT** | `/api/users/:id` |  (Admin) | Cập nhật thông tin/Role của user |
| **DELETE** | `/api/users/:id` |  (Admin) | Xóa tài khoản user khỏi hệ thống |

### Cấu trúc JSON Request/Response mẫu

#### Đăng ký Tài khoản (`POST /api/auth/register`)
*   **Request Body (`RegisterDto`):**
    ```json
    {
      "username": "johndoe",
      "email": "johndoe@example.com",
      "password": "password123"
    }
    ```
*   **Response `data` (Thành công):**
    ```json
    {
      "user": {
        "id": 1,
        "username": "johndoe",
        "email": "johndoe@example.com",
        "role": "user"
      },
      "tokens": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "expiresIn": 900
      }
    }
    ```

#### Đăng nhập (`POST /api/auth/login`)
*   **Request Body (`LoginDto`):**
    ```json
    {
      "email": "johndoe@example.com",
      "password": "password123"
    }
    ```
*   **Response `data`:** Giống cấu trúc trả về của API Đăng ký ở trên.

#### Lấy Profile Cá nhân (`GET /api/users/profile`)
*   **Response `data`:**
    ```json
    {
      "id": 1,
      "username": "johndoe",
      "email": "johndoe@example.com",
      "roleId": 2,
      "createdAt": "2026-05-26T07:28:35.000Z",
      "updatedAt": "2026-05-26T07:28:35.000Z",
      "role": {
        "id": 2,
        "roleName": "user"
      }
    }
    ```

#### Cập nhật Profile (`PUT /api/users/profile`)
*   **Request Body (`UpdateUserDto`):**
    ```json
    {
      "username": "johndoe_updated",
      "email": "johndoe_new@example.com"
    }
    ```

---

## 2. Từ điển Cây trồng (Plant)

Danh mục lưu trữ thông tin về các loại cây trồng và ngưỡng môi trường tối ưu (do Admin quản lý, User có thể tra cứu).

### Danh sách API chính

| Phương thức | Endpoint | Yêu cầu Auth | Mô tả |
| :--- | :--- | :---: | :--- |
| **GET** | `/api/plants` | ❌ | Lấy danh sách toàn bộ các loại cây trồng |
| **GET** | `/api/plants/search` | ❌ | Tìm kiếm cây trồng theo tên hoặc mô tả |
| **GET** | `/api/plants/:id` | ❌ | Lấy chi tiết cây trồng và các thông số lý tưởng theo ID |
| **POST** | `/api/plants` |  (Admin) | Tạo một cây trồng mới vào hệ thống |
| **PUT** | `/api/plants/:id` |  (Admin) | Chỉnh sửa thông tin cây trồng |
| **DELETE** | `/api/plants/:id` |  (Admin) | Xóa cây trồng khỏi hệ thống (nếu chưa gán vào Garden nào) |

### Cấu trúc JSON Request/Response mẫu

#### Chi tiết Cây trồng (`GET /api/plants/:id`)
*   **Response `data`:**
    ```json
    {
      "id": 1,
      "name": "Cà chua",
      "description": "Cây cà chua thích hợp trồng trong điều kiện ấm áp, đất tơi xốp giữ ẩm tốt.",
      "minTemperature": 18.0,
      "maxTemperature": 32.0,
      "minAirHumidity": 50.0,
      "maxAirHumidity": 80.0,
      "minSoilMoisture": 40.0,
      "maxSoilMoisture": 75.0,
      "createdById": 1,
      "createdAt": "2026-05-26T07:28:35.000Z",
      "updatedAt": "2026-05-26T07:28:35.000Z"
    }
    ```

#### Tạo Cây trồng Mới (`POST /api/plants`)
*   **Request Body (`CreatePlantDto`):**
    ```json
    {
      "name": "Cà chua Cherry",
      "description": "Loại cà chua quả nhỏ ngọt, dễ trồng chậu",
      "minTemperature": 15.0,
      "maxTemperature": 35.0,
      "minAirHumidity": 40.0,
      "maxAirHumidity": 80.0,
      "minSoilMoisture": 30.0,
      "maxSoilMoisture": 70.0
    }
    ```

---

## 3. Vườn cây (Garden)

Thực thể cốt lõi quản lý vườn, cài đặt các chế độ tưới tiêu, bật/tắt thiết bị thủ công và kết nối thiết bị ESP32.

### Danh sách API chính

| Phương thức | Endpoint | Yêu cầu Auth | Mô tả |
| :--- | :--- | :---: | :--- |
| **POST** | `/api/gardens` |  | Tạo vườn mới (kết nối ESP32 và Plant tùy chọn) |
| **GET** | `/api/gardens` |  | Lấy danh sách vườn của người dùng hiện tại |
| **GET** | `/api/gardens/:id` |  | Lấy thông tin chi tiết vườn (kèm thiết bị, cây trồng) |
| **PUT** | `/api/gardens/:id` |  | Cập nhật thông tin vườn, ngưỡng cảnh báo, chế độ tưới |
| **DELETE** | `/api/gardens/:id` |  | Xóa vườn (xóa cả logs, schedules liên quan) |
| **POST** | `/api/gardens/:id/pump/on` |  | Bật máy bơm nước thủ công (hẹn giờ bật tùy chọn) |
| **POST** | `/api/gardens/:id/pump/off` |  | Tắt máy bơm nước thủ công ngay lập tức |
| **POST** | `/api/gardens/:id/led/on` |  | Bật đèn LED chiếu sáng thủ công |
| **POST** | `/api/gardens/:id/led/off` |  | Tắt đèn LED thủ công |
| **GET** | `/api/gardens/:id/status` |  | Lấy trạng thái cảm biến thời gian thực & trạng thái thiết bị |

### Chế độ tưới của Vườn (`IrrigationMode`):
*   `manual`: Chỉ điều khiển tưới thủ công qua API bật/tắt bơm.
*   `auto`: Tưới tự động dựa vào độ ẩm đất (khi độ ẩm đất nhỏ hơn `autoIrrigationThreshold`).
*   `periodic`: Tưới theo chu kỳ lặp lại sau mỗi `periodicIntervalHours` giờ.
*   `scheduled`: Tưới theo lịch thời gian cụ thể trong tuần (cấu hình trong bảng `Schedule`).

### Cấu trúc JSON Request/Response mẫu

#### Tạo Vườn mới (`POST /api/gardens`)
*   **Request Body (`CreateGardenDto`):**
    ```json
    {
      "gardenName": "Vườn Cải Sân Thượng",
      "description": "Vườn rau xanh trồng trên khay nhựa ghép",
      "deviceCode": "ESP32_001", // Code của ESP32 để liên kết
      "plantId": 1, // Liên kết với loại cây trồng để lấy ngưỡng mặc định
      "irrigationMode": "manual"
    }
    ```

#### Chi tiết thông tin Vườn (`GET /api/gardens/:id`)
*   **Response `data`:**
    ```json
    {
      "id": 1,
      "gardenName": "Vườn Cải Sân Thượng",
      "description": "Vườn rau xanh trồng trên khay nhựa ghép",
      "irrigationMode": "manual",
      "autoIrrigationThreshold": 30.0,
      "autoIrrigationDuration": 60,
      "periodicIntervalHours": 24,
      "periodicLastIrrigation": null,
      "ledAutoMode": false,
      "alertMinTemperature": 15.0,
      "alertMaxTemperature": 35.0,
      "alertMinSoilMoisture": 20.0,
      "userId": 1,
      "plantId": 1,
      "deviceId": 1,
      "createdAt": "2026-05-26T07:28:35.000Z",
      "updatedAt": "2026-05-26T07:28:35.000Z",
      "device": {
        "id": 1,
        "deviceCode": "ESP32_001",
        "temperature": 28.5,
        "airHumidity": 60.0,
        "soilMoisture": 45.0,
        "isDark": false,
        "isPumpOn": false,
        "isLedOn": false,
        "isConnected": true,
        "lastSeen": "2026-05-26T07:29:45.000Z"
      },
      "plant": {
        "id": 1,
        "name": "Cà chua",
        "minTemperature": 18,
        "maxTemperature": 32
      },
      "irrigation": {
        "id": 1,
        "gardenId": 1,
        "isActive": false,
        "startTime": null,
        "mode": null
      }
    }
    ```

#### Bật máy bơm (`POST /api/gardens/:id/pump/on`)
*   **Request Body (`PumpControlDto`):**
    ```json
    {
      "durationSeconds": 120 // Hẹn giờ tắt sau 120 giây (mặc định là 60 nếu không truyền)
    }
    ```
*   **Response `data`:**
    ```json
    {
      "status": "success",
      "message": "Command sent to device successfully",
      "command": "pump_on",
      "payload": 120
    }
    ```

#### Trạng thái thời gian thực (`GET /api/gardens/:id/status`)
*   **Response `data`:**
    ```json
    {
      "gardenId": 1,
      "gardenName": "Vườn Cải Sân Thượng",
      "irrigationMode": "manual",
      "device": {
        "deviceCode": "ESP32_001",
        "isConnected": true,
        "isPumpOn": false,
        "isLedOn": false,
        "lastSeen": "2026-05-26T07:29:45.000Z",
        "sensors": {
          "temperature": 28.5,
          "airHumidity": 60.0,
          "soilMoisture": 45.0,
          "isDark": false
        }
      }
    }
    ```

---

## 4. Nhật ký Dữ liệu & Lịch sử (Logs)

Lịch sử hệ thống chia làm hai loại logs chính: **Sensor Logs** (Lịch sử cảm biến ghi nhận tự động mỗi 5 phút) và **Irrigation Logs** (Lịch sử kích hoạt tưới tiêu).

### A. Lịch sử Cảm biến (Sensor Logs)

#### Danh sách API

| Phương thức | Endpoint | Yêu cầu Auth | Mô tả |
| :--- | :--- | :---: | :--- |
| **GET** | `/api/gardens/:gardenId/sensors/logs` |  | Lấy lịch sử chỉ số cảm biến theo khoảng thời gian |
| **GET** | `/api/gardens/:gardenId/sensors/latest` |  | Lấy các bản ghi cảm biến mới nhất gần đây |
| **GET** | `/api/gardens/:gardenId/sensors/statistics`|  | Lấy thống kê min/max/avg cảm biến của một khoảng thời gian |

#### Cấu trúc JSON Request/Response mẫu

*   **Lấy lịch sử cảm biến (`GET /api/gardens/1/sensors/logs?limit=2&from=2026-05-25T00:00:00Z`)**
    *   **Response `data`:**
        ```json
        [
          {
            "id": 105,
            "gardenId": 1,
            "temperature": 29.2,
            "airHumidity": 58.5,
            "soilMoisture": 42.0,
            "isDark": false,
            "recordedAt": "2026-05-26T07:25:00.000Z"
          },
          {
            "id": 104,
            "gardenId": 1,
            "temperature": 29.0,
            "airHumidity": 59.0,
            "soilMoisture": 42.5,
            "isDark": false,
            "recordedAt": "2026-05-26T07:20:00.000Z"
          }
        ]
        ```

*   **Lấy Thống kê cảm biến (`GET /api/gardens/1/sensors/statistics?from=2026-05-25T00:00:00Z&to=2026-05-26T23:59:59Z`)**
    *   **Response `data`:**
        ```json
        {
          "avgTemperature": 27.8,
          "avgAirHumidity": 62.4,
          "avgSoilMoisture": 48.2,
          "minTemperature": 22.1,
          "maxTemperature": 32.5,
          "minSoilMoisture": 35.0,
          "maxSoilMoisture": 68.0,
          "totalRecords": 576
        }
        ```

---

### B. Lịch sử Tưới tiêu (Irrigation Logs)

#### Danh sách API

| Phương thức | Endpoint | Yêu cầu Auth | Mô tả |
| :--- | :--- | :---: | :--- |
| **GET** | `/api/gardens/:gardenId/irrigation/status` |  | Lấy trạng thái phiên tưới hiện tại (đang tưới hay không) |
| **GET** | `/api/gardens/:gardenId/irrigation/logs` |  | Lấy danh sách lịch sử các lần bật máy bơm tưới cây |
| **GET** | `/api/gardens/:gardenId/irrigation/statistics`|  | Xem thống kê về số lần tưới, thời lượng trung bình và tổng |

#### Cấu trúc JSON Request/Response mẫu

*   **Trạng thái phiên tưới hiện tại (`GET /api/gardens/1/irrigation/status`)**
    *   **Response `data` (Khi đang có máy bơm chạy):**
        ```json
        {
          "id": 5,
          "gardenId": 1,
          "isActive": true,
          "startTime": "2026-05-26T07:28:00.000Z",
          "mode": "manual"
        }
        ```

*   **Xem lịch sử tưới (`GET /api/gardens/1/irrigation/logs?limit=2`)**
    *   **Response `data`:**
        ```json
        [
          {
            "id": 12,
            "gardenId": 1,
            "startTime": "2026-05-26T07:00:00.000Z",
            "endTime": "2026-05-26T07:01:00.000Z",
            "duration": 60, // Thời lượng thực tế chạy (giây)
            "mode": "auto", // Bơm tự động do độ ẩm thấp
            "status": "completed", // Trạng thái: started, completed, failed
            "note": "Tưới tự động do độ ẩm đất chạm mức 29.5%"
          },
          {
            "id": 11,
            "gardenId": 1,
            "startTime": "2026-05-25T18:00:00.000Z",
            "endTime": "2026-05-25T18:02:00.000Z",
            "duration": 120,
            "mode": "manual",
            "status": "completed",
            "note": "Người dùng bật thủ công trên Web/Mobile App"
          }
        ]
        ```

*   **Thống kê hoạt động tưới (`GET /api/gardens/1/irrigation/statistics?from=2026-05-20T00:00:00Z&to=2026-05-26T23:59:59Z`)**
    *   **Response `data`:**
        ```json
        {
          "totalIrrigations": 18,
          "totalDuration": 1380, // Tổng thời gian chạy máy bơm (giây)
          "avgDuration": 77, // Thời gian trung bình mỗi lần tưới (giây)
          "byMode": [
            {
              "mode": "manual",
              "count": 5
            },
            {
              "mode": "auto",
              "count": 13
            }
          ]
        }
        ```
