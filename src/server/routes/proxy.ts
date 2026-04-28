/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import express from 'express';
import { isBlocked } from '../utils/adblocker';
import { logger } from '../logger';

const router = express.Router();

// In-memory download queue
const downloadQueue = new Map<string, any>();

// Enhanced Proxy for Internal Browser
router.all('/proxy', async (req, res) => {
  const targetUrl = (req.query.url || req.body.url) as string;
  if (!targetUrl) {
    return res.status(400).send('URL is required');
  }

  // Socket.io for network activity
  const io = req.app.get('server')?.io;
  const emitActivity = (data: any) => {
    if (io) io.emit('browser:network-activity', { ...data, timestamp: Date.now() });
  };

  // PROTOKOL: Anti-SSRF (Server-Side Request Forgery) Protection
  try {
    const parsedUrl = new URL(targetUrl);
    
    // Check for Master Override Token
    const masterToken = req.headers['x-master-token'] || 
      (req.headers.cookie && req.headers.cookie.includes('master_token=QUANTUM_OVERRIDE_TOKEN_V1') ? 'QUANTUM_OVERRIDE_TOKEN_V1' : null);
    const isMasterOverride = masterToken === 'QUANTUM_OVERRIDE_TOKEN_V1';

    // 1. Block non-HTTP protocols (e.g., file://, ftp://, gopher://)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(403).send('Blocked: Invalid protocol');
    }

    // Bypass localhost/private IP blocks if Master Override is active
    if (!isMasterOverride) {
      // 2. Block localhost and loopback addresses
      const hostname = parsedUrl.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.endsWith('.localhost')
      ) {
        return res.status(403).send('Blocked: Internal network access denied');
      }

      // 3. Block AWS/GCP Metadata IP and Private IP ranges
      const isPrivateIP = (ip: string) => {
        const parts = ip.split('.');
        if (parts.length !== 4) return false;
        const [a, b] = parts.map(Number);
        return (
          a === 10 || // 10.0.0.0/8
          (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
          (a === 192 && b === 168) || // 192.168.0.0/16
          (a === 169 && b === 254) // 169.254.0.0/16 (Cloud Metadata)
        );
      };

      if (isPrivateIP(hostname)) {
        return res.status(403).send('Blocked: Private IP access denied');
      }
    } else {
      console.warn(`[MASTER OVERRIDE] Bypassing SSRF protection for: ${targetUrl}`);
    }
  } catch (e) {
    return res.status(400).send('Invalid URL format');
  }

  if (isBlocked(targetUrl)) {
    return res.status(403).send('Blocked by Quantum Shield');
  }

  try {
    const method = req.method;
    const headers: any = {};
    
    // Copy relevant headers from the original request
    const skipHeaders = ['host', 'origin', 'referer', 'connection', 'content-length', 'cookie', 'user-agent', 'x-forwarded-for', 'x-real-ip'];
    Object.keys(req.headers).forEach(key => {
      if (!skipHeaders.includes(key.toLowerCase())) {
        headers[key] = req.headers[key];
      }
    });

    // Set a randomized User-Agent to prevent fingerprinting
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    ];
    headers['User-Agent'] = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    // Forward cookies if present
    if (req.headers.cookie) {
      headers['Cookie'] = req.headers.cookie;
    }

    const fetchOptions: any = {
      method,
      headers,
      redirect: 'follow',
    };

    // Handle request body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (Buffer.isBuffer(req.body)) {
        fetchOptions.body = req.body;
      } else if (typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        // If it was parsed as JSON or URL-encoded
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          fetchOptions.body = JSON.stringify(req.body);
        } else {
          // Fallback to form-urlencoded
          const params = new URLSearchParams();
          for (const key in req.body) {
            params.append(key, req.body[key]);
          }
          fetchOptions.body = params.toString();
        }
      }
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || '';
    const contentDisposition = response.headers.get('content-disposition') || '';
    const contentLength = response.headers.get('content-length');

    // Emit network activity
    emitActivity({
      url: targetUrl,
      method: method,
      status: response.status,
      contentType: contentType,
      size: contentLength ? parseInt(contentLength) : 0
    });

    // Check for downloads
    const isDownload = contentDisposition.includes('attachment') || 
                       /application\/(octet-stream|zip|pdf|x-zip-compressed|x-rar-compressed)/.test(contentType);

    if (isDownload) {
      const downloadId = Math.random().toString(36).substring(7);
      const filename = contentDisposition.split('filename=')[1]?.replace(/["']/g, '') || targetUrl.split('/').pop() || 'download';
      
      downloadQueue.set(downloadId, {
        id: downloadId,
        url: targetUrl,
        filename,
        contentType,
        size: contentLength,
        status: 'starting',
        timestamp: Date.now()
      });

      if (io) io.emit('browser:download-started', downloadQueue.get(downloadId));

      res.setHeader('Content-Disposition', contentDisposition || `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);

      if (response.body) {
        const reader = response.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
        } finally {
          downloadQueue.get(downloadId).status = 'completed';
          res.end();
        }
      } else {
        res.end();
      }
      return;
    }

    // Strip restrictive headers from target response BEFORE sending
    const forbiddenHeaders = [
      'x-frame-options',
      'content-security-policy',
      'content-security-policy-report-only',
      'frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'strict-transport-security'
    ];

    // Forward key headers, but filter sensitive ones and forbidden ones
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!forbiddenHeaders.includes(lowerKey) && !['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(lowerKey)) {
        res.setHeader(key, value);
      }
    });

    // Explicitly set X-Frame-Options to allow
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    
    if (contentType.includes('text/html')) {
      let html = await response.text();
      
      // Remove meta-tag based CSP and Frame-Options
      html = html.replace(/<meta[^>]*http-equiv=["']?(Content-Security-Policy|X-Frame-Options|Frame-Options)["']?[^>]*>/gi, '');
      html = html.replace(/<meta[^>]*name=["']?(Content-Security-Policy|X-Frame-Options|Frame-Options)["']?[^>]*>/gi, '');
      
      // Robust URL Rewriter
      const rewriteUrl = (url: string) => {
          if (!url || url.startsWith('data:') || url.startsWith('#') || url.startsWith('javascript:')) return url;
          try {
              // Handle absolute URLs
              if (url.startsWith('//')) url = 'https:' + url;
              const absolute = new URL(url, targetUrl).href;
              return `/api/proxy?url=${encodeURIComponent(absolute)}`;
          } catch (e) {
              return url;
          }
      };

      // Use a more robust approach to replace URLs in HTML
      // This is still regex-based but handles more cases
      html = html.replace(/(src|href|action|data|srcset)=["']([^"']+)["']/g, (match, attr, url) => {
          if (attr === 'srcset') {
              // Handle srcset: "url1 1x, url2 2x"
              const parts = url.split(',').map((part: string) => {
                  const [u, d] = part.trim().split(' ');
                  return `${rewriteUrl(u)}${d ? ' ' + d : ''}`;
              });
              return `${attr}="${parts.join(', ')}"`;
          }
          return `${attr}="${rewriteUrl(url)}"`;
      });
      
      // Handle CSS url()
      html = html.replace(/url\(["']?([^"')]+)["']?\)/g, (match, url) => {
          return `url("${rewriteUrl(url)}")`;
      });
      
      // Inject Navigation Script, Cookie Bridge, Console & Network Interceptor
      const script = `
        <script>
          (function() {
            // Ham Internal Browser Bridge
            window.__PROXY_BASE__ = '/api/proxy?url=';
            window.__ORIGIN_URL__ = "${targetUrl}";
            
            // --- FINGERPRINT SPOOFER (ANTI-BOT) ---
            try {
              Object.defineProperty(navigator, 'webdriver', { get: () => false });
              Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
              Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
              
              // Spoof WebGL Vendor
              const getParameter = WebGLRenderingContext.prototype.getParameter;
              WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) return 'Intel Inc.';
                if (parameter === 37446) return 'Intel Iris OpenGL Engine';
                return getParameter.apply(this, arguments);
              };
              
              // Spoof User-Agent
              Object.defineProperty(navigator, 'userAgent', {
                get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
              });
            } catch (e) { console.warn('Fingerprint spoofing partially failed', e); }
            // --------------------------------------

            // Intercept Console
            ['log', 'warn', 'error', 'info'].forEach(level => {
              const original = console[level];
              console[level] = function(...args) {
                window.parent.postMessage({ type: 'CONSOLE_LOG', level, message: args.join(' ') }, '*');
                original.apply(console, args);
              };
            });

            // Intercept Fetch
            const originalFetch = window.fetch;
            window.fetch = async function(input, init) {
              const url = typeof input === 'string' ? input : input.url;
              const startTime = Date.now();
              const response = await originalFetch(input, init);
              window.parent.postMessage({ 
                type: 'NETWORK_REQUEST', 
                url, 
                method: init?.method || 'GET', 
                status: response.status, 
                duration: Date.now() - startTime 
              }, '*');
              return response;
            };

            // Override window.open
            const originalOpen = window.open;
            window.open = function(url, target) {
                if (url) {
                    try {
                        const absolute = new URL(url, window.__ORIGIN_URL__).href;
                        const proxied = window.__PROXY_BASE__ + encodeURIComponent(absolute);
                        return originalOpen(proxied, target);
                    } catch (e) {}
                }
                return originalOpen(url, target);
            };

            // Handle forms to use proxy
            document.addEventListener('submit', function(e) {
                const form = e.target;
                if (form.tagName === 'FORM') {
                    const action = form.getAttribute('action');
                    if (action && !action.startsWith('/api/proxy')) {
                        try {
                            const absolute = new URL(action, window.__ORIGIN_URL__).href;
                            form.setAttribute('action', window.__PROXY_BASE__ + encodeURIComponent(absolute));
                        } catch (e) {}
                    }
                }
            }, true);

            // Intercept XMLHttpRequest
            const originalOpenXHR = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
                const startTime = Date.now();
                this.addEventListener('load', () => {
                    window.parent.postMessage({ 
                        type: 'NETWORK_REQUEST', 
                        url, 
                        method, 
                        status: this.status, 
                        duration: Date.now() - startTime 
                    }, '*');
                });
                try {
                    const absolute = new URL(url, window.__ORIGIN_URL__).href;
                    const proxied = window.__PROXY_BASE__ + encodeURIComponent(absolute);
                    return originalOpenXHR.apply(this, [method, proxied, ...Array.from(arguments).slice(2)]);
                } catch (e) {
                    return originalOpenXHR.apply(this, arguments);
                }
            };

            // AI Pilot / Jokey Command Listener
            window.addEventListener('message', function(event) {
                if (event.data && event.data.type === 'INJECT_SCRIPT') {
                    try {
                        const scriptEl = document.createElement('script');
                        const scriptId = 'injected_script_' + Date.now();
                        scriptEl.id = scriptId;
                        
                        // Wrap the script to capture the result and post it back
                        scriptEl.textContent = \`
                          try {
                            const result = (function() { \${event.data.script} })();
                            window.parent.postMessage({ type: 'INJECT_RESULT', result: String(result), id: '\${scriptId}' }, '*');
                          } catch (e) {
                            window.parent.postMessage({ type: 'INJECT_RESULT', error: e.message, id: '\${scriptId}' }, '*');
                          }
                        \`;
                        
                        document.body.appendChild(scriptEl);
                        
                        // Clean up the script element after execution
                        setTimeout(() => {
                          const el = document.getElementById(scriptId);
                          if (el) el.remove();
                        }, 100);
                    } catch (e) {
                        window.parent.postMessage({ type: 'INJECT_RESULT', error: e.message }, '*');
                    }
                } else if (event.data && event.data.type === 'PILOT_INTERACT') {
                    try {
                        const { action, selector, value } = event.data.payload;
                        const el = document.querySelector(selector);
                        if (el) {
                            if (action === 'click') el.click();
                            else if (action === 'type') {
                                el.value = value;
                                el.dispatchEvent(new Event('input', { bubbles: true }));
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            window.parent.postMessage({ type: 'INTERACT_RESULT', success: true }, '*');
                        } else {
                            window.parent.postMessage({ type: 'INTERACT_RESULT', success: false, error: 'Element not found' }, '*');
                        }
                    } catch (e) {
                        window.parent.postMessage({ type: 'INTERACT_RESULT', success: false, error: e.message }, '*');
                    }
                }
            });
          })();
        </script>
      `;
      
      // Inject at the end of body or html
      if (html.includes('</body>')) {
          html = html.replace('</body>', script + '</body>');
      } else if (html.includes('</head>')) {
          html = html.replace('</head>', script + '</head>');
      } else {
          html += script;
      }
      
      res.send(html);
    } else {
      // Stream Binary/Text content
      if (response.body) {
        const reader = response.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
        } catch (err) {
          logger.error({ err, url: targetUrl }, 'Error streaming proxy response');
        } finally {
          res.end();
        }
      } else {
        res.end();
      }
    }
  } catch (error: any) {
    logger.error({ err: error, url: targetUrl }, 'Proxy Error');
    
    // Check if client expects JSON
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.status(500).json({ error: 'Proxy Error', message: error.message });
    } else {
      res.status(500).send(`
        <div style="padding: 20px; font-family: sans-serif; background: #1a1a1a; color: #ff4444; border-radius: 8px; border: 1px solid #333; text-align: center;">
            <h3 style="margin-top: 0; color: #00ffcc;">Quantum Shield: Akses Terbatas</h3>
            <p>Situs <strong>${targetUrl}</strong> membatasi akses melalui terowongan quantum kami.</p>
            <p style="color: #888; font-size: 12px; font-family: monospace;">Error: ${error.message}</p>
            <div style="margin: 20px 0; display: flex; gap: 10px; justify-content: center;">
                <button onclick="location.reload()" style="background: #333; color: #fff; border: 1px solid #444; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Coba Lagi</button>
                <button onclick="window.open('${targetUrl}', '_blank')" style="background: #00ffcc; color: #000; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">Buka di Tab Baru</button>
            </div>
            <p style="color: #666; font-size: 11px;">Beberapa situs besar (seperti Facebook/Google) memiliki keamanan ketat yang mungkin memerlukan pemuatan langsung.</p>
        </div>
      `);
    }
  }
});

router.get('/downloads', (req, res) => {
  res.json(Array.from(downloadQueue.values()));
});

router.delete('/downloads/:id', (req, res) => {
  const { id } = req.params;
  downloadQueue.delete(id);
  res.json({ success: true });
});

export default router;
