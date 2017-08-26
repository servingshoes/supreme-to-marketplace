CREATE TABLE "public"."mkt_product_web_mappings" (
    "id" serial,
    "url" text,
    "unique_reference" text,
    "product_id" uuid,
    "created_at" text,
    PRIMARY KEY ("id"),
    UNIQUE ("unique_reference"),
    FOREIGN KEY ("product_id") REFERENCES "public"."mkt_products"("id")
);
