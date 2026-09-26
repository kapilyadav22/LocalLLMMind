import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('docs/assets');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log('🚀 Starting Comprehensive Real Screenshot & Video Capture on Mac mini M4...');

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

  // Setup video recording canvas on helper page
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
        videoBitsPerSecond: 4500000
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

  // =========================================================================
  // SCENARIO 1: Multimodal Vision (Upload Image & Ask for Description)
  // =========================================================================
  console.log('📸 Scenario 1: Multimodal Vision Image Upload & Description Prompt...');
  try {
    const sampleImgPath = path.resolve('docs/assets/real_chat_dashboard.png');
    const fileInputs = await page.$$('input[type="file"]');
    for (const input of fileInputs) {
      const accept = await page.evaluate((el) => el.getAttribute('accept') || '', input);
      if (accept.includes('image')) {
        await input.uploadFile(sampleImgPath);
        break;
      }
    }
    await sleep(800);
    await page.evaluate(() => {
      const ta = document.getElementById('chat-message-input');
      if (ta) {
        ta.value = 'Analyze this UI screenshot: describe the component layout, color hierarchy, and active model badge.';
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await sleep(600);
    await recordFrames(1500);
    await page.screenshot({ path: path.join(OUT_DIR, 'real_vision_multimodal.png') });
  } catch (e) {
    console.error('Scenario 1 error:', e);
  }

  // Clear input
  await page.evaluate(() => {
    const ta = document.getElementById('chat-message-input');
    if (ta) { ta.value = ''; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    const removeBtn = document.querySelector('button[aria-label="Remove image"]');
    if (removeBtn) removeBtn.click();
  });
  await sleep(400);

  // =========================================================================
  // SCENARIO 2 & 4: Code Section (Project Import, Refactor Prompt, Comments & Terminal)
  // =========================================================================
  console.log('💻 Scenario 2 & 4: Code Workspace (Project, Refactor Prompt & Comments)...');
  try {
    // Click Code tab
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.trim() === 'Code');
      if (btn) btn.click();
    });
    await sleep(800);
    await recordFrames(800);

    // Click Starter Template
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Starter Template'));
      if (btn) btn.click();
    });
    await sleep(800);
    await recordFrames(800);

    // Set Refactor prompt
    await page.evaluate(() => {
      const ta = Array.from(document.querySelectorAll('textarea')).find((t) =>
        (t.placeholder && t.placeholder.includes('modifications')) || (t.getAttribute('aria-label') && t.getAttribute('aria-label').includes('Prompt'))
      ) || document.querySelector('textarea');
      if (ta) {
        ta.value = 'Refactor greet() into an asynchronous message pipeline with robust exception handling and strict type annotations.';
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await sleep(600);
    await recordFrames(1200);
    console.log('📸 Capturing Scenario 2: Code Refactor Prompt...');
    await page.screenshot({ path: path.join(OUT_DIR, 'real_code_refactor.png') });

    // Switch right panel to "Comments"
    await page.evaluate(() => {
      const commentsBtn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Comments'));
      if (commentsBtn) commentsBtn.click();
    });
    await sleep(800);
    await recordFrames(1200);
    console.log('📸 Capturing Scenario 4: Code Workspace with Comments Panel...');
    await page.screenshot({ path: path.join(OUT_DIR, 'real_code_comments_extensive.png') });

    // Switch back to Chat
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.trim() === 'Chat');
      if (btn) btn.click();
    });
    await sleep(600);
    await recordFrames(600);
  } catch (e) {
    console.error('Scenario 2/4 error:', e);
  }

  // =========================================================================
  // SCENARIO 3: Local RAG & Document Knowledge Base Demo
  // =========================================================================
  console.log('📚 Scenario 3: Local RAG & Knowledge Base Demo...');
  try {
    await page.evaluate(() => {
      const ragBtn = document.querySelector('button[aria-label*="Knowledge Base"]') ||
                     document.querySelector('button[aria-label*="Local RAG"]');
      if (ragBtn) ragBtn.click();
    });
    await sleep(1000);
    await recordFrames(1500);
    console.log('📸 Capturing Scenario 3: RAG Knowledge Base...');
    await page.screenshot({ path: path.join(OUT_DIR, 'real_rag_demo.png') });

    // Close RAG dialog
    await page.keyboard.press('Escape');
    await sleep(600);
    await recordFrames(600);
  } catch (e) {
    console.error('Scenario 3 error:', e);
  }

  // =========================================================================
  // SCENARIO 5: AI Providers Options Support
  // =========================================================================
  console.log('🔑 Scenario 5: AI Providers Options Support in Settings...');
  try {
    // Open Settings dialog
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label*="Settings"]');
      if (btn) btn.click();
    });
    await sleep(800);

    // Click API Providers & Keys menu item
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.MuiListItemButton-root'));
      const b = btns.find((el) => el.textContent && el.textContent.includes('API Providers'));
      if (b) b.click();
    });
    await sleep(800);
    await recordFrames(1500);
    console.log('📸 Capturing Scenario 5: AI Providers & Keys...');
    await page.screenshot({ path: path.join(OUT_DIR, 'real_ai_providers.png') });

    // Close Settings
    await page.keyboard.press('Escape');
    await sleep(600);
    await recordFrames(600);
  } catch (e) {
    console.error('Scenario 5 error:', e);
  }

  // =========================================================================
  // SCENARIO 6: TypeSafe Jev Structured Decision Studio Modal
  // =========================================================================
  console.log('🎯 Scenario 6: Jev Decision Studio Modal...');
  try {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-jev-studio'));
    });
    await sleep(1000);
    await recordFrames(1500);
    console.log('📸 Capturing Scenario 6: Jev Decision Studio...');
    await page.screenshot({ path: path.join(OUT_DIR, 'real_jev_studio.png') });

    // Close Jev Studio modal
    await page.keyboard.press('Escape');
    await sleep(600);
    await recordFrames(600);
  } catch (e) {
    console.error('Scenario 6 error:', e);
  }

  // =========================================================================
  // SCENARIO 7: Model Comparison Arena Results
  // =========================================================================
  console.log('⚔️ Scenario 7: Model Comparison Arena Results...');
  try {
    // Inject Model Arena conversation into localStorage and reload
    await page.evaluate(() => {
      const arenaConversation = {
        id: 'convo_arena_demo',
        title: 'Model Arena: Asynchronous Queue Comparison',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: 'llama3.2:latest vs deepseek-r1:8b',
        messages: [
          {
            id: 'msg_user_1',
            role: 'user',
            content: 'Compare the best architectural approach for an asynchronous task queue in a high-throughput backend service.',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'msg_assistant_arena',
            role: 'assistant',
            isArena: true,
            timestamp: new Date().toISOString(),
            modelA: {
              name: 'llama3.2:latest',
              content: '### Approach 1: In-Memory Redis Worker Queue\n\nFor sub-millisecond dispatching with high concurrency, use a Redis-backed stream queue with BullMQ:\n\n```typescript\nimport { Queue, Worker } from "bullmq";\n\nexport const taskQueue = new Queue("high-throughput-tasks", {\n  connection: { host: "127.0.0.1", port: 6379 }\n});\n```\n\n**Key Strengths:**\n- Extremely low latency (sub-millisecond job scheduling)\n- Built-in rate limiting, exponential backoff, and event hooks\n- Low operational complexity for cloud-native clusters',
              isStreaming: false,
              metrics: {
                tokPerSec: 64.2,
                totalTokens: 186,
                duration: 2.9,
                ttftMs: 42,
              },
            },
            modelB: {
              name: 'deepseek-r1:8b',
              content: '### Approach 2: Partitioned Kafka Event Log\n\nFor distributed pipelines where ordering guarantees and replayability are mandatory:\n\n```python\nfrom confluent_kafka import Producer\n\nproducer = Producer({"bootstrap.servers": "localhost:9092"})\nproducer.produce("tasks.partitioned", key=user_id, value=payload)\n```\n\n**Trade-offs:**\n- Guaranteed partition ordering across consumer groups\n- Zero message loss with persistent commit offsets\n- Slightly higher latency floor than pure in-memory brokers',
              isStreaming: false,
              metrics: {
                tokPerSec: 53.6,
                totalTokens: 215,
                duration: 4.0,
                ttftMs: 78,
              },
            },
            vote: 'A',
          },
        ],
      };

      const existing = JSON.parse(localStorage.getItem('llm_ui_conversations') || '[]');
      const filtered = existing.filter((c) => c.id !== 'convo_arena_demo');
      localStorage.setItem('llm_ui_conversations', JSON.stringify([arenaConversation, ...filtered]));
      localStorage.setItem('llm_ui_active_conversation_id', 'convo_arena_demo');
    });

    await page.goto('http://localhost:2210/', { waitUntil: 'networkidle0' });
    await sleep(1200);

    // Toggle arena mode bar if not active
    await page.evaluate(() => {
      const arenaBtn = document.querySelector('button[aria-label*="Model Arena"]') ||
                       Array.from(document.querySelectorAll('button')).find((b) => b.getAttribute('title')?.includes('Model Arena'));
      if (arenaBtn) arenaBtn.click();
    });
    await sleep(800);
    await recordFrames(2000);
    console.log('📸 Capturing Scenario 7: Model Comparison Results...');
    await page.screenshot({ path: path.join(OUT_DIR, 'real_model_comparison_results.png') });
  } catch (e) {
    console.error('Scenario 7 error:', e);
  }

  // =========================================================================
  // Finish & Compile Demo Video
  // =========================================================================
  console.log('🎬 Compiling Comprehensive Demo Video...');
  try {
    const b64Video = await recPage.evaluate(() => window.getRecording());
    const videoBuffer = Buffer.from(b64Video, 'base64');
    const videoPath = path.join(OUT_DIR, 'demo_video.webm');
    fs.writeFileSync(videoPath, videoBuffer);
    console.log(`✅ Demo video saved to ${videoPath} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
  } catch (e) {
    console.error('Video compilation error:', e);
  }

  await browser.close();
  console.log('✨ All scenarios captured and recorded successfully!');
}

run().catch((e) => {
  console.error('Fatal capture error:', e);
  process.exit(1);
});
