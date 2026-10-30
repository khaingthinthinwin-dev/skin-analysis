import { afterEach, describe, expect, it, vi } from "vitest";
import { printInvoice } from "./printInvoice";
import { OrderStatus } from "../types/orderInsights.types";
import type { OrderDetailResponseDto } from "../types/orderInsights.types";

const ORDER: OrderDetailResponseDto = {
  id: "9f1c1a52-6f0e-4f6d-9a1e-2b5d3c7e8a10",
  orderNumber: "ORD-9F1C1A52",
  createdAt: "2026-10-06T12:00:00.000Z",
  status: OrderStatus.PLACED,
  items: [],
  discountAmount: "0.00",
  couponCode: null,
  totalAmount: "0.00",
  paymentMethod: "cash_on_delivery",
  paymentStatus: "pending",
  shippingAddress: {},
  notes: null,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("printInvoice", () => {
  it("formats the order date in English regardless of the browser locale", () => {
    const printWindow = {
      document: { write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      setTimeout: vi.fn(),
      print: vi.fn(),
    };
    vi.spyOn(window, "open").mockReturnValue(printWindow as unknown as Window);

    const nativeToLocaleDateString = Date.prototype.toLocaleDateString;
    vi.spyOn(Date.prototype, "toLocaleDateString").mockImplementation(function (
      this: Date,
      locale?: Intl.LocalesArgument,
      options?: Intl.DateTimeFormatOptions,
    ) {
      return nativeToLocaleDateString.call(this, locale ?? "ja-JP", options);
    });

    const expectedOrderDate = nativeToLocaleDateString.call(
      new Date(ORDER.createdAt),
      "en-US",
      { year: "numeric", month: "long", day: "numeric" },
    );

    printInvoice(ORDER);

    const html = printWindow.document.write.mock.calls[0][0] as string;
    expect(html).toContain(`Order Date: ${expectedOrderDate}`);
    expect(html).not.toContain("年");
  });
});
