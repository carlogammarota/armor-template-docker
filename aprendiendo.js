

const Docker = require('dockerode');

const docker = new Docker();

// docker.listContainers(function (err, containers) {
//     console.log(containers);
//   if (err) {
//     console.error('Error al obtener la lista de contenedores: ', err);
//   } else {
//     containers.forEach(function (containerInfo) {
//       console.log(containerInfo);
//     });
//   }
// });

// docker.listImages(function (err, images) {
//     if (err) {
//       console.error('Error al obtener la lista de imágenes: ', err);
//     } else {
//       images.forEach(function (imageInfo) {
//         console.log(imageInfo);
//       });
//     }
//   });


const imageName = 'ferry-frontend:latest'; // Reemplaza 'nombre_de_la_imagen' con el nombre de la imagen que deseas eliminar

docker.getImage(imageName).remove(function (err, data) {
  if (err) {
    console.error('Error al eliminar la imagen: ', err);
  } else {
    console.log('Imagen eliminada con éxito: ', data);
  }
});