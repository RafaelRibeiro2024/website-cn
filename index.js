const express = require('express');
const multer = require('multer');
const fs = require('fs'); // Import the fs module
const app = express();

// Multer configuration
const upload = multer({ dest: 'uploads/' }); // Define the destination folder for uploaded files

// Importing the BlobServiceClient library from Azure Storage
const { BlobServiceClient } = require("@azure/storage-blob");

app.get('/dfsd', (req, res) => {
    const htmlString = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Upload de Arquivos para o Azure Blob Storage</title>
    </head>
    <body>
        <form action="/upload" method="post" enctype="multipart/form-data">
                <input type="file" name="nome_do_arquivo" accept="image/*" multiple />
            <button type="submit">Enviar Arquivo</button>
        </form>
    </body>
    </html>
    `;
    res.send(htmlString);
});

// Your file upload handling function
const uploadFiles = async (files) => {
    try {
        const blobSasUrl = "https://testetrabalho.blob.core.windows.net/?sv=2022-11-02&ss=b&srt=co&sp=wctf&se=2024-03-26T22:07:37Z&st=2024-03-26T14:07:37Z&spr=https&sig=3sorRUG3Za1c03ufj%2BQBuJXZJXcs%2FJ7LEwNKGa3N96Q%3D";
        const blobServiceClient = new BlobServiceClient(blobSasUrl);
        const containerName = "teste-containers";
        const containerClient = blobServiceClient.getContainerClient(containerName);

        const promises = [];
        for (const file of files) {
            // Read the file locally
            const fileContent = fs.readFileSync(file.path);
            // Upload to Azure Blob Storage
            const blockBlobClient = containerClient.getBlockBlobClient(file.originalname); // Changed file.name to file.originalname
            promises.push(blockBlobClient.uploadData(fileContent, file.size));
        }
        await Promise.all(promises);
        console.log('Done.');
    }
    catch (error) {
        console.error(error.message);
    }
};

// Route for file upload
app.post('/upload', upload.array('nome_do_arquivo'), (req, res) => { // Use upload.array() to handle multiple files
    // Call the file upload function
    uploadFiles(req.files)
        .then(() => res.send('Arquivos enviados com sucesso para o Azure Blob Storage.'))
        .catch(() => res.status(500).send('Ocorreu um erro durante o upload dos arquivos.'));
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
