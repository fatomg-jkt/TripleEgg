import {cookies} from 'next/headers';
import type {RestaurantSlug} from './schema';
import {restaurants} from './schema';
import type {User} from './users';

export const ACTIVE_RESTAURANT_COOKIE='active_restaurant';
export function accessibleRestaurants(user:Pick<User,'restaurantSlugs'>){return restaurants.filter(r=>user.restaurantSlugs.includes(r.slug))}
export function activeRestaurantFor(user:Pick<User,'restaurantSlugs'>){const allowed=accessibleRestaurants(user);const saved=cookies().get(ACTIVE_RESTAURANT_COOKIE)?.value as RestaurantSlug|undefined;return allowed.find(r=>r.slug===saved)||allowed[0]||null}
export function canAccessRestaurant(user:Pick<User,'restaurantSlugs'>,slug:string){return user.restaurantSlugs.includes(slug)}
