const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const testPdfInvalid = () => {
    try {
        const doc = new PDFDocument({ margin: 20 });
        const imgPath = path.join(__dirname, 'invalid.jpg');
        fs.writeFileSync(imgPath, 'This is not a real image');

        console.log(`Processing image: ${imgPath}`);
        doc.image(imgPath, {
            fit: [doc.page.width - 40, doc.page.height - 40],
            align: 'center',
            valign: 'center'
        });

    } catch (e) {
        console.error('[Error]', e.message);
    }
};

testPdfInvalid();
