import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://thxcltvgwwluvsfpciyr.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeGNsdHZnd3dsdXZzZnBjaXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyODE4NDQsImV4cCI6MjA5OTg1Nzg0NH0.wDqoMM8RoZKgJPbIBU2xDu8GWCqYpNDlR1V9JKd7Voo";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectTables() {
  console.log("Checking fare_matrix with is_active = true:");
  const { data: fareData, error: fareError } = await supabase
    .from("fare_matrix")
    .select("base_fare, base_distance_km, succeeding_rate, is_active, created_at")
    .eq("is_active", true);

  console.log("fare_matrix result:", fareData, "Error:", fareError);

  console.log("\nChecking toda table with account_status = 'Active':");
  const { data: todaData, error: todaError } = await supabase
    .from("toda")
    .select("toda_id, toda_name, toda_acronym, registration_number, account_status");

  console.log("toda result:", todaData, "Error:", todaError);

  console.log("\nChecking passenger table rows:");
  const { data: passData, error: passError } = await supabase
    .from("passenger")
    .select("passenger_id, auth_user_id, full_name, email, phone_number, account_status");

  console.log("passenger result:", passData, "Error:", passError);

  console.log("\nChecking driver table rows:");
  const { data: driverData, error: driverError } = await supabase
    .from("driver")
    .select("driver_id, auth_user_id, full_name, toda_id, license_number, account_status");

  console.log("driver result:", driverData, "Error:", driverError);

  console.log("\nChecking booking table rows:");
  const { data: bookingData, error: bookingError } = await supabase
    .from("booking")
    .select("booking_id, passenger_id, pickup_address, dropoff_address, estimated_fare, booking_status, created_at");

  console.log("booking result:", bookingData, "Error:", bookingError);
}

inspectTables();
