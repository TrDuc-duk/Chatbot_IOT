import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  console.log('🌱 Seeding database...');

  // Tạo roles
  const adminRole = await prisma.role.upsert({
    where: { roleName: 'admin' },
    update: {},
    create: { roleName: 'admin' },
  });

  const userRole = await prisma.role.upsert({
    where: { roleName: 'user' },
    update: {},
    create: { roleName: 'user' },
  });

  console.log('✅ Roles created:', { adminRole, userRole });

  // Hash passwords
  const userPassword = await bcrypt.hash('password123', SALT_ROUNDS);
  const adminPassword = await bcrypt.hash('admin123', SALT_ROUNDS);

  // Tạo test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: { password: userPassword },
    create: {
      username: 'testuser',
      email: 'test@example.com',
      password: userPassword,
      roleId: userRole.id,
    },
  });

  console.log('✅ Test user created:', {
    ...testUser,
    password: '[HIDDEN]',
    credentials: 'test@example.com / password123',
  });

  // Tạo admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { password: adminPassword },
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password: adminPassword,
      roleId: adminRole.id,
    },
  });

  console.log('✅ Admin user created:', {
    ...adminUser,
    password: '[HIDDEN]',
    credentials: 'admin@example.com / admin123',
  });

  // Tạo plants mẫu
  const plants = [
    {
      name: 'Cà chua',
      description: 'Cây cà chua thích hợp trồng trong điều kiện ấm áp',
      minTemperature: 18,
      maxTemperature: 32,
      minAirHumidity: 50,
      maxAirHumidity: 80,
      minSoilMoisture: 40,
      maxSoilMoisture: 70,
      createdById: adminUser.id,
    },
    {
      name: 'Rau xà lách',
      description: 'Rau xà lách thích hợp với khí hậu mát mẻ',
      minTemperature: 15,
      maxTemperature: 25,
      minAirHumidity: 60,
      maxAirHumidity: 80,
      minSoilMoisture: 50,
      maxSoilMoisture: 75,
      createdById: adminUser.id,
    },
    {
      name: 'Ớt chuông',
      description: 'Ớt chuông cần nhiều ánh sáng và độ ẩm vừa phải',
      minTemperature: 20,
      maxTemperature: 35,
      minAirHumidity: 50,
      maxAirHumidity: 70,
      minSoilMoisture: 35,
      maxSoilMoisture: 65,
      createdById: adminUser.id,
    },
    {
      name: 'Dưa leo',
      description: 'Dưa leo cần nhiều nước và ánh sáng',
      minTemperature: 20,
      maxTemperature: 35,
      minAirHumidity: 60,
      maxAirHumidity: 85,
      minSoilMoisture: 50,
      maxSoilMoisture: 80,
      createdById: adminUser.id,
    },
    {
      name: 'Húng quế',
      description: 'Húng quế thích hợp trồng trong điều kiện ấm',
      minTemperature: 20,
      maxTemperature: 30,
      minAirHumidity: 40,
      maxAirHumidity: 70,
      minSoilMoisture: 30,
      maxSoilMoisture: 60,
      createdById: adminUser.id,
    },
  ];

  for (const plant of plants) {
    await prisma.plant.upsert({
      where: { id: plants.indexOf(plant) + 1 },
      update: plant,
      create: plant,
    });
  }

  console.log('✅ Plants created:', plants.length);

  // Tạo device mẫu
  const device = await prisma.device.upsert({
    where: { deviceCode: 'ESP32_001' },
    update: {},
    create: {
      deviceCode: 'ESP32_001',
      temperature: 28.5,
      airHumidity: 65.0,
      soilMoisture: 45.0,
      isDark: false,
      isPumpOn: false,
      isLedOn: false,
      isConnected: true,
      lastSeen: new Date(),
    },
  });

  console.log('✅ Device created:', device);

  // Tạo garden mẫu cho test user
  const garden = await prisma.garden.upsert({
    where: { id: 1 },
    update: {},
    create: {
      gardenName: 'Vườn rau sân thượng',
      description: 'Vườn rau organic trên sân thượng tầng 5',
      irrigationMode: 'manual',
      userId: testUser.id,
      plantId: 1,
      deviceId: device.id,
      autoIrrigationThreshold: 30,
      autoIrrigationDuration: 60,
      ledAutoMode: false,
    },
  });

  console.log('✅ Garden created:', garden);

  // Tạo irrigation record
  await prisma.irrigation.upsert({
    where: { gardenId: garden.id },
    update: {},
    create: {
      gardenId: garden.id,
      isActive: false,
    },
  });

  console.log('✅ Irrigation record created');

  console.log('\n🎉 Seeding completed! ');
  console.log('\n📝 Test Credentials:');
  console.log('   User:   test@example.com / password123');
  console.log('   Admin: admin@example.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
