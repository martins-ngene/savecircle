import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserNotifications(userWallet: string) {
    try {
      return await this.prisma.notification.findMany({
        where: { userWallet },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    } catch {
      return [];
    }
  }

  async markAsRead(id: string, userWallet: string) {
    try {
      return await this.prisma.notification.updateMany({
        where: { id, userWallet },
        data: { isRead: true },
      });
    } catch {
      return { count: 0 };
    }
  }

  async markAllAsRead(userWallet: string) {
    try {
      return await this.prisma.notification.updateMany({
        where: { userWallet },
        data: { isRead: true },
      });
    } catch {
      return { count: 0 };
    }
  }
}
