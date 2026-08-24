import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://thxcltvgwwluvsfpciyr.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeGNsdHZnd3dsdXZzZnBjaXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyODE4NDQsImV4cCI6MjA5OTg1Nzg0NH0.wDqoMM8RoZKgJPbIBU2xDu8GWCqYpNDlR1V9JKd7Voo";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  const tables = ["toda", "fare_matrix", "passenger", "driver", "booking", "driver_verification", "incident_report", "announcement", "audit_log"];
  
  console.log("--- TABLE DETAILS & COLUMNS ---");
  for (const t of tables) {
    // query 1 row with limit 0 or select all
    const { data, error } = await supabase.from(t).select("*").limit(1);
    if (error) {
      console.log(`Table '${t}' error:`, error.message);
    } else {
      console.log(`\nTable '${t}' sample row / keys:`);
      if (data.length > 0) {
        console.log(Object.keys(data[0]));
      } else {
        // try an insert with invalid column to see error or check schema
        console.log("Table exists, 0 rows currently.");
      }
    }
  }
}

checkColumns();
