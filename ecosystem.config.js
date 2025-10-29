module.exports = {
  apps: [{
    name: 'motomanager',
    script: 'npm start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Configuración de reinicio automático
    restart_delay: 4000,
    // Configuración de cluster
    exec_mode: 'fork',
    // Variables de entorno específicas
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};