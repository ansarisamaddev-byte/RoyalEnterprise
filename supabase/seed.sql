-- ROYAL ENTERPRISE — starter data (run AFTER schema.sql). Safe to edit; images are external URLs.

insert into categories (name, slug, section, icon, sort_order) values
 ('Mobiles','mobiles','mobiles','phone',1),
 ('Accessories','accessories','electronics','headset',2),
 ('Chargers','chargers','electronics','plug',3),
 ('TV & Appliances','tv-appliances','electronics','tv',4),
 ('Refrigerators','refrigerators','electronics','fridge',5),
 ('Home Appliances','home-appliances','electronics','washer',6),
 ('Smartwatches','smartwatches','electronics','watch',7),
 ('Audio','audio','electronics','speaker',8)
on conflict (slug) do nothing;

insert into sub_categories (category_id, name, slug, sort_order)
select c.id, s.name, s.slug, s.o from categories c join (values
 ('mobiles','Samsung','samsung',1),('mobiles','Apple','apple',2),('mobiles','OnePlus','oneplus',3),('mobiles','Xiaomi','xiaomi',4),
 ('tv-appliances','TV','tv',1),('tv-appliances','Air Conditioner','air-conditioner',2),
 ('refrigerators','Single Door','single-door',1),('refrigerators','Double Door','double-door',2),
 ('home-appliances','Washing Machine','washing-machine',1),('home-appliances','Mixer Grinder','mixer-grinder',2)
) as s(cat,name,slug,o) on s.cat = c.slug
on conflict do nothing;

insert into product_tabs (key,label,is_enabled,is_custom,sort_order) values
 ('specifications','Specifications',true,false,1),
 ('reviews','Reviews',true,false,2),
 ('offers','Offers',true,false,3),
 ('warranty','Warranty',true,false,4)
on conflict (key) do nothing;

insert into settings (key,value) values
 ('store_name','"Royal Enterprise"'),
 ('store_tagline','"Mobile & Electronics Store"'),
 ('store_phone','"+91 98765 43210"'),
 ('store_whatsapp','"919876543210"'),
 ('store_address','"Shop No. 12, Main Market Road, Near Post Office, Your City - 123456"'),
 ('currency','"INR"'),
 ('delivery_charge','50'),
 ('business_hours','"Mon – Sat: 10:00 AM – 9:00 PM  |  Sunday: 10:00 AM – 2:00 PM"'),
 ('default_offer','{"enabled":true,"title":"Festive Offer","text":"Free tempered glass & cover on every mobile purchase.","image_url":""}'),
 ('about_page_content','{
   "about":"Royal Enterprise is your neighbourhood mobile and electronics store, bringing genuine products and honest prices to families in our community.",
   "store":"Visit our shop for the latest smartphones, accessories, TVs and home appliances. Our team is happy to help you compare options in person.",
   "mission":"To make quality electronics affordable and accessible, backed by friendly local support before and after every purchase.",
   "trust":["100% genuine, brand-warranty products","Fair prices with no hidden charges","Quick help on WhatsApp","Local team you can walk up to"],
   "owners":[{"name":"Owner Name","role":"Founder & Owner","bio":"Serving customers in the area for many years."}],
   "team":[{"name":"Team Member","role":"Sales Executive"},{"name":"Team Member","role":"Service & Support"}],
   "contact":{"phone":"+91 98765 43210","whatsapp":"+91 98765 43210","email":"hello@royalenterprise.example"}
 }')
on conflict (key) do nothing;

