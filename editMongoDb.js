const MongoClient = require("mongodb").MongoClient;


const axios = require("axios");



async function editCollection(data) {
  const nombreSubdominio = data.subdomain;

const targetUri = `mongodb+srv://armortemplate:jBFEqdXv6wvi1QbR@armorcluster.4egzv.mongodb.net/${nombreSubdominio}?authSource=admin`;
  console.log("editCollection", data);
  try {
    const targetClient = await MongoClient.connect(targetUri, { useNewUrlParser: true, useUnifiedTopology: true });
    const targetDb = targetClient.db();

    const collection = targetDb.collection("settings");

    // Encontrar el primer documento en la colección
    const firstDoc = await collection.findOne({});
    if (!firstDoc) {
      throw new Error("No se encontró ningún documento en la colección.");
    }

    const update = await collection.updateOne(
      { _id: firstDoc._id },
      {
        $set: {
          plugins: data.result.plugins,
          title: data.result.title,
          description: data.result.description,
          logo: data.result.logo,
          link: data.result.link,
          status: data.result.status,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(),
          subdomain: data.subdomain,
          theme: data.result.theme,
        },
      }
    );

    console.log("setting actualizado", update);

    targetClient.close();
  } catch (error) {
    console.error("Error al editar la colección:", error);
  }
}

// editCollection({
//   plugins: [{
//     mercadopago: {
//       mercadopago_token: "APP_USR-8509403097579740-051601-e1c674ca876a173dd84e3b63a2ac3d6e-1375519379"
//     }
//   }],
//   _id: '66b1ccd75f7856b62bced0a3',
//   subdomain: 'tesla-motors',
//   logo: 'https://cdn.worldvectorlogo.com/logos/tesla-motors.svg',
//   title: 'Sitio Web de Tesla Motors',
//   description: 'Introducing Armor Template, a robust and feature-rich web theme that combines the power of modern technologies to kickstart your next online project. Crafted with Vue3, Vuex, Tailwind CSS, Express.js (SSR), Node.js, and Socket.io, Feathers.js (rest) this versatile template offers everything you need to create a dynamic web presence.',
//   theme: 'dark',
//   link: 'https://tesla-motors.armortemplate.site',
//   status: 'creating',
//   createdAt: '2024-08-06T07:12:23.484Z',
//   updatedAt: '2024-08-06T07:12:23.484Z',
//   __v: 0
// });


module.exports = {
    editCollection,
    };