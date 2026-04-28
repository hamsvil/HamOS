
import { LicenseConfig } from '../src/types';
import { androidTemplates } from './generator/android';
import { cssTemplate } from './generator/styles';
import { dataTemplate } from './generator/data';
import { componentsTemplate } from './generator/components';
import { viewsTemplate } from './generator/views'; // NEW IMPORT
import { appLogicTemplate } from './generator/appLogic';

export const projectGenerator = {
  getManifest: androidTemplates.getManifest,
  getLayoutXml: androidTemplates.getLayoutXml,
  getJavaActivity: androidTemplates.getJavaActivity,
  getVpnService: androidTemplates.getVpnService,
  getCoreCss: () => cssTemplate,

  getCoreJs: (lic?: LicenseConfig) => `
    ${dataTemplate}
    ${componentsTemplate}
    ${viewsTemplate}
    ${appLogicTemplate}
  `,

  getOfflineHtml(): string {
    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>HAM Tunnel Pro</title>
    
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>

    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
    
    <style>
        ${cssTemplate}
    </style>

    <script>
        window.onerror = function(msg, url, line) {
            document.body.innerHTML = '<div style="color:red; padding:20px; font-family:monospace;"><h3>CRITICAL ERROR</h3>' + msg + '<br>Line: ' + line + '</div>';
            if(window.AndroidBridge) window.AndroidBridge.toast("JS Error: " + msg);
        };
    </script>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        // 1. Data & Icons
        ${dataTemplate}

        // 2. UI Components (Header, Sidebar, Footer)
        ${componentsTemplate}

        // 3. Page Views (Dashboard, Settings, etc)
        ${viewsTemplate}

        // 4. Main App Logic & Render
        ${appLogicTemplate}
    </script>
</body>
</html>`;
  }
};
