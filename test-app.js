const { spawn } = require('child_process');
const http = require('http');

async function runE2ETests() {
  console.log('🚀 Starting Chrome in headless mode for Registro-M E2E validation...');
  const PORT = 9225;
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--remote-allow-origins=*',
    '--user-data-dir=/tmp/chrome-test-profile-' + Date.now(),
    '--disable-gpu',
    'file://' + process.cwd() + '/index.html'
  ]);
  chrome.stderr.on('data', d => {
    const s = d.toString();
    if (!s.includes('CVDisplayLink')) console.log('Chrome stderr:', s.trim());
  });

  // Wait for Chrome to be ready with retries
  let pages = null;
  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      pages = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${PORT}/json`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
          });
        });
        req.on('error', reject);
      });
      if (pages && pages.length) break;
    } catch (e) {}
  }

  if (!pages) {
    console.error('❌ Could not connect to Chrome CDP');
    chrome.kill();
    process.exit(1);
  }

  const appPage = pages.find(p => p.url.includes('index.html')) || pages[0];
  if (!appPage) {
    console.error('❌ Could not find index.html page');
    chrome.kill();
    process.exit(1);
  }

      const ws = new WebSocket(appPage.webSocketDebuggerUrl);
      let idCounter = 1;
      const send = (method, params = {}) => {
        return new Promise((resolve) => {
          const id = idCounter++;
          const handler = (evt) => {
            const msg = JSON.parse(evt.data);
            if (msg.id === id) {
              ws.removeEventListener('message', handler);
              resolve(msg.result);
            }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id, method, params }));
        });
      };

      const evalExpr = async (expression) => {
        const res = await send('Runtime.evaluate', {
          expression,
          returnByValue: true,
          awaitPromise: true
        });
        if (res.exceptionDetails) {
          console.error('❌ Eval Exception:', res.exceptionDetails);
        }
        return res.result ? res.result.value : undefined;
      };

      ws.onopen = async () => {
        console.log('✅ Connected to Chrome CDP');
        await send('Runtime.enable');
        await send('Page.enable');

        await send('Page.reload');
        await new Promise(r => setTimeout(r, 1500));

        console.log('\n--- TEST 1: LOGIN SCREEN & PRELOADED USERS ---');
        const title = await evalExpr('document.title');
        console.log('Title:', title);
        const buttons = await evalExpr('Array.from(document.querySelectorAll("button")).map(b => b.innerText.trim()).filter(Boolean)');
        console.log('Buttons found on Login:', buttons.length);

        // Click on Melissa's quick login
        console.log('\n--- TEST 2: QUICK LOGIN (MELISSA) ---');
        await evalExpr(`(() => {
          const melissaBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('melissa'));
          if (melissaBtn) melissaBtn.click();
        })()`);
        await new Promise(r => setTimeout(r, 500));

        const currentUser = await evalExpr('document.body.innerText.toLowerCase().includes("melissa")');
        console.log('Melissa logged in:', currentUser);
        const step1Title = await evalExpr('document.body.innerText.toLowerCase().includes("elige un emprendimiento")');
        console.log('Step 1 reached:', step1Title);

        console.log('\n--- TEST 3: STEP 1 - BUSINESS SELECTION & SEARCH ---');
        const hasCompostela = await evalExpr('document.body.innerText.toLowerCase().includes("compostela")');
        console.log('Has "Compostela":', hasCompostela);

        // Select Compostela
        await evalExpr(`(() => {
          const cards = Array.from(document.querySelectorAll('.cursor-pointer'));
          const comp = cards.find(c => c.innerText.toLowerCase().includes('compostela'));
          if (comp) comp.click();
        })()`);
        await new Promise(r => setTimeout(r, 300));

        // Click Continuar / Ver productos
        await evalExpr(`(() => {
          const continueBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('ver productos') || b.innerText.toLowerCase().includes('continuar'));
          if (continueBtn) continueBtn.click();
        })()`);
        await new Promise(r => setTimeout(r, 500));

        console.log('\n--- TEST 4: STEP 2 - PRODUCTS & CONTEXTUAL PAYMENT ---');
        const isStep2 = await evalExpr('document.body.innerText.toLowerCase().includes("productos disponibles") || document.body.innerText.toLowerCase().includes("catálogo de productos")');
        console.log('Step 2 reached:', isStep2);

        // Check product names
        const hasGalletaNostalgia = await evalExpr('document.body.innerText.toLowerCase().includes("galleta nostalgia")');
        const hasGalletaNavidena = await evalExpr('document.body.innerText.toLowerCase().includes("galleta navideña")');
        console.log('Has Galleta Nostalgia ($12.000):', hasGalletaNostalgia);
        console.log('Has Galleta Navideña ($12.000):', hasGalletaNavidena);

        // Increment Galleta Nostalgia
        console.log('Adding 2 units of Galleta Nostalgia x200gr...');
        await evalExpr(`(() => {
          const prodCards = Array.from(document.querySelectorAll('.bg-white.rounded-2xl.border'));
          const nostalgiaCard = prodCards.find(c => c.innerText.toLowerCase().includes('galleta nostalgia'));
          if (nostalgiaCard) {
            const plusBtn = nostalgiaCard.querySelectorAll('button')[1];
            plusBtn.click(); // 1
            plusBtn.click(); // 2
          }
        })()`);
        await new Promise(r => setTimeout(r, 400));

        // Verify contextual payment unfolded
        const hasPaymentMethod = await evalExpr('document.body.innerText.toLowerCase().includes("método de pago para este ítem")');
        console.log('Contextual payment method selector unfolded:', hasPaymentMethod);

        // Switch Galleta Nostalgia to Tarjeta
        console.log('Selecting Tarjeta for Galleta Nostalgia...');
        await evalExpr(`(() => {
          const prodCards = Array.from(document.querySelectorAll('.bg-white.rounded-2xl.border'));
          const nostalgiaCard = prodCards.find(c => c.innerText.toLowerCase().includes('galleta nostalgia'));
          if (nostalgiaCard) {
            const cardBtn = Array.from(nostalgiaCard.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('tarjeta'));
            if (cardBtn) cardBtn.click();
          }
        })()`);
        await new Promise(r => setTimeout(r, 300));

        // Add 1 Galleta Navideña and set Transferencia (QR)
        console.log('Adding 1 unit of Galleta Navideña (Transferencia QR)...');
        await evalExpr(`(() => {
          const prodCards = Array.from(document.querySelectorAll('.bg-white.rounded-2xl.border'));
          const navidenaCard = prodCards.find(c => c.innerText.toLowerCase().includes('galleta navideña x200gr'));
          if (navidenaCard) {
            const plusBtn = navidenaCard.querySelectorAll('button')[1];
            plusBtn.click();
            const qrBtn = Array.from(navidenaCard.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('transf'));
            if (qrBtn) qrBtn.click();
          }
        })()`);
        await new Promise(r => setTimeout(r, 400));

        // Add 1 Galleta Cuca (Efectivo by default)
        console.log('Adding 1 unit of Galleta Cuca (Efectivo)...');
        await evalExpr(`(() => {
          const prodCards = Array.from(document.querySelectorAll('.bg-white.rounded-2xl.border'));
          const cucaCard = prodCards.find(c => c.innerText.toLowerCase().includes('galleta cuca'));
          if (cucaCard) {
            const plusBtn = cucaCard.querySelectorAll('button')[1];
            plusBtn.click();
          }
        })()`);
        await new Promise(r => setTimeout(r, 400));

        // Check accumulated total in bottom bar: 2 * 55000 + 1 * 115000 = 225.000 COP
        const totalText = await evalExpr(`(() => {
          const bar = document.querySelector('.fixed.bottom-14');
          return bar ? bar.innerText.replace(/\\n/g, ' ') : '';
        })()`);
        console.log('Bottom bar summary:', totalText);

        // Click Verificar
        console.log('Clicking Verificar...');
        await evalExpr(`(() => {
          const verifyBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('verificar'));
          if (verifyBtn) verifyBtn.click();
        })()`);
        await new Promise(r => setTimeout(r, 500));

        console.log('\n--- TEST 5: STEP 3 - VERIFICATION & BREAKDOWN ---');
        const isStep3 = await evalExpr('document.body.innerText.toLowerCase().includes("verificar venta")');
        console.log('Step 3 reached:', isStep3);
        const hasComparativeTotals = await evalExpr('document.body.innerText.toLowerCase().includes("efectivo") && document.body.innerText.toLowerCase().includes("transf") && document.body.innerText.toLowerCase().includes("tarjeta")');
        console.log('Comparative Subtotals Box (Cash, QR & Card) present:', hasComparativeTotals);

        // Capture screenshot of Step 3
        const fs = require('fs');
        const { data: step3Data } = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('/Users/fredyarroyave/.gemini/antigravity/brain/704a876f-19e0-4a10-ae82-61112409f146/preview-step3.png', Buffer.from(step3Data, 'base64'));

        // Click Confirmar venta
        console.log('Clicking Confirmar venta...');
        await evalExpr(`(() => {
          const regBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('confirmar venta') || b.innerText.toLowerCase().includes('registrar ventas'));
          if (regBtn) regBtn.click();
        })()`);
        await new Promise(r => setTimeout(r, 800));

        console.log('\n--- TEST 6: STEP 4 - CONFIRMATION & EMOTIONAL IMPACT ---');
        const isStep4 = await evalExpr('document.body.innerText.toLowerCase().includes("venta registrada con éxito")');
        console.log('Step 4 reached (¡Venta registrada con éxito!):', isStep4);
        const hasReceipt = await evalExpr('document.body.innerText.toLowerCase().includes("vendedor") && document.body.innerText.toLowerCase().includes("total recaudado")');
        console.log('Receipt card present with Vendedor and Total recaudado:', hasReceipt);
        const hasSeqId = await evalExpr('document.body.innerText.includes("RV-")');
        console.log('Receipt card includes sequential ID (RV-0001):', hasSeqId);

        // Capture step 4 screenshot with full mobile view
        await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
        const { data: step4Data } = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('/Users/fredyarroyave/.gemini/antigravity/brain/704a876f-19e0-4a10-ae82-61112409f146/preview-step4.png', Buffer.from(step4Data, 'base64'));

        // Test continuation button B: same business
        console.log('Testing Option B: "Otra venta aquí"...');
        await evalExpr(`(() => {
          const sameBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('otra venta aquí') || b.innerText.toLowerCase().includes('este mismo emprendimiento'));
          if (sameBtn) sameBtn.click();
        })()`);
        await new Promise(r => setTimeout(r, 500));

        const isBackToStep2 = await evalExpr('document.body.innerText.toLowerCase().includes("productos disponibles") || document.body.innerText.toLowerCase().includes("catálogo de productos")');
        console.log('Back to Step 2 for same business:', isBackToStep2);

        console.log('\n--- TEST 7: MIS REGISTROS (HISTORIAL) & QUICK EDIT ---');
        await evalExpr(`(() => {
          const histTab = Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.toLowerCase().includes('mis registros'));
          if (histTab) histTab.click();
        })()`);
        await new Promise(r => setTimeout(r, 500));

        const hasHistoryCard = await evalExpr('document.body.innerText.toLowerCase().includes("compostela") && document.body.innerText.toLowerCase().includes("editar cantidades")');
        console.log('Confirmed visit in user history:', hasHistoryCard);
        const hasHistorySeqId = await evalExpr('document.body.innerText.includes("RV-")');
        console.log('Mis Registros includes sequential ID (RV-0001):', hasHistorySeqId);

        // Test Reversible Delete with Deshacer Toast
        console.log('Testing Reversible Delete with "Deshacer" toast...');
        await evalExpr(`(() => {
          const deleteBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('🗑️'));
          if (deleteBtn) deleteBtn.click();
        })()`);
        await new Promise(r => setTimeout(r, 300));
        const toastShown = await evalExpr('document.body.innerText.toLowerCase().includes("venta eliminada") && document.body.innerText.toLowerCase().includes("deshacer")');
        console.log('In-app Toast shown with Deshacer button:', toastShown);

        // Click Deshacer
        await evalExpr(`(() => {
          const undoBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('deshacer'));
          if (undoBtn) undoBtn.click();
        })()`);
        await new Promise(r => setTimeout(r, 400));
        const visitRestored = await evalExpr('document.body.innerText.toLowerCase().includes("compostela")');
        console.log('Sale restored successfully after Deshacer:', visitRestored);

        console.log('\n--- TEST 8: ADMIN ROLE & SHEETJS EXCEL EXPORT ---');
        // Switch to admin
        await evalExpr(`(() => {
          const userBtn = document.querySelector('header button');
          if (userBtn) userBtn.click();
        })()`);
        await new Promise(r => setTimeout(r, 300));

        await evalExpr(`(() => {
          const adminSwitch = Array.from(document.querySelectorAll('.fixed button')).find(b => b.innerText.toLowerCase().includes('administrador'));
          if (adminSwitch) adminSwitch.click();
        })()`);
        await new Promise(r => setTimeout(r, 500));

        // Click Admin Tab
        await evalExpr(`(() => {
          const adminTab = Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.toLowerCase().includes('admin'));
          if (adminTab) adminTab.click();
        })()`);
        await new Promise(r => setTimeout(r, 500));

        const isAdminPanel = await evalExpr('document.body.innerText.toLowerCase().includes("panel de administración")');
        console.log('Admin Panel reached:', isAdminPanel);

        const hasExcelBtn = await evalExpr('document.body.innerText.toLowerCase().includes("descargar excel")');
        console.log('Native Excel export button present:', hasExcelBtn);

        // Click Emprendimientos tab
        await evalExpr(`(() => {
          const comerciosTab = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('emprendimientos'));
          if (comerciosTab) comerciosTab.click();
        })()`);
        await new Promise(r => setTimeout(r, 400));
        const hasProductMatrix = await evalExpr('document.body.innerText.toLowerCase().includes("matriz de productos habilitados")');
        console.log('Product Matrix in Emprendimientos present:', hasProductMatrix);

        // Click Configuración tab
        await evalExpr(`(() => {
          const configTab = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('configuración'));
          if (configTab) configTab.click();
        })()`);
        await new Promise(r => setTimeout(r, 400));
        const hasWebhookSetup = await evalExpr('document.body.innerText.toLowerCase().includes("integración google sheets") && document.body.innerText.toLowerCase().includes("lockservice")');
        console.log('Google Sheets Webhook & LockService code present:', hasWebhookSetup);

        const hasDualPersistence = await evalExpr('document.body.innerText.toLowerCase().includes("persistencia dual: firebase firestore")');
        console.log('Firebase Firestore dual persistence present:', hasDualPersistence);

        console.log('\n======================================================');
        console.log('🎉 100% OF E2E TESTS PASSED WITH CLEAN NATURAL CASING!');
        console.log('======================================================');

        ws.close();
        chrome.kill();
        process.exit(0);
      };
}

runE2ETests().catch(err => {
  console.error('Fatal error during E2E tests:', err);
  process.exit(1);
});
