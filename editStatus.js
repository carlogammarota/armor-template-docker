const MongoClient = require("mongodb").MongoClient;

// Conexión de MongoDB
const uri = "mongodb+srv://admin-web:stuart@cluster0.podle1o.mongodb.net/themeforest-003";

async function editStatus(data) {
  const nombreSubdominio = data.subdomain;

  // Conectar a la base de datos específica para el subdominio
  const targetUri = `${uri}?authSource=admin`;
  console.log("editStatus", data);

  try {
    const targetClient = await MongoClient.connect(targetUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const targetDb = targetClient.db(); // Usa la base de datos predeterminada

    const collection = targetDb.collection("applications"); // Nombre de la colección

    // Encontrar el documento que coincida con el subdominio
    const docToUpdate = await collection.findOne({ subdomain: nombreSubdominio });
    if (!docToUpdate) {
      throw new Error("No se encontró ningún documento con el subdominio especificado.");
    }

    // Actualizar el campo 'status'
    const update = await collection.updateOne(
      { _id: docToUpdate._id },
      {
        $set: {
          status: data.status, // Solo actualizar el campo 'status'
          updatedAt: new Date(), // Actualizar el campo 'updatedAt' también
        },
      }
    );

    console.log("Status actualizado:", data.status);

    targetClient.close();
  } catch (error) {
    console.error("Error al editar el status:", error);
  }
}

// Ejemplo de uso de editStatus
// editStatus({
//   subdomain: 'tesla-motors',
//   status: 'active',
// });

module.exports = {
  editStatus,
};
