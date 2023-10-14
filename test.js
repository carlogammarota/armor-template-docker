const fs = require('fs').promises;
const util = require('util');
const { exec } = require('child_process');
const execPromisified = util.promisify(exec);

async function clonarArchivoDominioDefault(subdomain, port) {
    try {
        const archivoDefault = "domain-default.conf";
        const nuevoNombre = `${subdomain}.armortemplate.site`;
        const rutaDestino = `./etc/${nuevoNombre}`;

        const data = await fs.readFile(archivoDefault, "utf8");
        const nuevoContenido = data
            .replace(/default/g, subdomain)
            .replace(/port/g, port);

        await fs.writeFile(nuevoNombre, nuevoContenido, { encoding: 'utf8' });
        console.log(`Archivo ${nuevoNombre} creado con éxito.`);

        await execPromisified(`sudo mv ${nuevoNombre} ${rutaDestino}`);
        console.log(`Archivo movido a ${rutaDestino} con éxito.`);
    } catch (error) {
        console.error("Error:", error);
    }
}


clonarArchivoDominioDefault("prueba", 3000);