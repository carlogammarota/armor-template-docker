const MongoClient = require('mongodb').MongoClient;
const async = require('async');
const fs = require('fs').promises;
const { exec } = require('child_process');
const express = require('express');
const bodyParser = require('body-parser');

const axios = require('axios');

const app = express();
app.use(express.json());
const PORT = 3131;

// Configurar bodyParser para manejar solicitudes JSON
app.use(bodyParser.json());

async function clonarArchivoDominioDefault(subdomain, port) {
    const archivoDefault = "default.conf";
    const nuevoNombre = `${subdomain}.armortemplate.site`;
    const rutaDestino = `/etc/nginx/sites-enabled/${nuevoNombre}`;
  
    const data = await fs.readFile(archivoDefault, "utf8");
    const nuevoContenido = data
      .replace(/default/g, subdomain)
      .replace(/port/g, port);
  
    await fs.writeFile(nuevoNombre, nuevoContenido, "utf8");
    console.log(`Archivo ${nuevoNombre} creado con éxito.`);
  
    await exec(`sudo mv ${nuevoNombre} ${rutaDestino}`);
    console.log(`Archivo movido a ${rutaDestino} con éxito.`);
}

async function recargarNginx() {
const comando = "sudo systemctl reload nginx";

const { stdout, stderr } = await exec(comando);
console.log(`Resultado: ${stdout}`);
console.error(`Errores: ${stderr}`);
}

async function crearSubdominioCloudFlare(subdomain) {
const zoneId = "22ba6192a10c766dd77527c7a101ad35";
const apiKey = "77543657f985f75834e7951b022638892bddc";
const authEmail = "carlo.gammarota@gmail.com";
const dnsRecordData = {
    type: "A",
    name: subdomain,
    content: "64.227.76.217",
    ttl: 1,
    proxied: true,
};

const apiUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;

const config = {
    method: "post",
    url: apiUrl,
    headers: {
    "X-Auth-Key": apiKey,
    "X-Auth-Email": authEmail,
    "Content-Type": "application/json",
    },
    data: dnsRecordData,
};

try {
    const response = await axios(config);
    console.log("Registro DNS agregado con éxito:", response.data);
    return response.data;
} catch (error) {
    // console.error("Error al agregar el registro DNS:", error.errors);
    throw new Error("Error al agregar el registro DNS (CloudFlare)");
}
}

// Función para crear la aplicación
async function createApp(defaultChange, API_PORT, FRONTEND_PORT){

    // Variable para almacenar el valor de defaultChange
    const terceraVariable = defaultChange;

    await crearSubdominioCloudFlare(defaultChange);
    await clonarArchivoDominioDefault(defaultChange, API_PORT);
    await recargarNginx();

    // Función para editar un archivo con un nuevo puerto
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

    // Ejemplo de uso de la función de edición de archivos con puerto
    const rutaArchivoModelo = './FeathersClientModel.js';
    const rutaArchivoDestino = './FeathersClient.js';
    const nuevoPuerto = API_PORT; // Puedes cambiar este valor por el que necesites
    editarArchivoConPuerto(rutaArchivoModelo, rutaArchivoDestino, nuevoPuerto);

    // Función para inicializar la aplicación
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
        fs.copyFile('./FeathersClient.js', './frontend/src/FeathersClient.js', (err) => {
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

    // Función para clonar la base de datos
    async function cloneDatabase() {
        // Configuración de las conexiones
        const sourceUri = 'mongodb+srv://admin-web:stuart@cluster0.podle1o.mongodb.net/themeforest-003';
        const targetUri = 'mongodb://example_username:example_password@64.227.76.217:27017/' + defaultChange + '?authSource=admin'; // Cambia esta URI según tu configuración

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
    createApp(req.body.subdomain, req.body.api_port, req.body.frontend_port);
    res.send('Creando Aplicacion');
});


app.post('/create-new-app', (req, res) => {
    try {
      // Aquí puedes poner tu lógica para el manejo del POST
      // Ejemplo: validar la entrada, realizar operaciones, etc.
  
      // Ejemplo de error (simulado)
      const error = true;
  
      if (error) {
        throw new Error('Ocurrió un error en el servidor.');
      }
  
      // Si no hay errores, puedes enviar una respuesta exitosa
      res.send('¡POST exitoso!');
    } catch (err) {
      // Manejo de errores aquí
      console.error('Ha ocurrido un error:', err.message);
      res.status(500).send('Algo salió mal, pero la aplicación sigue funcionando.');
    }
});









async function externalFunction() {
    // Simulando una función que arroja un error
    const error = true;
  
    if (error) {
      throw new Error('Ocurrió un error en la función externa.');
    }
  
    // Si no hay errores, realiza alguna operación y devuelve el resultado
    return 'Resultado exitoso de la función externa.';
  }


app.post('/post', async (req, res) => {
try {
    // Llamando a la función externa de manera asíncrona
    const result = await externalFunction();

    // Si no hay errores, puedes enviar una respuesta exitosa con el resultado
    res.send(result);
} catch (err) {
    // Manejo de errores aquí
    console.error('Ha ocurrido un error:', err.message);
    res.status(500).send('Algo salió mal, pero la aplicación sigue funcionando.');
}
});


// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
