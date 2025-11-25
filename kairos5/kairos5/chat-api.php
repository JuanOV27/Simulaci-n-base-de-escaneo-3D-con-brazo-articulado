<?php
header('Content-Type: application/json');

// Importar configuración
require_once 'config.php';

// Obtener el mensaje del cliente
$input = json_decode(file_get_contents('php://input'), true);
$userMessage = $input['message'] ?? '';
$imageData = $input['image'] ?? null;

if (empty($userMessage) && !$imageData) {
    echo json_encode(['success' => false, 'error' => 'Mensaje o imagen vacíos']);
    exit;
}

$systemPrompt = <<<EOT
Eres Kairos, un asistente experto en simuladores de escaneo 3D con brazo robótico.
Tu rol es:
1. Responder preguntas sobre cómo usar el simulador.
2. Explicar conceptos de escaneo 3D.
3. Ayudar con configuraciones del brazo robótico.
4. Guiar sobre exportación de datos.
5. Analizar imágenes y describir qué tipo de objeto sería escaneable con el sistema 3D.
6. Ser amable y profesional.
7. A la hora de responder, no te extiendas tanto; sé conciso, claro y directo.
8. Sugiere dos o tres preguntas relacionadas con lo que están preguntando.

Proporciona respuestas técnicas pero accesibles.
Si la pregunta no está relacionada con el simulador 3D, menciona amablemente que te especializas en ese tema.

Nota: Siempre, culmina diciendo que la información proporcionada puede no ser completamente precisa o aplicable a todos los casos. Siempre verifica y corrobora cualquier dato crítico antes de usarlo en entornos reales.
EOT;

try {
    $response = callGeminiAPI($userMessage, $systemPrompt, $imageData);
    
    if ($response) {
        echo json_encode([
            'success' => true,
            'response' => $response
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'No se pudo obtener respuesta de la API'
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

function callGeminiAPI($message, $systemPrompt, $imageData = null) {
    $apiKey = GEMINI_API_KEY;
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . $apiKey;
    
    // Construir partes del contenido
    $parts = [];
    
    // Agregar texto del sistema y mensaje
    $parts[] = [
        'text' => $systemPrompt . "\n\nPregunta del usuario: " . $message
    ];
    
    if ($imageData) {
        // Convertir base64 a formato compatible
        if (strpos($imageData, 'data:image') === 0) {
            // Es un data URL
            $imageData = str_replace('data:image/png;base64,', '', $imageData);
            $imageData = str_replace('data:image/jpeg;base64,', '', $imageData);
            $imageData = str_replace('data:image/jpg;base64,', '', $imageData);
            $imageData = str_replace('data:image/gif;base64,', '', $imageData);
            $imageData = str_replace('data:image/webp;base64,', '', $imageData);
        }
        
        // Agregar imagen
        if ($imageData) {
            $parts[] = [
                'inline_data' => [
                    'mime_type' => 'image/jpeg',
                    'data' => $imageData
                ]
            ];
            
            // Agregar instrucción para analizar
            $parts[] = [
                'text' => 'Por favor, analiza esta imagen en el contexto del simulador de escaneo 3D. Describe: 
                1. ¿Qué objeto es?  
                2. Si es escaneable (dimensiones, complejidad)  
                3. Ángulos recomendados de captura  
                4. Posibles desafíos al escanearlo  

                Al final de tu respuesta SIEMPRE añade esta frase, sin excepciones: 
                "Nota: “La interpretación de la imagen puede no ser 100% precisa. Te recomiendo corroborar la información.”"'
            ];

        }
    }
    
    $payload = [
        'contents' => [
            [
                'role' => 'user',
                'parts' => $parts
            ]
        ],
        'generationConfig' => [
            'temperature' => 0.7,
            'topP' => 0.95,
            'topK' => 40,
            'maxOutputTokens' => 1024
        ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception('Error de API (Código ' . $httpCode . ')');
    }

    $decoded = json_decode($response, true);
    
    if (isset($decoded['candidates'][0]['content']['parts'][0]['text'])) {
        return $decoded['candidates'][0]['content']['parts'][0]['text'];
    }

    return null;
}
?>
