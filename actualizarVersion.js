const { MongoClient } = require('mongodb');

// Función para copiar la versión y actualizar en ambas bases de datos
async function copiarYActualizarVersion(nombreSubdominio) {
  const uriThemeforest = 'mongodb+srv://admin-web:stuart@cluster0.podle1o.mongodb.net/themeforest-003?authSource=admin';
  const uriSubdominio = `mongodb+srv://armortemplate:jBFEqdXv6wvi1QbR@armorcluster.4egzv.mongodb.net/${nombreSubdominio}?authSource=admin`;

  const clientThemeforest = new MongoClient(uriThemeforest);
  const clientSubdominio = new MongoClient(uriSubdominio);

  try {
    // Conectar al cliente de themeforest-003
    await clientThemeforest.connect();
    const dbThemeforest = clientThemeforest.db('themeforest-003');
    
    // Verificar colecciones en themeforest-003
    const collectionsThemeforest = await dbThemeforest.listCollections().toArray();
    console.log('Colecciones disponibles en themeforest-003:', collectionsThemeforest.map(col => col.name));
    
    // Obtener la colección settings
    const settingsCollectionThemeforest = dbThemeforest.collection('settings');
    const settingsThemeforest = await settingsCollectionThemeforest.find().toArray();

    if (settingsThemeforest.length > 0) {
      const versionThemeforest = settingsThemeforest[0].version; // Obtener la versión actual
      console.log('Versión en themeforest-003:', versionThemeforest);

      // Conectar al cliente del subdominio
      await clientSubdominio.connect();
      const dbSubdominio = clientSubdominio.db(nombreSubdominio);
      const settingsCollectionSubdominio = dbSubdominio.collection('settings');

      // Actualizar la versión en la DB del subdominio
      const resultadoSubdominio = await settingsCollectionSubdominio.updateOne(
        { _id: settingsThemeforest[0]._id }, // Buscar el documento por su _id
        { $set: { version: versionThemeforest } } // Actualizar la versión
      );

      if (resultadoSubdominio.matchedCount > 0) {
        console.log(`Versión copiada exitosamente a ${nombreSubdominio}:`, versionThemeforest);
      } else {
        console.log(`No se encontró el documento para actualizar en ${nombreSubdominio}.`);
      }

      // Verificar colecciones en themeforest-003
      const applicationCollection = dbThemeforest.collection('applications');
      const collectionsApplications = await dbThemeforest.listCollections().toArray();
      console.log('Colecciones disponibles en themeforest-003:', collectionsApplications.map(col => col.name));

      // Buscar el documento en la colección application por subdomain
      const applicationDocument = await applicationCollection.findOne({ subdomain: nombreSubdominio });

      if (applicationDocument) {
        const applicationId = applicationDocument._id;

        // Actualizar la colección application usando el _id
        const resultadoApplication = await applicationCollection.updateOne(
          { _id: applicationId }, // Usar el _id para la actualización
          { $set: { version: versionThemeforest } } // Actualizar la versión
        );

        if (resultadoApplication.matchedCount > 0) {
          console.log(`Versión actualizada exitosamente en application para ${nombreSubdominio}:`, versionThemeforest);
        } else {
          console.log(`No se pudo actualizar la versión en la colección application para ${nombreSubdominio}.`);
        }
      } else {
        console.log(`No se encontró el subdomain ${nombreSubdominio} en la colección application.`);
      }
    } else {
      console.log('No se encontraron documentos en la colección settings de themeforest-003.');
    }
  } catch (error) {
    console.error('Error copiando y actualizando la versión:', error);
  } finally {
    // Cerrar ambas conexiones
    await clientThemeforest.close();
    await clientSubdominio.close();
  }
}

// Llamar a la función con el nombre del subdominio
// copiarYActualizarVersion('carlo2024'); // Reemplaza con el subdominio correcto

// module.exports = { copiarYActualizarVersion };
module.exports = {
    copiarYActualizarVersion,
  };
  
