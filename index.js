//imports
const { exec } = require('child_process');
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
}));;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

const connString = process.env.CONNSTRINGSTORAGE;
const blobServiceClient = BlobServiceClient.fromConnectionString(connString);
const containerName = "projcontainerstorage"; 


const itemsAprovados = [];
const items = [];
const endpoint = process.env.ENDPOINTCOSMO;const key = process.env.KEYCOSMO;

const client = new CosmosClient({ endpoint, key });

let proximoId;
let db;
let cont;

async function todosAprovatos() {
	    try {

		const { database } = await client.databases.createIfNotExists({ id: "Eventos" });
		db = database;
		const { container } = await database.containers.createIfNotExists({ id: "Evento" });
		cont = container;
		
		   const { resources } = await cont.items
		.query("SELECT * from c where c.aprovado = true")
		.fetchAll();
		for (const evento of resources) {
			itemsAprovados.push({Id: evento.id, Nome: evento.nome, Descricao: evento.descrição, Data: evento.start_date, DataFim: evento.end_date, Local: evento.local, Ocupacao: evento.ocupacao, Imagem: evento.link_imagens, Organizadores: evento.organizadores, Aprovado: evento.aprovado });
		}
    } catch (error) {
        console.error('Failed to retrieve Cosmos DB key:', error);
    }
}

async function Todos() {
	    try {
		const { database } = await client.databases.createIfNotExists({ id: "Eventos" });
		db = database;
		const { container } = await database.containers.createIfNotExists({ id: "Evento" });
		cont = container;

		const { resources } = await cont.items
		.query("SELECT * from c")
		.fetchAll();
		for (const evento of resources) {
			items.push({Id: evento.id, Nome: evento.nome, Descricao: evento.descrição, Data: evento.start_date, DataFim: evento.end_date, Local: evento.local, Ocupacao: evento.ocupacao, Imagem: evento.link_imagens, Organizadores: evento.organizadores, Aprovado: evento.aprovado });
		}
    } catch (error) {
        console.error('Failed to retrieve Cosmos DB key:', error);
    }
}


async function updateItens(id,item) {
	try {
        id.toString();
        const { database } = await client.databases.createIfNotExists({ id: "Eventos" });
        db = database;
        const { container } = await database.containers.createIfNotExists({ id: "Evento" });
        cont = container;
		
        const { resource: updated } = await container.item(id).replace(item);
        console.log('Item updated:', updated);
        return updated;
    } catch (error) {
        console.error('Error updating item:', error);
        throw error; 
    }
}

async function apagarEvento(id, blob) {
    try {

        id.toString();
        const { database } = await client.databases.createIfNotExists({ id: "Eventos" });
        db = database;
        const { container } = await database.containers.createIfNotExists({ id: "Evento" });
        cont = container;
        const { resource: result } = await container.item(id).delete();
       
		//Apagar a imagem
		const containerClient = blobServiceClient.getContainerClient(containerName);
		const nomeFicheiro = blob.split('/').pop();
        const blobClient = containerClient.getBlockBlobClient(nomeFicheiro);
        const exists = await blobClient.exists();
        if (exists) {
            const deleteResponse = await blobClient.delete();
        }
        return result;
    } catch (error) {
        
        throw error;
    }
}

async function atualizarListaEventos() {
    itemsAprovados.length = 0;
    items.length = 0;

    await todosAprovatos();
    await Todos();
}

Todos();
todosAprovatos();

app.use(express.static('public'));


