# Métrica y unidad por tipo de proyecto

## Objetivo
Configurar automáticamente los campos “Métrica que envía el sensor” y “Unidad” según el sector del proyecto, manteniéndolos editables antes de instalar las credenciales en la placa.

## Cambios
- Definir una configuración única para los siete sectores de Bio Tokens.
- Pasar el sector actual al apartado de dispositivos ESP32.
- Cargar estos valores por defecto:
  - Forestal: superficie reforestada / m²
  - Agrícola: superficie agrícola / m²
  - Energía limpia: corriente eléctrica / KWh
  - Movilidad eléctrica: emisiones de CO₂ reducidas / kg
  - Recuperación de agua: volumen de agua recuperada / L
  - Transformación de residuos: residuos transformados / kg
  - Captura de CO₂: CO₂ capturado / kg
- Confirmar que los valores llegan al firmware y a las credenciales enviadas por USB sin alterar ese proceso.

## Verificación
- Comprobar el panel de un proyecto de energía limpia y al menos otro sector.
- Confirmar que la aplicación compila sin errores.
