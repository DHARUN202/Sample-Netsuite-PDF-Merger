const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const app = express();

// IMPORTANT: accept large payloads
app.use(bodyParser.json({ limit: '50mb' }));

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// Health check (IMPORTANT)
app.get('/', (req, res) => {
    res.json({ status: 'PDF Merge API running' });
});

app.post('/merge-pdf', (req, res) => {
    try {
        console.log('Request received');

        const pdfs = req.body.pdfs;

        if (!Array.isArray(pdfs) || pdfs.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No PDFs received'
            });
        }

        const inputFiles = [];

        pdfs.forEach((base64, index) => {
            const filePath = path.join(TEMP_DIR, `input_${index}.pdf`);
            fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
            inputFiles.push(filePath);
        });

        const outputFile = path.join(TEMP_DIR, 'merged.pdf');

        const command = `qpdf --empty --pages ${inputFiles.join(' ')} -- ${outputFile}`;
        execSync(command);

        const mergedBase64 = fs.readFileSync(outputFile).toString('base64');

        [...inputFiles, outputFile].forEach(f => fs.unlinkSync(f));

        res.json({
            success: true,
            mergedPdf: mergedBase64
        });

    } catch (err) {
        console.error('Merge error:', err);

        // ALWAYS return JSON
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// REQUIRED FOR RENDER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`PDF Merge API running on port ${PORT}`);
});

