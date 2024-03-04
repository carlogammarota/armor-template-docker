const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

app.post('/', (req, res) => {
  try {
    // Aquí puedes poner tu lógica para el manejo del POST
    // Ejemplo: validar la entrada, realizar operaciones, etc.

    // Ejemplo de error (simulado)
    const error = false;

    if (error) {
      throw new Error('Ocurrió un error en el servidor.');
    }

    // Si no hay errores, puedes enviar una respuesta exitosa
    res.send('¡POST exitoso!');
  } catch (err) {
    // Manejo de errores aquí
    console.error('Ha ocurrido un error:', err.message);
    res.status(500).send('Algo salió mal, pero la aplicación sigue funcionando.');
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
