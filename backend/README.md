Cách chạy server:

1. mở terminal từ thư mục sau clone
2. docker-compose -f docker/docker-compose.yml up -d
3. npm install
4. cấu hình .env: tạo file .env và copy nôi dung file .env.example
5. npx prisma migrate dev --name init
6. npx prisma generate
7. npm run start:dev


