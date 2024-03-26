import 'regenerator-runtime/runtime'
const { BlobServiceClient } = require("@azure/storage-blob");

const selectButton = document.getElementById("select-button"); 
const fileInput = document.getElementById("file-input");

const blobSasUrl = "https://testetrabalho.blob.core.windows.net/?sv=2022-11-02&ss=b&srt=co&sp=wctf&se=2024-03-26T08:45:14Z&st=2024-03-26T00:44:14Z&spr=https&sig=gAMSTZqOohCG4onnQEOdkFq9ukrE4EL1vyB%2BVuU7K6A%3D"

const blobServiceClient = new BlobServiceClient(blobSasUrl);


const containerName = "teste-containers"; 
const containerClient = blobServiceClient.getContainerClient(containerName);

const uploadFiles = async () => {
	try {
		const promises = [];
		for (const file of fileInput.files) {
		const blockBlobClient = containerClient.getBlockBlobClient(file.name); 		
		promises.push(blockBlobClient.uploadBrowserData(file));
	}
	await Promise.all(promises);
	alert('Done.');
	}
	catch (error) {
		alert(error.message);
	}
}
selectButton.addEventListener("click", () => fileInput.click()); 
fileInput.addEventListener("change", uploadFiles);