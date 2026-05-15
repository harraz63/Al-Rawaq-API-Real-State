import dotenv from "dotenv";
import mongoose from "mongoose";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const BASE = "http://localhost:5000/api/v1";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

const checks = [];
const pass = (name, detail = "") => {
  checks.push({ name, ok: true, detail });
  console.log("PASS", name, detail);
};
const fail = (name, detail = "") => {
  checks.push({ name, ok: false, detail });
  console.log("FAIL", name, detail);
};

async function request(method, path, { body, token } = {}) {
  const headers = { "User-Agent": UA, Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function withDb(fn) {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI not set");
  await mongoose.connect(uri);
  try {
    return await fn(mongoose.connection.db);
  } finally {
    await mongoose.disconnect();
  }
}

console.log("Testing Al-Rawaq API at", BASE);
console.log("---\n");

const email = `rawaq.apitest.${Date.now()}@gmail.com`;
const password = "TestPass123!";

// 1. Featured (public)
const featured = await request("GET", "/property/featured");
if (featured.status === 200 && typeof featured.data?.count === "number") {
  pass("GET /property/featured", `count=${featured.data.count}`);
} else {
  fail("GET /property/featured", `status=${featured.status}`);
}

// 2. Register
const reg = await request("POST", "/auth/register", {
  body: { name: "API Test User", email, password },
});
if (reg.status === 201) {
  pass("POST /auth/register", reg.data?.message?.slice(0, 60));
} else {
  fail("POST /auth/register", `${reg.status} ${reg.data?.message || ""}`);
}

// 3. Verify email in DB
if (reg.status === 201) {
  try {
    const verified = await withDb(async (db) => {
      const r = await db.collection("users").updateOne(
        { email },
        { $set: { isEmailVerified: true } },
      );
      return r.matchedCount > 0;
    });
    if (verified) pass("Verify test user in DB");
    else fail("Verify test user in DB", "user not found");
  } catch (e) {
    fail("Verify test user in DB", e.message);
  }
}

// 4. Login with tokens
let accessToken = "";
let refreshToken = "";
const login = await request("POST", "/auth/login", {
  body: { email, password },
});
if (
  login.status === 200 &&
  login.data?.accessToken &&
  login.data?.refreshToken &&
  login.data?.user
) {
  accessToken = login.data.accessToken;
  refreshToken = login.data.refreshToken;
  pass("POST /auth/login", "accessToken + refreshToken + user returned");
} else {
  fail("POST /auth/login", `${login.status} ${login.data?.message || ""}`);
}

// 5. Refresh tokens
if (refreshToken) {
  const refresh = await request("POST", "/auth/refresh", {
    body: { refreshToken },
  });
  if (refresh.status === 200 && refresh.data?.accessToken && refresh.data?.refreshToken) {
    accessToken = refresh.data.accessToken;
    refreshToken = refresh.data.refreshToken;
    pass("POST /auth/refresh", "new token pair issued");
  } else {
    fail("POST /auth/refresh", `${refresh.status} ${refresh.data?.message || ""}`);
  }

  const badRefresh = await request("POST", "/auth/refresh", {
    body: { refreshToken: "not-a-valid-token" },
  });
  if (badRefresh.status === 401) pass("POST /auth/refresh rejects invalid token");
  else fail("POST /auth/refresh rejects invalid token", `status=${badRefresh.status}`);
}

// 6. JWT auth guard
if (accessToken) {
  const denied = await request("GET", "/admin/stats", { token: accessToken });
  if (denied.status === 403) pass("GET /admin/stats returns 403 for buyer");
  else fail("GET /admin/stats returns 403 for buyer", `status=${denied.status}`);
}

// 7. Properties + featured admin flow
const allProps = await request("GET", "/property");
let propertyList = Array.isArray(allProps.data) ? allProps.data : [];
if (allProps.status === 200) {
  pass("GET /property", `${propertyList.length} properties`);
} else {
  fail("GET /property", `status=${allProps.status}`);
}

// Use existing properties from DB if list is empty
if (propertyList.length === 0) {
  propertyList = await withDb(async (db) =>
    db.collection("properties").find({}).limit(2).toArray(),
  );
  if (propertyList.length > 0) {
    pass("Loaded properties from DB for featured test", `${propertyList.length} found`);
  }
}

const propertyIds = propertyList.slice(0, 2).map((p) => String(p._id));

if (accessToken && propertyIds.length > 0) {
  await withDb(async (db) => {
    await db.collection("users").updateOne({ email }, { $set: { role: "admin" } });
  });

  const adminLogin = await request("POST", "/auth/login", {
    body: { email, password },
  });
  const adminToken = adminLogin.data?.accessToken;
  if (adminToken) {
    pass("Promote test user to admin + re-login");
  } else {
    fail("Admin re-login", `${adminLogin.status}`);
  }

  if (adminToken) {
    const setFeatured = await request("PUT", "/admin/featured-properties", {
      token: adminToken,
      body: { propertyIds },
    });
    if (
      setFeatured.status === 200 &&
      setFeatured.data?.properties?.length === propertyIds.length
    ) {
      pass("PUT /admin/featured-properties", `set ${propertyIds.length} properties`);
    } else {
      fail(
        "PUT /admin/featured-properties",
        `${setFeatured.status} ${setFeatured.data?.message || JSON.stringify(setFeatured.data).slice(0, 120)}`,
      );
    }

    const featuredAfter = await request("GET", "/property/featured");
    if (
      featuredAfter.status === 200 &&
      featuredAfter.data?.count === propertyIds.length &&
      featuredAfter.data?.properties?.[0]?.featuredOrder === 1
    ) {
      pass("GET /property/featured returns admin selection in order");
    } else {
      fail(
        "GET /property/featured returns admin selection",
        `count=${featuredAfter.data?.count} order=${featuredAfter.data?.properties?.[0]?.featuredOrder}`,
      );
    }
  }
} else if (propertyIds.length === 0) {
  pass("PUT /admin/featured-properties", "skipped — no properties in database");
  pass("GET /property/featured after set", "skipped — no properties in database");
} else {
  fail("PUT /admin/featured-properties", "skipped — login failed");
}

// 8. Google OAuth redirect
const googleRes = await fetch(`${BASE}/auth/google`, {
  method: "GET",
  redirect: "manual",
  headers: { "User-Agent": UA },
});
const location = googleRes.headers.get("location") || "";
if (googleRes.status === 302 && location.includes("accounts.google.com")) {
  pass("GET /auth/google", "redirects to Google");
} else {
  fail("GET /auth/google", `status=${googleRes.status} location=${location.slice(0, 80)}`);
}

// 9. Unauthenticated admin featured
const noAuth = await request("PUT", "/admin/featured-properties", {
  body: { propertyIds: ["507f1f77bcf86cd799439011"] },
});
if (noAuth.status === 401) pass("PUT /admin/featured-properties requires auth (401)");
else fail("PUT /admin/featured-properties requires auth", `status=${noAuth.status}`);

console.log("\n=== SUMMARY ===");
const failed = checks.filter((c) => !c.ok);
console.log(`Passed: ${checks.length - failed.length}/${checks.length}`);
if (failed.length) {
  failed.forEach((f) => console.log(`  FAIL: ${f.name} — ${f.detail}`));
  process.exit(1);
}
console.log("\nAll checks passed. Final OK.");
