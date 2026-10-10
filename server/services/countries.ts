import type { CountryConfig } from "../../shared/types.js";

// gl = Google country, hl = interface language, location = SerpApi canonical location.
// These parameters *bias* Google toward a locale; they do not guarantee that every
// result is exclusive to that country.
export const COUNTRIES: CountryConfig[] = [
  { code: "US", name: "United States", gl: "us", hl: "en", location: "United States", lat: 39.8, lng: -98.6 },
  { code: "GB", name: "United Kingdom", gl: "uk", hl: "en", location: "United Kingdom", lat: 54.0, lng: -2.5 },
  { code: "IN", name: "India", gl: "in", hl: "hi", location: "India", lat: 22.6, lng: 79.0 },
  { code: "DE", name: "Germany", gl: "de", hl: "de", location: "Germany", lat: 51.1, lng: 10.4 },
  { code: "FR", name: "France", gl: "fr", hl: "fr", location: "France", lat: 46.6, lng: 2.4 },
  { code: "BR", name: "Brazil", gl: "br", hl: "pt", location: "Brazil", lat: -10.8, lng: -52.9 },
  { code: "JP", name: "Japan", gl: "jp", hl: "ja", location: "Japan", lat: 36.2, lng: 138.3 },
  { code: "AU", name: "Australia", gl: "au", hl: "en", location: "Australia", lat: -25.7, lng: 134.5 },
  { code: "CA", name: "Canada", gl: "ca", hl: "en", location: "Canada", lat: 56.1, lng: -106.3 },
  { code: "ZA", name: "South Africa", gl: "za", hl: "en", location: "South Africa", lat: -29.0, lng: 24.7 },
  { code: "NG", name: "Nigeria", gl: "ng", hl: "en", location: "Nigeria", lat: 9.1, lng: 8.7 },
  { code: "MX", name: "Mexico", gl: "mx", hl: "es", location: "Mexico", lat: 23.6, lng: -102.5 },
  { code: "KR", name: "South Korea", gl: "kr", hl: "ko", location: "South Korea", lat: 36.5, lng: 127.9 },
  { code: "ID", name: "Indonesia", gl: "id", hl: "id", location: "Indonesia", lat: -2.5, lng: 118.0 },
  { code: "AE", name: "United Arab Emirates", gl: "ae", hl: "ar", location: "United Arab Emirates", lat: 24.3, lng: 54.3 },
  { code: "ES", name: "Spain", gl: "es", hl: "es", location: "Spain", lat: 40.4, lng: -3.7 },
];

export const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));
export const MIN_COUNTRIES = 2;
export const MAX_COUNTRIES = 10;
