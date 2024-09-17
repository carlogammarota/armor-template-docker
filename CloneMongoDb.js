//script para clonar una base de datos funciona perfecto.

const MongoClient = require('mongodb').MongoClient;
const { ServerApiVersion } = require('mongodb');
const async = require('async');

// Configuración de las conexiones
const sourceUri = 'mongodb+srv://admin-web:stuart@cluster0.podle1o.mongodb.net/themeforest-003?authSource=admin';
const targetUri = 'mongodb+srv://armor:9CtPqJqwm4IUQoI1@armorcluster.4egzv.mongodb.net/template2'; // Cambia esta URI según tu configuración

console.log("probando")
async function cloneDatabase() {
  try {
    // Conectar a la base de datos de origen
    const sourceClient = await MongoClient.connect(sourceUri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }})
    const sourceDb = sourceClient.db();

    // Conectar a la base de datos de destino
    const targetClient = await MongoClient.connect(targetUri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }});
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
  } catch (error) {
    console.error('Error al clonar la base de datos:', error);
  }
}

// Ejecutar la función para clonar la base de datos
cloneDatabase();
