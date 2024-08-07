/*
 * Script creado por Carlo Gammarota.
 * Este script se utiliza para crear una aplicación, gestionar subdominios en CloudFlare, 
 * clonar archivos de configuración de Nginx, manipular archivos con fs, y manejar bases de datos en MongoDB.
 */

const MongoClient = require("mongodb").MongoClient;
const async = require("async");
const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const path = require("path");
const Docker = require('dockerode');
//importar editCollection con objeto
const { editCollection } = require('./editMongoDb.js');

// Promisificar funciones de fs
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const copyFile = util.promisify(fs.copyFile);

const app = express();
const PORT = 3131;

// Configurar bodyParser para manejar solicitudes JSON
app.use(bodyParser.json());

// Función para crear la aplicación
async function createApp(nombreSubdominio, API_PORT, FRONTEND_PORT, result) {

  // Función para clonar el archivo de configuración de dominio por defecto
  function clonarArchivoDominioDefault(subdomain, port) {
    const archivoDefault = "domain-default.conf";
    const nuevoNombre = `${subdomain}.armortemplate.site`;
    const rutaDestino = path.join("/etc/nginx/sites-enabled", nuevoNombre);

    fs.readFile(archivoDefault, "utf8", (err, data) => {
      if (err) {
        throw err;
      }
      const newData = data
        .replace(/default/g, subdomain)
        .replace(/port/g, port);

      fs.writeFile(rutaDestino, newData, "utf8", (err) => {
        if (err) {
          throw err;
        }
        console.log(`Archivo clonado con éxito en ${rutaDestino}`);
      });
    });
  }

  // Función para recargar Nginx
  async function recargarNginx() {
    const comando = "sudo systemctl reload nginx";
    const { stdout, stderr } = await exec(comando);
    console.log(`Resultado: ${stdout}`);
    console.error(`Errores: ${stderr}`);
  }

  // Función para crear un subdominio en CloudFlare
  async function crearSubdominioCloudFlare(subdomain) {
    const zoneId = "22ba6192a10c766dd77527c7a101ad35";
    const apiKey = "77543657f985f75834e7951b022638892bddc";
    const authEmail = "carlo.gammarota@gmail.com";
    const dnsRecordData = {
      type: "A",
      name: subdomain,
      content: "181.110.131.81",
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
      console.log("Error al agregar el registro DNS (CloudFlare)");
    }
  }

  // Crear subdominios y clonar archivos de configuración
  await crearSubdominioCloudFlare(nombreSubdominio);
  await crearSubdominioCloudFlare("api-" + nombreSubdominio);

  clonarArchivoDominioDefault(nombreSubdominio, FRONTEND_PORT);
  clonarArchivoDominioDefault("api-" + nombreSubdominio, API_PORT);

  await recargarNginx();

  // Variable para almacenar el valor de nombreSubdominio
  const terceraVariable = nombreSubdominio;

  // Función para editar un archivo con un nuevo puerto
  function editarArchivoConPuerto(FeathersClientModel, FeathersClient, nueva_ip) {
    fs.copyFile(FeathersClientModel, FeathersClient, (err) => {
      if (err) {
        return console.error(`Error al copiar el archivo: ${err}`);
      }

      fs.readFile(FeathersClient, "utf8", (err, data) => {
        if (err) {
          return console.error(`Error al leer el archivo: ${err}`);
        }

        const resultado = data.replace(/nueva_ip/g, nueva_ip);

        fs.writeFile(FeathersClient, resultado, "utf8", (err) => {
          if (err) return console.error(`Error al escribir en el archivo: ${err}`);
          console.log(`Se ha actualizado la IP en ${FeathersClient}`);
        });
      });
    });
  }

  //necesito una funcion que me permita editar el archivo server.js

  

  // Función para editar y guardar archivos
  function editarYGuardar(serverModeloPath, subdominioNuevo) {
    fs.readFile(serverModeloPath, "utf8", (err, data) => {
      if (err) {
        console.error("Error al leer el archivo:", err);
        return;
      }

      let result = data.replace(/subdominioEdit/g, subdominioNuevo);

      fs.writeFile("./frontend/server.js", result, "utf8", (err) => {
        if (err) {
          console.error("Error al escribir el archivo:", err);
          return;
        }
        console.log("Archivo guardado exitosamente.");
      });
    });
  }

  const serverModeloPath = "./serverModelo.js";
  editarYGuardar(serverModeloPath, nombreSubdominio);

  //const nueva_ip = "http://192.168.1.4:" + API_PORT;
  //produccion

  const nueva_ip = "https://api-" + nombreSubdominio + ".armortemplate.site";

  editarArchivoConPuerto("./FeathersClientModel.js", "./FeathersClient.js", nueva_ip);

  // Crear instancia de Docker
  const docker = new Docker();

  // Función para inicializar la aplicación
  async function init() {
    try {
      let data = await readFile(path.join(__dirname, 'default.json'), 'utf8');
      const result = data.replace("nombreSubdominio", nombreSubdominio);
      await writeFile(path.join(__dirname, './api/config/default.json'), result, 'utf8');

      await copyFile(
        path.join(__dirname, './FeathersClient.js'),
        path.join(__dirname, './frontend/src/FeathersClient.js')
      );
      console.log("FeathersClient.js fue reemplazado con éxito");

      const envData = `API_PORT=${API_PORT}\nFRONTEND_PORT=${FRONTEND_PORT}`;
      await writeFile(path.join(__dirname, '.env'), envData, 'utf8');
      console.log(".env fue creado con éxito");

      const command = `docker compose -p ${terceraVariable} up --force-recreate -d`;
      await execComposeCommand(command);

      console.log("Aplicación inicializada exitosamente.");
    } catch (error) {
      console.error(`Error durante la inicialización: ${error.message}`);
    }
  }

  async function execComposeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`exec error: ${error.message}`));
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
        }
        console.log(`stdout: ${stdout}`);
        resolve();
      });
    });
  }

  // Función para clonar la base de datos
  async function cloneDatabase() {
    const sourceUri = "mongodb+srv://admin-web:stuart@cluster0.podle1o.mongodb.net/themeforest-003";
    const targetUri = `mongodb+srv://admin-web:stuart@cluster0.podle1o.mongodb.net/${nombreSubdominio}?authSource=admin`;

    try {
      const sourceClient = await MongoClient.connect(sourceUri);
      const sourceDb = sourceClient.db();
      const targetClient = await MongoClient.connect(targetUri);
      const targetDb = targetClient.db();

      const collections = await sourceDb.listCollections().toArray();

      await async.eachSeries(collections, async (collection) => {
        if (collection.name === "applications" || collection.name === "ports") {
          return;
        }

        const sourceCollection = sourceDb.collection(collection.name);
        const targetCollection = targetDb.collection(collection.name);
        const documents = await sourceCollection.find({}).toArray();
        await targetCollection.insertMany(documents);
      });


      editCollection(result);

      sourceClient.close();
      targetClient.close();

      console.log("Base de datos clonada exitosamente.");
      init();
    } catch (error) {
      console.log("Error: La base de datos ya existe");
    }
  }

  cloneDatabase();
}
// Manejar la solicitud POST en la ruta '/create-app'
app.post("/create-app", (req, res) => {
  const { subdomain, api_port, frontend_port, password, result } = req.body;
  const correctPassword = "luci2024"; // La contraseña correcta

  if (password !== correctPassword) {
    res.status(401).send("Error: Contraseña incorrecta");
    return;
  }

  console.log("Se recibió un JSON:", req.body);
  //el id es el id de la aplicacion
  console.log("El id de la nueva aplicacion es", result);

  createApp(subdomain, api_port, frontend_port, result)
    .then(() => {

      res.send("Aplicación creada exitosamente");
    })
    .catch((error) => {
      console.error("Error al crear la aplicación:", error);
      res.status(500).send("Error al crear la aplicación");
    });
});


