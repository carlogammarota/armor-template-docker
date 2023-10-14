const express = require("express");
const { exec } = require("child_process");

const fs = require("fs").promises;
const axios = require("axios");


async function clonarArchivoDominioDefault(subdomain, port) {
    const archivoDefault = "default.conf";
    const nuevoNombre = `${subdomain}.armortemplate.site`;
    const rutaDestino = `/etc/nginx/sites-enabled/${nuevoNombre}`;
  
    const data = await fs.readFile(archivoDefault, "utf8");
    const nuevoContenido = data
      .replace(/default/g, subdomain)
      .replace(/port/g, port);
  
    await fs.writeFile(nuevoNombre, nuevoContenido, "utf8");
    console.log(`Archivo ${nuevoNombre} creado con éxito.`);
  
    await exec(`sudo mv ${nuevoNombre} ${rutaDestino}`);
    console.log(`Archivo movido a ${rutaDestino} con éxito.`);
}

async function recargarNginx() {
const comando = "sudo systemctl reload nginx";

const { stdout, stderr } = await exec(comando);
console.log(`Resultado: ${stdout}`);
console.error(`Errores: ${stderr}`);
}

async function crearSubdominioCloudFlare(subdomain) {
const zoneId = "22ba6192a10c766dd77527c7a101ad35";
const apiKey = "77543657f985f75834e7951b022638892bddc";
const authEmail = "carlo.gammarota@gmail.com";
const dnsRecordData = {
    type: "A",
    name: subdomain,
    content: "64.227.76.217",
    ttl: 1,
    proxied: true,
};

const apiUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;

const config = {
    method: "post",
    url: apiUrl,
    headers: {
    "X-Auth-Key": apiKey,
    "X-Auth-Email": authEmail,
    "Content-Type": "application/json",
    },
    data: dnsRecordData,
};

try {
    const response = await axios(config);
    console.log("Registro DNS agregado con éxito:", response.data);
    return response.data;
} catch (error) {
    // console.error("Error al agregar el registro DNS:", error.errors);
    throw new Error("Error al agregar el registro DNS (CloudFlare)");
}
}


 crearSubdominioCloudFlare("subdomain-test");
