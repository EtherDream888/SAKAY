import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabaseUrl = "https://thxcltvgwwluvsfpciyr.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeGNsdHZnd3dsdXZzZnBjaXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyODE4NDQsImV4cCI6MjA5OTg1Nzg0NH0.wDqoMM8RoZKgJPbIBU2xDu8GWCqYpNDlR1V9JKd7Voo";

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const TABLES_TO_CHECK = [
  "toda",
  "lgu_admin",
  "toda_admin",
  "passenger",
  "driver",
  "driver_verification",
  "fare_matrix",
  "booking",
  "dispatch_attempt",
  "shared_trip_match",
  "cancellation_record",
  "gps_log",
  "rating",
  "incident_report",
  "notification",
  "announcement",
  "analytics_log",
  "analytics_report",
  "audit_log",
];

async function runDiagnostics() {
  console.log("==================================================");
  console.log("     SAKAY SUPABASE DATABASE HEALTH CHECK        ");
  console.log("==================================================");
  console.log(`Target URL: ${supabaseUrl}`);
  console.log(`Timestamp:  ${new Date().toISOString()}\n`);

  const results = {
    network: null,
    auth: null,
    tables: {},
    storage: null,
    sampleData: {},
    issues: [],
    recommendations: [],
  };

  // 1. Network & Basic Connectivity
  console.log("--- [1] Checking Connectivity ---");
  const startTime = Date.now();
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });
    const latency = Date.now() - startTime;
    results.network = {
      status: res.status,
      statusText: res.statusText,
      latencyMs: latency,
      ok: res.ok,
    };
    console.log(`✅ REST Endpoint reachable! Status: ${res.status} (${latency}ms)`);
  } catch (err) {
    results.network = { ok: false, error: err.message };
    results.issues.push(`Network error connecting to Supabase: ${err.message}`);
    console.error(`❌ Connection failed:`, err);
  }

  // 2. Auth Endpoint
  console.log("\n--- [2] Checking Supabase Auth Service ---");
  try {
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      results.auth = { ok: false, error: authError.message };
      results.issues.push(`Auth service error: ${authError.message}`);
      console.log(`❌ Auth error:`, authError.message);
    } else {
      results.auth = { ok: true, session: authData.session };
      console.log(`✅ Auth service is responsive and healthy.`);
    }
  } catch (err) {
    results.auth = { ok: false, error: err.message };
    results.issues.push(`Auth check exception: ${err.message}`);
    console.error(`❌ Auth check failed:`, err);
  }

  // 3. Schema & Tables Check
  console.log("\n--- [3] Checking Database Tables & Policies ---");
  for (const table of TABLES_TO_CHECK) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: false })
        .limit(3);

      if (error) {
        results.tables[table] = {
          exists: error.code !== "PGRST204" && error.code !== "42P01",
          error: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details,
        };
        console.log(`⚠️ Table '${table}': [${error.code}] ${error.message}`);
        results.issues.push(`Table '${table}' query issue: [${error.code}] ${error.message}`);
      } else {
        results.tables[table] = {
          exists: true,
          status: "OK",
          rowCount: count !== null ? count : data.length,
          sampleCount: data.length,
        };
        console.log(`✅ Table '${table}': Accessible (Found ${data.length} sample rows, total: ${count ?? data.length})`);
        if (data.length > 0) {
          results.sampleData[table] = data[0];
        }
      }
    } catch (err) {
      results.tables[table] = { exists: false, error: err.message };
      console.log(`❌ Table '${table}': Exception - ${err.message}`);
    }
  }

  // 4. Storage Buckets Check
  console.log("\n--- [4] Checking Storage Buckets ---");
  try {
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      results.storage = { ok: false, error: bucketError.message };
      results.issues.push(`Storage check issue: ${bucketError.message}`);
      console.log(`⚠️ Storage buckets query error:`, bucketError.message);
    } else {
      results.storage = { ok: true, buckets: buckets?.map((b) => b.name) || [] };
      console.log(`✅ Storage service responsive. Available Buckets:`, results.storage.buckets);
    }
  } catch (err) {
    results.storage = { ok: false, error: err.message };
    console.log(`⚠️ Storage check exception:`, err.message);
  }

  // 5. Check Active Fare Matrix data
  console.log("\n--- [5] Checking Fare Matrix & TODA Seed Data ---");
  try {
    const { data: fares, error: fareErr } = await supabase
      .from("fare_matrix")
      .select("*")
      .eq("status", "Active");

    if (fareErr) {
      console.log("⚠️ Could not query active fare matrix:", fareErr.message);
    } else {
      console.log(`ℹ️ Active Fare Matrix configurations: ${fares?.length || 0} active records found.`);
      if (fares && fares.length > 0) {
        console.log("   Current Active Fare Matrix:", JSON.stringify(fares[0]));
      } else {
        results.recommendations.push("Seed active record in 'fare_matrix' so passenger fare calculation works reliably from DB.");
      }
    }

    const { data: todas, error: todaErr } = await supabase
      .from("toda")
      .select("toda_id, toda_name, status");

    if (todaErr) {
      console.log("⚠️ Could not query TODAs:", todaErr.message);
    } else {
      console.log(`ℹ️ Registered TODAs in DB: ${todas?.length || 0} found.`);
      if (todas && todas.length > 0) {
        console.log(`   Sample TODAs: ${todas.map((t) => t.toda_name).join(", ")}`);
      } else {
        results.recommendations.push("Seed at least 1 TODA record in 'toda' table for driver registration / TODA portal.");
      }
    }
  } catch (e) {
    console.error("Seed data check error:", e);
  }

  console.log("\n==================================================");
  console.log("                DIAGNOSTIC SUMMARY               ");
  console.log("==================================================");
  console.log(`Total Tables Checked: ${TABLES_TO_CHECK.length}`);
  const accessibleCount = Object.values(results.tables).filter((t) => t.status === "OK").length;
  console.log(`Accessible Tables: ${accessibleCount} / ${TABLES_TO_CHECK.length}`);
  console.log(`Identified Issues: ${results.issues.length}`);
  console.log(`Recommendations: ${results.recommendations.length}`);
  console.log("==================================================\n");

  fs.writeFileSync("db_health_report.json", JSON.stringify(results, null, 2));
}

runDiagnostics();
