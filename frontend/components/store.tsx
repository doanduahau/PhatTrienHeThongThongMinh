"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { Cart, Product, User } from "@/lib/types";
import { CartDrawer } from "./cart-drawer";

const GUEST_CART_KEY = "gear_guest_cart";

export type GuestLine = {
  productId: number;
  name: string;
  price: number;
  imageUrl: string | null;
  stockQuantity: number | null;
  categorySlug: string | null;
  quantity: number;
};

/** Dòng giỏ đã chuẩn hoá, dùng chung cho drawer, trang giỏ và trang thanh toán. */
export type CartLineView = {
  productId: number;
  name: string;
  imageUrl: string | null;
  price: number;
  quantity: number;
  lineTotal: number;
  categorySlug: string | null;
};

const readGuestCart = (): GuestLine[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeGuestCart = (items: GuestLine[]) =>
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));

const normalizeServer = (cart: Cart | null): CartLineView[] =>
  (cart?.items ?? []).map((item) => {
    const product = item.product;
    const price = Number(item.price ?? product?.price ?? 0);
    return {
      productId: item.productId ?? product?.id ?? 0,
      name: item.name ?? product?.name ?? "",
      imageUrl: item.imageUrl ?? product?.imageUrl ?? null,
      price,
      quantity: item.quantity,
      lineTotal: Number(item.lineTotal ?? price * item.quantity),
      categorySlug: item.categorySlug ?? product?.category?.slug ?? null,
    };
  });

const normalizeGuest = (items: GuestLine[]): CartLineView[] =>
  items.map((item) => ({
    productId: item.productId,
    name: item.name,
    imageUrl: item.imageUrl,
    price: item.price,
    quantity: item.quantity,
    lineTotal: item.price * item.quantity,
    categorySlug: item.categorySlug,
  }));

type StoreValue = {
  ready: boolean;
  user: User | null;
  cartCount: number;
  cartLoading: boolean;
  lines: CartLineView[];
  subtotal: number;
  toast: (message: string) => void;
  login: (session: { user: User }) => Promise<void>;
  logout: () => void;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  refreshCart: () => Promise<void>;
  stepQuantity: (productId: number, delta: number) => Promise<void>;
  removeLine: (productId: number) => Promise<void>;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [serverCart, setServerCart] = useState<Cart | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [cartLoading, setCartLoading] = useState(true);
  const [guestItems, setGuestItems] = useState<GuestLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 2600);
  }, []);

  // Khôi phục phiên từ cookie httpOnly qua /api/auth/me — client không đọc token.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(async () => {
      try {
        const u = await api.me();
        if (!cancelled) setUser(u);
      } catch {
        if (!cancelled) setUser(null);
      }
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Một lần gọi `cart` vừa cập nhật badge vừa nuôi danh sách dòng cho drawer/trang. */
  const refreshCart = useCallback(async () => {
    if (user) {
      setCartLoading(true);
      try {
        const cart = await api.cart();
        setServerCart(cart);
        setCartCount(cart.totalItems);
      } catch {
        setServerCart(null);
        setCartCount(0);
      } finally {
        setCartLoading(false);
      }
    } else {
      setServerCart(null);
      const items = readGuestCart();
      setGuestItems(items);
      setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
      setCartLoading(false);
    }
  }, [user]);

  // Đồng bộ giỏ hàng khi sẵn sàng / đổi phiên.
  useEffect(() => {
    if (ready) queueMicrotask(() => void refreshCart());
  }, [ready, refreshCart]);

  /** Đẩy giỏ khách lên server sau đăng nhập; lỗi từng dòng không chặn dòng khác. */
  const login = useCallback(async ({ user: nextUser }: { user: User }) => {
    setUser(nextUser);
    const items = readGuestCart();
    for (const item of items) {
      try {
        await api.addToCart(item.productId, item.quantity);
      } catch {
        // hết hàng hoặc bị xoá: bỏ qua
      }
    }
    writeGuestCart([]);
    setGuestItems([]);
    try {
      const cart = await api.cart();
      setServerCart(cart);
      setCartCount(cart.totalItems);
    } catch {
      setServerCart(null);
      setCartCount(0);
    }
    setCartLoading(false);
  }, []);

  const logout = useCallback(() => {
    void api.logout();
    setUser(null);
    setServerCart(null);
    setCartCount(0);
    setGuestItems(readGuestCart());
  }, []);

  const addToCart = useCallback(
    async (product: Product, quantity = 1) => {
      if (user) {
        await api.addToCart(product.id, quantity);
        toast(`Đã thêm ${product.name} vào giỏ.`);
      } else {
        const items = readGuestCart();
        const existing = items.find((item) => item.productId === product.id);
        if (existing) existing.quantity += quantity;
        else
          items.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            stockQuantity: product.stockQuantity ?? null,
            categorySlug: product.category?.slug ?? null,
            quantity,
          });
        writeGuestCart(items);
        toast(`Đã thêm ${product.name} vào giỏ. Giỏ sẽ đồng bộ khi bạn đăng nhập.`);
      }
      await refreshCart();
    },
    [user, refreshCart, toast],
  );

  const setGuestQuantity = useCallback((productId: number, quantity: number) => {
    let items = readGuestCart();
    if (quantity <= 0) items = items.filter((i) => i.productId !== productId);
    else {
      const target = items.find((i) => i.productId === productId);
      if (target) target.quantity = quantity;
    }
    writeGuestCart(items);
    setGuestItems(items);
    setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
  }, []);

  const stepQuantity = useCallback(
    async (productId: number, delta: number) => {
      if (user) {
        const line = serverCart?.items.find((item) => item.productId === productId);
        if (!line) return;
        const next = line.quantity + delta;
        try {
          if (next <= 0) await api.removeCartItem(productId);
          else await api.updateCartItem(productId, next);
        } catch (err) {
          toast(err instanceof Error ? err.message : "Không cập nhật được giỏ.");
          return;
        }
        await refreshCart();
      } else {
        const line = guestItems.find((item) => item.productId === productId);
        setGuestQuantity(productId, Math.max(0, (line?.quantity ?? 1) + delta));
      }
    },
    [user, serverCart, guestItems, refreshCart, setGuestQuantity, toast],
  );

  const removeLine = useCallback(
    async (productId: number) => {
      if (user) {
        try {
          await api.removeCartItem(productId);
        } catch (err) {
          toast(err instanceof Error ? err.message : "Không xoá được sản phẩm.");
          return;
        }
        await refreshCart();
      } else {
        setGuestQuantity(productId, 0);
      }
    },
    [user, refreshCart, setGuestQuantity, toast],
  );

  const lines = useMemo(
    () => (user ? normalizeServer(serverCart) : normalizeGuest(guestItems)),
    [user, serverCart, guestItems],
  );
  const subtotal = user
    ? Number(serverCart?.subtotal ?? 0)
    : guestItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  return (
    <StoreContext.Provider
      value={{
        ready,
        user,
        cartCount,
        cartLoading,
        lines,
        subtotal,
        toast,
        login,
        logout,
        addToCart,
        refreshCart,
        stepQuantity,
        removeLine,
        cartOpen,
        openCart,
        closeCart,
      }}
    >
      {children}
      <CartDrawer />
      {toastMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-btn bg-ink px-5 py-3 text-sm text-bg shadow-float"
        >
          {toastMessage}
        </div>
      ) : null}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore phải nằm trong StoreProvider");
  return context;
}
