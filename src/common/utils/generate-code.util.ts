const crypto = require('crypto');

async function generateRoomCode(prisma) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 ký tự dễ đọc
    let isUnique = false;
    let newCode = '';

    while (!isUnique) {
        // Sinh mã 6 hoặc 8 ký tự
        newCode = Array.from({ length: 6 }, () => chars[crypto.randomInt(0, chars.length)]).join('');

        // Kiểm tra xem mã này có đang được dùng ở phòng nào chưa kết thúc không
        const existingRoom = await prisma.room.findFirst({
            where: {
                code: newCode,
                status: { in: ['WAITING', 'ACTIVE'] }
            }
        });

        if (!existingRoom) isUnique = true;
    }
    return newCode;
}

export default generateRoomCode;