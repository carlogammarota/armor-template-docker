const axios = require('axios');

async function borrarTodosLosDNS() {
  const zoneId = "22ba6192a10c766dd77527c7a101ad35";
  const apiKey = "77543657f985f75834e7951b022638892bddc";
  const authEmail = "carlo.gammarota@gmail.com";

  const apiUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;
  const config = {
    method: 'get',
    url: apiUrl,
    headers: {
      "X-Auth-Key": apiKey,
      "X-Auth-Email": authEmail,
      "Content-Type": "application/json",
    },
  };

  try {
    // Obtener todos los registros DNS
    const response = await axios(config);
    const dnsRecords = response.data.result;

    // Eliminar cada registro DNS
    for (let record of dnsRecords) {
      try {
        const deleteUrl = `${apiUrl}/${record.id}`;
        const deleteConfig = {
          method: 'delete',
          url: deleteUrl,
          headers: {
            "X-Auth-Key": apiKey,
            "X-Auth-Email": authEmail,
            "Content-Type": "application/json",
          },
        };
        await axios(deleteConfig);
        console.log(`Registro DNS eliminado: ${record.name}`);
      } catch (error) {
        console.log(`Error al eliminar el registro DNS: ${record.name}`, error);
      }
    }
    console.log("Todos los registros DNS han sido eliminados.");
  } catch (error) {
    console.log("Error al obtener los registros DNS:", error);
  }
}

borrarTodosLosDNS();
