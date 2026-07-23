import type { FormState, RestaurantProfileLike } from "./intake";

const LAST_BACKEND_RESTAURANT_KEY = "mops:last-backend-restaurant";

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function loadLastBackendRestaurantId() {
  try {
    return window.localStorage.getItem(LAST_BACKEND_RESTAURANT_KEY) || "";
  } catch {
    return "";
  }
}

export function saveLastBackendRestaurantId(restaurantId: string) {
  try {
    window.localStorage.setItem(LAST_BACKEND_RESTAURANT_KEY, restaurantId);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

export function clearLastBackendRestaurantId() {
  try {
    window.localStorage.removeItem(LAST_BACKEND_RESTAURANT_KEY);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

export function mergeFormWithProfile(
  form: FormState,
  profile?: RestaurantProfileLike,
): FormState {
  if (!profile) return form;
  return {
    ...form,
    name: profile.brand || form.name,
    city: profile.city || form.city,
    district: profile.district || form.district,
    category: profile.category || form.category,
    address: profile.address || form.address,
    priceRange: profile.priceRange || form.priceRange,
    stage: profile.stage || form.stage,
  };
}
