const selfsigned = require('selfsigned');
const fs = require('fs');

async function main() {
    const host = process.env.HOST || '192.168.100.104';
    const attrs = [
        { name: 'commonName', value: host }
    ];

    try {
        const pems = await selfsigned.generate(attrs, {
            algorithm: 'sha256',
            days: 365,
            keySize: 2048,
            extensions: [{
                name: 'subjectAltName',
                altNames: [
                    { type: 2, value: 'localhost' },
                    { type: 7, ip: '127.0.0.1' },
                    { type: 7, ip: host.match(/^\d+\.\d+\.\d+\.\d+$/) ? host : undefined }
                ].filter(name => name.ip !== undefined || name.type === 2)
            }]
        });

        fs.mkdirSync('./certificates', { recursive: true });
        // In v2+ it returns { private, public, cert } OR we stringify just to be safe
        const cert = pems.cert || pems.public;
        fs.writeFileSync('./certificates/localhost.pem', cert);
        fs.writeFileSync('./certificates/localhost-key.pem', pems.private);
        console.log(`Certificates generated for ${host} in ./certificates/`);
    } catch (e) {
        console.error(e);
    }
}

main();
