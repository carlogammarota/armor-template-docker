const { MongoClient } = require('mongodb');

// URL de conexión a MongoDB
const uri = 'mongodb+srv://armortemplate:jBFEqdXv6wvi1QbR@armorcluster.4egzv.mongodb.net/';

async function dropAllDatabases() {
  const client = new MongoClient(uri);

  try {
    // Conectar al cliente
    await client.connect();
    console.log('Conectado a MongoDB');

    // Obtener las bases de datos
    const adminDb = client.db().admin();
    const dbList = await adminDb.listDatabases();

    // Bases de datos internas que no queremos eliminar
    const protectedDbs = ['admin', 'local', 'config'];

    // Eliminar cada base de datos, excepto las protegidas
    for (const dbInfo of dbList.databases) {
      const dbName = dbInfo.name;
      if (!protectedDbs.includes(dbName)) {
        await client.db(dbName).dropDatabase();
        console.log(`Base de datos ${dbName} eliminada`);
      } else {
        console.log(`Base de datos protegida ${dbName}, no se eliminará`);
      }
    }

    console.log('Todas las bases de datos han sido eliminadas (excepto las protegidas)');
  } catch (error) {
    console.error('Error al eliminar bases de datos:', error);
  } finally {
    // Cerrar la conexión
    await client.close();
    console.log('Conexión cerrada');
  }
}

dropAllDatabases();
