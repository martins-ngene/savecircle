import { Prisma } from '@prisma/client';

export class MockPrismaStore {
  users: any[] = [];
  nonces: any[] = [];
  groups: any[] = [];
  members: any[] = [];
  cycles: any[] = [];
  payments: any[] = [];
  withdrawals: any[] = [];
  notifications: any[] = [];
  syncStates: any[] = [];

  reset() {
    this.users = [];
    this.nonces = [];
    this.groups = [];
    this.members = [];
    this.cycles = [];
    this.payments = [];
    this.withdrawals = [];
    this.notifications = [];
    this.syncStates = [];
  }

  getService() {
    return {
      $connect: async () => {},
      $disconnect: async () => {},
      $transaction: async (run: (tx: any) => Promise<unknown>) => run(this.getService()),
      user: {
        upsert: async ({ where, create, update }: any) => {
          let u = this.users.find((x) => x.walletAddress === where.walletAddress);
          if (!u) {
            u = { id: 'u-' + Math.random().toString(36).substring(7), ...create, createdAt: new Date(), updatedAt: new Date() };
            this.users.push(u);
          } else {
            Object.assign(u, update, { updatedAt: new Date() });
          }
          return u;
        },
        findUnique: async ({ where }: any) => {
          return this.users.find((x) => x.walletAddress === where.walletAddress || x.id === where.id) || null;
        },
      },
      walletNonce: {
        create: async ({ data }: any) => {
          const rec = { id: 'n-' + Math.random().toString(36).substring(7), isUsed: false, createdAt: new Date(), ...data };
          this.nonces.push(rec);
          return rec;
        },
        updateMany: async ({ where, data }: any) => {
          const record = this.nonces.find((nonce) =>
            nonce.nonce === where.nonce && nonce.walletAddress === where.walletAddress &&
            nonce.isUsed === where.isUsed && nonce.expiresAt > where.expiresAt.gt,
          );
          if (!record) return { count: 0 };
          Object.assign(record, data);
          return { count: 1 };
        },
      },
      savingsGroup: {
        create: async ({ data, include }: any) => {
          const { members, ...rest } = data;
          const grp = {
            id: 'grp-' + Math.random().toString(36).substring(7),
            inviteToken: 'inv-' + Math.random().toString(36).substring(7),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...rest,
          };
          this.groups.push(grp);

          if (members?.create) {
            const mData = members.create;
            const mRec = {
              id: 'mbr-' + Math.random().toString(36).substring(7),
              groupId: grp.id,
              totalContributed: new Prisma.Decimal(0),
              totalReceived: new Prisma.Decimal(0),
              joinedAt: new Date(),
              updatedAt: new Date(),
              ...mData,
            };
            this.members.push(mRec);
          }

          return this.getGroupView(grp.id, include);
        },
        findUnique: async ({ where, include }: any) => {
          const grp = this.groups.find((group) => Object.entries(where).every(([key, value]) => group[key] === value));
          if (!grp) return null;
          return this.getGroupView(grp.id, include);
        },
        updateMany: async ({ where, data }: any) => {
          const groups = this.groups.filter((group) => Object.entries(where).every(([key, value]) => (group[key] ?? null) === value));
          groups.forEach((group) => Object.assign(group, data));
          return { count: groups.length };
        },
        findMany: async ({ where }: any) => {
          return this.groups
            .filter((g) => {
              if (where?.OR) {
                return where.OR.some((condition: any) => {
                  if (condition.organizerWallet && g.organizerWallet === condition.organizerWallet) return true;
                  if (condition.members?.some?.walletAddress) {
                    return this.members.some((m) => m.groupId === g.id && m.walletAddress === condition.members.some.walletAddress);
                  }
                  return false;
                });
              }
              return true;
            })
            .map((g) => this.getGroupView(g.id, { members: true, cycles: true }));
        },
      },
      groupMember: {
        create: async ({ data }: any) => {
          const m = {
            id: 'mbr-' + Math.random().toString(36).substring(7),
            totalContributed: new Prisma.Decimal(0),
            totalReceived: new Prisma.Decimal(0),
            joinedAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          this.members.push(m);
          return m;
        },
        findUnique: async ({ where }: any) => {
          if (where.id) return this.members.find((x) => x.id === where.id) || null;
          if (where.groupId_walletAddress) {
            return this.members.find((x) => x.groupId === where.groupId_walletAddress.groupId && x.walletAddress === where.groupId_walletAddress.walletAddress) || null;
          }
          return null;
        },
        findMany: async ({ where, include }: any) => {
          return this.members
            .filter((m) => {
              if (where?.walletAddress && m.walletAddress !== where.walletAddress) return false;
              if (where?.status && m.status !== where.status) return false;
              return true;
            })
            .map((m) => {
              if (include?.group) {
                const group = this.getGroupView(m.groupId, include.group.include);
                return { ...m, group };
              }
              return m;
            });
        },
        update: async ({ where, data }: any) => {
          const m = this.members.find((x) => x.id === where.id);
          if (m) Object.assign(m, data, { updatedAt: new Date() });
          return m;
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const m of this.members) {
            if ((!where.groupId || m.groupId === where.groupId) && (!where.walletAddress || m.walletAddress === where.walletAddress)) {
              if (data.totalContributed?.increment) {
                m.totalContributed = m.totalContributed.add(data.totalContributed.increment);
              }
              if (data.totalReceived?.increment) {
                m.totalReceived = m.totalReceived.add(data.totalReceived.increment);
              }
              count++;
            }
          }
          return { count };
        },
      },
      contributionCycle: {
        create: async ({ data }: any) => {
          const c = {
            id: 'cyc-' + Math.random().toString(36).substring(7),
            collectedAmount: new Prisma.Decimal(0),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          this.cycles.push(c);
          return c;
        },
        findUnique: async ({ where }: any) => {
          if (where.id) return this.cycles.find((x) => x.id === where.id) || null;
          if (where.groupId_cycleIndex) {
            return this.cycles.find((x) => x.groupId === where.groupId_cycleIndex.groupId && x.cycleIndex === where.groupId_cycleIndex.cycleIndex) || null;
          }
          return null;
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const c of this.cycles) {
            if (c.groupId === where.groupId && (!where.cycleIndex || c.cycleIndex === where.cycleIndex)) {
              Object.assign(c, data, { updatedAt: new Date() });
              count++;
            }
          }
          return { count };
        },
        update: async ({ where, data }: any) => {
          const c = this.cycles.find((x) => x.id === where.id);
          if (c) {
            if (data.collectedAmount?.increment) {
              c.collectedAmount = c.collectedAmount.add(data.collectedAmount.increment);
            }
            Object.assign(c, data, { updatedAt: new Date() });
          }
          return c;
        },
      },
      paymentRecord: {
        create: async ({ data }: any) => {
          const p = { id: 'pmt-' + Math.random().toString(36).substring(7), createdAt: new Date(), ...data };
          this.payments.push(p);
          return p;
        },
        findFirst: async ({ where }: any) => {
          return this.payments.find((x) => x.cycleId === where.cycleId && x.memberWallet === where.memberWallet) || null;
        },
        upsert: async ({ where, create, update }: any) => {
          let p = this.payments.find((x) => x.txHash === where.txHash);
          if (!p) {
            p = { id: 'pmt-' + Math.random().toString(36).substring(7), createdAt: new Date(), ...create };
            this.payments.push(p);
          } else {
            Object.assign(p, update);
          }
          return p;
        },
      },
      notification: {
        findMany: async ({ where }: any) => {
          return this.notifications.filter((x) => x.userWallet === where.userWallet);
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const n of this.notifications) {
            if ((!where.id || n.id === where.id) && (!where.userWallet || n.userWallet === where.userWallet)) {
              Object.assign(n, data);
              count++;
            }
          }
          return { count };
        },
      },
      syncState: {
        findUnique: async () => null,
        upsert: async () => ({}),
      },
    };
  }

  private getGroupView(id: string, include?: any) {
    const grp = this.groups.find((x) => x.id === id);
    if (!grp) return null;
    const view: any = { ...grp };
    if (include?.members) {
      view.members = this.members.filter((m) => m.groupId === id);
    }
    if (include?.cycles) {
      view.cycles = this.cycles
        .filter((c) => c.groupId === id)
        .map((c) => {
          const cView = { ...c };
          if (include.cycles.include?.payments) {
            cView.payments = this.payments.filter((p) => p.cycleId === c.id);
          }
          return cView;
        });
    }
    if (include?.withdrawals) {
      view.withdrawals = this.withdrawals.filter((w) => w.groupId === id);
    }
    return view;
  }
}
