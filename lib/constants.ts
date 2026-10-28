export enum CookieName { CartToken = 'versell_cart', CartVersion = 'versell_cart_v' }
export enum ApiPath { Products = '/products', Categories = '/categories', Promotions = '/promotions', Cart = '/cart', CartCreate = '/cart/create' }
export enum ApiHeader { Bypass = 'x-vercel-protection-bypass', CartToken = 'x-cart-token' }
export enum CartOpType { Add = 'add', Set = 'set' } // Set with quantity 0 = remove
export enum Category { Bottles = 'bottles', Cups = 'cups', Mugs = 'mugs' } // only the ones code references

export const SEARCH_LIMIT = 5
export const MAX_QUANTITY = 99 // selector cap until real stock arrives
export const SITE_NAME = 'Versell'
export const CURRENCY = 'USD'
