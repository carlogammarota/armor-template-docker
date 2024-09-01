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
const { editStatus } = require('./editStatus.js');

// editStatus({
//   subdomain: 'tesla-motors',
//   status: 'active',
// });

// Promisificar funciones de fs
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const copyFile = util.promisify(fs.copyFile);

const app = express();
const PORT = 3131;

// Configurar bodyParser para manejar solicitudes JSON
app.use(bodyParser.json());

// Función para ejecutar comandos de shell
function ejecutarComando(comando) {
  return new Promise((resolve, reject) => {
    exec(comando, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error al ejecutar el comando: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

//ejemplo de uso de editStatus, para cambiar el status de una aplicacion
// editStatus({
//   subdomain: 'tesla-motors',
//   status: 'active',
// });

// Función para crear la aplicación
async function createApp(nombreSubdominio, API_PORT, FRONTEND_PORT, result) {

  //edit status clonando
  editStatus({
    subdomain: nombreSubdominio,
    status: 'creating',
  });

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
    editStatus({
      subdomain: nombreSubdominio,
      status: 'recharging nginx',
    });
    // const comando = "sudo systemctl reload nginx";
    const comando = "sudo /usr/bin/systemctl reload nginx";
    const { stdout, stderr } = await exec(comando);
    console.log(`Resultado: ${stdout}`);
    editStatus({
      subdomain: nombreSubdominio,
      status: stdout,
    });
    console.error(`Errores: ${stderr}`);
  }

  editStatus({
    subdomain: nombreSubdominio,
    status: 'creating subdomains',
  });

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
      editStatus({
        subdomain: nombreSubdominio,
        status: 'subdomain created',
      });
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

  editStatus({
    subdomain: nombreSubdominio,
    status: 'cloning database',
  });

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

  editarArchivoConPuerto("./FeathersClientModel.js", "./frontend/src/FeathersClient.js", nueva_ip);



  //necesito hacer un yarn build en el frontend
    // Ajuste para ejecutar npm run build
    try {
      const buildCommand = `cd frontend && npm run build`;
      console.log("Ejecutando comando de construcción:", buildCommand);
      editStatus({
        subdomain: nombreSubdominio,
        status: 'building frontend',
      });
      await ejecutarComando(buildCommand);
      console.log("Construcción completada con éxito.");
    } catch (error) {
      console.error("Error durante la construcción del frontend:", error.message);
    }

  //editar archivos con nueva ip
  



  /*


const localPath = "./frontend/dist/assets/index-f5d65ef8.js";

fs.readFile(localPath, "utf8", (err, data) => {
  if (err) {
    console.error("Error al leer el archivo:", err);
    return;
  }

  let result = data.replace(/https:\/\/api.armortemplate.site/g, `https://api-${nombreSubdominio}.armortemplate.site`);

  // Guardar los cambios en el archivo
  fs.writeFile(localPath, result, "utf8", (err) => {
    if (err) {
      console.error("Error al escribir el archivo:", err);
      return;
    }
    console.log("Archivo guardado exitosamente.");
  });
});



    


    */


  // Crear instancia de Docker
  const docker = new Docker();

  editStatus({
    subdomain: nombreSubdominio,
    status: 'docker instance creating',
  });

  // Función para inicializar la aplicación
  async function init() {
    try {
      editStatus({
        subdomain: nombreSubdominio,
        status: 'app initializing',
      });
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
      editStatus({
        subdomain: nombreSubdominio,
        status: 'active',
      });
    } catch (error) {
      console.error(`Error durante la inicialización: ${error.message}`);
      editStatus({
        subdomain: nombreSubdominio,
        status: 'error',
      });
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

    const targetUri = `mongodb+srv://carlogammarota:ZfAdZxtHFY7gwa6I@armortemplate.erwby.mongodb.net/${nombreSubdominio}?authSource=admin`

    // const targetUri = `mongodb+srv://admin-web:stuart@cluster0.podle1o.mongodb.net/${nombreSubdominio}?authSource=admin`;
    // nueva base de datos
    

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
      console.log("Error: La base de datos ya existe. actualizando aplicacion");
      init();

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

  console.log("Se recibió un JSON:", req.body);

 //para eliminar la aplicacion se necesita el subdominio. localhost:3000/api/delete-application y cuando responde creamos la aplicacion nuevamente

  const deleteAppFront = await axios.post("http://localhost:3000/api/delete-application", {
    subdomain: subdomain + "-frontend-1"
    
  });

  console.log("deleteAppFront", deleteAppFront.data);

  const deleteAppBack = await axios.post("http://localhost:3000/api/delete-application", {
    subdomain:  subdomain + "-api-1"
  });

  //buscar en la base de datos en ports 

  const uri = `mongodb+srv://admin-web:stuart@cluster0.podle1o.mongodb.net/themeforest-003?authSource=admin`;
  const client = new MongoClient(uri, {
  });

  //hay que buscar segun el subdomain los puertos 

  try {
    await client.connect();
    const db = client.db("themeforest-003"); // Especifica el nombre de la base de datos explícitamente

    // Buscar el _id de la aplicación
    const collection = db.collection("ports");
    const app = await collection.findOne({ subdomain: subdomain });

    if (app) {
      const appId = app._id;
      console.log(`Encontrada la aplicación ${subdomain} con _id: ${appId}`);

      //crear app utilizando los puertos encontrados
      const API_PORT = app.api_port;
      const FRONTEND_PORT = app.frontend_port;
      const result = app.result;

      createApp(subdomain, API_PORT, FRONTEND_PORT, result)
        .then(() => {
          res.send("Aplicación actualizada exitosamente");
        })
        .catch((error) => {
          console.error("Error al actualizar la aplicación:", error);
          res.status(500).send("Error al actualizar la aplicación");
        });
    } else {
      console.log(`No se encontró los puertos con subdominio: ${subdomain}`);
    }

  }
    catch (error) {
      console.error("Error al buscar los puertos:", error);
    } finally {
      // await client.close(); // Cerrar la conexión
    }




  // return res.send("Aplicación actualizada exitosamente");

 

});


// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
