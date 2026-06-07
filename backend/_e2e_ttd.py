import requests, sqlite3, sys
BASE = "http://localhost:8000/api/v1"

def login(email, pw):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": pw})
    if r.status_code != 200:
        print(f"  LOGIN FAIL {email}: {r.status_code} {r.text[:200]}"); return None
    return r.json()["data"]["access_token"]

# 1) login pimpinan
tk_pim = login("pimpinan@demo.id", "Demo1234!")
print("pimpinan login:", bool(tk_pim))
if not tk_pim: sys.exit(1)

# 2) pimpinan uploads/sets TTD via the real endpoint
hp = {"Authorization": f"Bearer {tk_pim}"}
r = requests.post(f"{BASE}/auth/profile/ttd", json={"ttd_url": "/media/e2e_pimpinan_ttd.png"}, headers=hp)
print("set ttd:", r.status_code, r.json() if r.status_code==200 else r.text[:200])

# 3) profile/me reflects it
r = requests.get(f"{BASE}/auth/profile/me", headers=hp)
me = r.json().get("data", {})
print("profile/me ttd_url:", me.get("ttd_url"), "| tipe:", me.get("tipe"))

# 4) login admin, list events, fetch first event detail -> ketua_ttd
tk_adm = login("admin@demo.id", "Demo1234!")
print("admin login:", bool(tk_adm))
ha = {"Authorization": f"Bearer {tk_adm}"}
r = requests.get(f"{BASE}/uji", headers=ha)
items = r.json().get("data", []) if r.status_code==200 else []
print("events:", len(items), "| http", r.status_code)
if items:
    uid = items[0]["id"]
    print("first event ketua_ttd (list):", items[0].get("ketua_ttd"))
    r = requests.get(f"{BASE}/uji/{uid}", headers=ha)
    d = r.json().get("data", {})
    print("event detail ketua_ttd (get):", d.get("ketua_ttd"))
else:
    print("NO EVENTS in demo DB")
