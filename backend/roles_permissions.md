# 🛡️ Tài liệu Phân quyền & Vai trò (Roles & Permissions)

Tài liệu này mô tả chi tiết về hệ thống **Phân quyền (Authorization)** và **Xác thực (Authentication)** trong hệ thống Smart Garden IoT Backend. Hệ thống sử dụng cơ chế Phân quyền dựa trên vai trò (Role-Based Access Control - RBAC) kết hợp với Kiểm tra quyền sở hữu tài nguyên (Resource Ownership Control).

---

## 👥 1. Định nghĩa vai trò (Role Definitions)

Hệ thống hỗ trợ 2 vai trò cơ bản được lưu trong Database thông qua bảng `roles`:

| Vai trò (Role) | `roleName` | ID mặc định | Mô tả |
| :--- | :--- | :---: | :--- |
| **Quản trị viên** | `admin` | `1` | Có toàn quyền quản lý hệ thống, bao gồm quản lý người dùng, từ điển cây trồng (`Plant`), và đăng ký thiết bị ESP32 (`Device`). |
| **Người dùng** | `user` | `2` | Khách hàng/Người dùng cuối. Có quyền tạo vườn, kết nối thiết bị của mình, cấu hình chế độ tưới, xem logs cảm biến và lịch sử tưới của khu vườn họ sở hữu. |

> [!NOTE]
> Khi đăng ký tài khoản mới qua API `POST /api/auth/register`, mặc định trường `roleId` sẽ luôn được gán là `2` (tương đương vai trò `user`). Tài khoản `admin` cần được khởi tạo qua script seed cơ sở dữ liệu hoặc do một `admin` khác tạo.

---

## 🗄️ 2. Cấu trúc Database liên quan

