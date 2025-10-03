// Application State
let dsaKeyPair = null;
let currentDocument = null;
let currentSignature = null;

// Theme Management
function initTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = prefersDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-color-scheme', theme);
  updateThemeToggle(theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-color-scheme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-color-scheme', newTheme);
  updateThemeToggle(newTheme);
}

function updateThemeToggle(theme) {
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

// Navigation System
function initNavigation() {
  const navLinks = document.querySelectorAll('[data-section-link]');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetSection = this.getAttribute('href').substring(1);
      showSection(targetSection);
      navLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');
    });
  });
  showSection('home');
  if (navLinks.length > 0) {
    navLinks[0].classList.add('active');
  }
}

function showSection(sectionId) {
  const sections = document.querySelectorAll('.app-section');
  sections.forEach(section => {
    if (section.id === sectionId) {
      section.classList.remove('hidden');
    } else {
      section.classList.add('hidden');
    }
  });
}

// Key Generation (with fallback to RSA for compatibility)
async function generateDSAKeys() {
  const generateBtn = document.getElementById('generateKeysBtn');
  const keyOutput = document.getElementById('keyOutput');
  const techDetails = document.getElementById('keyTech');
  if (!generateBtn || !keyOutput) return;
  generateBtn.disabled = true;
  generateBtn.classList.add('loading');
  try {
    let keyPair;
    let keyType = 'DSA';
    try {
      keyPair = await KEYUTIL.generateKeypair('DSA', 2048);
    } catch (dsaError) {
      console.warn('DSA generation failed, falling back to RSA:', dsaError);
      keyType = 'RSA';
      keyPair = await KEYUTIL.generateKeypair('RSA', 2048);
    }
    dsaKeyPair = keyPair;
    if (keyType === 'DSA') {
      const privateKey = keyPair.prvKeyObj;
      const publicKey = keyPair.pubKeyObj;
      keyOutput.innerHTML = `
        <div class="key-pair">
          <span class="key-label">Private Key (x):</span>
          <div class="key-value">${privateKey.x.toString(16)}</div>
        </div>
        <div class="key-pair">
          <span class="key-label">Public Key (y):</span>
          <div class="key-value">${publicKey.y.toString(16)}</div>
        </div>
        <div class="key-pair">
          <span class="key-label">Parameter p:</span>
          <div class="key-value">${publicKey.p.toString(16)}</div>
        </div>
        <div class="key-pair">
          <span class="key-label">Parameter q:</span>
          <div class="key-value">${publicKey.q.toString(16)}</div>
        </div>
        <div class="key-pair">
          <span class="key-label">Parameter g:</span>
          <div class="key-value">${publicKey.g.toString(16)}</div>
        </div>
      `;
      techDetails.textContent = `DSA Key Generation Complete
Key Size: 2048 bits
Algorithm: Digital Signature Algorithm (DSA)
Hash: SHA-256
Standard: FIPS 186-4

Private key (x) length: ${privateKey.x.toString(16).length * 4} bits
Public key (y) length: ${publicKey.y.toString(16).length * 4} bits
Parameter p length: ${publicKey.p.toString(16).length * 4} bits
Parameter q length: ${publicKey.q.toString(16).length * 4} bits
Parameter g length: ${publicKey.g.toString(16).length * 4} bits`;
    } else {
      const privateKey = keyPair.prvKeyObj;
      const publicKey = keyPair.pubKeyObj;
      keyOutput.innerHTML = `
        <div class="key-pair">
          <span class="key-label">Private Key (d):</span>
          <div class="key-value">${privateKey.d.toString(16)}</div>
        </div>
        <div class="key-pair">
          <span class="key-label">Public Key (n):</span>
          <div class="key-value">${publicKey.n.toString(16)}</div>
        </div>
        <div class="key-pair">
          <span class="key-label">Public Exponent (e):</span>
          <div class="key-value">${publicKey.e.toString(16)}</div>
        </div>
      `;
      techDetails.textContent = `RSA Key Generation Complete (DSA fallback)
Key Size: 2048 bits
Algorithm: RSA (used for compatibility)
Hash: SHA-256

Private key (d) length: ${privateKey.d.toString(16).length * 4} bits
Public key (n) length: ${publicKey.n.toString(16).length * 4} bits
Public exponent (e): ${publicKey.e.toString(16)}

Note: Using RSA for better browser compatibility.`;
    }
    const downloadPrivateBtn = document.getElementById('downloadPrivateBtn');
    const downloadPublicBtn = document.getElementById('downloadPublicBtn');
    if (downloadPrivateBtn) downloadPrivateBtn.disabled = false;
    if (downloadPublicBtn) downloadPublicBtn.disabled = false;
    showMessage('Key pair generated successfully!', 'success');
  } catch (error) {
    console.error('Key generation failed:', error);
    showMessage('Key generation failed: ' + error.message, 'error');
  } finally {
    generateBtn.disabled = false;
    generateBtn.classList.remove('loading');
  }
}

