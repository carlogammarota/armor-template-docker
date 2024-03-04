const fs = require('fs');

function editarArchivoConPuerto(rutaArchivo, nuevoPuerto) {
    fs.readFile(rutaArchivo, 'utf8', (err, data) => {
        if (err) {
            return console.error(err);
        }

        const resultado = data.replace(/nuevoPuerto/g, nuevoPuerto);

        fs.writeFile(rutaArchivo, resultado, 'utf8', (err) => {
            if (err) return console.error(err);
            console.log(`Se ha actualizado el puerto en ${rutaArchivo} a ${nuevoPuerto}`);
        });
    });
}

// Ejemplo de uso
const rutaArchivo = './FeathersClient.js';
const nuevoPuerto = 3000; // Puedes cambiar este valor por el que necesites
editarArchivoConPuerto(rutaArchivo, nuevoPuerto);
