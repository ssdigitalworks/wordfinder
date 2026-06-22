<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap | Scrabble Word Finder</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&amp;family=Inter:wght@400;500;600&amp;display=swap" rel="stylesheet" />
        <style type="text/css">
          :root {
            --color-bg: #f8fafc;
            --color-surface: #ffffff;
            --color-primary: #4f46e5;
            --color-primary-hover: #3730a3;
            --color-border: #e2e8f0;
            --color-text-main: #0f172a;
            --color-text-muted: #64748b;
            --color-accent: #10b981;
          }
          
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background-color: var(--color-bg);
            color: var(--color-text-main);
            margin: 0;
            padding: 60px 20px;
            line-height: 1.6;
          }
          
          .container {
            max-width: 900px;
            margin: 0 auto;
          }
          
          .header-section {
            text-align: center;
            margin-bottom: 40px;
          }
          
          .logo {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-weight: 700;
            color: var(--color-text-main);
            text-decoration: none;
            margin-bottom: 16px;
            font-size: 1.1rem;
          }
          
          h1 {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 2.5rem;
            font-weight: 800;
            color: var(--color-text-main);
            margin-top: 0;
            margin-bottom: 12px;
            letter-spacing: -0.025em;
          }
          
          .desc {
            color: var(--color-text-muted);
            font-size: 1rem;
            max-width: 600px;
            margin: 0 auto 24px auto;
          }
          
          .meta-badge {
            display: inline-block;
            background: #e0e7ff;
            color: var(--color-primary);
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 0.85rem;
            font-weight: 600;
          }
          
          .card {
            background-color: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: 20px;
            padding: 32px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            margin-bottom: 32px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }
          
          th {
            border-bottom: 2px solid var(--color-border);
            color: var(--color-text-muted);
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-weight: 700;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 12px 16px;
          }
          
          td {
            padding: 16px;
            border-bottom: 1px solid var(--color-border);
            font-size: 0.925rem;
            word-break: break-all;
            color: var(--color-text-main);
          }
          
          tr:last-child td {
            border-bottom: none;
          }
          
          tr:hover td {
            background-color: #f8fafc;
          }
          
          /* Links are styled as clean text */
          a.sitemap-link {
            color: var(--color-text-main);
            text-decoration: none;
            font-weight: 500;
            transition: color 0.15s ease;
          }
          
          a.sitemap-link:hover {
            color: var(--color-primary);
            text-decoration: underline;
          }
          
          .badge {
            display: inline-block;
            padding: 3px 8px;
            font-size: 0.75rem;
            font-weight: 700;
            border-radius: 6px;
            background-color: rgba(16, 185, 129, 0.1);
            color: var(--color-accent);
            border: 1px solid rgba(16, 185, 129, 0.15);
          }
          
          .footer {
            text-align: center;
            color: var(--color-text-muted);
            font-size: 0.825rem;
            margin-top: 48px;
          }
          
          .footer a {
            color: var(--color-primary);
            text-decoration: none;
            font-weight: 500;
          }
          
          .footer a:hover {
            color: var(--color-primary-hover);
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header-section">
            <a href="/" class="logo">
              <span>🎯</span> Scrabble Word Finder
            </a>
            <xsl:choose>
              <xsl:when test="sitemap:sitemapindex">
                <h1>XML Sitemap Index</h1>
                <p class="desc">
                  This sitemap index references all individual sitemap resource files for search engines.
                </p>
                <div class="meta-badge">
                  Total Sitemaps: <xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/>
                </div>
              </xsl:when>
              <xsl:otherwise>
                <h1>XML Sitemap</h1>
                <p class="desc">
                  This sitemap contains a listing of document and tool URLs to help crawler crawlers index the site.
                </p>
                <div class="meta-badge">
                  Total URLs: <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/>
                </div>
              </xsl:otherwise>
            </xsl:choose>
          </div>
          
          <div class="card">
            <xsl:choose>
              <xsl:when test="sitemap:sitemapindex">
                <table>
                  <thead>
                    <tr>
                      <th style="width: 70%;">Sitemap File</th>
                      <th style="width: 30%;">Last Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                      <tr>
                        <td>
                          <a class="sitemap-link" href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                        </td>
                        <td style="color: var(--color-text-muted);">
                          <xsl:value-of select="sitemap:lastmod"/>
                        </td>
                      </tr>
                    </xsl:for-each>
                  </tbody>
                </table>
              </xsl:when>
              
              <xsl:otherwise>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 60%;">URL Path</th>
                      <th style="width: 15%;">Priority</th>
                      <th style="width: 15%;">Change Freq</th>
                      <th style="width: 10%;">Last Mod</th>
                    </tr>
                  </thead>
                  <tbody>
                    <xsl:for-each select="sitemap:urlset/sitemap:url">
                      <tr>
                        <td>
                          <a class="sitemap-link" href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                        </td>
                        <td>
                          <span class="badge"><xsl:value-of select="sitemap:priority"/></span>
                        </td>
                        <td style="color: var(--color-text-muted);">
                          <xsl:value-of select="sitemap:changefreq"/>
                        </td>
                        <td style="color: var(--color-text-muted);">
                          <xsl:value-of select="sitemap:lastmod"/>
                        </td>
                      </tr>
                    </xsl:for-each>
                  </tbody>
                </table>
              </xsl:otherwise>
            </xsl:choose>
          </div>
          
          <div class="footer">
            Generated by Scrabble Word Finder. Learn more about sitemaps at <a href="https://sitemaps.org" target="_blank" rel="noopener">sitemaps.org</a>.
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