app.get('/', async (req, res) => {
   			
	await atualizarListaEventos();
			
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
                <strong>Data Inicio:</strong> ${item.Data}<br>
                <strong>Data Fim:</strong> ${item.DataFim}<br>
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

app.get('/SoAprovados', async (req, res) => {
	await atualizarListaEventos();

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
            ${itemsAprovados.map((itemA, index) => `
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

app.use('/Detalhes', express.static('public'));
app.get('/Detalhes/:index', (req, res) => {
    const index = parseInt(req.params.index);
	const aprovado = items[index].Aprovado;
    const textoBotao = aprovado ? 'Desaprovar Evento' : 'Aprovar Evento';
	
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
							<h2>Data Inicio:</h2>
							<p>${items[index].Data}</p>
                            <h2>Data Fim:</h2>
                            <p>${items[index].DataFim}</p>
							<h2>Local:</h2>
							<p>${items[index].Local}</p>
							<h2>Ocupação:</h2>
							<p>${items[index].Ocupacao}</p>
							<h2>Imagem:</h2>
							<img src="${items[index].Imagem}" alt="Imagem do evento ${index}" width="200" height="200">
						</div>	
                        <button onclick="location.href='/EditarEvento/${index}'">Editar Evento</button>					
						<button onclick="location.href='/ApagarEvento/${index}'">Apagar Evento </button>
						<button onclick="location.href='/MudarEstadoAprovacao/${items[index].Id}/${aprovado}'">${textoBotao}</button>
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
                <button onclick="location.href='/criareventos'">Criar </button>
            </form>
            <button onclick="location.href='/'">Voltar para a página principal</button>
        </div>
    </div>
</body>
</html>

    `;
    res.send(html);
});

const crypto = require('crypto');
// Função para gerar uma string aleatória tipo hash
function generateRandomString(length) {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(10, length); 
}

app.post('/criareventos', async (req, res) => {
    try {
        //await ProxID(); 
        console.log(proximoId);
        
        const {image} = req.files;
        const imgPath = image.tempFilePath;
        let imgUrl='';

        const { Nome, Descricao, Organizadores, Data, DataFim, Local, Ocupacao } = req.body;
        
        const containerClient = blobServiceClient.getContainerClient(containerName);

		const blobName = generateRandomString(25);
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
        await cont.items.create(item);

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

app.use('/EditarEvento', express.static('public'));
app.get('/EditarEvento/:index', (req, res) => {
    const index = parseInt(req.params.index);
    const html = `
        <!DOCTYPE html>
        <html lang="pt">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Editar Evento</title>
            <link rel="stylesheet" href="style.css">
        </head>
        <body>
            <div class="container-detalhes">
                <h1>Editar Evento</h1>
                <div class="event-details">
                    <form action="/Editar/" method="post" enctype="multipart/form-data">
                        <input type="hidden" name="id" value="${items[index].Id}">
                        <h2>Nome do evento:</h2>
                        <input type="text" name="Nome" value="${items[index].Nome}" required><br>
                        <h2>Descrição:</h2>
                        <input type="text" name="Descricao" value="${items[index].Descricao}" required><br>
                        <h2>Data Inicio:</h2>
                        <input type="date" name="DataInicio" value="${items[index].Data}" required><br>
                        <h2>Data Fim</h2>
                        <input type="date" name="DataFim" value="${items[index].DataFim}" required><br>
                        <h2>Local:</h2>
                        <input type="text" name="Local" value="${items[index].Local}" required><br>
                        <h2>Ocupação:</h2>
                        <input type="number" name="Ocupacao" value="${items[index].Ocupacao}" required><br>
						<input type="hidden" name="Organizadores" value="${items[index].Organizadores}">
						<input type="hidden" name="Aprovado" value="${items[index].Aprovado}">
						<input type="hidden" name="imgUrl" value="${items[index].Imagem}">
                        <button type="submit">Editar</button>
                    </form>
                </div>  
                <button onclick="location.href='/'">Voltar para a página principal</button>
            </div>
        </body>
        </html>`;
    res.send(html);
});

app.use('/ApagarEvento', express.static('public'));
app.get('/ApagarEvento/:index', (req, res) => {
    const index = parseInt(req.params.index);
    const id = items[index].Id;
	const imagem = items[index].Imagem;

    apagarEvento(id, imagem);
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

            </div>	
            <button onclick="location.href='/'">Voltar para a página principal</button>
        </div>
    </body>
    </html>

`;
    res.send(detalhes);
});
app.post('/Editar/', async (req, res) => {
    
    const { Nome, Descricao, DataInicio, DataFim, Local, Ocupacao, id , Aprovado, Organizadores, imgUrl} = req.body;
    const item = {
        id: id,
        nome: Nome,
        descrição: Descricao,
        start_date: DataInicio,
        end_date: DataFim,
        local: Local,
        ocupacao: Ocupacao,
		organizadores: Organizadores,
		aprovado: Aprovado,
		link_imagens: imgUrl
    };

    updateItens(id,item);
    res.redirect('/');
    
});

app.get('/MudarEstadoAprovacao/:index/:estado', async (req, res) => {
	const index = req.params.index.toString();
	const estado = req.params.estado;
	console.log(estado);
	
    const { database } = await client.databases.createIfNotExists({ id: "Eventos" });
    db = database;
    const { container } = await database.containers.createIfNotExists({ id: "Evento" });
    cont = container;

    
    const { resource: doc } = await container.item(index).read();

	if(estado === 'true'){
        doc.aprovado = false;
	}else {
        doc.aprovado = true;
	}

    updateItens(index,doc);
	
    res.redirect('/');
});

app.listen(port, function () {
  console.log('Example app listening on port ' + port);
});
