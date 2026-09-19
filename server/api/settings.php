<?php
/**
 * Store-wide settings (branding, contact info, about text).
 *
 *   GET  /api/settings.php   public
 *   POST /api/settings.php   admin — replaces the single settings row
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

function row_to_settings(?array $row): ?array
{
    if (!$row) return null;
    return [
        'logo'          => $row['logo'],
        'heroImage'     => $row['hero_image'],
        'aboutImage'    => $row['about_image'],
        'aboutText'     => ['en' => $row['about_text_en'], 'ar' => $row['about_text_ar'], 'ku' => $row['about_text_ku']],
        'phone1'        => $row['phone1'],
        'phone2'        => $row['phone2'],
        'instagram'     => $row['instagram'],
        'facebook'      => $row['facebook'],
        'tiktok'        => $row['tiktok'],
        'googleMapsUrl' => $row['google_maps_url'],
    ];
}

$method = allow('GET', 'POST');

if ($method === 'GET') {
    $row = db()->query('SELECT * FROM settings WHERE id = 1')->fetch();
    json_out(row_to_settings($row ?: null));
}

require_admin();
$data = body();

$logo  = save_data_uri_image($data['logo'] ?? null);
$hero  = save_data_uri_image($data['heroImage'] ?? null);
$about = save_data_uri_image($data['aboutImage'] ?? null);
$aboutText = is_array($data['aboutText'] ?? null) ? $data['aboutText'] : [];

// Social links end up in an href, so they are checked to be real http(s)
// addresses — a javascript: URL saved here would run for every visitor.
$params = [
    $logo, $hero, $about,
    str_field($aboutText['en'] ?? '', 'About text (English)', 2000),
    str_field($aboutText['ar'] ?? '', 'About text (Arabic)', 2000),
    str_field($aboutText['ku'] ?? '', 'About text (Kurdish)', 2000),
    str_field($data['phone1'] ?? '', 'Phone 1', 30),
    str_field($data['phone2'] ?? '', 'Phone 2', 30),
    url_field($data['instagram'] ?? '', 'Instagram link'),
    url_field($data['facebook'] ?? '', 'Facebook link'),
    url_field($data['tiktok'] ?? '', 'TikTok link'),
    url_field($data['googleMapsUrl'] ?? '', 'Google Maps link'),
];

$sql = db_driver() === 'sqlite'
    ? 'INSERT INTO settings (id, logo, hero_image, about_image, about_text_en, about_text_ar, about_text_ku, phone1, phone2, instagram, facebook, tiktok, google_maps_url)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET logo=excluded.logo, hero_image=excluded.hero_image, about_image=excluded.about_image,
         about_text_en=excluded.about_text_en, about_text_ar=excluded.about_text_ar, about_text_ku=excluded.about_text_ku,
         phone1=excluded.phone1, phone2=excluded.phone2, instagram=excluded.instagram, facebook=excluded.facebook,
         tiktok=excluded.tiktok, google_maps_url=excluded.google_maps_url'
    : 'INSERT INTO settings (id, logo, hero_image, about_image, about_text_en, about_text_ar, about_text_ku, phone1, phone2, instagram, facebook, tiktok, google_maps_url)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE logo=VALUES(logo), hero_image=VALUES(hero_image), about_image=VALUES(about_image),
         about_text_en=VALUES(about_text_en), about_text_ar=VALUES(about_text_ar), about_text_ku=VALUES(about_text_ku),
         phone1=VALUES(phone1), phone2=VALUES(phone2), instagram=VALUES(instagram), facebook=VALUES(facebook),
         tiktok=VALUES(tiktok), google_maps_url=VALUES(google_maps_url)';

db()->prepare($sql)->execute($params);

$row = db()->query('SELECT * FROM settings WHERE id = 1')->fetch();
json_out(row_to_settings($row));
