# Digital-Signature

This project is a demonstration of digital document signing and verification in the browser using JavaScript and [jsrsasign](https://github.com/kjur/jsrsasign).  
You can generate cryptographic key pairs, sign files, and verify signed bundles—all client-side!

## Features

- Generate RSA (with DSA fallback if available) key pairs
- Sign any document/file with your private key
- Download and verify signed document bundles
- Secure hash (SHA-256) and digital signature algorithms
- All crypto is performed in the browser (no backend required)

## Usage

1. **Key Generation:**  
   Generate a cryptographic key pair. The app will use RSA-2048 by default.
2. **Sign Document:**  
   Upload a file and sign it using your private key. Download the signed bundle.
3. **Verify Signature:**  
   Upload a signed bundle (JSON file) and verify its authenticity and integrity.

## File Structure

- `index.html` – Main application UI
- `app.js` – Application logic and cryptography
- `random_signed_bundle.json` – Example of a fake/invalid signed bundle for testing

## Security Notice

- All operations are performed client-side for demonstration purposes.
- For production or sensitive use cases, always use well-reviewed, up-to-date libraries and a secure backend for key management and signing.

## License

See [LICENSE](LICENSE) for details.

---