Hệ thống lưu thông tin vai trò qua hai bảng `roles` và `users` được định nghĩa trong file [schema.prisma](file:///c:/Users/ADMIN/Desktop/Project-IoT/Smart-Garden-Backend/prisma/schema.prisma):

```prisma
// Vai trò người dùng (Enum)
enum RoleName {
  admin
  user
}

// Bảng Role - Phân quyền
model Role {
  id       Int      @id @default(autoincrement())
  roleName RoleName @unique @default(user)

  // Quan hệ 1-n: Một role có nhiều users
  users User[]

  @@map("roles")
}

// Bảng User - Người dùng
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique @db.VarChar(50)
  email     String   @unique @db.VarChar(100)
  password  String   @db.VarChar(255)
  roleId    Int      @default(2) // Mặc định là user (id=2)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Quan hệ với bảng Role
  role    Role     @relation(fields: [roleId], references: [id])
  gardens Garden[]
  plants  Plant[]  @relation("PlantCreatedBy") // Cây trồng do Admin tạo

  @@map("users")
}
```

---

## 🏗️ 3. Kiến trúc Xác thực & Phân quyền (Auth Architecture)

Kiến trúc phân quyền của dự án được xây dựng dựa trên 3 lớp bảo vệ chính của NestJS:

### 3.1. Xác thực toàn cục (Global Authentication Guard)
Trong file [app.module.ts](file:///c:/Users/ADMIN/Desktop/Project-IoT/Smart-Garden-Backend/src/app.module.ts), hệ thống đăng ký `JwtAuthGuard` làm Guard toàn cục (`APP_GUARD`). 
* Mọi API endpoint mặc định đều **yêu cầu đăng nhập** bằng Bearer Token.
* Nếu muốn cho phép truy cập công khai (Public) không cần token, route đó phải được đánh dấu bằng decorator `@Public()`.

### 3.2. Trích xuất vai trò từ JWT
Khi người dùng đăng nhập thành công, Access Token JWT chứa thông tin payload gồm `sub` (User ID). Khi client thực hiện request kèm token, [JwtStrategy](file:///c:/Users/ADMIN/Desktop/Project-IoT/Smart-Garden-Backend/src/auth/strategies/jwt.strategy.ts) sẽ validate và truy vấn thông tin user kèm theo vai trò từ Database:

```typescript
// Trích đoạn xử lý validate trong jwt.strategy.ts
const user = await this.prisma.user.findUnique({
  where: { id: payload.sub },
  include: { role: true }, // Load thông tin bảng role
});

// Trả về dữ liệu đính kèm vào request.user dưới dạng CurrentUserData
const userData: CurrentUserData = {
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role.roleName, // 'admin' hoặc 'user'
};
```

### 3.3. Kiểm tra vai trò bằng `@Roles` và `RolesGuard`
Để giới hạn endpoint cho một nhóm vai trò cụ thể, ta sử dụng decorator `@Roles('admin')`. Lớp [RolesGuard](file:///c:/Users/ADMIN/Desktop/Project-IoT/Smart-Garden-Backend/src/common/guards/roles.guard.ts) sẽ:
1. Lấy thông tin các vai trò được phép truy cập từ decorator metadata.
2. Kiểm tra `user.role` (từ JWT payload ở bước trên) xem có nằm trong danh sách được phép không.
3. Nếu không khớp, trả về mã lỗi `403 Forbidden` (`Access denied. Required roles: ...`).

> [!WARNING]
> **Lưu ý quan trọng cho nhà phát triển**:
> Hiện tại, decorator `@Roles('admin')` đang được gắn tại các controller (như `UsersController`, `DevicesController`, `PlantsController`), nhưng `RolesGuard` **chưa được đăng ký chạy mặc định** hoặc gắn trực tiếp qua `@UseGuards(RolesGuard)`.
>
> Để kích hoạt kiểm tra quyền dựa trên vai trò hoạt động chính xác, bạn cần thực hiện một trong hai cách sau:
> 1. **Cách 1 (Khuyên dùng)**: Đăng ký `RolesGuard` chạy toàn cục trong [app.module.ts](file:///c:/Users/ADMIN/Desktop/Project-IoT/Smart-Garden-Backend/src/app.module.ts):
>    ```typescript
>    import { RolesGuard } from './common/guards/roles.guard';
>    // ... trong providers của AppModule
>    providers: [
>      // JwtAuthGuard chạy trước để xác thực token
>      {
>        provide: APP_GUARD,
>        useClass: JwtAuthGuard,
>      },
>      // RolesGuard chạy sau để kiểm tra role của user
>      {
>        provide: APP_GUARD,
>        useClass: RolesGuard,
>      },
>    ]
>    ```
> 2. **Cách 2**: Sử dụng `@UseGuards(RolesGuard)` trên các Controller/Method cần phân quyền:
>    ```typescript
>    @Controller('devices')
>    @UseGuards(RolesGuard)
>    export class DevicesController { ... }
>    ```

### 3.4. Kiểm tra quyền sở hữu dữ liệu (Data Ownership Control)
Đối với tài nguyên liên quan trực tiếp đến cá nhân người dùng như **Vườn cây (Garden)**, **Nhật ký cảm biến (Sensor Log)**, **Nhật ký tưới (Irrigation Log)** và **Lịch tưới (Schedule)**:
* Phân quyền theo Role đơn thuần là chưa đủ (vì cả Admin và User đều có thể truy cập các route chung).
* Do đó, hệ thống thực hiện kiểm tra quyền sở hữu (Ownership Check) trực tiếp trong các Service thông qua phương thức `gardensService.findById(gardenId, userId)`. Nếu khu vườn đó không thuộc về `userId` đang gửi yêu cầu, hệ thống sẽ trả về lỗi `404 Not Found` hoặc `403 Forbidden`, ngăn chặn việc truy cập hoặc điều khiển thiết bị của người khác.

---

## 📊 4. Bảng ma trận phân quyền chi tiết (API Permissions Matrix)

| Endpoint | Method | Public | User | Admin | Cơ chế bảo vệ & Xác thực |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Xác thực (Auth)** | | | | | |
| `/api/auth/register` | `POST` | ✅ | ✅ | ✅ | Không yêu cầu xác thực (`@Public`) |
| `/api/auth/login` | `POST` | ✅ | ✅ | ✅ | Không yêu cầu xác thực (`@Public`) |
| `/api/auth/refresh` | `POST` | ✅ | ✅ | ✅ | Không yêu cầu xác thực (`@Public`) |
| `/api/auth/me` | `GET` | ❌ | ✅ | ✅ | JWT Token (Trả về user hiện tại) |
| **Hồ sơ cá nhân (Profile)** | | | | | |
| `/api/users/profile` | `GET` | ❌ | ✅ | ✅ | JWT Token (Profile của chính mình) |
| `/api/users/profile` | `PUT` | Contrast | ✅ | ✅ | JWT Token (Cập nhật profile cá nhân) |
| `/api/users/change-password` | `POST` | ❌ | ✅ | ✅ | JWT Token (Đổi mật khẩu cá nhân) |
| **Quản trị người dùng (Admin)** | | | | | |
| `/api/users` | `GET` | ❌ | ❌ | ✅ | JWT Token + `@Roles('admin')` |
| `/api/users` | `POST` | ❌ | ❌ | ✅ | JWT Token + `@Roles('admin')` |
| `/api/users/statistics` | `GET` | ❌ | ❌ | ✅ | JWT Token + `@Roles('admin')` |
| `/api/users/:id` | `GET` | ❌ | ❌ | ✅ | JWT Token + `@Roles('admin')` |
| `/api/users/:id` | `PUT` | ❌ | ❌ | ✅ | JWT Token + `@Roles('admin')` |
| `/api/users/:id` | `DELETE` | ❌ | ❌ | ✅ | JWT Token + `@Roles('admin')` (Không được tự xóa) |
| **Từ điển cây trồng (Plant)** | | | | | |
| `/api/plants` | `GET` | ✅ | ✅ | ✅ | Công khai (`@Public`) |
| `/api/plants/search` | `GET` | ✅ | ✅ | ✅ | Công khai (`@Public`) |
| `/api/plants/:id` | `GET` | ✅ | ✅ | ✅ | Công khai (`@Public`) |
| `/api/plants` | `POST` | ❌ | ❌ | ✅ | JWT Token + `@Roles('admin')` |
| `/api/plants/:id` | `PUT` | ❌ | ❌ | ✅ | JWT Token + `@Roles('admin')` |
| `/api/plants/:id` | `DELETE` | ❌ | ❌ | ✅ | JWT Token + `@Roles('admin')` (Nếu cây chưa thuộc vườn nào) |
| **Vườn cây (Garden)** | | | | | |
| `/api/gardens` | `POST` | ❌ | ✅ | ✅ | JWT Token (Tạo vườn cho user hiện tại) |
| `/api/gardens` | `GET` | ❌ | ✅ | ✅ | JWT Token (Chỉ lấy vườn của user hiện tại) |
| `/api/gardens/:id` | `GET` | ❌ | 🔑 | 🔑 | JWT Token + **Kiểm tra quyền sở hữu vườn** |
| `/api/gardens/:id` | `PUT` | ❌ | 🔑 | 🔑 | JWT Token + **Kiểm tra quyền sở hữu vườn** |
| `/api/gardens/:id` | `DELETE` | ❌ | 🔑 | 🔑 | JWT Token + **Kiểm tra quyền sở hữu vườn** |
| `/api/gardens/:id/pump/on` | `POST` | ❌ | 🔑 | 🔑 | JWT Token + **Kiểm tra quyền sở hữu vườn** |
| `/api/gardens/:id/pump/off`| `POST` | ❌ | 🔑 | 🔑 | JWT Token + **Kiểm tra quyền sở hữu vườn** |
| `/api/gardens/:id/led/on` | `POST` | ❌ | 🔑 | 🔑 | JWT Token + **Kiểm tra quyền sở hữu vườn** |
| `/api/gardens/:id/led/off` | `POST` | ❌ | 🔑 | 🔑 | JWT Token + **Kiểm tra quyền sở hữu vườn** |
| `/api/gardens/:id/status` | `GET` | ❌ | 🔑 | 🔑 | JWT Token + **Kiểm tra quyền sở hữu vườn** |
| **Nhật ký & Lịch sử (Logs)** | | | | | |
| `/api/gardens/:id/sensors/logs` | `GET` | ❌ | 🔑 | 🔑 | JWT Token + **Kiểm tra quyền sở hữu vườn** |
| `/api/gardens/:id/sensors/latest` | `GET` | ❌ | 🔑 | 🔑 | JWT Token + **Kiểm tra quyền sở hữu vườn** |
| `/api/gardens/:id/sensors/statistics` | `GET` | ❌ | 🔑 | 🔑 | JWT Token + **Kiểm tra quyền sở hữu vườn** |
| `/api/gardens/:id/irrigation/status`| `GET` | ❌ | 🔑 | 🔑 | JWT Token + **Kiểm tra quyền sở hữu vườn** |
| `/api/gardens/:id/irrigation/logs` | `GET` | ❌ | 🔑 | 🔑 | JWT Token + **Kiểm tra quyền sở hữu vườn** |
| `/api/gardens/:id/irrigation/statistics`| `GET` | ❌ | 🔑 | 🔑 | JWT Token + **Kiểm tra quyền sở hữu vườn** |
| **Quản trị Thiết bị (Device)** | | | | | |
| `/api/devices` | `GET` | ❌ | ❌ | ✅ | JWT Token + `@Roles('admin')` |
| `/api/devices/:id` | `GET` | ❌ | ❌ | ✅ | JWT Token + `@Roles('admin')` |
| `/api/devices/code/:deviceCode`| `GET` | ❌ | ❌ | ✅ | JWT Token + `@Roles('admin')` |
| `/api/devices/:id/status` | `GET` | ❌ | ❌ | ✅ | JWT Token + `@Roles('admin')` |

*Chú giải:*
- ✅ : Cho phép truy cập.
- ❌ : Không cho phép truy cập (trả về lỗi `401 Unauthorized` hoặc `403 Forbidden`).
- 🔑 : Chỉ cho phép truy cập nếu User sở hữu tài nguyên Vườn cây tương ứng (trả về lỗi `404 Not Found` nếu không phải chủ sở hữu).

---

## 💻 5. Hướng dẫn áp dụng trong Code (Code Examples)

### 5.1. Tạo API Endpoint công khai không cần đăng nhập
Sử dụng decorator `@Public()` để bypass qua lớp `JwtAuthGuard`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('plants')
export class PlantsController {
  
  @Get()
  @Public() // Bất kỳ ai cũng có thể gọi API lấy danh sách cây trồng
  async findAll() {
    return this.plantsService.findAll();
  }
}
```

### 5.2. Giới hạn Endpoint chỉ cho Admin truy cập
Sử dụng decorator `@Roles('admin')`:

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('plants')
export class PlantsController {

  @Post()
  @Roles('admin') // Chỉ những tài khoản có vai trò 'admin' mới truy cập được
  async create(@Body() dto: CreatePlantDto) {
    return this.plantsService.create(dto);
  }
}
```

### 5.3. Ràng buộc quyền sở hữu tài nguyên (Ownership Checking)
Được kiểm tra thông qua nghiệp vụ trong Service. Ví dụ trong `GardensService`:

```typescript
@Injectable()
export class GardensService {
  constructor(private prisma: PrismaService) {}

  async findById(id: number, userId: number) {
    const garden = await this.prisma.garden.findUnique({
      where: { id },
      include: { device: true, plant: true },
    });

    if (!garden) {
      throw new NotFoundException(`Garden with ID ${id} not found`);
    }

    // Kiểm tra quyền sở hữu: Vườn phải thuộc về userId đang request
    if (garden.userId !== userId) {
      throw new NotFoundException(`Garden with ID ${id} not found`); // Trả về 404 để bảo mật thông tin sự tồn tại của vườn
    }

    return garden;
  }
}
```

---

## 🧪 6. Tài khoản kiểm thử có sẵn (Seed Data)

Khi cơ sở dữ liệu được khởi tạo bằng lệnh `npx prisma db seed`, các tài khoản kiểm thử sau sẽ được tạo tự động:

1. **Tài khoản User thông thường:**
   - **Email:** `test@example.com`
   - **Mật khẩu:** `password123`
   - **Vai trò:** `user`

2. **Tài khoản Quản trị viên (Admin):**
   - **Email:** `admin@example.com`
   - **Mật khẩu:** `admin123`
   - **Vai trò:** `admin`
