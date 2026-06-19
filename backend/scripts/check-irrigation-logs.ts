import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkIrrigationLogs() {
    console.log('Checking irrigation logs...\n');

    const logs = await prisma.irrigationLog.findMany({
        orderBy: { startTime: 'desc' },
        take: 10,
    });

    console.log('Recent irrigation logs:');
    console.table(logs.map(log => ({
        id: log.id,
        gardenId: log.gardenId,
        mode: log.mode,
        status: log.status,
        duration: log.duration,
        startTime: log.startTime,
        endTime: log.endTime,
        note: log.note?.substring(0, 50),
    })));

    const stuckLogs = await prisma.irrigationLog.findMany({
        where: { status: 'started' },
    });

    console.log(`\nStuck logs (status='started'): ${stuckLogs.length}`);
    if (stuckLogs.length > 0) {
        console.table(stuckLogs.map(log => ({
            id: log.id,
            gardenId: log.gardenId,
            startTime: log.startTime,
            duration: log.duration,
        })));
    }

    await prisma.$disconnect();
}

checkIrrigationLogs().catch(console.error);