// File Upload Handler
function handleFileUpload(file) {
  const fileName = document.getElementById('fileName');
  const hashOutput = document.getElementById('hashOutput');
  const signBtn = document.getElementById('signBtn');
  const signTech = document.getElementById('signTech');
  if (fileName) {
    fileName.textContent = file.name;
    fileName.classList.add('has-file');
  }
  const reader = new FileReader();
  reader.onload = async function(e) {
    let content = e.target.result;
    currentDocument = {
      name: file.name,
      type: file.type,
      content: content,
      size: file.size
    };
    let hash;
    if (typeof content === 'string') {
      hash = await KJUR.crypto.Util.sha256(content);
    } else {
      const uint8Array = new Uint8Array(content);
      const contentStr = Array.from(uint8Array).map(b => String.fromCharCode(b)).join('');
      hash = await KJUR.crypto.Util.sha256(contentStr);
      currentDocument.contentStr = contentStr;
    }
    currentDocument.hash = hash;
    if (hashOutput) {
      hashOutput.innerHTML = `<strong>Document Hash (SHA-256):</strong><br>${hash}`;
    }
    if (signBtn && dsaKeyPair && dsaKeyPair.prvKeyObj) {
      signBtn.disabled = false;
    }
    if (signTech) {
      signTech.textContent = `Document Information:
Name: ${file.name}
Type: ${file.type}
Size: ${file.size} bytes
Hash Algorithm: SHA-256
Hash: ${hash}

Ready for digital signature.`;
    }
  };
  if (file.type.startsWith('text/')) {
    reader.readAsText(file);
  } else {
    reader.readAsArrayBuffer(file);
  }
}

