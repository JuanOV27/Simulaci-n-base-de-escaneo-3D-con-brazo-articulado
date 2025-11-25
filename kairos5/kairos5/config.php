<?php
// ===== CONFIGURACIÓN DE KAIROS =====

// API Key de Google Gemini
// Obtén tu clave en: https://ai.google.dev/
define('GEMINI_API_KEY', getenv('GEMINI_API_KEY') ?: 'AIzaSyBupdzOPK9ws9Am3zjaZQMlgEJXEgK4jfQ');

// Validar que la API key esté configurada
if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    error_log('⚠️ AVISO: GEMINI_API_KEY no está configurada en config.php');
}

// Otras configuraciones
define('APP_NAME', 'Kairos');
define('APP_VERSION', '1.0.0');

// Permite CORS si es necesario (descomenta si lo necesitas)
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type');

?>
