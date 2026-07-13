// Generates the Open Graph share image at static/og.png (1200x630).
//
// Run with: node scripts/gen-og.mjs
// Requires Playwright's chromium browser to be installed. If it isn't:
//   npx playwright install chromium
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'static', 'og.png');

const WIDTH = 1200;
const HEIGHT = 630;

// wforacle brand palette (verbatim, see src/app.css)
const COLORS = {
	bg: '#080c12',
	bgGlow: '#0f1c2e',
	gold: '#e6b854',
	cyan: '#37d2e6',
	panel: '#0c1522',
	edge: '#1c3350',
	muted: '#7f97b3',
};

const html = `<!doctype html>
<html>
	<head>
		<meta charset="utf-8" />
		<style>
			* {
				margin: 0;
				padding: 0;
				box-sizing: border-box;
			}
			html,
			body {
				width: ${WIDTH}px;
				height: ${HEIGHT}px;
				background: ${COLORS.bg};
				overflow: hidden;
			}
			.stage {
				position: relative;
				width: ${WIDTH}px;
				height: ${HEIGHT}px;
				background:
					radial-gradient(circle at 22% 32%, ${COLORS.bgGlow} 0%, transparent 55%),
					radial-gradient(circle at 82% 78%, ${COLORS.bgGlow} 0%, transparent 45%),
					${COLORS.bg};
			}
			.grid {
				position: absolute;
				inset: 0;
				background-image:
					linear-gradient(${COLORS.edge} 1px, transparent 1px),
					linear-gradient(90deg, ${COLORS.edge} 1px, transparent 1px);
				background-size: 48px 48px;
				opacity: 0.22;
			}
			.frame {
				position: absolute;
				inset: 40px;
				border: 1px solid ${COLORS.edge};
				border-radius: 24px;
			}
			.content {
				position: relative;
				z-index: 1;
				width: 100%;
				height: 100%;
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				font-family:
					'Segoe UI',
					Verdana,
					Geneva,
					Arial,
					sans-serif;
			}
			.badge {
				display: flex;
				align-items: center;
				gap: 14px;
				margin-bottom: 28px;
			}
			.badge .dot {
				width: 14px;
				height: 14px;
				border-radius: 50%;
				background: ${COLORS.cyan};
				box-shadow: 0 0 18px 4px ${COLORS.cyan};
			}
			.badge .label {
				font-size: 22px;
				letter-spacing: 0.5em;
				text-transform: uppercase;
				color: ${COLORS.muted};
			}
			.wordmark {
				font-size: 128px;
				font-weight: 700;
				line-height: 1;
				letter-spacing: -0.02em;
			}
			.wordmark .wf {
				color: ${COLORS.gold};
			}
			.wordmark .oracle {
				color: ${COLORS.cyan};
			}
			.tagline {
				margin-top: 26px;
				font-size: 30px;
				color: ${COLORS.muted};
			}
		</style>
	</head>
	<body>
		<div class="stage">
			<div class="grid"></div>
			<div class="frame"></div>
			<div class="content">
				<div class="badge">
					<div class="dot"></div>
					<div class="label">Star Chart Tracker</div>
				</div>
				<div class="wordmark"><span class="wf">wf</span><span class="oracle">oracle</span></div>
				<div class="tagline">Warframe Star Chart &amp; Resource Farming Tracker</div>
			</div>
		</div>
	</body>
</html>`;

mkdirSync(dirname(OUT_PATH), { recursive: true });

const browser = await chromium.launch();
try {
	const page = await browser.newPage();
	await page.setViewportSize({ width: WIDTH, height: HEIGHT });
	await page.setContent(html);
	await page.screenshot({ path: OUT_PATH });
	console.log(`wrote ${OUT_PATH}`);
} finally {
	await browser.close();
}
