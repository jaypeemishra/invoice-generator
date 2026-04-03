<?php
$authToken = 'pristine123';
$opts = [
    "http" => [
        "method" => "GET",
        "header" => "X-Auth: $authToken\r\n"
    ]
];
$context = stream_context_create($opts);

$response = file_get_contents('http://localhost/invoice-gen/bank-parse.php?name=Tide%20Current%20Account_03_Apr_2026_14.26.56.csv', false, $context);
$data = json_decode($response, true);
print_r($data['summary']);
