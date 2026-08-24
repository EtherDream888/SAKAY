import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://thxcltvgwwluvsfpciyr.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeGNsdHZnd3dsdXZzZnBjaXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyODE4NDQsImV4cCI6MjA5OTg1Nzg0NH0.wDqoMM8RoZKgJPbIBU2xDu8GWCqYpNDlR1V9JKd7Voo";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectPassenger() {
  const { data, error } = await supabase
    .from("passenger")
    .select("*")
    .limit(1);

  console.log("Passenger row columns:", error ? error : Object.keys(data[0]));
  if (data && data[0]) {
    console.log("Sample passenger row:", data[0]);
  }
}

inspectPassenger();
