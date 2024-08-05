const MongoClient = require("mongodb").MongoClient;
const async = require("async");
const fs = require("fs");
// const { exec } = require("child_process");
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const execPromisified = util.promisify(exec);
path = require("path");

const app = express();
const PORT = 3131;

// Configurar bodyParser para manejar solicitudes JSON
app.use(bodyParser.json());

// Función para crear la aplicación
async function createApp(nombreSubdominio, API_PORT, FRONTEND_PORT) {
  function clonarArchivoDominioDefault(subdomain, port) {
    const archivoDefault = "domain-default.conf";
    const nuevoNombre = `${subdomain}.armortemplate.site`;
    const rutaDestino = path.join("/etc/nginx/sites-enabled", nuevoNombre);

    // Leemos el archivo domain-default.conf
    fs.readFile(archivoDefault, "utf8", (err, data) => {
      if (err) {
        throw err;
      }
      // Realizamos las sustituciones
      const newData = data
        .replace(/default/g, subdomain)
        .replace(/port/g, port);

      // Escribimos el nuevo archivo
      fs.writeFile(rutaDestino, newData, "utf8", (err) => {
        if (err) {
          throw err;
        }
        console.log(`Archivo clonado con éxito en ${rutaDestino}`);
      });
    });
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
      res.send("Error al agregar el registro DNS (CloudFlare)");
      // console.error("Error al agregar el registro DNS:", error.errors);
      // return "Error al agregar el registro DNS (CloudFlare)"
      console.log("Error al agregar el registro DNS (CloudFlare)");
      // throw new Error("Error al agregar el registro DNS (CloudFlare)");
    }
  }



  //funciona pero comentamos para desarrollo

  /*

  // Crear subdominios en CloudFlare
  await crearSubdominioCloudFlare(nombreSubdominio);
  await crearSubdominioCloudFlare("api-" + nombreSubdominio);

  // Clonar archivos de dominio nginx para la configuración de los subdominios
  clonarArchivoDominioDefault(nombreSubdominio, FRONTEND_PORT);
  clonarArchivoDominioDefault("api-" + nombreSubdominio, API_PORT);

  // Recargar Nginx para aplicar los cambios
  await recargarNginx();

  */

  // Variable para almacenar el valor de nombreSubdominio
  const terceraVariable = nombreSubdominio;

  // Función para editar un archivo con un nuevo puerto
  function editarArchivoConPuerto(
    FeathersClientModel,
    FeathersClient,
    nueva_ip
  ) {
    // Copia el archivo modelo FeathersClientModel.js a FeathersClient.js
    fs.copyFile(FeathersClientModel, FeathersClient, (err) => {
      if (err) {
        return console.error(`Error al copiar el archivo: ${err}`);
      }

      // Lee el archivo FeathersClient.js
      fs.readFile(FeathersClient, "utf8", (err, data) => {
        if (err) {
          return console.error(`Error al leer el archivo: ${err}`);
        }

        // Realiza la sustitución del texto que contiene la ip de la api
        const resultado = data.replace(/nueva_ip/g, nueva_ip);

        // Escribe el nuevo contenido en el archivo FeathersClient.js
        fs.writeFile(FeathersClient, resultado, "utf8", (err) => {
          if (err)
            return console.error(`Error al escribir en el archivo: ${err}`);
          console.log(
            `Se ha actualizado el puerto en ${FeathersClient} a ${nuevoPuerto}`
          );
        });
      });
    });
  }

  // Ejemplo de uso de la función de edición de archivos con puerto
  const FeathersClientModel = "./FeathersClientModel.js";
  const FeathersClient = "./FeathersClient.js";
  const nuevoPuerto = API_PORT; // Puedes cambiar este valor por el que necesites

  function editarYGuardar(serverModeloPath, subdominioNuevo) {
    fs.readFile(serverModeloPath, "utf8", (err, data) => {
      if (err) {
        console.error("Error al leer el archivo:", err);
        return;
      }

      // Realizar las sustituciones globales
      let result = data.replace(/subdominioEdit/g, subdominioNuevo);
      // let result = data.replace(/dominioEdit/g, dominioNuevo).replace(/subdominioEdit/g, "9999");

      // Guardar el archivo editado
      fs.writeFile("./frontend/server.js", result, "utf8", (err) => {
        if (err) {
          console.error("Error al escribir el archivo:", err);
          return;
        }
        console.log("Archivo guardado exitosamente.");
      });
    });
  }

  // Uso de la función
  const serverModeloPath = "./serverModelo.js";
  //guardar el archivo server.js para el front con el subdominio de api nuevo para metatags y otros. 
  editarYGuardar(serverModeloPath, nombreSubdominio);


  //produccion
  // const nueva_ip = "https://api-" + nombreSubdominio + ".armortemplate.site";


  //desarrollo
  const nueva_ip = "http://192.168.1.4:" + API_PORT;


  editarArchivoConPuerto(FeathersClientModel, FeathersClient, nueva_ip);

  // Función para inicializar la aplicación
  async function init() {
    // Editar default.json

    //default.json es la configuracion para la feathers que va en ./config/default.json
    fs.readFile("default.json", "utf8", (err, data) => {
      if (err) throw err;

      //remplaza el nombreSubdominio por el nombre del subdominio
      //es para la configuracion de feathers con mongodb
      const result = data.replace("nombreSubdominio", nombreSubdominio);

      //guardamos el archivo despues de la edicion
      fs.writeFile("./api/config/default.json", result, "utf8", (err) => {
        if (err) throw err;
      });
    });

    // Reemplazar FeathersClient.js
    fs.copyFile(
      "./FeathersClient.js",
      "./frontend/src/FeathersClient.js",
      (err) => {
        if (err) throw err;
        console.log("FeathersClient.js fue reemplazado con éxito");
      }
    );

    // Crear .env
    const envData = `API_PORT=${API_PORT}\nFRONTEND_PORT=${FRONTEND_PORT}`;
    fs.writeFile(".env", envData, "utf8", (err) => {
      if (err) throw err;
      console.log(".env fue creado con éxito");
    });

    // Levantar contenedores con docker-compose
    //para mac > docker compose
    //para linux > docker-compose
    // docker-compose -p probando222 up --force-recreate -d
    const command = `docker compose -p ${terceraVariable} up --force-recreate -d`;
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

    console.log("Aplicación inicializada exitosamente.");
  }

  // Función para clonar la base de datos
  async function cloneDatabase() {
    // Configuración de las conexiones
    const sourceUri =
      "mongodb+srv://admin-web:stuart@cluster0.podle1o.mongodb.net/themeforest-003";
    const targetUri =
      "mongodb+srv://admin-web:stuart@cluster0.podle1o.mongodb.net/" +
      nombreSubdominio +
      "?authSource=admin"; // Cambia esta URI según tu configuración

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

        //no clonar servicio /applications
        if (collection.name === "applications") {
          return;
        }

        //no clonar ports
        if (collection.name === "ports") {
          return;
        }

        const sourceCollection = sourceDb.collection(collection.name);
        const targetCollection = targetDb.collection(collection.name);
        const documents = await sourceCollection.find({}).toArray();
        await targetCollection.insertMany(documents);
      });



      const data_desarrollo = {
        "subdomain": "tesla",
        "logo": "https://cdn.worldvectorlogo.com/logos/tesla-motors.svg", //svg
        "title": "Sitio Web de Tesla Motors",
        "description":"Introducing Armor Template, a robust and feature-rich web theme that combines the power of modern technologies to kickstart your next online project. Crafted with Vue3, Vuex, Tailwind CSS, Express.js (SSR), Node.js, and Socket.io, Feathers.js (rest) this versatile template offers everything you need to create a dynamic web presence.",
        "theme": "dark",
        "plugins": ["mercadopago", "paypal", "strapi"],
        "user": {}

      }

      //editar servicio "settings[0]" en titulo y descripcion
      const settings = targetDb.collection("settings");

      const update = await settings.updateOne(
        { _id: "652dbaaaf522ff35aa9c932a" },
        {
          $set: {
            data: data_desarrollo,
          },
        }
      );  

      console.log("settings actualizado:", update);


      





      // Cerrar conexiones
      sourceClient.close();
      targetClient.close();

      console.log("Base de datos clonada exitosamente.");

      //   try {

      // } catch (error) {
      // console.error("Error:", error.message);
      // }

      //con init iniciamos el proseso de crear las imagenes necesarias y levantar los contenedores.
      init();
    } catch (error) {
      console.error("Error al clonar la base de datos:", error);
    }
  }




  // init();

  // Ejecutar la función para clonar la base de datos
  cloneDatabase();
}


createApp("gorras", 1003, 2003);

// Manejar la solicitud POST en la ruta '/datos'
app.post("/create-app", (req, res) => {
  console.log("Se recibió un JSON:", req.body);
  // createApp(req.body.subdomain, req.body.api_port, req.body.frontend_port);
  res.send("Creando Aplicacion");
});

// createApp("capillaconecta2024", 1001, 2001);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
