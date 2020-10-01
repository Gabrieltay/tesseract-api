import { log } from './mockLogger';
import express from 'express';
import morganBody from 'morgan-body';
import cors from 'cors';
import bodyParser from 'body-parser';
import { PORT } from './constants';
import Tesseract from 'tesseract.js';
import mrz from 'mrz';
import fileUpload from 'express-fileupload';
import Jimp from 'jimp';

const app = express();

app.use(cors());
app.use(bodyParser.text()); 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());

morganBody(app);

const { createWorker } = Tesseract;
const worker = createWorker({
    langPath: '..',
    gzip: false,
    logger: m => console.log(m),
});

(async () => {
    await worker.load();
    await worker.loadLanguage('OCRB');
    await worker.initialize('OCRB');
})();

app.get('/', function(req: express.Request, res: express.Response) {
    res.status(200).send("Healthy")
});

app.post('/mrz', async function(req: express.Request, res: express.Response): Promise<void> {
    console.log('--------- test mrz ---------');
    if (!req.files || Object.keys(req.files).length === 0) {
        res.status(400).send('No files were uploaded.');
        return;
    }

    const sampleFile = req.files.mrzphoto;
    console.log('--------- jimp mrz ---------', sampleFile.data.length);
    (async () => {
        try {
            const {
                data: { text },
            } = await worker.recognize(sampleFile.data);
            // await worker.terminate();
            const result = text.split('\n').filter(line => {
                return line.length > 40;
            });
            const data = mrz.parse(result);
            const dataDetails = data.details.map(details => {
                if (details.field === 'documentNumberCheckDigit' && details.value == null)
                    throw Error('MRZ checksum failed');
                return { field: details.field, value: details.value };
            });
            res.json({ data: dataDetails });
        } catch (err) {
            console.log(err);
            res.status(500).json({ error: err });
        }
    })();
    // Jimp.read(sampleFile.data).then(image => {
    //     // image
    //     //     .normalize()
    //     //     .greyscale()
    //     //     .contrast(0.3)
    //     //     .writeAsync('grey.png');
    //     image
    //         .normalize()
    //         .greyscale()
    //         .contrast(0.3)
    //         .getBufferAsync(Jimp.MIME_PNG)
    //         .then(uploadBuffer => {
    //             (async () => {
    //                 try {
    //                     const {
    //                         data: { text },
    //                     } = await worker.recognize(uploadBuffer);
    //                     // await worker.terminate();
    //                     const result = text.split('\n').filter(line => {
    //                         return line.length > 40;
    //                     });
    //                     const data = mrz.parse(result);
    //                     const dataDetails = data.details.map(details => {
    //                         if (details.field === 'documentNumberCheckDigit' && details.value == null)
    //                             throw Error('MRZ checksum failed');
    //                         return { field: details.field, value: details.value };
    //                     });
    //                     res.json({ data: dataDetails });
    //                 } catch (err) {
    //                     console.log(err);
    //                     res.status(500).json({ error: err });
    //                 }
    //             })();
    //         });
    // });
});

log.debug(`authServer listening on port ${PORT}`);
export const server = app.listen(process.env.PORT || PORT);
