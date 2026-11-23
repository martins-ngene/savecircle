import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MockPrismaStore } from './mock-prisma';
import { Account, Contract, Keypair, nativeToScVal, rpc, TransactionBuilder } from '@stellar/stellar-sdk';
import { createHash } from 'node:crypto';
import { BlockchainService } from '../src/blockchain/blockchain.service';

describe('SaveCircle End-to-End System & Regression Tests', () => {
  let app: INestApplication;
  const prismaStore = new MockPrismaStore();

  // Test Wallets (Valid Stellar Ed25519 addresses)
  const organizerKeypair = Keypair.random();
  const organizerWallet = organizerKeypair.publicKey();

  const memberKeypair = Keypair.random();
  const memberWallet = memberKeypair.publicKey();

  const rogueWallet = 'GCPZAXFI45FYYEG25SDJYI7EP7PR67EV2M24CGT6KJOHUBSEEYF5E36M';

  let organizerToken: string;
  let memberToken: string;
  let createdGroupId: string;
  let inviteToken: string;

  beforeAll(async () => {
    prismaStore.reset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStore.getService())
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: ['health'],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Authentication Flow (SEP-0010 Challenge-Response)', () => {
    it('should generate a cryptographic challenge nonce for a valid Stellar address', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/challenge')
        .send({ walletAddress: organizerWallet })
        .expect(200);

      expect(res.body.message).toContain('Sign this message to authenticate with SaveCircle:');
      expect(typeof res.body.expiresAt).toBe('number');
    });

    it('should reject malformed or invalid Stellar addresses', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/challenge')
        .send({ walletAddress: 'invalid-stellar-address' })
        .expect(400);
    });

    it('should authenticate organizer with valid cryptographic signature and return JWT token', async () => {
      const chalRes = await request(app.getHttpServer())
        .post('/api/auth/challenge')
        .send({ walletAddress: organizerWallet });

      const message = chalRes.body.message;
      const signature = organizerKeypair.sign(Buffer.from(message, 'utf-8')).toString('base64');

      const verifyRes = await request(app.getHttpServer())
        .post('/api/auth/verify')
        .send({
          walletAddress: organizerWallet,
          signature,
          message,
        })
        .expect(200);

      expect(verifyRes.body.accessToken).toBeDefined();
      expect(verifyRes.body.walletAddress).toBe(organizerWallet);
      organizerToken = verifyRes.body.accessToken;
    });

    it('should authenticate a member with a Freighter-compatible SEP-53 signature', async () => {
      const chalRes = await request(app.getHttpServer())
        .post('/api/auth/challenge')
        .send({ walletAddress: memberWallet });

      const message = chalRes.body.message;
      const digest = createHash('sha256').update('Stellar Signed Message:\n').update(message).digest();
      const signature = memberKeypair.sign(digest).toString('base64');

      const verifyRes = await request(app.getHttpServer())
        .post('/api/auth/verify')
        .send({
          walletAddress: memberWallet,
          signature,
          message,
        })
        .expect(200);

      expect(verifyRes.body.accessToken).toBeDefined();
      memberToken = verifyRes.body.accessToken;
    });

    it('regression: should reject tampered signatures', async () => {
      const chalRes = await request(app.getHttpServer())
        .post('/api/auth/challenge')
        .send({ walletAddress: organizerWallet });

      const message = chalRes.body.message;
      const wrongSignature = memberKeypair.sign(Buffer.from(message, 'utf-8')).toString('base64');

      await request(app.getHttpServer())
        .post('/api/auth/verify')
        .send({
          walletAddress: organizerWallet,
          signature: wrongSignature,
          message,
        })
        .expect(401);
    });

    it('regression: should reject replayed nonce', async () => {
      const chalRes = await request(app.getHttpServer())
        .post('/api/auth/challenge')
        .send({ walletAddress: organizerWallet });

      const message = chalRes.body.message;
      const signature = organizerKeypair.sign(Buffer.from(message, 'utf-8')).toString('base64');

      // First verify succeeds
      await request(app.getHttpServer())
        .post('/api/auth/verify')
        .send({ walletAddress: organizerWallet, signature, message })
        .expect(200);

      // Replaying the exact same message must fail
      await request(app.getHttpServer())
        .post('/api/auth/verify')
        .send({ walletAddress: organizerWallet, signature, message })
        .expect(401);
    });
  });

  describe('2. Savings Group Creation & Validation', () => {
    it('should reject unauthenticated circle creation', async () => {
      await request(app.getHttpServer())
        .post('/api/groups')
        .send({
          name: 'Unauthorized Circle',
          description: 'Should fail',
          contributionAmount: '100.00',
          totalMembers: 5,
          rules: 'Rules',
        })
        .expect(401);
    });

    it('should create a valid savings circle and initialize rotating cycles', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/groups')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          name: 'Lagos Tech Savings Circle',
          description: 'Ajo rotating savings for 5 developers',
          contributionAmount: '100.00',
          totalMembers: 5,
          paymentFrequency: 'MONTHLY',
          cycleDurationDays: 30,
          approvalThreshold: 3,
          payoutModel: 'ROTATING',
          rules: '1. Pay on 1st. 2. Payouts in rotation.',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Lagos Tech Savings Circle');
      expect(res.body.organizerWallet).toBe(organizerWallet);
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].rotationPosition).toBe(1);
      expect(res.body.cycles).toHaveLength(5);

      createdGroupId = res.body.id;
      inviteToken = res.body.inviteToken;
    });

    it('links only a confirmed matching create_group transaction submitted by the circle organizer', async () => {
      const config = app.get(BlockchainService).getNetworkConfig();
      const args = [
        nativeToScVal(organizerWallet, { type: 'address' }),
        nativeToScVal('Lagos Tech Savings Circle', { type: 'string' }),
        nativeToScVal(config.usdcTokenId, { type: 'address' }),
        nativeToScVal(1_000_000_000n, { type: 'i128' }),
        nativeToScVal(5, { type: 'u32' }),
        nativeToScVal(30 * 17_280, { type: 'u32' }),
        nativeToScVal(3, { type: 'u32' }),
      ];
      const envelope = (name: string) => new TransactionBuilder(new Account(organizerWallet, '0'), {
        fee: '100', networkPassphrase: config.networkPassphrase,
      }).addOperation(new Contract(config.contractId).call(name, ...args)).setTimeout(60).build().toEnvelope();
      const response = {
        status: rpc.Api.GetTransactionStatus.SUCCESS,
        feeBump: false,
        returnValue: nativeToScVal(7, { type: 'u32' }),
        envelopeXdr: envelope('contribute'),
      };
      const lookup = vi.spyOn(rpc.Server.prototype, 'getTransaction').mockResolvedValue(response as rpc.Api.GetSuccessfulTransactionResponse);
      const path = `/api/groups/${createdGroupId}/link-on-chain`;
      const proof = { txHash: 'a'.repeat(64) };
      try {
        await request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${memberToken}`).send(proof).expect(403);
        await request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${organizerToken}`).send(proof).expect(400);
        response.envelopeXdr = envelope('create_group');
        const linked = await request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${organizerToken}`).send(proof).expect(200);
        expect(linked.body.onChainGroupId).toBe(7);
      } finally {
        lookup.mockRestore();
      }
    });

    it('should retrieve circles for the authenticated organizer', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/groups/my-circles')
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].id).toBe(createdGroupId);
    });

    it('should retrieve full details of circle by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/groups/${createdGroupId}`)
        .expect(200);

      expect(res.body.id).toBe(createdGroupId);
      expect(res.body.cycles[0].cycleIndex).toBe(1);
      expect(res.body.cycles[0].status).toBe('PENDING');
      expect(res.body.cycles[1].status).toBe('UPCOMING');
    });

    it('should load public preview via invite token', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/groups/invite/${inviteToken}`)
        .expect(200);

      expect(res.body.groupId).toBe(createdGroupId);
      expect(res.body.name).toBe('Lagos Tech Savings Circle');
      expect(res.body.joinedMembers).toBe(1);
    });
  });

  describe('3. Member Onboarding & Rules Acceptance', () => {
    it('should allow organizer to register an authorized member', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/groups/${createdGroupId}/members`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          walletAddress: memberWallet,
          displayName: 'Alice Developer',
          rotationPosition: 2,
        })
        .expect(201);

      expect(res.body.walletAddress).toBe(memberWallet);
      expect(res.body.rotationPosition).toBe(2);
      expect(res.body.status).toBe('INVITED');
      expect(res.body.rulesAccepted).toBe(false);
    });

    it('regression: should reject duplicate rotation position', async () => {
      const anotherWallet = Keypair.random().publicKey();

      await request(app.getHttpServer())
        .post(`/api/groups/${createdGroupId}/members`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          walletAddress: anotherWallet,
          displayName: 'Bob Developer',
          rotationPosition: 2, // Already taken by memberWallet
        })
        .expect(400);
    });

    it('regression: should prevent non-organizer from registering members', async () => {
      const anotherWallet = Keypair.random().publicKey();

      await request(app.getHttpServer())
        .post(`/api/groups/${createdGroupId}/members`)
        .set('Authorization', `Bearer ${memberToken}`) // Member, not organizer
        .send({
          walletAddress: anotherWallet,
          rotationPosition: 3,
        })
        .expect(403);
    });

    it('should allow member to accept group rules', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/groups/${createdGroupId}/accept-rules`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(res.body.rulesAccepted).toBe(true);
      expect(res.body.status).toBe('ACTIVE');
    });
  });

  describe('4. Contribution Schedules & Obligations', () => {
    it('should retrieve group contribution schedule', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/schedules/group/${createdGroupId}`)
        .expect(200);

      expect(res.body.groupId).toBe(createdGroupId);
      expect(res.body.cycles).toHaveLength(5);
      expect(res.body.cycles[0].cycleIndex).toBe(1);
      expect(res.body.cycles[0].status).toBe('PENDING');
      expect(res.body.cycles[0].targetAmount).toBe('500');
    });

    it('should return upcoming obligations for authenticated member', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/schedules/my-obligations')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].groupId).toBe(createdGroupId);
      expect(res.body[0].amount).toBe('100');
    });
  });

  describe('5. Member Ledger & Financial Reconciliation', () => {
    it('should retrieve transparent member ledger', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/ledger/group/${createdGroupId}/my-ledger`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(res.body.groupId).toBe(createdGroupId);
      expect(res.body.walletAddress).toBe(memberWallet);
      expect(res.body.payoutPosition).toBe(2);
      expect(res.body.totalContributed).toBe('0');
      expect(res.body.totalPayoutsReceived).toBe('0');
      expect(res.body.cycles).toHaveLength(5);
    });

    it('should return group financial summary', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/ledger/group/${createdGroupId}/summary`)
        .expect(200);

      expect(res.body.groupId).toBe(createdGroupId);
      expect(res.body.totalTargetPool).toBe('500');
      expect(res.body.memberCount).toBe(2);
    });
  });

  describe('6. Blockchain & Soroban Integration Config', () => {
    it('should return valid Soroban contract configuration', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/blockchain/config')
        .expect(200);

      expect(res.body.network).toBe('TESTNET');
      expect(res.body.contractId).toBe('CDSNM3LJEEDHPHKQBEUA5FS42SUMAWTEEKWHAIVWJYYYT6QY3B5HNYNB');
      expect(res.body.usdcTokenId).toBe('CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA');
      expect(res.body.rpcUrl).toContain('soroban-testnet.stellar.org');
    });

    it('should handle transaction verification lookup gracefully', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/blockchain/tx/333624b8c4daabc6b9c8010586248d995669d29c5ac710ff368db1f58c107b09')
        .expect(200);

      expect(res.body).toHaveProperty('success');
    });
  });

  describe('7. Notifications System', () => {
    it('should return notifications list for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should mark all notifications as read', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      expect(res.body).toHaveProperty('count');
    });
  });

  describe('8. System Health & Observability', () => {
    it('should return 200 OK and valid health metrics on /health', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(res.body).toMatchObject({
        status: 'ok',
        service: 'savecircle-backend',
        database: expect.any(String),
        stellar: expect.objectContaining({
          network: expect.any(String),
          contractId: expect.any(String),
        }),
      });
      expect(typeof res.body.uptimeSeconds).toBe('number');
      expect(typeof res.body.timestamp).toBe('string');
    });
  });
});
