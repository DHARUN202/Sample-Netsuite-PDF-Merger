const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

app.post('/merge-pdf', async (req, res) => {
    try {
        const pdfs = req.body.pdfs; // array of base64 PDFs

        if (!pdfs || !pdfs.length) {
            return res.status(400).json({ error: 'No PDFs received' });
        }

        const inputFiles = [];

        // Save input PDFs
        pdfs.forEach((base64, index) => {
            const filePath = path.join(TEMP_DIR, `input_${index}.pdf`);
            fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
            inputFiles.push(filePath);
        });

        const outputFile = path.join(TEMP_DIR, 'merged.pdf');

        // Build qpdf command
        const command = `qpdf --empty --pages ${inputFiles.join(' ')} -- ${outputFile}`;
        execSync(command);

        // Read merged PDF
        const mergedBase64 = fs.readFileSync(outputFile).toString('base64');

        // Cleanup
        [...inputFiles, outputFile].forEach(f => fs.unlinkSync(f));

        res.json({
            success: true,
            mergedPdf: mergedBase64
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => {
    console.log('PDF Merge API running on port 3000');
});
