/**
 * PDF & Print Export Utility for LocalLLMMind
 * Generates an executive, beautifully styled printable document and triggers browser print-to-PDF.
 * Engineered for LocalLLMMind by Kapil Kumar Yadav.
 */

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMessageContent(content) {
  if (!content) return '';

  // Clean DeepSeek <think> tags for print if needed, or format them as thinking block
  let formatted = content.replace(
    /<think>([\s\S]*?)<\/think>/gi,
    (_, thoughts) =>
      `<div class="thinking-block"><div class="thinking-header">🧠 Chain of Thought</div><div class="thinking-content">${escapeHtml(thoughts.trim())}</div></div>`
  );

  // Simple markdown code block formatting for print
  formatted = formatted.replace(
    /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g,
    (_, lang, code) =>
      `<pre class="code-block"><div class="code-lang">${escapeHtml(lang || 'code')}</div><code>${escapeHtml(code.trim())}</code></pre>`
  );

  // Inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Paragraphs / newlines
  formatted = formatted
    .split('\n\n')
    .map((p) => {
      if (p.startsWith('<pre') || p.startsWith('<div class="thinking-block"')) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');

  return formatted;
}

export function exportConversationToPdf(conversation) {
  if (!conversation) return;

  const title = conversation.title || 'LocalLLMMind Conversation';
  const model = conversation.model || 'Local LLM';
  const dateStr = new Date(conversation.createdAt || Date.now()).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = new Date(conversation.createdAt || Date.now()).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const messages = conversation.messages || [];

  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Please allow popups to export the conversation as PDF.');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} — LocalLLMMind PDF Export</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 8pt;
        color: #64748b;
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.6;
      font-size: 10.5pt;
      margin: 0;
      padding: 24px;
    }

    /* Header */
    .doc-header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }

    .doc-brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .brand-title {
      font-size: 13pt;
      font-weight: 800;
      color: #0284c7;
      letter-spacing: -0.02em;
    }

    .brand-tag {
      font-size: 8.5pt;
      color: #64748b;
      font-weight: 500;
    }

    .doc-title {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      margin: 8px 0;
      line-height: 1.25;
    }

    .meta-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 8.5pt;
      color: #475569;
      margin-top: 6px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 500;
    }

    .meta-label {
      color: #64748b;
    }

    /* Message Turns */
    .message-turn {
      margin-bottom: 20px;
      page-break-inside: avoid;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }

    .turn-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .user-turn .turn-header {
      background: #f8fafc;
      color: #0369a1;
      border-bottom: 1px solid #e2e8f0;
    }

    .assistant-turn .turn-header {
      background: #f0f9ff;
      color: #0284c7;
      border-bottom: 1px solid #bae6fd;
    }

    .turn-body {
      padding: 12px 14px;
      font-size: 10pt;
      color: #1e293b;
    }

    .user-turn .turn-body {
      background: #ffffff;
    }

    .assistant-turn .turn-body {
      background: #ffffff;
    }

    .turn-body p {
      margin: 0 0 8px 0;
    }

    .turn-body p:last-child {
      margin-bottom: 0;
    }

    /* Code Blocks */
    .code-block {
      background: #0f172a;
      color: #f8fafc;
      border-radius: 6px;
      padding: 10px 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 8.5pt;
      overflow-x: auto;
      margin: 10px 0;
      position: relative;
    }

    .code-lang {
      font-size: 7pt;
      color: #94a3b8;
      text-transform: uppercase;
      margin-bottom: 4px;
      font-weight: 700;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 1px 4px;
      border-radius: 4px;
    }

    .code-block code {
      background: transparent;
      color: inherit;
      padding: 0;
    }

    /* Chain of Thought */
    .thinking-block {
      background: #fdf4ff;
      border: 1px solid #f0abfc;
      border-radius: 6px;
      padding: 8px 12px;
      margin: 8px 0;
      font-size: 9pt;
    }

    .thinking-header {
      font-weight: 700;
      color: #a21caf;
      font-size: 8pt;
      margin-bottom: 4px;
    }

    .thinking-content {
      color: #4a044e;
      font-style: italic;
      white-space: pre-wrap;
    }

    /* Metrics Footer */
    .metrics-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 14px;
      background: #fafafa;
      border-top: 1px solid #f1f5f9;
      font-size: 7.5pt;
      color: #64748b;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* Footer */
    .doc-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      margin-top: 32px;
      text-align: center;
      font-size: 8pt;
      color: #94a3b8;
    }

    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }

    .print-bar {
      position: fixed;
      top: 12px;
      right: 12px;
      background: #0f172a;
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      gap: 8px;
      z-index: 1000;
    }

    .print-btn {
      background: #0284c7;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      font-weight: 600;
      font-size: 9pt;
      cursor: pointer;
    }

    .print-btn:hover {
      background: #0369a1;
    }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="doc-header">
    <div class="doc-brand">
      <span class="brand-title">LocalLLMMind</span>
      <span class="brand-tag">Private Local AI Workstation</span>
    </div>
    <div class="doc-title">${escapeHtml(title)}</div>
    <div class="meta-strip">
      <div class="meta-item"><span class="meta-label">Model:</span> <strong>${escapeHtml(model)}</strong></div>
      <div class="meta-item"><span class="meta-label">Date:</span> ${escapeHtml(dateStr)} ${escapeHtml(timeStr)}</div>
      <div class="meta-item"><span class="meta-label">Messages:</span> ${messages.length}</div>
    </div>
  </div>

  <div class="conversation-container">
    ${messages
      .map((m, i) => {
        const isUser = m.role === 'user';
        const roleClass = isUser ? 'user-turn' : 'assistant-turn';
        const roleLabel = isUser ? '👤 You' : `🤖 Assistant (${escapeHtml(m.model || model)})`;

        let metricsHtml = '';
        if (m.metrics) {
          const tokPerSec = m.metrics.tokPerSec ? `⚡ ${m.metrics.tokPerSec} tok/s` : '';
          const count = m.metrics.evalCount ? ` · ${m.metrics.evalCount} tokens` : '';
          const duration = m.metrics.duration ? ` (${m.metrics.duration}s)` : '';
          if (tokPerSec || count) {
            metricsHtml = `<div class="metrics-bar">${tokPerSec}${count}${duration}</div>`;
          }
        }

        return `
        <div class="message-turn ${roleClass}">
          <div class="turn-header">
            <span>${roleLabel}</span>
            <span style="color:#94a3b8; font-weight:normal;">#${i + 1}</span>
          </div>
          <div class="turn-body">
            ${formatMessageContent(m.content)}
          </div>
          ${metricsHtml}
        </div>`;
      })
      .join('\n')}
  </div>

  <div class="doc-footer">
    Exported from LocalLLMMind — Production-Grade Local AI Workstation
  </div>

  <script>
    // Automatically trigger print dialog after page styles render
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 250);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
