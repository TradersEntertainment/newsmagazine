const express = require('express');
const router = express.Router();
const { getAllArticles, getAllArticlesFiltered, getArticleBySlug, incrementViews, addSubscriber, getStats } = require('../database/db');

// Home page
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const offset = (page - 1) * limit;
  const category = req.query.category || null;
  const search = req.query.search || null;

  const articles = getAllArticlesFiltered({ status: 'published', category, search, limit, offset });
  const nextArticles = getAllArticlesFiltered({ status: 'published', category, search, limit: 1, offset: offset + limit });
  const hasNextPage = nextArticles.length > 0;
  
  const stats = getStats();
  
  res.render('public/home', {
    articles,
    stats,
    currentPage: page,
    hasNextPage,
    currentCategory: category,
    currentSearch: search
  });
});

// Single article page
router.get('/haber/:slug', (req, res) => {
  const article = getArticleBySlug(req.params.slug);

  if (!article) {
    return res.status(404).render('public/home', {
      articles: getAllArticles('published', 12, 0),
      stats: getStats(),
      error: 'Makale bulunamadı.'
    });
  }

  // Increment view count
  incrementViews(req.params.slug);

  // Get recent articles for sidebar
  const recentArticles = getAllArticles('published', 4, 0);

  res.render('public/article', { article, recentArticles });
});

// Newsletter subscription
router.post('/abone-ol', (req, res) => {
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'E-posta adresi gereklidir.' });
  }

  try {
    addSubscriber(email, name);
    return res.json({ success: true, message: 'Bültenimize başarıyla abone oldunuz!' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ success: false, message: 'Bu e-posta adresi zaten kayıtlı.' });
    }
    console.error('Abone ekleme hatası:', error.message);
    return res.status(500).json({ success: false, message: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
  }
});

// Dynamic XML Sitemap
router.get('/sitemap.xml', (req, res) => {
  const articles = getAllArticles('published', 1000, 0);
  const host = req.get('host');
  const protocol = req.protocol;
  const baseUrl = `${protocol}://${host}`;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

  articles.forEach(article => {
    try {
      const dateObj = new Date(article.updated_at || article.created_at || Date.now());
      const dateStr = dateObj.toISOString().split('T')[0];
      xml += `
  <url>
    <loc>${baseUrl}/haber/${article.slug}</loc>
    <lastmod>${dateStr}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    } catch (e) {
      // Ignore formatting error
    }
  });

  xml += `\n</urlset>`;
  res.header('Content-Type', 'application/xml');
  return res.send(xml);
});

// robots.txt
router.get('/robots.txt', (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol;
  const baseUrl = `${protocol}://${host}`;

  const robots = `User-agent: *
Allow: /
Disallow: /admin/

Sitemap: ${baseUrl}/sitemap.xml`;

  res.header('Content-Type', 'text/plain');
  return res.send(robots);
});

module.exports = router;
