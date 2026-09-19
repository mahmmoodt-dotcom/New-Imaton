-- Local dev seed data. Safe to re-run (INSERT OR IGNORE everywhere).
-- Loaded by local-sqlite-init.php after schema.sqlite.sql.

-- Temporary admin account: username "admin", password "admin".
-- CHANGE THIS before the real site goes live — see README / DEPLOY notes.
INSERT OR IGNORE INTO admins (id, username, password_hash) VALUES
    (1, 'admin', '$2y$10$0f1ir26U3h7rkBUuTts2AO37/X5Y.fv00AzV7B6NbABjlPu8w8JdO');

INSERT OR IGNORE INTO settings (
    id, logo, hero_image, about_image,
    about_text_en, about_text_ar, about_text_ku,
    phone1, phone2, instagram, facebook, tiktok, google_maps_url
) VALUES (
    1,
    '/logo.svg',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1200&h=600',
    'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=800&h=600',
    'Imation is a computer and electronics shop in Iraq. Quality and reliability are our priorities.',
    'إيميشن هو متجر لأجهزة الكمبيوتر والإلكترونيات في العراق. الجودة والموثوقية هما أولوياتنا.',
    'ئیمەیشن دووکانێکە بۆ کۆمپیوتەر و ئەلیکترۆنیات لە عێراق. کوالیتی و متمانە کارە لەپێشینەکانمانن.',
    '07504995658',
    '',
    'https://www.instagram.com/imationforcomputers/',
    '',
    'https://www.tiktok.com/@imationforcomputer',
    'https://share.google/vRzBxVL00ZuBzi18N'
);

INSERT OR IGNORE INTO categories (id, name_en, name_ar, name_ku, image) VALUES
    ('cat-laptops', 'Laptops', 'أجهزة لابتوب', 'لاپتۆپ', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=600'),
    ('cat-accessories', 'Accessories', 'إكسسوارات', 'ئامرازەکان', 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=600'),
    ('cat-components', 'Components', 'قطع الكمبيوتر', 'پارچەکانی کۆمپیوتەر', 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=600');

INSERT OR IGNORE INTO products (
    id, category_id, name_en, name_ar, name_ku,
    description_en, description_ar, description_ku,
    price, discount_price, image, is_available, created_at
) VALUES
    ('prod-laptop-1', 'cat-laptops', 'ProBook 15 Laptop', 'حاسوب محمول بروبوك 15', 'لاپتۆپی پرۆبووک ١٥',
     'Reliable everyday laptop with a fast SSD.', 'حاسوب محمول موثوق للاستخدام اليومي مع قرص SSD سريع.', 'لاپتۆپێکی متمانەپێکراو بۆ بەکارهێنانی ڕۆژانە لەگەڵ SSDی خێرا.',
     650000, 599000, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=600', 1, CURRENT_TIMESTAMP),
    ('prod-mouse-1', 'cat-accessories', 'Wireless Gaming Mouse', 'ماوس ألعاب لاسلكي', 'مۆسی یاری بێ وایەر',
     'Precise wireless mouse for gaming and work.', 'ماوس لاسلكي دقيق للألعاب والعمل.', 'مۆسێکی وردی بێ وایەر بۆ یاری و کارکردن.',
     35000, NULL, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=600', 1, CURRENT_TIMESTAMP),
    ('prod-ram-1', 'cat-components', '16GB DDR4 RAM', 'ذاكرة DDR4 سعة 16 جيجا', 'رامی DDR4ی ١٦ گیگا',
     'High-speed memory upgrade for desktops and laptops.', 'ذاكرة عالية السرعة لترقية أجهزة الكمبيوتر المكتبية والمحمولة.', 'یادگاری خێرا بۆ باشترکردنی کۆمپیوتەری مێز و لاپتۆپ.',
     55000, NULL, 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=600', 1, CURRENT_TIMESTAMP);
