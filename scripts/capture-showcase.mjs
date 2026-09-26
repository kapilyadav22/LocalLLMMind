import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('docs/assets');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('🚀 Launching Google Chrome on macOS...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--window-size=1600,1000',
      '--font-render-hinting=none',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1.5 });
  await page.goto('http://localhost:2210/', { waitUntil: 'networkidle0' });
  await sleep(1500);

  // Setup video recorder page
  const recPage = await browser.newPage();
  await recPage.setContent(`
    <canvas id="c" width="1600" height="1000"></canvas>
    <script>
      const canvas = document.getElementById("c");
      const ctx = canvas.getContext("2d");
      const stream = canvas.captureStream(20);
      window.chunks = [];
      window.recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 4000000
      });
      window.recorder.ondataavailable = (e) => { if (e.data.size > 0) window.chunks.push(e.data); };
      window.recorder.start(100);

      window.drawFrame = async (blobUrl) => {
        const img = new Image();
        await new Promise((r) => { img.onload = r; img.src = blobUrl; });
        ctx.drawImage(img, 0, 0, 1600, 1000);
      };

      window.getRecording = async () => {
        window.recorder.stop();
        await new Promise((r) => (window.recorder.onstop = r));
        const blob = new Blob(window.chunks, { type: 'video/webm' });
        const reader = new FileReader();
        return new Promise((r) => {
          reader.onload = () => r(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        });
      };
    </script>
  `);

  async function recordFrames(durationMs, frameIntervalMs = 100) {
    const start = Date.now();
    while (Date.now() - start < durationMs) {
      const shot = await page.screenshot({ type: 'jpeg', quality: 92, encoding: 'base64' });
      await recPage.evaluate((b64) => window.drawFrame('data:image/jpeg;base64,' + b64), shot);
      await sleep(frameIntervalMs);
    }
  }

  console.log('📸 1. Capturing Real Chat Dashboard...');
  await page.screenshot({ path: path.join(OUT_DIR, 'real_chat_dashboard.png'), fullPage: false });
  await recordFrames(1500);

  console.log('⚡ 2. Enabling Agent Mode...');
  // Click Agent mode toggle button
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.innerText.includes('Agent mode off')
    );
    if (btn) btn.click();
  });
  await sleep(1000);
  await recordFrames(1200);

  console.log('📸 3. Capturing Real Agent Mode (Activity Expanded)...');
  await page.screenshot({ path: path.join(OUT_DIR, 'real_agent_mode_active.png') });

  console.log('👁️ 4. Toggling "Hide activity"...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.innerText.includes('Hide activity')
    );
    if (btn) btn.click();
  });
  await sleep(800);
  await recordFrames(1200);

  console.log('📸 5. Capturing Real Agent Mode (Activity Hidden)...');
  await page.screenshot({ path: path.join(OUT_DIR, 'real_agent_mode_hidden.png') });

  console.log('👁️ 6. Toggling "Show activity" back on...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.innerText.includes('Show activity')
    );
    if (btn) btn.click();
  });
  await sleep(800);
  await recordFrames(1000);

  console.log('🎨 7. Opening Appearance & Custom Themes...');
  // Click Settings button
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label*="Settings"]');
    if (btn) btn.click();
  });
  await sleep(800);
  await recordFrames(800);

  // Click Appearance in Settings vertical menu
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.MuiListItemButton-root'));
    const b = btns.find((el) => el.textContent && el.textContent.includes('Appearance'));
    if (b) b.click();
  });
  await sleep(800);
  await recordFrames(1000);

  console.log('📸 8. Capturing Real Theme Customizer...');
  await page.screenshot({ path: path.join(OUT_DIR, 'real_theme_swatch.png') });

  // Scroll to show preset cards
  await page.evaluate(() => {
    const dc = document.querySelector('.MuiDialogContent-root');
    if (dc) dc.scrollTop = 380;
  });
  await sleep(600);
  await recordFrames(1200);
  await page.screenshot({ path: path.join(OUT_DIR, 'real_theme_customizer.png') });

  // Click Neon Cyberpunk preset to demonstrate theme switching
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div, button')).filter((el) =>
      el.textContent && el.textContent.includes('Neon Cyberpunk')
    );
    const target = cards.at(-1);
    if (target) target.click();
  });
  await sleep(800);
  await recordFrames(1500);

  // Close Settings dialog
  await page.keyboard.press('Escape');
  await sleep(600);
  await recordFrames(800);

  console.log('💻 9. Navigating to Code Workspace...');
  await page.evaluate(() => {
    const codeBtn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText === 'Code');
    if (codeBtn) codeBtn.click();
  });
  await sleep(1000);
  await recordFrames(1500);

  console.log('📸 10. Capturing Real Code Workspace...');
  await page.screenshot({ path: path.join(OUT_DIR, 'real_code_workspace.png') });

  console.log('💬 11. Navigating back to Chat...');
  await page.evaluate(() => {
    const chatBtn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText === 'Chat');
    if (chatBtn) chatBtn.click();
  });
  await sleep(800);
  await recordFrames(800);

  console.log('🧪 12. Opening Playground & Evaluations...');
  await page.evaluate(() => {
    const labBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.innerText.includes('Playground & evaluations')
    );
    if (labBtn) labBtn.click();
  });
  await sleep(800);
  await recordFrames(1200);

  console.log('📸 13. Capturing Real Playground & Evaluations...');
  await page.screenshot({ path: path.join(OUT_DIR, 'real_evaluations_lab.png') });

  // Close lab dialog
  await page.keyboard.press('Escape');
  await sleep(600);
  await recordFrames(1000);

  console.log('🎬 14. Compiling recorded demo video...');
  const b64Video = await recPage.evaluate(() => window.getRecording());
  const videoBuffer = Buffer.from(b64Video, 'base64');
  const videoPath = path.join(OUT_DIR, 'demo_video.webm');
  fs.writeFileSync(videoPath, videoBuffer);
  console.log(`✅ Demo video saved to ${videoPath} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

  await browser.close();
  console.log('✨ All real screenshots and demo video captured successfully!');
}

run().catch((e) => {
  console.error('Capture failed:', e);
  process.exit(1);
});