app.post("/update-app", async (req, res) => {
  const { subdomain, password } = req.body;
  const correctPassword = "luci2024"; // La contraseña correcta

  if (password !== correctPassword) {
    res.status(401).send("Error: Contraseña incorrecta");
    return;
  }

  try {
    const docker = new Docker();
    const containerName = `${subdomain}_frontend_1`; // Nombre del contenedor basado en el subdominio y el servicio

    // Detener el contenedor si está corriendo
    try {
      const container = docker.getContainer(containerName);
      await container.stop();
      await container.remove();
      console.log(`Contenedor ${containerName} detenido y eliminado exitosamente.`);
    } catch (err) {
      console.log(`No se pudo detener o eliminar el contenedor ${containerName}. Es posible que no esté corriendo.`, err.message);
    }

    // Cambiar a la ruta del frontend
    const frontendPath = path.join(__dirname, "frontend");
    process.chdir(frontendPath);

    // Ejecutar git pull
    const { stdout, stderr } = await exec("git pull");
    console.log("Git Pull stdout:", stdout);
    console.error("Git Pull stderr:", stderr);

    // Volver a construir y ejecutar la imagen Docker
    const command = `docker compose -p ${subdomain} up --build -d`;
    const { stdout: dockerStdout, stderr: dockerStderr } = await exec(command);
    console.log("Docker stdout:", dockerStdout);
    console.error("Docker stderr:", dockerStderr);

    res.send("Aplicación actualizada exitosamente");
  } catch (error) {
    console.error("Error al actualizar la aplicación:", error);
    res.status(500).send("Error al actualizar la aplicación");
  }
});


// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
