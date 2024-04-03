const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000
const fileupload = require('express-fileupload');
const { CosmosClient } = require("@azure/cosmos");
const { BlobServiceClient } = require("@azure/storage-blob");
app.use(fileupload({
    useTempFiles: true,
    tempFileDir: "/tmp",
}));
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

const connString = 'DefaultEndpointsProtocol=https;AccountName=trabalhoteste;AccountKey=N9MYIECYga9ETsbXQWSMAKnNo+qy/uzprQUyG50YDoI84nwOM4r8pzs8ByergbOl46sQvEQhuE6w+AStVwrvlQ==;EndpointSuffix=core.windows.net';
const blobServiceClient = BlobServiceClient.fromConnectionString(connString);

const itemsAprovatos = [];
const items = [];
const endpoint = "https://cosmos-ricardo0723059.documents.azure.com:443/";
const key = "IvENfgz69qDwnzTnPAXutetLc7jKbpliyHXpAPP30dXK23PIj9fJZF2LOjvb2Y04wpJ3MxmjsabPACDb142tfQ==";

const client = new CosmosClient({ endpoint, key });

let proximoId;
let db;
let cont;



async function ProxID() {
    try {
        const { database } = await client.databases.createIfNotExists({ id: "Eventos" });
        db = database;
        const { container } = await database.containers.createIfNotExists({ id: "Evento" });
        cont = container;

        const querySpec = {
            query: 'SELECT TOP 1 c.id FROM c ORDER BY c.id DESC'
        };

        const { resources: results } = await container.items.query(querySpec).fetchAll();

        if (results.length > 0) {
            const ultimoID = results[0].id;
            const prox = parseInt(ultimoID) + 1;
            proximoId = prox;
        } else {
            proximoId = 1;
        }
    } catch (error) {
        console.error("Error in ProxID function:", error);
        throw error;
    }
}
async function todosAprovatos() {
    const { database } = await client.databases.createIfNotExists({ id: "Eventos" });
    db = database;
    const { container } = await database.containers.createIfNotExists({ id: "Evento" });
    cont = container;
    const { resources } = await cont.items
    .query("SELECT * from c where c.aprovado = true")
    .fetchAll();
    for (const evento of resources) {
        itemsAprovatos.push({Nome: evento.nome, Descricao: evento.descrição, Data: evento.start_date, Local: evento.local, Ocupacao: evento.ocupacao, Imagem: evento.link_imagens});
    }
}

async function Todos() {
    const { database } = await client.databases.createIfNotExists({ id: "Eventos" });
    db = database;
    const { container } = await database.containers.createIfNotExists({ id: "Evento" });
    cont = container;

    const { resources } = await container.items
    .query("SELECT * from c")
    .fetchAll();
    for (const evento of resources) {
        items.push({Nome: evento.nome, Descricao: evento.descrição, Data: evento.start_date, Local: evento.local, Ocupacao: evento.ocupacao, Imagem: evento.link_imagens});
    }
}

Todos();
todosAprovatos();

app.use(express.static('public'));


app.get('/', function (req, res) {
    const html = `
	<!DOCTYPE html>
    <html lang="pt">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Página Inicial</title>
        <link rel="stylesheet" href="style.css">
    </head>
	<body>
        <h1>Lista de eventos</h1>
        <ul>
            ${items.map((item, index) => `
            <li>
                <strong>Nome:</strong> ${item.Nome}<br>
                <strong>Descrição:</strong> ${item.Descricao}<br>
                <strong>Data:</strong> ${item.Data}<br>
                <strong>Local:</strong> ${item.Local}<br>
                <strong>Ocupação:</strong> ${item.Ocupacao}<br>
                <strong>Imagem:</strong> <img src="${item.Imagem}" alt="" width="200" height="200"><br>
                <button onclick="location.href='/Detalhes/${index}'">Mais detalhes</button>

        </li>`).join('')}
        </ul>
        <button onclick="location.href='/criarevento'">Criar um evento</button>
        <button onclick="location.href='/SoAprovados'">So aprovados</button>
        <br>
        <br>
	</body>
    </html>
    `;
    res.send(html);
});

