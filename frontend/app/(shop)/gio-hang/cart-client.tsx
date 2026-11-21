"use client";

import Link from "next/link";
import { useStore } from "@/components/store";
import { CartLineRow } from "@/components/cart-line-row";
import { ButtonLink, Container, EmptyState } from "@/components/ui";
import { AccountSidebar } from "@/components/account-sidebar";
import { money } from "@/lib/format";

export default function CartPage() {
  const { user, ready, cartLoading, lines, subtotal, stepQuantity, removeLine } =
    useStore();
  const busy = !ready || (cartLoading && lines.length === 0);

  return (
    <>
      <Container className="grid items-start gap-10 py-16 lg:py-20 lg:grid-cols-[260px_1fr]">
        <AccountSidebar />

        <div className={lines.length > 0 ? "grid gap-10 lg:grid-cols-[1fr_360px]" : ""}>
          <section aria-labelledby="cart-heading">
            <h2 id="cart-heading" className="mb-4 text-xl font-semibold">Giỏ của bạn</h2>
            {busy ? (
              <p className="text-muted">Đang tải giỏ hàng...</p>
            ) : lines.length === 0 ? (
              <EmptyState
                title="Giỏ hàng đang trống"
                text="Thêm vài món gear phù hợp để bắt đầu. Giỏ của khách sẽ được đồng bộ khi bạn đăng nhập."
                href="/san-pham"
                cta="Xem sản phẩm"
              />
            ) : (
              lines.map((line) => (
                <CartLineRow
                  key={line.productId}
                  line={line}
                  onStep={stepQuantity}
                  onRemove={removeLine}
                />
              ))
            )}
          </section>

          {lines.length > 0 ? (
            <section aria-labelledby="summary-heading" className="h-fit rounded-card border border-line p-6">
              <h2 id="summary-heading" className="mb-4 text-lg font-semibold">Thanh toán</h2>
              <p className="flex justify-between py-1.5 text-sm">
                <span className="text-muted">Tạm tính</span>
                <span>{money(subtotal)}</span>
              </p>
              <p className="flex justify-between border-t border-line py-3 font-semibold">
                <span>Tổng cộng</span>
                <span>{money(subtotal)}</span>
              </p>
              <p className="text-xs text-muted">
                Giá đã bao gồm thuế. Phí ship chọn ở bước thanh toán.
              </p>

              <div className="mt-4 space-y-3">
                <ButtonLink href="/thanh-toan" size="lg" className="w-full">
                  Thanh toán
                </ButtonLink>
                <ButtonLink href="/san-pham" variant="ghost" className="w-full">
                  Tiếp tục mua hàng
                </ButtonLink>
              </div>

              {!user ? (
                <p className="mt-4 text-sm text-muted">
                  Giỏ đang lưu trên trình duyệt này.{" "}
                  <Link href="/dang-nhap?next=/gio-hang" className="text-accent hover:underline">
                    Đăng nhập
                  </Link>{" "}
                  để đồng bộ và đặt hàng.
                </p>
              ) : null}

              <ul className="mt-5 space-y-1.5 border-t border-line pt-4 text-xs text-muted">
                <li>Thanh toán khi nhận hàng</li>
                <li>Kiểm tra hàng trước khi nhận</li>
                <li>Hỗ trợ đổi trả 7 ngày</li>
              </ul>
            </section>
          ) : null}
        </div>
      </Container>
    </>
  );
}
