<?php
// Ciljni URL kamor bodo poslani podatki
$target_url = 'http://localhost/UpConstruction-1.0.0/sprejemnik.php';

// Email naslov prejemnika
$receiving_email_address = 'sergej.cicic2@gmail.com';

// Preverimo, ali so podatki poslani preko POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Pridobimo podatke iz POST
    $data = [
        'name' => $_POST['name'] ?? '',
        'email' => $_POST['email'] ?? '',
        'subject' => $_POST['subject'] ?? '',
        'message' => $_POST['message'] ?? '',
        'receiver_email' => $receiving_email_address
    ];

    // Inicializiramo cURL
    $ch = curl_init($target_url);
    
    // Nastavimo cURL možnosti
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);

    // Pošljemo zahtevo
    $response = curl_exec($ch);

    // Preverimo morebitne napake
    if (curl_errno($ch)) {
        echo 'Napaka pri pošiljanju: ' . curl_error($ch);
    } else {
        echo 'Odgovor strežnika: ' . $response;
    }

    // Zapremo cURL povezavo
    curl_close($ch);
} else {
    echo 'Metoda ni podprta';
}
?>
