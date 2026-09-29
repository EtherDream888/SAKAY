/**
 * Official SAKAY Fare Calculator
 * Adheres to Calapan City Ordinance Fare Matrix Rules and Ride Sharing Rules.
 */

import type { TariffConfig } from '../config/policyConfig';
import { DEFAULT_TARIFF } from '../config/policyConfig';
export type { TariffConfig };
export { DEFAULT_TARIFF };

export interface RouteSegment {
  distanceKm: number;
  type: 'common' | 'exclusive';
  totalPassengersOnBoard: number; // Total passengers in the trike during this segment
}

export interface FareCalculationParams {
  distanceKm: number;          // Total distance for this booking
  tripType: 'Solo' | 'Shared'; // Booking type
  passengerCount: number;      // Declared passenger count
  segments?: RouteSegment[];   // Present if finalizing a matched shared trip
  tariff?: TariffConfig;
}

export interface FareSegmentBreakdown {
  type: 'common' | 'exclusive';
  distanceKm: number;
  totalPassengersOnBoard: number;
  cost: number;
}

export interface FareCalculationResult {
  seatFare: number;
  soloFare: number;
  sharedEstimate: number | null;
  maxUnmatchedFare: number | null;
  finalFare: number; // The exact fare to bill
  breakdown: {
    baseFareApplied: number;
    excessKm: number;
    shareRatio?: string;
    segments?: FareSegmentBreakdown[];
    minimumFareApplied: boolean;
  };
}

export function calculateFare(params: FareCalculationParams): FareCalculationResult {
  const tariff = params.tariff || DEFAULT_TARIFF;
  
  // 1. Calculate the core Seat Fare for the given total distance
  const excessKm = Math.max(0, params.distanceKm - tariff.baseDistanceKm);
  const seatFare = tariff.baseFare + (excessKm * tariff.succeedingRate);
  
  // 2. Solo Fare (Max Unmatched Fare) is always Seat Fare * Capacity
  const soloFare = seatFare * tariff.capacity;

  let sharedEstimate: number | null = null;
  let maxUnmatchedFare: number | null = null;
  let finalFareRaw = 0;
  let minimumFareApplied = false;
  let segmentsBreakdown: FareSegmentBreakdown[] | undefined = undefined;

  if (params.tripType === 'Solo') {
    // Solo trip implies they reserve the whole trike
    finalFareRaw = soloFare;
  } else {
    // Shared Trip
    sharedEstimate = seatFare * params.passengerCount;
    maxUnmatchedFare = soloFare;

    if (!params.segments || params.segments.length === 0) {
      // If no segments provided (e.g. at booking time), finalFare defaults to unmatched max
      finalFareRaw = soloFare;
    } else {
      // Trip completed, segments provided. Calculate proportional split.
      segmentsBreakdown = [];
      let totalSegmentDistance = 0;
      
      // We calculate proportion based on the sum of segment distances.
      // (This should closely match params.distanceKm unless there was a reroute).
      params.segments.forEach(s => totalSegmentDistance += s.distanceKm);

      // If for some reason segments sum to 0, fallback to solo fare.
      if (totalSegmentDistance === 0) {
        finalFareRaw = soloFare;
      } else {
        // Re-calculate the theoretical solo pool for the actual total segment distance
        // (This accounts for reroutes where segment sum != original distanceKm)
        const actualExcessKm = Math.max(0, totalSegmentDistance - tariff.baseDistanceKm);
        const actualSeatFare = tariff.baseFare + (actualExcessKm * tariff.succeedingRate);
        const actualSoloPool = actualSeatFare * tariff.capacity;

        params.segments.forEach(seg => {
          const distanceProportion = seg.distanceKm / totalSegmentDistance;
          let segmentCost = 0;

          if (seg.type === 'exclusive') {
            // Passenger pays 100% of their share of the solo pool for this segment
            segmentCost = distanceProportion * actualSoloPool;
          } else {
            // Passenger pays a proportional share based on passengers onboard
            // Share ratio = their passenger count / total passengers on board
            const shareRatio = params.passengerCount / seg.totalPassengersOnBoard;
            segmentCost = distanceProportion * actualSoloPool * shareRatio;
          }

          segmentsBreakdown!.push({
            type: seg.type,
            distanceKm: seg.distanceKm,
            totalPassengersOnBoard: seg.totalPassengersOnBoard,
            cost: segmentCost
          });

          finalFareRaw += segmentCost;
        });
      }
    }
  }

  // Rounding: nearest whole peso; >= .50 rounds up. Round once per booking at the end.
  let finalFareRounded = Math.round(finalFareRaw);

  // Minimum fare rule: no booking pays less than the base fare (15)
  if (finalFareRounded < tariff.baseFare) {
    finalFareRounded = tariff.baseFare;
    minimumFareApplied = true;
  }

  return {
    seatFare,
    soloFare,
    sharedEstimate,
    maxUnmatchedFare,
    finalFare: finalFareRounded,
    breakdown: {
      baseFareApplied: tariff.baseFare,
      excessKm,
      segments: segmentsBreakdown,
      minimumFareApplied
    }
  };
}
