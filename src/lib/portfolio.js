import fs from 'node:fs';
import path from 'node:path';
import prisma from '@/lib/db';
import { renderPage, validate } from '../../public/assets/js/cms-render.js';

export const PORTFOLIO_SETTING_KEY = 'portfolio_site_data';

function readFallbackSiteJson() {
  const filePath = path.join(process.cwd(), 'public', 'content', 'site.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Load portfolio data from PostgreSQL (Setting.portfolio_site_data).
 * Falls back to public/content/site.json if the database does not have it yet.
 */
export async function getPortfolioData() {
  try {
    const row = await prisma.setting.findUnique({
      where: { key: PORTFOLIO_SETTING_KEY },
    });
    if (row?.value) {
      return JSON.parse(row.value);
    }
  } catch (err) {
    console.warn('Portfolio DB read failed, using site.json fallback:', err.message);
  }
  return readFallbackSiteJson();
}

/**
 * Validate and persist portfolio data into PostgreSQL.
 */
export async function savePortfolioData(data) {
  const problems = validate(data);
  if (problems.length > 0) {
    const error = new Error(problems.join('; '));
    error.validationErrors = problems;
    throw error;
  }

  const serialized = JSON.stringify(data);
  await prisma.setting.upsert({
    where: { key: PORTFOLIO_SETTING_KEY },
    update: { value: serialized },
    create: { key: PORTFOLIO_SETTING_KEY, value: serialized },
  });

  return data;
}

/**
 * Render a portfolio HTML template from public/<fileName> using live DB data.
 */
export async function renderPortfolioHtml(fileName) {
  const safeName = path.basename(fileName);
  const templatePath = path.join(process.cwd(), 'public', safeName);
  if (!fs.existsSync(templatePath)) {
    return null;
  }
  const html = fs.readFileSync(templatePath, 'utf8');
  const data = await getPortfolioData();
  return renderPage(html, data, safeName);
}
