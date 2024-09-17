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
    const comando = "sudo systemctl reload nginx";
    // const comando = "sudo /usr/bin/systemctl reload nginx";
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
      content: "159.223.118.53",
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






  // Función para editar y guardar archivos
  function editarYGuardar(serverModeloPath, subdominioNuevo) {
    fs.readFile(serverModeloPath, "utf8", (err, data) => {
      if (err) {
        console.error("Error al leer el archivo:", err);
        return;
      }

      let result = data.replace(/subdominioEdit/g, subdominioNuevo);
      // const api_ssr = 'https://api.armortemplate.site'; asi esta en el archivo serverModelo.js

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



  //aca copiamos el archivo modulos/modelo-restaurant.hml y lo guardamos/remplazamos en  /modulos/restaurant/index.html
  //luego de copiarlo hay que remplazar remplazar_aqui_la_api por la nueva ip

  async function editarArchivoConIp(archivo, nueva_ip) {
    const destino = path.join(__dirname, "./frontend/modulos/restaurant/index.html");

    try {
      // Copiar el archivo modelo a la nueva ubicación
      await fs.promises.copyFile(archivo, destino);
      console.log("Archivo copiado correctamente");

      // Leer el archivo copiado
      let data = await fs.promises.readFile(destino, "utf8");

      // /home/armor-template-docker/frontend/modulos/modelo-restaurant.html
      // Reemplazar el texto
      const resultado = data.replace(/remplazar_aqui_la_api/g, nueva_ip);

      // Escribir el archivo con la nueva IP
      await fs.promises.writeFile(destino, resultado, "utf8");
      console.log(`Se ha actualizado la IP en ${destino}`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
  }

  editarArchivoConIp(path.join(__dirname, "./frontend/modulos/modelo-restaurant.html"), nueva_ip);





  editarArchivoConPuerto("./FeathersClientModel.js", "./frontend/src/FeathersClient.js", nueva_ip);



  //ajustar esto porque no lo esta corriendo bien.
  try {
    const buildCommand = `cd ./frontend && yarn build`;
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

      const command = `docker compose -p ${terceraVariable} up --build --force-recreate -d`;
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
    const targetUri = `mongodb+srv://armortemplate:jBFEqdXv6wvi1QbR@armorcluster.4egzv.mongodb.net/${nombreSubdominio}?authSource=admin`;

    try {
      const sourceClient = await MongoClient.connect(sourceUri);
      const sourceDb = sourceClient.db();
      const targetClient = await MongoClient.connect(targetUri);
      const targetDb = targetClient.db();

      const collections = await sourceDb.listCollections().toArray();

      await async.eachSeries(collections, async (collection) => {
        if (collection.name === "applications" || collection.name === "ports") {
          return; // Omite estas colecciones
        }

        const sourceCollection = sourceDb.collection(collection.name);
        const targetCollection = targetDb.collection(collection.name);
        let documents;

        if (collection.name === "users") {
          // Filtra solo el usuario con email "admin@gmail.com"
          documents = await sourceCollection.find({ email: "admin@gmail.com" }).toArray();
        } else {
          // Para otras colecciones, copia todos los documentos
          documents = await sourceCollection.find({}).toArray();
        }

        if (documents.length > 0) {
          await targetCollection.insertMany(documents);
        }
      });

      sourceClient.close();
      targetClient.close();

      console.log("Base de datos clonada exitosamente.");

      console.log("Editando la colección settings");
      editCollection({
        subdomain: nombreSubdominio,
        result: result,
      });


      init();
    } catch (error) {
      console.log("Error: La base de datos ya existe. Actualizando aplicación.");
      init();
    }
  }

  cloneDatabase();


}



/* 
Funcion para eliminar la app por completo. front y api, contenedores, subdominios, archivos de configuracion de nginx, registros dns en cloudflare y base de datos.
hacerlo bien ordenado.

1. eliminar contenedores
2. eliminar imagenes
3. eliminar subdominios
4. eliminar archivos de configuracion de nginx
5. eliminar registros dns en cloudflare
6. eliminar base de datos (si la opcion variable 'delete_full_application' esta activada)

*/


// Función principal para eliminar la aplicación
async function deleteApp(subdomain, delete_database) {
  // Función para eliminar un subdominio en CloudFlare
  async function eliminarSubdominioCloudFlare(subdomain) {
    const zoneId = "22ba6192a10c766dd77527c7a101ad35";
    const apiKey = "77543657f985f75834e7951b022638892bddc";
    const authEmail = "carlo.gammarota@gmail.com";
    const apiUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;

    try {
      const response = await axios.get(apiUrl, {
        headers: {
          "X-Auth-Key": apiKey,
          "X-Auth-Email": authEmail,
          "Content-Type": "application/json",
        },
      });
      const dnsRecords = response.data.result;

      for (let record of dnsRecords) {
        if (record.name === subdomain || record.name === `api-${subdomain}`) {
          try {
            await axios.delete(`${apiUrl}/${record.id}`, {
              headers: {
                "X-Auth-Key": apiKey,
                "X-Auth-Email": authEmail,
                "Content-Type": "application/json",
              },
            });
            console.log(`Registro DNS eliminado: ${record.name}`);
          } catch (error) {
            console.error(`Error eliminando el registro DNS para ${record.name}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.log("Error al eliminar el registro DNS (CloudFlare)", error.message);
    }
  }

  // Función para eliminar archivos de configuración de dominio
  function eliminarArchivoDominio(subdomain) {
    const archivoFrontend = `${subdomain}.armortemplate.site`;
    const archivoApi = `api-${subdomain}.armortemplate.site`;
    const rutaFrontend = path.join("/etc/nginx/sites-enabled", archivoFrontend);
    const rutaApi = path.join("/etc/nginx/sites-enabled", archivoApi);

    fs.unlink(rutaFrontend, (err) => {
      if (err) {
        console.error(`Error al eliminar el archivo ${archivoFrontend}: ${err}`);
      } else {
        console.log(`Archivo ${archivoFrontend} eliminado con éxito.`);
      }
    });

    fs.unlink(rutaApi, (err) => {
      if (err) {
        console.error(`Error al eliminar el archivo ${archivoApi}: ${err}`);
      } else {
        console.log(`Archivo ${archivoApi} eliminado con éxito.`);
      }
    });
  }

  // Función para recargar Nginx
  async function recargarNginx() {
    try {
      await exec("sudo systemctl reload nginx");
      console.log("Nginx recargado con éxito.");
    } catch (error) {
      console.error("Error al recargar Nginx:", error.message);
    }
  }

// Función para eliminar los contenedores
async function eliminarContenedores(subdomain) {
  const docker = new Docker();
  const contenedores = await docker.listContainers({ all: true }); // Incluye contenedores detenidos

  for (let contenedor of contenedores) {
    for (let nombre of contenedor.Names) {
      if (nombre.includes(subdomain)) {
        const container = docker.getContainer(contenedor.Id);
        try {
          // Primero intenta detener el contenedor (aunque esté detenido)
          try {
            await container.stop();
            console.log(`Contenedor ${nombre} detenido con éxito.`);
          } catch (stopError) {
            // Si el contenedor ya está detenido, no hace falta detenerlo de nuevo
            console.log(`Contenedor ${nombre} ya estaba detenido.`);
          }

          // Luego intenta eliminar el contenedor
          try {
            await container.remove({ force: true }); // Forzar la eliminación del contenedor
            console.log(`Contenedor ${nombre} eliminado con éxito.`);
          } catch (removeError) {
            console.error(`Error eliminando contenedor ${nombre}: ${removeError.message}`);
          }
        } catch (error) {
          console.error(`Error al manejar contenedor ${nombre}: ${error.message}`);
        }
      }
    }
  }
}


  // Función para eliminar las imágenes
  async function eliminarImagenes(subdomain) {
    const docker = new Docker();
    const imagenes = await docker.listImages();

    for (let imagen of imagenes) {
      for (let tag of imagen.RepoTags || []) {
        if (tag.includes(subdomain)) {
          const image = docker.getImage(imagen.Id);
          try {
            await image.remove({ force: true }); // Forzar la eliminación de la imagen
            console.log(`Imagen ${tag} eliminada con éxito.`);
          } catch (error) {
            console.error(`Error eliminando la imagen ${tag}: ${error.message}`);
          }
        }
      }
    }
  }

  // Función para eliminar las networks
  async function eliminarNetworks(subdomain) {
    const docker = new Docker();
    const networks = await docker.listNetworks();
    const networkName = `${subdomain}_mynetwork`; // Concatenar el subdominio con _mynetwork

    for (let network of networks) {
      const nombre = network.Name;  // Acceder al nombre directamente
      if (nombre === networkName) { // Comprobar si el nombre coincide
        const net = docker.getNetwork(network.Id);
        try {
          await net.remove();
          console.log(`Network ${nombre} eliminada con éxito.`);
        } catch (error) {
          console.error(`Error eliminando network ${nombre}: ${error.message}`);
        }
      }
    }
  }


  //si delete_database es true, eliminar la base de datos



  if (delete_database) {
    const uri = `mongodb+srv://armor:9CtPqJqwm4IUQoI1@armorcluster.4egzv.mongodb.net/${subdomain}`;
    const client = new MongoClient(uri, {
    });

    try {
      await client.connect();
      const db = client.db(subdomain); // Especifica el nombre de la base de datos explícitamente

      // Eliminar todas las colecciones de la base de datos
      const collections = await db.listCollections().toArray();
      for (let collection of collections) {
        await db.collection(collection.name).drop();
        console.log(`Colección ${collection.name} eliminada con éxito.`);
      }

      // Eliminar la base de datos
      await client.db().dropDatabase();
      console.log(`Base de datos ${subdomain} eliminada con éxito.`);
    }
    catch (error) {
      console.error(`Error eliminando la base de datos ${subdomain}: ${error.message}`);

    } finally {

      await client.close(); // Cerrar la conexión
    }
  }



  //eliminar tambien de la base de datos en aplicaciones y puertos buscar por subdomain y eliminar

  if (delete_database) {

    const uri = `mongodb+srv://admin-web:stuart@cluster0.podle1o.mongodb.net/themeforest-003?authSource=admin`;
    const client = new MongoClient(uri, {
    });

    try {
      await client.connect();
      const db = client.db("themeforest-003"); // Especifica el nombre de la base de datos explícitamente

      // Buscar el _id de la aplicación
      const collection = db.collection("applications");
      const app = await collection.findOne({ subdomain: subdomain });

      if (app) {
        const appId = app._id;
        console.log(`Encontrada la aplicación ${subdomain} con _id: ${appId}`);

        // Eliminar la aplicación
        await collection.deleteOne({ _id: appId });
        console.log(`Aplicación ${subdomain} eliminada con éxito.`);

        // Buscar el puerto de la aplicación
        const portsCollection = db.collection("ports");
        const port = await portsCollection.findOne({ subdomain: subdomain });

        if (port) {
          const portId = port._id;
          console.log(`Encontrado el puerto de la aplicación ${subdomain} con _id: ${portId}`);

          // Eliminar el puerto
          await portsCollection.deleteOne({ _id: portId });
          console.log(`Puerto de la aplicación ${subdomain} eliminado con éxito.`);
        }
      } else {
        console.log(`No se encontró la aplicación con subdominio: ${subdomain}`);
      }

    }
    catch (error) {
      console.error(`Error eliminando la aplicación ${subdomain}: ${error.message}`);
    } finally {
      await client.close(); // Cerrar la conexión
    }

  }





  // Ejecutar las funciones con manejo de errores por separado
  try {
    await eliminarContenedores(subdomain);
  } catch (error) {
    console.error(`Error en la eliminación de contenedores: ${error.message}`);
  }

  try {
    await eliminarImagenes(subdomain);
  } catch (error) {
    console.error(`Error en la eliminación de imágenes: ${error.message}`);
  }

  try {
    await eliminarNetworks(subdomain);
  } catch (error) {
    console.error(`Error en la eliminación de redes: ${error.message}`);
  }

  try {
    eliminarSubdominioCloudFlare(subdomain);
  } catch (error) {
    console.error(`Error en la eliminación del subdominio en CloudFlare: ${error.message}`);
  }

  try {
    eliminarArchivoDominio(subdomain);
  } catch (error) {
    console.error(`Error en la eliminación de archivos de dominio: ${error.message}`);
  }

  try {
    await recargarNginx();
  } catch (error) {
    console.error(`Error en la recarga de Nginx: ${error.message}`);
  }

  console.log(`Proceso de eliminación de la aplicación ${subdomain} completado.`);
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


//ruta delete app
app.post("/delete-application", async (req, res) => {
  const { subdomain, password, delete_database } = req.body;
  const correctPassword = "luci2024"; // La contraseña correcta

  if (password !== correctPassword) {
    res.status(401).send("Error: Contraseña incorrecta");
    return;
  }

  editStatus({
    subdomain: subdomain,
    status: 'deleting',
  });

  console.log("Se recibió un JSON:", req.body);

  deleteApp(subdomain, delete_database)
    .then(() => {
      res.send("Aplicación eliminada exitosamente");
    })
    .catch((error) => {
      console.error("Error al eliminar la aplicación:", error);
      res.status(500).send("Error al eliminar la aplicación");
    });
}
);


app.post("/update-app", async (req, res) => {
  const { subdomain, password } = req.body;
  const correctPassword = "luci2024"; // La contraseña correcta

  if (password !== correctPassword) {
    res.status(401).send("Error: Contraseña incorrecta");
    return;
  }

  // Actualizar el estado de la aplicación a 'updating'
  editStatus({
    subdomain: subdomain,
    status: 'updating',
  });

  console.log("Se recibió un JSON:", req.body);

  let client; // Definir client en el ámbito de la función

  try {
    // Llamar a deleteApp para eliminar la aplicación
    await deleteApp(subdomain, false);

    // Conectar a la base de datos MongoDB
    const uri = `mongodb+srv://admin-web:stuart@cluster0.podle1o.mongodb.net/themeforest-003?authSource=admin`;
    client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    await client.connect();
    const db = client.db("themeforest-003");

    // Buscar los puertos de la aplicación en la colección 'ports'
    const collection = db.collection("ports");
    const app = await collection.findOne({ subdomain: subdomain });

    if (app) {
      const appId = app._id;
      console.log(`Encontrada la aplicación ${subdomain} con _id: ${appId}`);

      // Crear la aplicación utilizando los puertos encontrados
      const API_PORT = app.api_port;
      const FRONTEND_PORT = app.frontend_port;
      const result = app.result;

      try {
        await createApp(subdomain, API_PORT, FRONTEND_PORT, result);
        editStatus({
          subdomain: subdomain,
          status: 'active',
        });
        res.send("Aplicación actualizada exitosamente");
      } catch (error) {
        console.error("Error al crear la aplicación:", error);
        res.status(500).send("Error al actualizar la aplicación");
      }
    } else {
      console.log(`No se encontraron los puertos con subdominio: ${subdomain}`);
      res.status(404).send("No se encontraron los puertos para el subdominio");
    }
  } catch (error) {
    console.error("Error al buscar los puertos:", error);
    res.status(500).send("Error al buscar los puertos");
  } finally {
    // Asegúrate de cerrar la conexión a la base de datos
    if (client) {
      await client.close();
    }
  }
});




// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
