select p.id,
p.name,
p.description,
p.retail_amount_cents,
p.retail_currency,
p.released_at,
p.sizes as sizes,
b.name as brand_name,
b.id as brand_id,
c.name as category_name,
c.id as category_id,
c.sizes as category_sizes,
(select array_agg(style_code) from mkt_variants v where v.product_id = p.id) as style_codes,
(select images from mkt_variants v where v.product_id = p.id and images != '{}' and active = true order by weight asc limit 1) as images,
(select count(*) from mkt_listings where product_id = p.id and status = 'active') as listing_count,
(select price_cents from mkt_listings where product_id = p.id and status = 'active' order by price_cents asc limit 1) as lowest_offer
from mkt_products p
left join mkt_categories c on p.category = c.id
left join mkt_brands b on p.brand = b.id
where p.id = $1
and deleted = false
limit 1
