const fs = require('fs');
function editarYGuardar(serverModeloPath, dominioNuevo, subdominioNuevo) {
    fs.readFile(serverModeloPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error al leer el archivo:', err);
            return;
        }

        // Realizar las sustituciones globales
        let result = data.replace(/subdominioEdit/g, subdominioNuevo);
        // let result = data.replace(/dominioEdit/g, dominioNuevo).replace(/subdominioEdit/g, "9999");

        // Guardar el archivo editado
        fs.writeFile('./frontend/server.js', result, 'utf8', (err) => {
            if (err) {
                console.error('Error al escribir el archivo:', err);
                return;
            }
            console.log('Archivo guardado exitosamente.');
        });
    });
}

// Uso de la función
const serverModeloPath = './serverModelo.js';
const dominioNuevo = 'nuevoDominio';
const subdominioNuevo = 'tesla';

editarYGuardar(serverModeloPath, dominioNuevo, subdominioNuevo);
