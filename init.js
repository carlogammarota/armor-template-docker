const MongoClient = require('mongodb').MongoClient;
const async = require('async');
const fs = require('fs');
const { exec } = require('child_process');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3131;

// Configurar bodyParser para manejar solicitudes JSON
app.use(bodyParser.json());

async function createApp(defaultChange, API_PORT, FRONTEND_PORT){

// Variables
// const defaultChange = 'nuevo_proyecto_4';
// const API_PORT = '7077';
// const FRONTEND_PORT = '7078';
const terceraVariable = defaultChange;


function editarArchivoConPuerto(rutaArchivoModelo, rutaArchivoDestino, nuevoPuerto) {
  // Copia el archivo modelo al archivo de destino
  fs.copyFile(rutaArchivoModelo, rutaArchivoDestino, (err) => {
      if (err) {
          return console.error(`Error al copiar el archivo: ${err}`);
      }

      // Lee el contenido del archivo
      fs.readFile(rutaArchivoDestino, 'utf8', (err, data) => {
          if (err) {
              return console.error(`Error al leer el archivo: ${err}`);
          }

          // Realiza la sustitución del texto
          const resultado = data.replace(/nuevoPuerto/g, nuevoPuerto);

          // Escribe el nuevo contenido en el archivo
          fs.writeFile(rutaArchivoDestino, resultado, 'utf8', (err) => {
              if (err) return console.error(`Error al escribir en el archivo: ${err}`);
              console.log(`Se ha actualizado el puerto en ${rutaArchivoDestino} a ${nuevoPuerto}`);
          });
      });
  });
}

// Ejemplo de uso
const rutaArchivoModelo = './FeathersClientModel.js';
const rutaArchivoDestino = './FeathersClient.js';
const nuevoPuerto = API_PORT; // Puedes cambiar este valor por el que necesites
editarArchivoConPuerto(rutaArchivoModelo, rutaArchivoDestino, nuevoPuerto);



async function init(){


  // Editar default.json
  fs.readFile('default.json', 'utf8', (err, data) => {
    if (err) throw err;
    const result = data.replace('defaultChange', defaultChange);
    fs.writeFile('./api/config/default.json', result, 'utf8', (err) => {
      if (err) throw err;
    });
  });

  
  // Reemplazar FeathersClient.js
  fs.copyFile('./FeathersClient.js', 'frontend/src/FeathersClient.js', (err) => {
      if (err) throw err;
      console.log('FeathersClient.js fue reemplazado con éxito');
    });
  
  // Crear .env
  const envData = `API_PORT=${API_PORT}\nFRONTEND_PORT=${FRONTEND_PORT}`;
  fs.writeFile('.env', envData, 'utf8', (err) => {
    if (err) throw err;
    console.log('.env fue creado con éxito');
  });
  
  
    
  // Levantar contenedores con docker-compose
  const command = `docker-compose -p ${terceraVariable} up --force-recreate -d`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    
  });
  
}
async function cloneDatabase() {
  // Configuración de las conexiones

  const sourceUri = 'mongodb+srv://admin-web:stuart@cluster0.podle1o.mongodb.net/themeforest-003';
const targetUri = 'mongodb://example_username:example_password@64.227.76.217:27017/'+defaultChange+'?authSource=admin'; // Cambia esta URI según tu configuración

  try {
    // Conectar a la base de datos de origen
    const sourceClient = await MongoClient.connect(sourceUri);
    const sourceDb = sourceClient.db();

    // Conectar a la base de datos de destino
    const targetClient = await MongoClient.connect(targetUri);
    const targetDb = targetClient.db();

    // Obtener una lista de todas las colecciones en la base de datos de origen
    const collections = await sourceDb.listCollections().toArray();

    // Clonar cada colección de la base de datos de origen a la de destino
    await async.eachSeries(collections, async (collection) => {
      const sourceCollection = sourceDb.collection(collection.name);
      const targetCollection = targetDb.collection(collection.name);
      const documents = await sourceCollection.find({}).toArray();
      await targetCollection.insertMany(documents);
    });

    // Cerrar conexiones
    sourceClient.close();
    targetClient.close();

    console.log('Base de datos clonada exitosamente.');
    init();
  } catch (error) {
    console.error('Error al clonar la base de datos:', error);
  }
}

// Ejecutar la función para clonar la base de datos
cloneDatabase();
}






// Manejar la solicitud POST en la ruta '/datos'
app.post('/create-app', (req, res) => {
  console.log('Se recibió un JSON:', req.body);
  // res.send('JSON recibido correctamente.');

  createApp(req.body.subdomain, req.body.api_port, req.body.frontend_port);
  res.send('Creando Aplicacion');
  // createApp('nuevo_proyecto_5', '7079', '7080');
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