app.get('/SoAprovados', (req, res) => {

    const html = `
		<!DOCTYPE html>
		<html lang="pt">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Lista de eventos aprovados</title>
			<link rel="stylesheet" href="style.css">
		</head>
		<body>
        <h1>Lista de eventos aprovados</h1>
        <ul>
            ${itemsAprovatos.map((itemA, index) => `
            <li>
                <strong>Nome:</strong> ${itemA.Nome}<br>
                <strong>Descrição:</strong> ${itemA.Descricao}<br>
                <strong>Data:</strong> ${itemA.Data}<br>
                <strong>Local:</strong> ${itemA.Local}<br>
                <strong>Ocupação:</strong> ${itemA.Ocupacao}<br>
                <strong>Imagem:</strong> <img src="${itemA.Imagem}" alt="" width="200" height="200"><br>
                <button onclick="location.href='/Detalhes/${index}'">Mais detalhes</button>
        </li>`).join('')}
        </ul>
        <button onclick="location.href='/'">Voltar para a página principal</button>
        <br>
        <br>
		</body>
		</html>
        
    `;
    res.send(html);
});

// Rota para servir o arquivo CSS
app.use('/Detalhes', express.static('public'));

app.get('/Detalhes/:index', (req, res) => {
    const index = parseInt(req.params.index);
    const detalhes = `
				<!DOCTYPE html>
				<html lang="pt">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<title>Detalhes do evento</title>
					<link rel="stylesheet" href="style.css">
				</head>
				<body>
					<div class="container-detalhes">
						<h1>Detalhes do evento</h1>
						<div class="event-details">
							<h2>Nome do evento:</h2>
							<p>${items[index].Nome}</p>
							<h2>Descrição:</h2>
							<p>${items[index].Descricao}</p>
							<h2>Data:</h2>
							<p>${items[index].Data}</p>
							<h2>Local:</h2>
							<p>${items[index].Local}</p>
							<h2>Ocupação:</h2>
							<p>${items[index].Ocupacao}</p>
							<h2>Imagem:</h2>
							<img src="${items[index].Imagem}" alt="Imagem do evento ${index}" width="200" height="200">
						</div>
						<button onclick="location.href='/'">Voltar para a página principal</button>
					</div>
				</body>
				</html>

        `;
        res.send(detalhes);
    });

app.get('/criarevento', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="style.css">
    <title>Criar Evento</title>
</head>
<body>
    <div class="container">
        <div class="form-container">
            <h1>Criar Evento</h1>
            <form action="/criareventos" method="post" enctype="multipart/form-data">
                <input type="text" name="Nome" placeholder="Nome do evento" required><br>
                <input type="text" name="Descricao" placeholder="Descricao" required><br>
                <input type="text" name="Organizadores" placeholder="Organizadores" required><br>
                <input type="date" name="Data" placeholder="Data Inicio" required><br>
                <input type="date" name="DataFim" placeholder="Data Fim" required><br>
                <input type="text" name="Local" placeholder="Local" required><br>
                <input type="number" name="Ocupacao" placeholder="Ocupacao" required><br>
                <input type="file" name="image" accept="image/*" required><br>
                <button type="submit">Criar</button>
            </form>
            <button onclick="location.href='/'">Voltar para a página principal</button>
        </div>
    </div>
</body>
</html>

    `;
    res.send(html);
});
app.post('/criareventos', async (req, res) => {
    try {
        //await ProxID(); 
        console.log(proximoId);
        
        const {image} = req.files;
        const imgPath = image.tempFilePath;
        let imgUrl='';
        const { Nome, Descricao, Organizadores, Data, DataFim, Local, Ocupacao } = req.body;
        
        let containerName = "teste-containers"; 
        const containerClient = blobServiceClient.getContainerClient(containerName);

        const blobName = `${image.name}`; 
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.uploadFile(imgPath);

        imgUrl = blockBlobClient.url;

        var item = {
            'nome': Nome,
            'organizadores': Organizadores,
            'descrição': Descricao, 
            'local': Local,
            'start_date': Data,
            'end_date': DataFim,
            'aprovado': false,
            'ocupacao': Ocupacao,
            'link_imagens': imgUrl,
        };
        await
        cont.items.create(item);

        const html = `
		<!DOCTYPE html>
			<html lang="pt">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link rel="stylesheet" href="style.css">
				<title>Criar Evento</title>
			</head>
			<body>
            <h1>Evento criado com sucesso</h1>
            <button onclick="location.href='/'">Voltar para a página principal</button>
			</body>
			</html>`;
        res.send(html);
    } catch (error) {
        console.error(error.message);
        return res.status(500).send('Error creating event');
    }
});

app.listen(port, function () {
  console.log('Example app listening on port ${port}!');
});