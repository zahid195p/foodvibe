// Cart lives in localStorage — one cart, one restaurant at a time.

export interface CartLine {
  id: string;
  name: string;
  price_rs: number;
  qty: number;
}

export interface Cart {
  restaurantId: string;
  restaurantName: string;
  minOrderRs: number;
  packagingFeeRs: number;
  lines: CartLine[];
}

const KEY = "foodvibe-cart";
export const CART_EVENT = "foodvibe-cart";

export function readCart(): Cart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Cart) : null;
  } catch {
    return null;
  }
}

export function writeCart(cart: Cart | null) {
  if (cart && cart.lines.length === 0) cart = null;
  if (cart) localStorage.setItem(KEY, JSON.stringify(cart));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(CART_EVENT));
}

export function cartSubtotal(cart: Cart | null): number {
  return cart?.lines.reduce((sum, l) => sum + l.price_rs * l.qty, 0) ?? 0;
}

export function cartCount(cart: Cart | null): number {
  return cart?.lines.reduce((sum, l) => sum + l.qty, 0) ?? 0;
}
