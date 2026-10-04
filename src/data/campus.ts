import type { Coordinates } from '@/types';
import { distanceMeters } from '@/utils/geo';

/**
 * Campus location config — used to auto-detect whether a new report's
 * coordinates fall inside the campus, so it can be recommended/marked
 * as a "campus" report visible to campus students & staff.
 *
 * EDIT THESE VALUES to match your actual campus (center + radius).
 * Example below uses the Amrita Bengaluru campus (Kasavanahalli).
 */

export interface CampusConfig {
  name: string;
  center: Coordinates;
  /** Detection radius in metres. */
  radiusMeters: number;
}

export const CAMPUS_CONFIG: CampusConfig = {
  name: 'Amrita Bengaluru Campus',
  center: { lat: 12.894505, lng: 77.675084 }, // Kasavanahalli, Carmelaram P.O., 560035
  radiusMeters: 800,
};

// Campus bounding box
export const CAMPUS_BOUNDS = {
  south: 12.8910,
  north: 12.8990,
  west: 77.6725,
  east: 77.6795,
};

// Campus acreage
export const CAMPUS_ACREAGE = {
  academic: 25.3,
  residential: 11.8,
  
  official: 50,
};

/** Is a coordinate inside the campus boundary? */
export function isInsideCampus(coords: Coordinates): boolean {
  return distanceMeters(coords, CAMPUS_CONFIG.center) <= CAMPUS_CONFIG.radiusMeters;
}
