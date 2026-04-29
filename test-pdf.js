const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const testPdf = () => {
    try {
        const doc = new PDFDocument({ margin: 20 });
        const tempPdfPath = path.join(__dirname, 'test.pdf');
        const stream = fs.createWriteStream(tempPdfPath);
        doc.pipe(stream);

        // Create a dummy image
        const imgPath = path.join(__dirname, 'dummy.jpg');
        // Let's copy an image if we can, or just use try-catch to simulate the failure
        // Instead, let's just create a valid small JPEG buffer and write it to dummy.jpg
        const dummyJpg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
        fs.writeFileSync(imgPath, dummyJpg);

        console.log(`Processing image 1/1: ${imgPath}`);
        doc.image(imgPath, {
            fit: [doc.page.width - 40, doc.page.height - 40],
            align: 'center',
            valign: 'center'
        });

        if (fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
        }

        doc.end();

        stream.on('finish', () => {
            console.log('PDF stream finished');
        });
        stream.on('error', (err) => {
            console.log('Stream error', err);
        });

    } catch (e) {
        console.error('Error caught:', e.message);
    }
};

testPdf();
