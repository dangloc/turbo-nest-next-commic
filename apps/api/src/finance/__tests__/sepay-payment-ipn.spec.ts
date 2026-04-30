import { UnauthorizedException } from '@nestjs/common';
import { SePayIpnGuard, computeSePayIpnSignature } from '../sepay-ipn.guard';
import {
  SePayPaymentController,
  SePayRootPaymentController,
} from '../sepay-payment.controller';

describe('SePay IPN endpoint security', () => {
  const financeService = {
    initSePayCheckout: jest.fn(),
  } as any;

  const walletService = {
    handleSePayPaymentIpn: jest.fn(),
  } as any;

  const controller = new SePayPaymentController(financeService, walletService);
  const rootController = new SePayRootPaymentController(walletService);

  const basePayload = {
    timestamp: 1759134682,
    notification_type: 'ORDER_PAID',
    order: {
      id: 'e2c195be-c721-47eb-b323-99ab24e52d85',
      order_id: 'NQD-68DA43D73C1A5',
      order_invoice_number: 'INV-1759134677',
      order_amount: '100000.00',
      order_description: 'Trial Payment for testuser123',
    },
    transaction: {
      transaction_id: '68da43da2d9de',
      transaction_amount: '100000',
      transaction_date: '2025-09-29 15:31:22',
    },
  } as Record<string, unknown>;

  function contextFor(headers: Record<string, string>, body: Record<string, unknown>) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          body,
          ip: '127.0.0.1',
        }),
      }),
    } as any;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SEPAY_SECRET_KEY = 'test-sepay-secret';
  });

  it('rejects IPN requests with missing signatures (401)', () => {
    const guard = new SePayIpnGuard();
    expect(() => guard.canActivate(contextFor({}, basePayload))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects IPN requests with invalid signatures (401)', () => {
    const guard = new SePayIpnGuard();
    expect(() =>
      guard.canActivate(
        contextFor({ 'x-sepay-signature': 'invalid-signature' }, basePayload),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('processes IPN successfully with a valid mocked signature', async () => {
    const guard = new SePayIpnGuard();
    const signature = computeSePayIpnSignature(
      basePayload,
      process.env.SEPAY_SECRET_KEY as string,
    );

    expect(
      guard.canActivate(
        contextFor({ 'x-sepay-signature': signature }, basePayload),
      ),
    ).toBe(true);

    walletService.handleSePayPaymentIpn.mockResolvedValue({
      success: true,
      result: {
        status: 'ok',
        processed: true,
      },
    });

    const result = await controller.ipn(basePayload);
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        result: {
          status: 'ok',
          processed: true,
        },
      }),
    );
    expect(walletService.handleSePayPaymentIpn).toHaveBeenCalledWith(
      basePayload,
      basePayload,
    );
  });

  it('accepts root POST IPN alias for existing SePay dashboard URLs', async () => {
    walletService.handleSePayPaymentIpn.mockResolvedValue({
      success: true,
      result: {
        status: 'ok',
        processed: true,
      },
    });

    await expect(rootController.rootIpn(basePayload)).resolves.toEqual({
      success: true,
      result: {
        status: 'ok',
        processed: true,
      },
    });
    expect(walletService.handleSePayPaymentIpn).toHaveBeenCalledWith(
      basePayload,
      basePayload,
    );
  });
});
