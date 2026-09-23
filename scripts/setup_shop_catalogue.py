#!/usr/bin/env python3
"""One-shot CanMed shop catalogue setup via Shopify Admin GraphQL."""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"


def load_env() -> dict[str, str]:
    data: dict[str, str] = {}
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        data[k.strip()] = v.strip().strip('"').strip("'")
    return data


ENV = load_env()
STORE = ENV["SHOPIFY_STORE"]
API = f"https://{STORE}/admin/api/2024-10/graphql.json"


def refresh_token() -> str:
    body = json.dumps(
        {
            "client_id": ENV["SHOPIFY_CLIENT_ID"],
            "client_secret": ENV["SHOPIFY_CLIENT_SECRET"],
            "grant_type": "client_credentials",
        }
    ).encode()
    req = urllib.request.Request(
        f"https://{STORE}/admin/oauth/access_token",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        token = json.load(resp)["access_token"]
    lines = [l for l in ENV_PATH.read_text().splitlines() if not l.startswith("SHOPIFY_ADMIN_TOKEN=")]
    lines.append(f"SHOPIFY_ADMIN_TOKEN={token}")
    ENV_PATH.write_text("\n".join(lines) + "\n")
    return token


TOKEN = ENV.get("SHOPIFY_ADMIN_TOKEN") or refresh_token()


def gql(query: str, variables: dict | None = None) -> dict:
    global TOKEN
    payload = {"query": query, "variables": variables or {}}
    data = json.dumps(payload).encode()

    def do(token: str) -> dict:
        req = urllib.request.Request(
            API,
            data=data,
            headers={
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": token,
            },
            method="POST",
        )
        with urllib.request.urlopen(req) as resp:
            return json.load(resp)

    try:
        out = do(TOKEN)
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            TOKEN = refresh_token()
            out = do(TOKEN)
        else:
            raise
    if out.get("errors"):
        # Some ACCESS_DENIED may need token refresh after scope install
        msgs = json.dumps(out["errors"])
        if "ACCESS_DENIED" in msgs or "access token" in msgs.lower():
            TOKEN = refresh_token()
            out = do(TOKEN)
    if out.get("errors"):
        raise RuntimeError(json.dumps(out["errors"], indent=2))
    return out["data"]


LOCATIONS = [
    {
        "name": "Kensington",
        "address": {
            "address1": "412 Macaulay Road",
            "city": "Kensington",
            "provinceCode": "VIC",
            "countryCode": "AU",
            "zip": "3031",
            "phone": "(03) 9376 2140",
        },
    },
    {
        "name": "Hawthorn",
        "address": {
            "address1": "88 Burwood Road",
            "city": "Hawthorn",
            "provinceCode": "VIC",
            "countryCode": "AU",
            "zip": "3122",
            "phone": "(03) 9818 7752",
        },
    },
    {
        "name": "Geelong",
        "address": {
            "address1": "27 Malop Street",
            "city": "Geelong",
            "provinceCode": "VIC",
            "countryCode": "AU",
            "zip": "3220",
            "phone": "(03) 5229 4418",
        },
    },
]

COLLECTIONS = [
    {
        "title": "Prescription Only",
        "handle": "prescription-only",
        "descriptionHtml": "<p>Requires a valid script from your prescriber before we dispense.</p>",
        "tag": "access-prescription",
    },
    {
        "title": "S3 Pharmacist Only",
        "handle": "s3-pharmacist-only",
        "descriptionHtml": "<p>No script needed — a pharmacist speaks with you before supply.</p>",
        "tag": "access-s3",
    },
    {
        "title": "Over the Counter",
        "handle": "over-the-counter",
        "descriptionHtml": "<p>Available to order online or collect from your nearest CanMed dispensary.</p>",
        "tag": "access-otc",
    },
]

PRODUCTS = [
    {
        "title": "Paediatric Oral Suspension",
        "handle": "paediatric-suspension-base",
        "tier": "prescription",
        "product_type": "Prescription Only",
        "sku": "CM-PS-014",
        "price": "48.00",
        "variants": ["50 mL", "100 mL", "200 mL"],
        "option": "Size",
        "descriptor": "Sugar-free, dye-free base, flavoured to the child",
        "form": "Oral suspension",
        "base": "SyrSpend SF pH4",
        "body": "Compounded to your prescriber's strength in a preservative-free suspending base. We flavour to your child's preference — strawberry, banana or unflavoured — and label the syringe in millilitres, not fractions of a tablet.",
        "access_note": "Requires a valid script from your prescriber before we dispense.",
    },
    {
        "title": "Phytocannabinoid Oil",
        "handle": "phyto-oil-full-spectrum",
        "tier": "prescription",
        "product_type": "Prescription Only",
        "sku": "CM-PC-102",
        "price": "129.00",
        "variants": ["10 mg/mL", "25 mg/mL", "50 mg/mL"],
        "option": "Strength",
        "descriptor": "Full spectrum, MCT carrier, titration dropper",
        "form": "Oral liquid",
        "base": "Fractionated coconut oil",
        "body": "Dispensed against an approved prescription only. Each batch is compounded per patient, with a titration schedule printed on the carton and a graduated dropper marked in milligrams.",
        "access_note": "Requires a valid script from your prescriber before we dispense.",
    },
    {
        "title": "Transdermal HRT Cream",
        "handle": "hrt-transdermal-cream",
        "tier": "prescription",
        "product_type": "Prescription Only",
        "sku": "CM-TD-233",
        "price": "92.00",
        "variants": ["30 g", "50 g", "100 g"],
        "option": "Size",
        "descriptor": "Metered pump, individualised strength",
        "form": "Transdermal cream",
        "base": "Anhydrous emollient",
        "body": "Delivered in an airless metered pump so each actuation is the same dose. Strength is set by your prescriber; we compound in-house at Hawthorn under sterile-adjacent conditions.",
        "access_note": "Requires a valid script from your prescriber before we dispense.",
    },
    {
        "title": "Veterinary Transdermal Gel",
        "handle": "veterinary-transdermal-gel",
        "tier": "prescription",
        "product_type": "Prescription Only",
        "sku": "CM-VT-058",
        "price": "64.00",
        "variants": ["12 mL", "24 mL"],
        "option": "Size",
        "descriptor": "Ear-tip application for cats who refuse tablets",
        "form": "Pluronic lecithin gel",
        "base": "PLO gel",
        "body": "For patients who will not take an oral dose. Applied to the inner pinna with a metered syringe. Compounded at Geelong with species-appropriate excipients only.",
        "access_note": "Requires a valid script from your prescriber before we dispense.",
    },
    {
        "title": "Geriatric Dysphagia Dose",
        "handle": "geriatric-thickened-dose",
        "tier": "s3",
        "product_type": "S3 Pharmacist Only",
        "sku": "CM-GD-071",
        "price": "39.00",
        "variants": ["100 mL", "250 mL"],
        "option": "Size",
        "descriptor": "Thickened liquid, IDDSI level 3",
        "form": "Thickened oral liquid",
        "base": "Xanthan-based thickener",
        "body": "For residents who cannot swallow solid dose forms. Prepared to IDDSI level 3 and viscosity-checked on every batch, with the batch number on the label.",
        "access_note": "No script needed — a pharmacist speaks with you before supply.",
    },
    {
        "title": "Compounded Troche",
        "handle": "compounded-lozenge",
        "tier": "s3",
        "product_type": "S3 Pharmacist Only",
        "sku": "CM-TR-118",
        "price": "55.00",
        "variants": ["30 troches", "60 troches"],
        "option": "Pack size",
        "descriptor": "Slow-dissolve buccal lozenge",
        "form": "Buccal troche",
        "base": "Polyethylene glycol",
        "body": "Useful when the gut is the problem, not the drug. Dissolves against the cheek over roughly 15 minutes. A pharmacist will talk through timing before first supply.",
        "access_note": "No script needed — a pharmacist speaks with you before supply.",
    },
    {
        "title": "Barrier Repair Ointment",
        "handle": "barrier-repair-ointment",
        "tier": "otc",
        "product_type": "Over the Counter",
        "sku": "CM-BR-009",
        "price": "28.00",
        "variants": ["50 g", "150 g"],
        "option": "Size",
        "descriptor": "Fragrance-free, for compromised skin",
        "form": "Ointment",
        "base": "Petrolatum / ceramide",
        "body": "Our house barrier ointment. Six ingredients, no fragrance, no lanolin. Made in small batches at Kensington and dated on the tub.",
        "access_note": "Available to order online or collect from your nearest CanMed dispensary.",
    },
    {
        "title": "Electrolyte Replacement Sachets",
        "handle": "electrolyte-replacement",
        "tier": "otc",
        "product_type": "Over the Counter",
        "sku": "CM-ER-045",
        "price": "22.00",
        "variants": ["14 sachets", "28 sachets"],
        "option": "Pack size",
        "descriptor": "Clinically weighted salts, low sugar",
        "form": "Oral powder",
        "base": "Glucose / sodium citrate",
        "body": "Weighted to the WHO oral rehydration ratio rather than a sports-drink profile. Each sachet dissolves in 200 mL of water.",
        "access_note": "Available to order online or collect from your nearest CanMed dispensary.",
    },
    {
        "title": "Wound Irrigation Kit",
        "handle": "wound-irrigation-kit",
        "tier": "otc",
        "product_type": "Over the Counter",
        "sku": "CM-WI-030",
        "price": "19.00",
        "variants": ["10 × 20 mL", "20 × 20 mL"],
        "option": "Pack size",
        "descriptor": "Sterile saline, single-use ampoules",
        "form": "Sterile solution",
        "base": "0.9% sodium chloride",
        "body": "Single-use ampoules so nothing is reused between dressings. Stocked at all three locations for same-day pick-up.",
        "access_note": "Available to order online or collect from your nearest CanMed dispensary.",
    },
]

TIER_TAG = {
    "prescription": "access-prescription",
    "s3": "access-s3",
    "otc": "access-otc",
}


def ensure_locations() -> list[str]:
    existing = gql(
        "{ locations(first: 25) { nodes { id name address { address1 city zip } } } }"
    )["locations"]["nodes"]
    by_name = {n["name"].lower(): n for n in existing}
    ids: list[str] = []
    for loc in LOCATIONS:
        key = loc["name"].lower()
        if key in by_name:
            print(f"  location exists: {loc['name']}")
            ids.append(by_name[key]["id"])
            continue
        data = gql(
            """
            mutation($input: LocationAddInput!) {
              locationAdd(input: $input) {
                location { id name }
                userErrors { field message }
              }
            }
            """,
            {"input": loc},
        )["locationAdd"]
        if data["userErrors"]:
            raise RuntimeError(data["userErrors"])
        print(f"  location created: {data['location']['name']}")
        ids.append(data["location"]["id"])
        time.sleep(0.3)
    return ids


def ensure_collections() -> dict[str, str]:
    existing = {
        c["handle"]: c
        for c in gql("{ collections(first: 50) { nodes { id title handle } } }")["collections"]["nodes"]
    }
    out: dict[str, str] = {}
    for col in COLLECTIONS:
        if col["handle"] in existing:
            print(f"  collection exists: {col['title']}")
            out[col["tag"]] = existing[col["handle"]]["id"]
            continue
        data = gql(
            """
            mutation($input: CollectionInput!) {
              collectionCreate(input: $input) {
                collection { id title handle }
                userErrors { field message }
              }
            }
            """,
            {
                "input": {
                    "title": col["title"],
                    "handle": col["handle"],
                    "descriptionHtml": col["descriptionHtml"],
                    "ruleSet": {
                        "appliedDisjunctively": False,
                        "rules": [
                            {
                                "column": "TAG",
                                "relation": "EQUALS",
                                "condition": col["tag"],
                            }
                        ],
                    },
                }
            },
        )["collectionCreate"]
        if data["userErrors"]:
            raise RuntimeError(data["userErrors"])
        print(f"  collection created: {data['collection']['title']}")
        out[col["tag"]] = data["collection"]["id"]
        time.sleep(0.3)
    return out


def find_product_by_handle(handle: str) -> dict | None:
    data = gql(
        """
        query($q: String!) {
          products(first: 1, query: $q) {
            nodes { id handle title }
          }
        }
        """,
        {"q": f"handle:{handle}"},
    )
    nodes = data["products"]["nodes"]
    return nodes[0] if nodes else None


def create_product(p: dict, location_ids: list[str]) -> str:
    found = find_product_by_handle(p["handle"])
    if found:
        print(f"  product exists: {p['title']}")
        return found["id"]

    tag = TIER_TAG[p["tier"]]
    description = (
        f"<p>{p['body']}</p>"
        f"<p><strong>{p['access_note']}</strong></p>"
        f"<ul>"
        f"<li>Form: {p['form']}</li>"
        f"<li>Base: {p['base']}</li>"
        f"<li>SKU: {p['sku']}</li>"
        f"</ul>"
    )
    variants = []
    for i, label in enumerate(p["variants"]):
        variants.append(
            {
                "optionValues": [{"optionName": p["option"], "name": label}],
                "price": p["price"],
                "sku": f"{p['sku']}-{i+1}",
                "inventoryPolicy": "CONTINUE",
                "inventoryItem": {"tracked": True, "sku": f"{p['sku']}-{i+1}"},
            }
        )

    data = gql(
        """
        mutation($productSet: ProductSetInput!, $synchronous: Boolean!) {
          productSet(input: $productSet, synchronous: $synchronous) {
            product {
              id
              title
              handle
              variants(first: 20) {
                nodes { id sku inventoryItem { id } }
              }
            }
            userErrors { field message code }
          }
        }
        """,
        {
            "synchronous": True,
            "productSet": {
                "title": p["title"],
                "handle": p["handle"],
                "descriptionHtml": description,
                "vendor": "CanMed Compounding Chemist",
                "productType": p["product_type"],
                "status": "ACTIVE",
                "tags": [tag, f"sku:{p['sku']}", p["form"]],
                "productOptions": [
                    {
                        "name": p["option"],
                        "values": [{"name": v} for v in p["variants"]],
                    }
                ],
                "variants": variants,
                "metafields": [
                    {
                        "namespace": "canmed",
                        "key": "access_tier",
                        "type": "single_line_text_field",
                        "value": p["tier"],
                    },
                    {
                        "namespace": "canmed",
                        "key": "descriptor",
                        "type": "single_line_text_field",
                        "value": p["descriptor"],
                    },
                    {
                        "namespace": "canmed",
                        "key": "form",
                        "type": "single_line_text_field",
                        "value": p["form"],
                    },
                    {
                        "namespace": "canmed",
                        "key": "base",
                        "type": "single_line_text_field",
                        "value": p["base"],
                    },
                    {
                        "namespace": "canmed",
                        "key": "access_note",
                        "type": "single_line_text_field",
                        "value": p["access_note"],
                    },
                    {
                        "namespace": "canmed",
                        "key": "base_sku",
                        "type": "single_line_text_field",
                        "value": p["sku"],
                    },
                ],
            },
        },
    )["productSet"]
    if data["userErrors"]:
        raise RuntimeError(data["userErrors"])

    product = data["product"]
    print(f"  product created: {product['title']}")

    # Seed inventory at all pharmacy locations so OTC nearest-store can show available
    qty = 25 if p["tier"] == "otc" else 10
    for v in product["variants"]["nodes"]:
        inv_id = v["inventoryItem"]["id"]
        for loc_id in location_ids:
            act = gql(
                """
                mutation($inventoryItemId: ID!, $locationId: ID!, $available: Int) {
                  inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available) {
                    inventoryLevel { id }
                    userErrors { field message }
                  }
                }
                """,
                {
                    "inventoryItemId": inv_id,
                    "locationId": loc_id,
                    "available": qty,
                },
            )
            errs = act["inventoryActivate"]["userErrors"]
            if errs:
                gql(
                    """
                    mutation($input: InventorySetQuantitiesInput!) {
                      inventorySetQuantities(input: $input) {
                        userErrors { field message }
                      }
                    }
                    """,
                    {
                        "input": {
                            "name": "available",
                            "reason": "correction",
                            "ignoreCompareQuantity": True,
                            "quantities": [
                                {
                                    "inventoryItemId": inv_id,
                                    "locationId": loc_id,
                                    "quantity": qty,
                                }
                            ],
                        }
                    },
                )
            time.sleep(0.15)
    return product["id"]


def publish_collections(collection_ids: list[str]) -> None:
    # Optional — needs read_publications / write_publications. Products stay ACTIVE either way.
    try:
        pubs = gql("{ publications(first: 10) { nodes { id name } } }")["publications"]["nodes"]
    except Exception as e:
        print(f"  skip collection publish ({e})")
        return
    online = next((p for p in pubs if "online" in p["name"].lower() or p["name"] == "Online Store"), None)
    if not online:
        print("  no Online Store publication found — skipping publish")
        return
    for cid in collection_ids:
        gql(
            """
            mutation($id: ID!, $input: [PublicationInput!]!) {
              publishablePublish(id: $id, input: $input) {
                userErrors { field message }
              }
            }
            """,
            {"id": cid, "input": [{"publicationId": online["id"]}]},
        )


def publish_products(product_ids: list[str]) -> None:
    try:
        pubs = gql("{ publications(first: 10) { nodes { id name } } }")["publications"]["nodes"]
    except Exception as e:
        print(f"  skip product publish ({e})")
        return
    online = next((p for p in pubs if "online" in p["name"].lower() or p["name"] == "Online Store"), None)
    if not online:
        return
    for pid in product_ids:
        gql(
            """
            mutation($id: ID!, $input: [PublicationInput!]!) {
              publishablePublish(id: $id, input: $input) {
                userErrors { field message }
              }
            }
            """,
            {"id": pid, "input": [{"publicationId": online["id"]}]},
        )
        time.sleep(0.2)


def main() -> int:
    print("== Refresh token ==")
    global TOKEN
    TOKEN = refresh_token()
    scopes = gql("{ currentAppInstallation { accessScopes { handle } } }")
    print("scopes:", ", ".join(s["handle"] for s in scopes["currentAppInstallation"]["accessScopes"]))

    print("\n== Locations ==")
    location_ids = ensure_locations()

    print("\n== Collections ==")
    coll_map = ensure_collections()
    publish_collections(list(coll_map.values()))

    print("\n== Products ==")
    product_ids = []
    for p in PRODUCTS:
        pid = create_product(p, location_ids)
        product_ids.append(pid)
        time.sleep(0.4)

    print("\n== Publish products to Online Store ==")
    publish_products(product_ids)

    summary = gql(
        """
        {
          products(first: 50) { nodes { title productType tags handle } }
          collections(first: 20) { nodes { title handle } }
          locations(first: 10) { nodes { name address { address1 city zip phone } } }
        }
        """
    )
    print("\n== Done ==")
    print(f"products: {len(summary['products']['nodes'])}")
    for n in summary["products"]["nodes"]:
        print(f"  - [{n['productType']}] {n['title']} ({n['handle']})")
    print("collections:")
    for c in summary["collections"]["nodes"]:
        if c["handle"] in {x["handle"] for x in COLLECTIONS}:
            print(f"  - {c['title']}")
    print("locations:")
    for loc in summary["locations"]["nodes"]:
        a = loc["address"]
        print(f"  - {loc['name']}: {a['address1']}, {a['city']} {a['zip']} {a.get('phone') or ''}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print("ERROR:", e, file=sys.stderr)
        sys.exit(1)
