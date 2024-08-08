const express = require('express');
const multer = require('multer');
const Docker = require('dockerode');

const app = express();
const docker = new Docker();

app.use(express.json());

// Configuración de multer para manejar la carga de archivos
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Endpoint para cargar una imagen y crear un contenedor
app.post('/images', upload.single('image'), async (req, res) => {
  try {
    const image = await docker.buildImage({
      context: req.file.buffer,
    });

    const container = await docker.createContainer({
      Image: image.id,
    });

    await container.start();

    res.status(201).json({ message: 'Imagen y contenedor creados exitosamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la imagen y el contenedor.' });
  }
});

// Endpoint para listar contenedores
app.get('/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers();
    console.log("containers", )
    res.json(containers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar los contenedores.' });
  }
});



// Endpoint para cargar una imagen y crear un contenedor
app.post('/images', upload.single('image'), async (req, res) => {
    try {
      const image = await docker.buildImage({
        context: req.file.buffer,
      });
  
      const container = await docker.createContainer({
        Image: image.id,
      });
  
      await container.start();
  
      res.status(201).json({ message: 'Imagen y contenedor creados exitosamente.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al crear la imagen y el contenedor.' });
    }
  });
  
  // Endpoint para obtener la lista de imágenes
  app.get('/images', async (req, res) => {
    try {
      const images = await docker.listImages();
      res.json(images);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener la lista de imágenes.' });
    }
  });
  
  // Endpoint para levantar un contenedor a partir de una imagen
  app.post('/containers', async (req, res) => {
    try {
      const { imageName } = req.body;
  
      const container = await docker.createContainer({
        Image: imageName,
      });
  
      await container.start();
  
      res.status(201).json({ message: 'Contenedor creado y levantado exitosamente.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al levantar el contenedor.' });
    }
  });
  
  // Endpoint para levantar una imagen en un contenedor
  app.post('/containers/:containerId/start', async (req, res) => {
    try {
      const { containerId } = req.params;
  
      const container = docker.getContainer(containerId);
      await container.start();
  
      res.json({ message: 'Contenedor levantado exitosamente.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al levantar el contenedor.' });
    }
  });
  

// Otros endpoints para actualizar, obtener y eliminar contenedores según tus necesidades.

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
