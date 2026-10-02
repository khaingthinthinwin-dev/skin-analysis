import { PrismaService } from '../../../shared/prisma/prisma.service';
import { runWithAuditRequestContext } from './audit-request-context';
import {
  AuditRequestMetadataInitializer,
  installAuditRequestMetadata,
  withAuditRequestMetadata,
} from './audit-request-metadata.installer';

type AuditRow = Record<string, unknown>;
type CreateArgs = { data: AuditRow | AuditRow[] };

const REQUEST_CONTEXT = {
  ipAddress: '203.0.113.1',
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0 Safari/537.36',
};

interface FakeDelegate {
  create: jest.Mock<Promise<unknown>, [CreateArgs]>;
  createMany: jest.Mock<Promise<{ count: number }>, [CreateArgs]>;
  __auditRequestMetadata?: unknown;
}

interface FakeClient {
  auditLog: FakeDelegate;
  $transaction: jest.Mock<Promise<unknown>, [unknown, ...unknown[]]>;
}

function createFakeClient() {
  const createMock = jest.fn<Promise<unknown>, [CreateArgs]>(() =>
    Promise.resolve({ id: 'audit-1' }),
  );
  const createManyMock = jest.fn<Promise<{ count: number }>, [CreateArgs]>(
    (args) => Promise.resolve({ count: (args.data as AuditRow[]).length }),
  );
  const transactionMock = jest.fn<Promise<unknown>, [unknown, ...unknown[]]>();

  const client: FakeClient = {
    auditLog: { create: createMock, createMany: createManyMock },
    $transaction: transactionMock,
  };

  // The install replaces the delegate methods in place, so the original mocks
  // stay reachable only through these captured references.
  return {
    client,
    prisma: () => client as unknown as PrismaService,
    createMock,
    createManyMock,
    transactionMock,
    createArgs: () => createMock.mock.calls[0][0],
    createManyArgs: () => createManyMock.mock.calls[0][0],
  };
}

describe('withAuditRequestMetadata', () => {
  it('should return the args untouched when no request context is active', () => {
    const args: CreateArgs = { data: { action: 'PLACE_ORDER' } };

    expect(withAuditRequestMetadata(args)).toBe(args);
  });

  it('should ignore non-object args', () => {
    expect(withAuditRequestMetadata(undefined)).toBeUndefined();
    expect(withAuditRequestMetadata('nope')).toBe('nope');
  });
});

describe('installAuditRequestMetadata', () => {
  it('should stamp the IP and User-Agent on an audit create', async () => {
    const { client, createArgs, prisma } = createFakeClient();
    installAuditRequestMetadata(prisma());

    await runWithAuditRequestContext(REQUEST_CONTEXT, () =>
      client.auditLog.create({
        data: { action: 'APPROVE_MERCHANT', entityType: 'merchant' },
      }),
    );

    expect(createArgs().data).toEqual({
      action: 'APPROVE_MERCHANT',
      entityType: 'merchant',
      ipAddress: REQUEST_CONTEXT.ipAddress,
      userAgent: REQUEST_CONTEXT.userAgent,
    });
  });

  it('should stamp every row of an audit createMany', async () => {
    const { client, createManyArgs, prisma } = createFakeClient();
    installAuditRequestMetadata(prisma());

    await runWithAuditRequestContext(REQUEST_CONTEXT, () =>
      client.auditLog.createMany({
        data: [
          { action: 'PAYOUT_DELETED', entityType: 'Payout' },
          { action: 'PAYOUT_DELETED', entityType: 'Payout' },
        ],
      }),
    );

    expect(createManyArgs().data).toEqual([
      {
        action: 'PAYOUT_DELETED',
        entityType: 'Payout',
        ipAddress: REQUEST_CONTEXT.ipAddress,
        userAgent: REQUEST_CONTEXT.userAgent,
      },
      {
        action: 'PAYOUT_DELETED',
        entityType: 'Payout',
        ipAddress: REQUEST_CONTEXT.ipAddress,
        userAgent: REQUEST_CONTEXT.userAgent,
      },
    ]);
  });

  it('should not override metadata supplied by the caller', async () => {
    const { client, createArgs, prisma } = createFakeClient();
    installAuditRequestMetadata(prisma());

    await runWithAuditRequestContext(REQUEST_CONTEXT, () =>
      client.auditLog.create({
        data: {
          action: 'TARGET_UPDATED',
          ipAddress: '198.51.100.7',
          userAgent: 'ExplicitAgent/1.0',
        },
      }),
    );

    expect(createArgs().data).toEqual({
      action: 'TARGET_UPDATED',
      ipAddress: '198.51.100.7',
      userAgent: 'ExplicitAgent/1.0',
    });
  });

  it('should leave audit rows untouched outside a request context', async () => {
    const { client, createArgs, prisma } = createFakeClient();
    installAuditRequestMetadata(prisma());

    await client.auditLog.create({ data: { action: 'PLACE_ORDER' } });

    expect(createArgs().data).toEqual({ action: 'PLACE_ORDER' });
  });

  it('should stamp audit writes made inside an interactive transaction', async () => {
    const { client, prisma, transactionMock } = createFakeClient();
    const transactionClient = createFakeClient();
    transactionMock.mockImplementation((arg: unknown) =>
      Promise.resolve(
        (arg as (tx: FakeClient) => unknown)(transactionClient.client),
      ),
    );
    installAuditRequestMetadata(prisma());

    await runWithAuditRequestContext(REQUEST_CONTEXT, () =>
      client.$transaction((tx: unknown) =>
        (tx as FakeClient).auditLog.create({
          data: { action: 'REVIEW_DELETED', entityType: 'review' },
        }),
      ),
    );

    expect(transactionClient.createArgs().data).toEqual({
      action: 'REVIEW_DELETED',
      entityType: 'review',
      ipAddress: REQUEST_CONTEXT.ipAddress,
      userAgent: REQUEST_CONTEXT.userAgent,
    });
  });

  it('should not wrap the same delegate twice', async () => {
    const { client, createMock, prisma } = createFakeClient();
    installAuditRequestMetadata(prisma());
    installAuditRequestMetadata(prisma());

    await runWithAuditRequestContext(REQUEST_CONTEXT, () =>
      client.auditLog.create({ data: { action: 'APPROVE_MERCHANT' } }),
    );

    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('should forward sequential ($transaction array) calls untouched', async () => {
    const { client, prisma, transactionMock } = createFakeClient();
    const queries = [Promise.resolve('query-result')];
    transactionMock.mockResolvedValue('sequential-result');
    installAuditRequestMetadata(prisma());

    await expect(client.$transaction(queries)).resolves.toBe(
      'sequential-result',
    );
    expect(transactionMock).toHaveBeenCalledWith(queries);
  });
});

describe('AuditRequestMetadataInitializer', () => {
  it('should install the stamping hooks on construction', async () => {
    const { client, createMock, prisma } = createFakeClient();

    new AuditRequestMetadataInitializer(prisma());

    await runWithAuditRequestContext(REQUEST_CONTEXT, () =>
      client.auditLog.create({ data: { action: 'AUDIT_LOG_DELETE' } }),
    );

    expect(createMock.mock.calls[0][0].data).toEqual({
      action: 'AUDIT_LOG_DELETE',
      ipAddress: REQUEST_CONTEXT.ipAddress,
      userAgent: REQUEST_CONTEXT.userAgent,
    });
  });
});
