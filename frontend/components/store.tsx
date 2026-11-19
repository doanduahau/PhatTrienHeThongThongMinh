"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, tokenStore } from "@/lib/api";
import type { Product, User } from "@/lib/types";

const USER_KEY = "gear_user";
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

const readUser = (): User | null => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
};

type StoreValue = {
  ready: boolean;
  user: User | null;
  cartCount: number;
  guestItems: GuestLine[];
  toast: (message: string) => void;
  login: (session: { user: User; token: string }) => Promise<void>;
  logout: () => void;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  refreshCart: () => Promise<void>;
  setGuestQuantity: (productId: number, quantity: number) => void;
  removeGuest: (productId: number) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [guestItems, setGuestItems] = useState<GuestLine[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 2600);
  }, []);

  const refreshCart = useCallback(async () => {
    if (tokenStore.get()) {
      try {
        const cart = await api.cart();
        setCartCount(cart.totalItems);
      } catch {
        setCartCount(0);
      }
    } else {
      const items = readGuestCart();
      setGuestItems(items);
      setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
    }
  }, []);

  useEffect(() => {
    // Đồng bộ từ localStorage (hệ thống ngoài React) sau khi mount để tránh lệch hydration.
    queueMicrotask(() => {
      setUser(readUser());
      setReady(true);
      void refreshCart();
    });
  }, [refreshCart]);

  /** Đẩy giỏ khách lên server sau đăng nhập; lỗi từng dòng không chặn dòng khác. */
  const login = useCallback(
    async ({ user: nextUser, token }: { user: User; token: string }) => {
      tokenStore.set(token);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
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
      await refreshCart();
    },
    [refreshCart],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setCartCount(0);
    setGuestItems(readGuestCart());
  }, []);

  const addToCart = useCallback(
    async (product: Product, quantity = 1) => {
      if (tokenStore.get()) {
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
    [refreshCart, toast],
  );

  const setGuestQuantity = useCallback(
    (productId: number, quantity: number) => {
      let items = readGuestCart();
      if (quantity <= 0) items = items.filter((i) => i.productId !== productId);
      else {
        const target = items.find((i) => i.productId === productId);
        if (target) target.quantity = quantity;
      }
      writeGuestCart(items);
      setGuestItems(items);
      setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
    },
    [],
  );

  const removeGuest = useCallback(
    (productId: number) => setGuestQuantity(productId, 0),
    [setGuestQuantity],
  );

  return (
    <StoreContext.Provider
      value={{
        ready,
        user,
        cartCount,
        guestItems,
        toast,
        login,
        logout,
        addToCart,
        refreshCart,
        setGuestQuantity,
        removeGuest,
      }}
    >
      {children}
      {toastMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-btn bg-ink px-5 py-3 text-sm text-bg shadow-lg"
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
