//script para clonar una base de datos funciona perfecto.

const MongoClient = require('mongodb').MongoClient;
const async = require('async');

// Configuración de las conexiones
const sourceUri = 'mongodb+srv://admin-web:stuart@cluster0.podle1o.mongodb.net/themeforest-003';
const targetUri = 'mongodb://example_username:example_password@192.168.0.112:27017/template?authSource=admin'; // Cambia esta URI según tu configuración


async function cloneDatabase() {
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
  } catch (error) {
    console.error('Error al clonar la base de datos:', error);
  }
}

// Ejecutar la función para clonar la base de datos
cloneDatabase();