// Document Signing
async function signDocument() {
  if (!currentDocument || !dsaKeyPair || !dsaKeyPair.prvKeyObj) {
    showMessage('Document and private key required for signing', 'error');
    return;
  }
  const signBtn = document.getElementById('signBtn');
  const signatureOutput = document.getElementById('signatureOutput');
  const signTech = document.getElementById('signTech');
  if (signBtn) {
    signBtn.disabled = true;
    signBtn.classList.add('loading');
  }
  try {
    let algorithm = 'SHA256withRSA';
    let contentToSign = currentDocument.content;
    if (typeof contentToSign !== 'string') {
      contentToSign = currentDocument.contentStr || 
        Array.from(new Uint8Array(contentToSign)).map(b => String.fromCharCode(b)).join('');
    }
    if (dsaKeyPair.prvKeyObj.p && dsaKeyPair.prvKeyObj.q && dsaKeyPair.prvKeyObj.g) {
      algorithm = 'SHA256withDSA';
    }
    const sig = new KJUR.crypto.Signature({alg: algorithm});
    await sig.init(dsaKeyPair.prvKeyObj);
    await sig.updateString(contentToSign);
    const signature = await sig.sign();
    currentSignature = {
      signature: signature,
      algorithm: algorithm.includes('DSA') ? 'DSA-2048' : 'RSA-2048',
      timestamp: new Date().toISOString(),
      documentHash: currentDocument.hash
    };
    if (signatureOutput) {
      signatureOutput.innerHTML = `
        <div class="signature-components">
          <h4>Digital Signature:</h4>
          <div class="signature-component">
            <span class="signature-component-label">Signature:</span>
            <div class="signature-component-value">${signature}</div>
          </div>
          <div class="signature-component">
            <span class="signature-component-label">Algorithm:</span>
            <div class="signature-component-value">${currentSignature.algorithm}</div>
          </div>
          <div class="signature-component">
            <span class="signature-component-label">Timestamp:</span>
            <div class="signature-component-value">${currentSignature.timestamp}</div>
          </div>
        </div>
      `;
    }
    const downloadSignedBtn = document.getElementById('downloadSignedBtn');
    if (downloadSignedBtn) downloadSignedBtn.disabled = false;
    if (signTech) {
      signTech.textContent += `

Signature Generated:
Algorithm: ${algorithm}
Signature: ${signature.substring(0, 64)}...
Timestamp: ${currentSignature.timestamp}

The signature provides:
- Authentication (proves who signed)
- Integrity (detects tampering)  
- Non-repudiation (cannot deny signing)`;
    }
    showMessage('Document signed successfully!', 'success');
  } catch (error) {
    console.error('Signing error:', error);
    showMessage('Signing failed: ' + error.message, 'error');
  } finally {
    if (signBtn) {
      signBtn.disabled = false;
      signBtn.classList.remove('loading');
    }
  }
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// FIXED: Save the public key as PEM, not as jsrsasign's internal object!
function downloadSignedDocument() {
  if (!currentDocument || !currentSignature || !dsaKeyPair) return;
  let contentBase64;
  if (typeof currentDocument.content === 'string') {
    contentBase64 = btoa(currentDocument.content);
  } else {
    const contentStr = currentDocument.contentStr || 
      Array.from(new Uint8Array(currentDocument.content)).map(b => String.fromCharCode(b)).join('');
    contentBase64 = btoa(contentStr);
  }
  // PEM string for public key!
  const pemPubKey = KEYUTIL.getPEM(dsaKeyPair.pubKeyObj);
  const bundle = {
    document: {
      filename: currentDocument.name,
      content: contentBase64,
      contentType: currentDocument.type,
      size: currentDocument.size,
      hash: currentDocument.hash
    },
    signature: {
      signature: currentSignature.signature,
      algorithm: currentSignature.algorithm,
      timestamp: currentSignature.timestamp
    },
    publicKey: {
      type: currentSignature.algorithm.includes('DSA') ? 'DSA' : 'RSA',
      data: pemPubKey
    },
    metadata: {
      version: '1.0',
      created: new Date().toISOString()
    }
  };
  downloadJSON(bundle, `${currentDocument.name}_signed.json`);
}

// Helper: Convert JWK to PEM for jsrsasign compatibility (not needed if using PEM, but kept for reference)
function jwkToPem(jwk) {
  if (jwk && jwk.kty === 'RSA') {
    const pubKeyObj = KEYUTIL.getKey(jwk);
    const pem = KEYUTIL.getPEM(pubKeyObj);
    console.log("PEM GENERATED:", pem);
    return pem;
  }
  throw new Error("Unsupported key type for PEM conversion");
}

// Verification
async function verifySignature(bundle) {
  const verifyResult = document.getElementById('verifyResult');
  const verifyTech = document.getElementById('verifyTech');
  try {
    const documentContent = atob(bundle.document.content);
    const computedHash = await KJUR.crypto.Util.sha256(documentContent);
    const hashValid = computedHash === bundle.document.hash;
    const algorithm = bundle.signature.algorithm.includes('DSA') ? 'SHA256withDSA' : 'SHA256withRSA';
    let pubkeyData = bundle.publicKey.data;
    console.log("publicKey.data:", pubkeyData);
    // Now, publicKey.data should always be PEM!
    if (typeof pubkeyData !== "string" || !pubkeyData.startsWith("-----BEGIN")) {
      throw new Error("Public key is not in PEM format. Your publicKey.data: " + JSON.stringify(pubkeyData));
    }
    console.log("KEY BEING PASSED TO init():", pubkeyData, typeof pubkeyData);
    const sig = new KJUR.crypto.Signature({ alg: algorithm });
    await sig.init(pubkeyData);
    await sig.updateString(documentContent);
    const signatureValid = await sig.verify(bundle.signature.signature);
    const isValid = hashValid && signatureValid;
    if (verifyResult) {
      verifyResult.innerHTML = `
        <div class="verify-result verify-result--${isValid ? 'valid' : 'invalid'}">
          <h3>${isValid ? '✅ Signature Valid' : '❌ Signature Invalid'}</h3>
          <p><strong>Document:</strong> ${bundle.document.filename}</p>
          <p><strong>Signed:</strong> ${new Date(bundle.signature.timestamp).toLocaleString()}</p>
          <p><strong>Algorithm:</strong> ${bundle.signature.algorithm}</p>
          <p><strong>Hash Integrity:</strong> ${hashValid ? 'Valid' : 'Invalid'}</p>
          <p><strong>Signature Verification:</strong> ${signatureValid ? 'Valid' : 'Invalid'}</p>
          ${isValid ? 
            '<p>✓ This document has not been tampered with and was signed by the holder of the private key.</p>' :
            '<p>⚠ This document may have been tampered with or the signature is invalid.</p>'
          }
        </div>
      `;
    }
    if (verifyTech) {
      verifyTech.textContent = `Verification Process:

1. Document Hash Verification:
   Expected: ${bundle.document.hash}
   Computed: ${computedHash}
   Match: ${hashValid}

2. Signature Verification:
   Algorithm: ${algorithm}
   Signature: ${bundle.signature.signature.substring(0, 64)}...
   Valid: ${signatureValid}

Final Result: ${isValid ? 'VALID' : 'INVALID'}

The signature was ${isValid ? 'successfully verified' : 'rejected'}.`;
    }
  } catch (error) {
    console.error('Verification error:', error, error.stack);
    if (verifyResult) {
      verifyResult.innerHTML = `
        <div class="verify-result verify-result--invalid">
          <h3>❌ Verification Error</h3>
          <p>Error verifying signature: ${error && error.message ? error.message : error}</p>
        </div>
      `;
    }
  }
}

function showMessage(message, type) {
  const messageEl = document.createElement('div');
  messageEl.className = `${type}-message`;
  messageEl.textContent = message;
  const activeSection = document.querySelector('.app-section:not(.hidden)');
  if (activeSection) {
    activeSection.insertBefore(messageEl, activeSection.firstChild);
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 5000);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  initTheme();
  initNavigation();
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  const generateKeysBtn = document.getElementById('generateKeysBtn');
  if (generateKeysBtn) {
    generateKeysBtn.addEventListener('click', generateDSAKeys);
  }
  const downloadPrivateBtn = document.getElementById('downloadPrivateBtn');
  if (downloadPrivateBtn) {
    downloadPrivateBtn.addEventListener('click', function() {
      if (dsaKeyPair) {
        const keyData = {
          type: 'PRIVATE_KEY',
          keyPair: dsaKeyPair.prvKeyObj,
          generated: new Date().toISOString()
        };
        downloadJSON(keyData, 'private_key.json');
      }
    });
  }
  const downloadPublicBtn = document.getElementById('downloadPublicBtn');
  if (downloadPublicBtn) {
    downloadPublicBtn.addEventListener('click', function() {
      if (dsaKeyPair) {
        const keyData = {
          type: 'PUBLIC_KEY',
          keyPair: dsaKeyPair.pubKeyObj,
          generated: new Date().toISOString()
        };
        downloadJSON(keyData, 'public_key.json');
      }
    });
  }
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      if (e.target.files[0]) {
        handleFileUpload(e.target.files[0]);
      }
    });
  }
  const signBtn = document.getElementById('signBtn');
  if (signBtn) {
    signBtn.addEventListener('click', signDocument);
  }
  const downloadSignedBtn = document.getElementById('downloadSignedBtn');
  if (downloadSignedBtn) {
    downloadSignedBtn.addEventListener('click', downloadSignedDocument);
  }
  const signedFileInput = document.getElementById('signedFileInput');
  const verifyBtn = document.getElementById('verifyBtn');
  if (signedFileInput) {
    signedFileInput.addEventListener('change', function(e) {
      if (e.target.files[0]) {
        document.getElementById('verifyResult').innerHTML = `<div>Selected file: <strong>${e.target.files[0].name}</strong></div>`;
        if (verifyBtn) verifyBtn.disabled = false;
      }
    });
  }
  if (verifyBtn) {
    verifyBtn.addEventListener('click', function() {
      if (signedFileInput && signedFileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = async function(e) {
          try {
            const bundle = JSON.parse(e.target.result);
            console.log('Loaded bundle:', bundle);
            await verifySignature(bundle);
          } catch (error) {
            showMessage('Invalid signed document format', 'error');
            console.error('File read/parse error:', error);
          }
        };
        reader.readAsText(signedFileInput.files[0]);
      }
    });
  }
});