# Sentinel Content

Coloca aquí (y solo aquí) el contenido que se despliega en Microsoft Sentinel:
plantillas ARM (`*.json`) o Bicep (`*.bicep`) de Analytics Rules, Automation Rules,
Hunting Queries, Parsers, Watchlists, Playbooks y Workbooks.

El workflow `sentinel-deploy-*.yml` solo despliega archivos de esta carpeta.
Los archivos JSON de la aplicación web (package.json, tsconfig.json, src/**) están
excluidos en `sentinel-deployment.config` porque no son plantillas de Sentinel y
hacían fallar el despliegue con `exit code 1`.