insert into admin_message_templates (key,label,body,sort_order) values
 ('order_placed','Order placed (sent at checkout)','Hello {CUSTOMER_NAME},

Your order has been placed successfully with Royal Enterprise.

Order ID: {ORDER_ID}

Items:
{ITEMS}

Total: {TOTAL}

Payment Status: {PAYMENT_STATUS}

Our team will contact you shortly regarding payment and delivery.

Track your order:
{TRACK_URL}

Thank you for shopping with Royal Enterprise.',0),
 ('order_status_updated','Order status updated','Hello {CUSTOMER_NAME},

Your Royal Enterprise order {ORDER_ID} status has been updated to {STATUS}.

Track your order:
{TRACK_URL}',1),
 ('order_cancelled','Order cancelled','Hello {CUSTOMER_NAME}, sorry, your order {ORDER_ID} has been cancelled.',2),
 ('out_of_stock','Item out of stock','Hello {CUSTOMER_NAME}, unfortunately one or more items in your order {ORDER_ID} are currently out of stock.',3),
 ('payment_received','Payment received','Hello {CUSTOMER_NAME}, your payment of {TOTAL} has been received for order {ORDER_ID}. Thank you!',4),
 ('out_for_delivery','Out for delivery','Hello {CUSTOMER_NAME}, your order {ORDER_ID} is out for delivery.',5),
 ('delivered','Delivered','Hello {CUSTOMER_NAME}, your order {ORDER_ID} has been delivered. Thank you for shopping with Royal Enterprise!',6)
on conflict (key) do nothing;

-- ---------- sample products (placeholder images: replace with your own URLs) ----------
insert into products (name,slug,category_id,subcategory_id,brand,description,price,original_price,discount,stock,sku,thumbnail_url,image_urls,highlights,badge,is_featured)
select v.name, v.slug, c.id, sc.id, v.brand, v.descr, v.price, v.orig, v.disc, v.stock, v.sku,
       'https://placehold.co/600x600/f3f4f6/0b1730/png?text=' || replace(v.name,' ','+'),
       jsonb_build_array('https://placehold.co/600x600/e5e7eb/0b1730/png?text=' || replace(v.name,' ','+') || '+2',
                         'https://placehold.co/600x600/dbeafe/0b1730/png?text=' || replace(v.name,' ','+') || '+3'),
       v.hl::jsonb, v.badge, v.feat
from (values
 ('Samsung Galaxy A56 5G','samsung-galaxy-a56','mobiles','samsung','Samsung','Super AMOLED display, 50MP camera and all-day battery.',32999,36999,11,15,'SAM-A56','["8 GB RAM","256 GB Storage","50 MP Camera","5000 mAh Battery","6.7 inch Super AMOLED","1 Year Warranty"]','New',true),
 ('Apple iPhone 15 128GB','apple-iphone-15','mobiles','apple','Apple','A16 Bionic chip, dual camera system and USB-C.',64999,69900,7,8,'APL-I15','["6 GB RAM","128 GB Storage","48 MP Camera","6.1 inch Super Retina","USB-C","1 Year Warranty"]',null,true),
 ('OnePlus Nord CE4','oneplus-nord-ce4','mobiles','oneplus','OnePlus','Snapdragon processor with 100W SuperVOOC charging.',24999,26999,7,12,'OP-CE4','["8 GB RAM","128 GB Storage","50 MP Camera","5500 mAh Battery","100W Fast Charging"]','Hot',true),
 ('Redmi Note 13 Pro','redmi-note-13-pro','mobiles','xiaomi','Xiaomi','200MP camera and 120Hz AMOLED display.',22999,25999,12,20,'RM-N13P','["8 GB RAM","256 GB Storage","200 MP Camera","5100 mAh Battery"]',null,false),
 ('Samsung Galaxy M35 5G','samsung-galaxy-m35','mobiles','samsung','Samsung','6000 mAh battery with Super AMOLED display.',16999,19999,15,25,'SAM-M35','["6 GB RAM","128 GB Storage","50 MP Camera","6000 mAh Battery"]',null,false),
 ('Fast Charger 20W','fast-charger-20w','chargers',null,'Samsung','20W USB-C fast charger with cable.',999,1299,23,60,'CHG-20W','["20W Fast Charging","USB-C Port","Cable Included","Overheat Protection"]',null,true),
 ('Wireless Earphones','wireless-earphones','audio',null,'boAt','Bluetooth 5.3 earbuds with 40 hours playback.',3499,4499,22,30,'AUD-WE1','["Bluetooth 5.3","40 Hours Playback","Noise Cancellation","Fast Charge"]','Bestseller',true),
 ('Bluetooth Speaker 20W','bluetooth-speaker-20w','audio',null,'JBL','Portable waterproof speaker with deep bass.',2499,3299,24,18,'AUD-SP20','["20W Output","IPX7 Waterproof","12 Hours Playback"]',null,false),
 ('Smartwatch Pro AMOLED','smartwatch-pro','smartwatches',null,'Fire-Boltt','1.8 inch AMOLED smartwatch with calling.',1999,4999,60,40,'SW-PRO','["1.8 inch AMOLED","Bluetooth Calling","SpO2 & Heart Rate","7 Day Battery"]','Deal',true),
 ('Tempered Glass & Cover Combo','tempered-glass-combo','accessories',null,'Generic','Screen protector and shockproof cover.',299,499,40,100,'ACC-TG1','["Scratch Resistant","Shockproof Cover","Easy Install"]',null,false),
 ('Samsung 43" Smart LED TV','samsung-43-smart-tv','tv-appliances','tv','Samsung','43 inch Full HD smart TV with built-in apps.',28999,34999,17,6,'TV-S43','["43 inch Full HD","Smart TV","2 HDMI / 1 USB","1 Year Warranty"]','Popular',true),
 ('LG 260L Double Door Refrigerator','lg-260l-double-door','refrigerators','double-door','LG','Frost-free refrigerator with smart inverter.',27490,31990,14,4,'RF-LG260','["260 Litres","Frost Free","Smart Inverter","10 Year Compressor Warranty"]',null,true),
 ('Samsung 7kg Washing Machine','samsung-7kg-washing-machine','home-appliances','washing-machine','Samsung','Fully automatic front load washing machine.',24990,29990,17,5,'WM-S7','["7 kg Capacity","Fully Automatic","Digital Inverter","5 Star Rated"]',null,false)
) as v(name,slug,cat,sub,brand,descr,price,orig,disc,stock,sku,hl,badge,feat)
join categories c on c.slug = v.cat
left join sub_categories sc on sc.category_id = c.id and sc.slug = v.sub
on conflict (slug) do nothing;

insert into product_specifications (product_id,spec_key,spec_value,sort_order)
select p.id,s.k,s.v,s.o from products p join (values
 ('samsung-galaxy-a56','Display','6.7 inch Super AMOLED',1),('samsung-galaxy-a56','RAM','8 GB',2),('samsung-galaxy-a56','Storage','256 GB',3),('samsung-galaxy-a56','Battery','5000 mAh',4),('samsung-galaxy-a56','Rear Camera','50 MP + 12 MP + 5 MP',5),
 ('apple-iphone-15','Display','6.1 inch Super Retina XDR',1),('apple-iphone-15','RAM','6 GB',2),('apple-iphone-15','Storage','128 GB',3),('apple-iphone-15','Rear Camera','48 MP + 12 MP',4),
 ('oneplus-nord-ce4','Display','6.7 inch AMOLED 120Hz',1),('oneplus-nord-ce4','RAM','8 GB',2),('oneplus-nord-ce4','Storage','128 GB',3),('oneplus-nord-ce4','Battery','5500 mAh',4),
 ('redmi-note-13-pro','Display','6.67 inch AMOLED 120Hz',1),('redmi-note-13-pro','RAM','8 GB',2),('redmi-note-13-pro','Storage','256 GB',3),('redmi-note-13-pro','Battery','5100 mAh',4),
 ('samsung-galaxy-m35','Display','6.6 inch Super AMOLED',1),('samsung-galaxy-m35','RAM','6 GB',2),('samsung-galaxy-m35','Storage','128 GB',3),('samsung-galaxy-m35','Battery','6000 mAh',4),
 ('samsung-43-smart-tv','Screen Size','43 inch',1),('samsung-43-smart-tv','Resolution','Full HD (1920 x 1080)',2),('samsung-43-smart-tv','Connectivity','Wi-Fi, 2 HDMI, 1 USB',3),
 ('lg-260l-double-door','Capacity','260 Litres',1),('lg-260l-double-door','Type','Frost Free Double Door',2),('lg-260l-double-door','Energy Rating','3 Star',3)
) as s(slug,k,v,o) on s.slug = p.slug;

insert into product_reviews (product_id,customer_name,rating,review,review_date)
select p.id,s.n,s.r,s.t,s.d::date from products p join (values
 ('samsung-galaxy-a56','Rahul K.',5,'Great phone, display is stunning and battery lasts all day.','2025-08-12'),
 ('samsung-galaxy-a56','Priya S.',4,'Very good value. Camera is excellent in daylight.','2025-08-28'),
 ('apple-iphone-15','Amit M.',5,'Smooth, fast and the camera is superb. Genuine product from the store.','2025-07-30'),
 ('wireless-earphones','Sana R.',4,'Good sound and battery life for the price.','2025-09-02')
) as s(slug,n,r,t,d) on s.slug = p.slug;

insert into product_offers (product_id,title,description,discount_text,sort_order)
select p.id,s.t,s.d,s.x,1 from products p join (values
 ('samsung-galaxy-a56','Exchange Bonus','Get up to ₹3,000 extra off when you exchange your old phone in store.','₹3,000 OFF'),
 ('apple-iphone-15','No-cost EMI','Ask our team about no-cost EMI on select cards.','EMI')
) as s(slug,t,d,x) on s.slug = p.slug;

insert into product_warranties (product_id,title,duration,description)
select p.id,'Brand Warranty', case when p.category_id in (select id from categories where slug in ('refrigerators','tv-appliances','home-appliances')) then '1–10 Years' else '1 Year' end,
       'Covers manufacturing defects. Warranty is provided by the brand through authorised service centres. Please keep your invoice.'
from products p;
