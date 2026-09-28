import { describe, it, expect } from 'vitest';
import { calculateFare, FareCalculationParams } from './fareCalculator';

describe('SAKAY LGU Fare Matrix Rules', () => {
  it('1. Seat Fare & Solo Fare', () => {
    // 5 km -> excess 3 -> Seat Fare = 18
    // Solo Fare = 18 * 4 = 72
    const params: FareCalculationParams = {
      distanceKm: 5,
      tripType: 'Solo',
      passengerCount: 1,
    };
    
    const result = calculateFare(params);
    expect(result.seatFare).toBe(18);
    expect(result.soloFare).toBe(72);
    expect(result.finalFare).toBe(72);
  });

  it('2. Shared Simple (Same pickup, same destination)', () => {
    // 5km, Pool = 72
    // Booking A: 1 pax, pays 1/2 of 72 = 36
    const resultA = calculateFare({
      distanceKm: 5,
      tripType: 'Shared',
      passengerCount: 1,
      segments: [
        { type: 'common', distanceKm: 5, totalPassengersOnBoard: 2 }
      ]
    });
    
    expect(resultA.sharedEstimate).toBe(18); // 1 * 18
    expect(resultA.maxUnmatchedFare).toBe(72);
    expect(resultA.finalFare).toBe(36);
  });

  it('3. Shared Different Pax Count (A=2, B=1)', () => {
    // 5km, Pool = 72
    // Booking A (2 pax): 2/3 * 72 = 48
    // Booking B (1 pax): 1/3 * 72 = 24
    const resultA = calculateFare({
      distanceKm: 5,
      tripType: 'Shared',
      passengerCount: 2,
      segments: [
        { type: 'common', distanceKm: 5, totalPassengersOnBoard: 3 }
      ]
    });

    const resultB = calculateFare({
      distanceKm: 5,
      tripType: 'Shared',
      passengerCount: 1,
      segments: [
        { type: 'common', distanceKm: 5, totalPassengersOnBoard: 3 }
      ]
    });

    expect(resultA.finalFare).toBe(48);
    expect(resultB.finalFare).toBe(24);
  });

  it('4. Shared Maximum Pax Count (A=2, B=2)', () => {
    // 5km, Pool = 72
    // A (2 pax): 2/4 * 72 = 36
    // B (2 pax): 2/4 * 72 = 36
    const resultA = calculateFare({
      distanceKm: 5,
      tripType: 'Shared',
      passengerCount: 2,
      segments: [
        { type: 'common', distanceKm: 5, totalPassengersOnBoard: 4 }
      ]
    });

    expect(resultA.finalFare).toBe(36);
  });

  it('5. Route Segments (Exclusive and Common)', () => {
    // Scenario: A and B both 1 pax.
    // A travels 5km total. 2km exclusive, 3km common.
    // A's total solo pool = 72.
    // Exclusive: 2/5 * 72 * 1 = 28.8
    // Common: 3/5 * 72 * 1/2 = 21.6
    // Total = 50.4 -> 50
    const resultA = calculateFare({
      distanceKm: 5,
      tripType: 'Shared',
      passengerCount: 1,
      segments: [
        { type: 'exclusive', distanceKm: 2, totalPassengersOnBoard: 1 },
        { type: 'common', distanceKm: 3, totalPassengersOnBoard: 2 },
      ]
    });

    expect(resultA.finalFare).toBe(50);
  });

  it('6. Minimum Fare constraint', () => {
    // 1km total distance (Base = 15)
    // Shared trip with 4 pax, passenger A books 1 pax.
    // A's proportion = 1/4 * 15 = 3.75 -> Minimum 15 applies.
    const resultA = calculateFare({
      distanceKm: 1,
      tripType: 'Shared',
      passengerCount: 1,
      segments: [
        { type: 'common', distanceKm: 1, totalPassengersOnBoard: 4 }
      ]
    });

    // Since 3.75 is less than 15, minimumFareApplied will trigger if it evaluates `< 15`.
    // Wait, 15 is the exact base fare. So 15 is naturally computed.
    expect(resultA.breakdown.minimumFareApplied).toBe(false);
    expect(resultA.finalFare).toBe(15);
  });

  it('7. Unmatched Shared Booking fallback to Max Unmatched Fare', () => {
    // If segments are not provided, it falls back to maxUnmatchedFare (soloFare)
    const result = calculateFare({
      distanceKm: 5,
      tripType: 'Shared',
      passengerCount: 1,
    });
    
    expect(result.finalFare).toBe(72);
  });
});
