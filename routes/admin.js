const express = require('express');
const router = express.Router();
const slugify = require('slugify');
const requireAdmin = require('../middleware/auth');
const {
  getAllArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  rememberSlug,
  isSlugTaken,
  getAllSubscribers,
  getStats
} = require('../database/db');

// Shared links get pasted into messages, so keep slugs short. Long headlines
// are cut at a word boundary rather than mid-word.
const SLUG_MAX_LENGTH = 50;

function buildSlug(title, articleId = null) {
  const full = slugify(title || '', {
    lower: true,
    strict: true,
    locale: 'tr',
    remove: /[*+~.()'"!:@]/g
  });

  let base = full;
  if (base.length > SLUG_MAX_LENGTH) {
    const cut = base.slice(0, SLUG_MAX_LENGTH + 1);
    const lastDash = cut.lastIndexOf('-');
    // Fall back to a hard cut if the first word alone is longer than the limit.
    base = lastDash > 0 ? cut.slice(0, lastDash) : base.slice(0, SLUG_MAX_LENGTH);
  }
  base = base.replace(/-+$/, '') || 'haber';

  // A slug is taken if any other article uses it now or used it before, since
  // old slugs still redirect.
  if (!isSlugTaken(base, articleId)) return base;
  for (let n = 2; n < 200; n++) {
    const candidate = `${base}-${n}`;
    if (!isSlugTaken(candidate, articleId)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

// --- Public admin routes (no auth) ---

// Login page
router.get('/login', (req, res) => {
  res.render('admin/login', { error: null });
});

// Login handler
router.post('/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (password === adminPassword) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }

  return res.render('admin/login', { error: 'Geçersiz şifre. Lütfen tekrar deneyin.' });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// --- Protected admin routes (require auth) ---
router.use(requireAdmin);

// Dashboard
router.get('/', (req, res) => {
  const stats = getStats();
  const recentArticles = getAllArticles(null, 5, 0);
  res.render('admin/dashboard', { stats, articles: recentArticles });
});

// List all articles
router.get('/haberler', (req, res) => {
  const articles = getAllArticles();
  res.render('admin/articles', { articles });
});

// Render newsletter digest compiler form
router.get('/bulten-olustur', (req, res) => {
  res.render('admin/newsletter');
});

// New article form
router.get('/haberler/yeni', (req, res) => {
  res.render('admin/editor', { article: null });
});

// Edit article form
router.get('/haberler/:id/duzenle', (req, res) => {
  const article = getArticleById(req.params.id);

  if (!article) {
    return res.redirect('/admin/haberler');
  }

  res.render('admin/editor', { article });
});

// Create or update article
router.post('/haberler', (req, res) => {
  const { id, title, excerpt, content, cover_image, social_image, editor_analysis, key_takeaways, category, tags, status } = req.body;

  const existing = id ? getArticleById(id) : null;

  // Keep an article's slug stable unless its title actually changed, so links
  // already in circulation stay canonical.
  const slug = (existing && existing.title === title)
    ? existing.slug
    : buildSlug(title, existing ? existing.id : null);

  if (id) {
    // The old slug keeps redirecting to this article.
    if (existing && existing.slug !== slug) rememberSlug(existing.id, existing.slug);

    // Update existing article
    updateArticle(id, {
      title,
      slug,
      excerpt,
      content,
      cover_image: cover_image || null,
      social_image: social_image || null,
      editor_analysis: editor_analysis || null,
      key_takeaways: key_takeaways || null,
      category: category || 'Genel',
      tags: tags || null,
      status: status || 'draft'
    });
    if (existing) rememberSlug(existing.id, slug);
  } else {
    // Create new article
    const created = createArticle({
      title,
      slug,
      excerpt,
      content,
      cover_image: cover_image || null,
      social_image: social_image || null,
      editor_analysis: editor_analysis || null,
      key_takeaways: key_takeaways || null,
      category: category || 'Genel',
      tags: tags || null,
      status: status || 'draft'
    });
    rememberSlug(created && created.lastInsertRowid, slug);
  }

  return res.redirect('/admin/haberler');
});

// Delete article
router.post('/haberler/:id/sil', (req, res) => {
  deleteArticle(req.params.id);
  return res.redirect('/admin/haberler');
});

// Subscribers list
router.get('/aboneler', (req, res) => {
  const subscribers = getAllSubscribers();
  res.render('admin/subscribers', { subscribers });
});

module.exports = router;
