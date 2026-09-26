import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('docs/assets');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log('🚀 Capturing Antigravity-style IDE AI Chat & GitHub Linking screenshots...');

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

  // 1. Navigate to Code Workspace
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const codeBtn = buttons.find((b) => b.textContent.includes('Code') || b.getAttribute('aria-label')?.includes('Code'));
    if (codeBtn) codeBtn.click();
  });
  await sleep(1500);

  // Load starter template if empty
  await page.evaluate(() => {
    const starterBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Starter Template'));
    if (starterBtn) starterBtn.click();
  });
  await sleep(1000);

  // Select Python Starter
  await page.evaluate(() => {
    const pyCard = Array.from(document.querySelectorAll('h6, p, div, span')).find((el) => el.textContent.includes('Python Starter'));
    if (pyCard) pyCard.click();
  });
  await sleep(1000);

  // Ensure right sidebar is open and AI Assistant tab is selected
  await page.evaluate(() => {
    const assistantBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('AI Assistant'));
    if (assistantBtn) assistantBtn.click();
  });
  await sleep(1000);

  // Inject a multi-turn conversation into localStorage for this project to showcase Antigravity IDE style chat
  await page.evaluate(() => {
    // Find active project id
    let activeId = localStorage.getItem('localllmmind_active_code_project') || 'default';
    const mockChat = [
      {
        id: 'turn-1',
        role: 'user',
        content: 'Refactor the greet function in src/main.py to accept an optional title parameter (e.g. Dr., Prof.) and validate empty strings.',
        timestamp: Date.now() - 120000,
        fileTags: ['src/main.py']
      },
      {
        id: 'turn-2',
        role: 'assistant',
        content: `I've analyzed \`src/main.py\` and refactored the \`greet()\` function to cleanly support optional honorific titles and input validation.\n\n### Summary of Changes\n- Added optional \`title: Optional[str] = None\` parameter with PEP 484 type annotations.\n- Validated \`name.strip()\` to prevent blank greetings.\n- Preserved backwards compatibility.\n\n\`\`\`python file:src/main.py\ndef greet(name: str, title: str | None = None) -> str:\n    \"\"\"Return a customized greeting with optional title.\"\"\"\n    clean_name = name.strip()\n    if not clean_name:\n        raise ValueError("Name cannot be empty.")\n    prefix = f"{title.strip()} " if title and title.strip() else ""\n    return f"Hello, {prefix}{clean_name}!"\n\`\`\``,
        timestamp: Date.now() - 90000,
        steps: [
          { type: 'tool', name: 'read_file (src/main.py)', status: 'completed', durationMs: 42 },
          { type: 'tool', name: 'propose_file (src/main.py)', status: 'completed', durationMs: 85 }
        ],
        proposals: [
          { path: 'src/main.py', content: 'def greet(name: str, title: str | None = None) -> str:\n    clean_name = name.strip()\n    if not clean_name:\n        raise ValueError("Name cannot be empty.")\n    prefix = f"{title.strip()} " if title and title.strip() else ""\n    return f"Hello, {prefix}{clean_name}!"\n', applied: true }
        ],
        metrics: { inputTokens: 412, outputTokens: 268, durationMs: 1420 }
      },
      {
        id: 'turn-3',
        role: 'user',
        content: 'Now write comprehensive unit tests in tests/test_main.py covering valid greetings, honorific titles, and the empty string ValueError.',
        timestamp: Date.now() - 40000,
        fileTags: ['tests/test_main.py']
      },
      {
        id: 'turn-4',
        role: 'assistant',
        content: `Added comprehensive unit tests covering all test cases and edge cases:\n\n\`\`\`python file:tests/test_main.py\nimport pytest\nfrom src.main import greet\n\ndef test_greet_standard():\n    assert greet("Alice") == "Hello, Alice!"\n\ndef test_greet_with_title():\n    assert greet("Curie", title="Dr.") == "Hello, Dr. Curie!"\n\ndef test_greet_empty_name_raises():\n    with pytest.raises(ValueError, match="cannot be empty"):\n        greet("   ")\n\`\`\``,
        timestamp: Date.now() - 15000,
        steps: [
          { type: 'tool', name: 'read_file (tests/test_main.py)', status: 'completed', durationMs: 38 },
          { type: 'tool', name: 'propose_file (tests/test_main.py)', status: 'completed', durationMs: 92 }
        ],
        proposals: [
          { path: 'tests/test_main.py', content: 'import pytest\nfrom src.main import greet\n\ndef test_greet_standard():\n    assert greet("Alice") == "Hello, Alice!"\n\ndef test_greet_with_title():\n    assert greet("Curie", title="Dr.") == "Hello, Dr. Curie!"\n\ndef test_greet_empty_name_raises():\n    with pytest.raises(ValueError, match="cannot be empty"):\n        greet("   ")\n', applied: false }
        ],
        metrics: { inputTokens: 520, outputTokens: 310, durationMs: 1680 }
      }
    ];

    activeId = localStorage.getItem('localllmmind_active_code_project') || activeId;
    if (activeId) {
      localStorage.setItem(`localllmmind_code_agent_chat_${activeId}`, JSON.stringify(mockChat));
    }
    // Also set for any keys or default
    localStorage.setItem('localllmmind_code_agent_chat_default', JSON.stringify(mockChat));
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('localllmmind_code_agent_chat_')) {
        localStorage.setItem(k, JSON.stringify(mockChat));
      }
    }
  });

  // Reload page to display populated chat
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1500);

  // Navigate back to Code tab
  await page.evaluate(() => {
    const codeBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Code') || b.getAttribute('aria-label')?.includes('Code'));
    if (codeBtn) codeBtn.click();
  });
  await sleep(1000);

  // Ensure AI Assistant is open
  await page.evaluate(() => {
    const assistantBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('AI Assistant'));
    if (assistantBtn) assistantBtn.click();
  });
  await sleep(1000);

  // Fill in composer at the bottom with a follow-up ready to reply
  await page.evaluate(() => {
    const composer = document.querySelector('textarea[placeholder*="Ask follow-up"]');
    if (composer) {
      composer.value = 'Can you also add docstrings and update the README to document the new title parameter?';
      composer.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await sleep(800);

  // Capture Antigravity IDE AI Chat screenshot!
  const chatFile = path.join(OUT_DIR, 'real_code_chat_antigravity.png');
  await page.screenshot({ path: chatFile });
  console.log(`✅ 1. Captured Antigravity-style IDE AI Chat: ${chatFile}`);

  // 2. Switch to Git Source Control Sidebar
  await page.evaluate(() => {
    const gitTab = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Git'));
    if (gitTab) gitTab.click();
  });
  await sleep(1000);

  // Capture Git sidebar with "Link GitHub Account" card
  const gitLinkFile = path.join(OUT_DIR, 'real_github_link.png');
  await page.screenshot({ path: gitLinkFile });
  console.log(`✅ 2. Captured GitHub Link Banner in Git Sidebar: ${gitLinkFile}`);

  // 3. Click "Connect" to open Link GitHub Account Dialog
  await page.evaluate(() => {
    const connectBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Connect');
    if (connectBtn) connectBtn.click();
  });
  await sleep(800);

  // Type mock PAT token in dialog
  await page.evaluate(() => {
    const patInput = document.querySelector('input[placeholder*="ghp_"]');
    if (patInput) {
      patInput.value = 'ghp_exampleTokenForLocalLLMMindVerification';
      patInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await sleep(600);

  // Capture Link GitHub Dialog
  const gitDialogFile = path.join(OUT_DIR, 'real_github_dialog.png');
  await page.screenshot({ path: gitDialogFile });
  console.log(`✅ 3. Captured Link GitHub Dialog: ${gitDialogFile}`);

  // 4. Now simulate connected account in localStorage to showcase "Push Project to GitHub"
  await page.evaluate(() => {
    // Close dialog
    const cancelBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Cancel');
    if (cancelBtn) cancelBtn.click();

    const mockAccount = {
      token: 'ghp_valid_token_mock',
      username: 'kapilyadav22',
      name: 'Kapil Yadav',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1024025?v=4',
      email: 'kapil@example.com',
      htmlUrl: 'https://github.com/kapilyadav22',
      publicRepos: 18,
      linkedAt: Date.now(),
    };
    localStorage.setItem('localllmmind_github_auth', JSON.stringify(mockAccount));
  });
  await sleep(600);

  // Reload to reflect connected GitHub account
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1200);

  // Navigate to Code tab and Git sidebar
  await page.evaluate(() => {
    const codeBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Code') || b.getAttribute('aria-label')?.includes('Code'));
    if (codeBtn) codeBtn.click();
  });
  await sleep(800);

  await page.evaluate(() => {
    const gitTab = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Git'));
    if (gitTab) gitTab.click();
  });
  await sleep(1000);

  // Click Push to GitHub button
  await page.evaluate(() => {
    const pushBtn = document.querySelector('button[title*="Push project"], button[title*="Push Project"]');
    if (pushBtn) pushBtn.click();
  });
  await sleep(800);

  // Capture Push to GitHub modal
  const gitPushFile = path.join(OUT_DIR, 'real_github_push.png');
  await page.screenshot({ path: gitPushFile });
  console.log(`✅ 4. Captured Push Project to GitHub Dialog: ${gitPushFile}`);

  await browser.close();
  console.log('🎉 All new feature screenshots successfully captured!');
}

run().catch((e) => {
  console.error('Capture failed:', e);
  process.exit(1);
});
